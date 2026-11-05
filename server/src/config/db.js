const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Ignore if DNS servers cannot be set
}

const os = require('os');
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'apex_portal_data')
  : path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'portal_db.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  // Ignore on read-only serverless filesystems
}

const dbState = {
  mode: 'initializing', // 'mongodb' | 'persistent-local'
  uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/apex_shareholder_portal',
  connectedAt: null,
  lastError: null
};

// Persistent local store for fallback when mongod is not running locally
let localStore = {
  users: [],
  companySettings: [],
  rolePermissions: [],
  shareholders: [],
  shareMovements: [],
  shareValuations: [],
  publications: [],
  supportRequests: [],
  auditLogs: [],
  notifications: []
};

function loadLocalStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      localStore = { ...localStore, ...parsed };
    } else {
      saveLocalStore();
    }
  } catch (err) {
    console.error('Error loading local persistent store:', err.message);
  }
}

function saveLocalStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local persistent store:', err.message);
  }
}

function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

function matchesQuery(doc, query = {}) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const [key, cond] of Object.entries(query)) {
    if (key === '$or' && Array.isArray(cond)) {
      if (!cond.some((sub) => matchesQuery(doc, sub))) return false;
      continue;
    }
    if (key === '$and' && Array.isArray(cond)) {
      if (!cond.every((sub) => matchesQuery(doc, sub))) return false;
      continue;
    }
    const val = doc[key];
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && !(cond instanceof RegExp) && !Array.isArray(cond)) {
      if ('$in' in cond) {
        if (Array.isArray(val)) {
          if (!val.some((v) => cond.$in.map(String).includes(String(v)))) return false;
        } else if (!cond.$in.map(String).includes(String(val))) {
          return false;
        }
      }
      if ('$nin' in cond) {
        if (cond.$nin.map(String).includes(String(val))) return false;
      }
      if ('$ne' in cond) {
        if (String(val) === String(cond.$ne)) return false;
      }
      if ('$lte' in cond) {
        if (new Date(val) > new Date(cond.$lte) && Number(val) > Number(cond.$lte)) return false;
      }
      if ('$gte' in cond) {
        if (new Date(val) < new Date(cond.$gte) && Number(val) < Number(cond.$gte)) return false;
      }
      if ('$lt' in cond) {
        if (new Date(val) >= new Date(cond.$lt) && Number(val) >= Number(cond.$lt)) return false;
      }
      if ('$gt' in cond) {
        if (new Date(val) <= new Date(cond.$gt) && Number(val) <= Number(cond.$gt)) return false;
      }
      if ('$regex' in cond) {
        const flags = cond.$options || 'i';
        const re = cond.$regex instanceof RegExp ? cond.$regex : new RegExp(cond.$regex, flags);
        if (!re.test(String(val || ''))) return false;
      }
    } else if (cond instanceof RegExp) {
      if (!cond.test(String(val || ''))) return false;
    } else {
      if (val === undefined && cond === null) continue;
      if (String(val) !== String(cond)) return false;
    }
  }
  return true;
}

class LocalQueryChain {
  constructor(items) {
    this.items = [...items];
  }
  sort(sortObj = {}) {
    const entries = Object.entries(sortObj);
    if (entries.length > 0) {
      this.items.sort((a, b) => {
        for (const [field, dir] of entries) {
          const av = a[field];
          const bv = b[field];
          if (av === bv) continue;
          const isDate =
            field.toLowerCase().includes('date') ||
            field === 'createdAt' ||
            field === 'updatedAt' ||
            field === 'timestamp';
          if (isDate && av && bv) {
            const diff = new Date(av).getTime() - new Date(bv).getTime();
            if (diff !== 0) return dir === -1 || dir === 'desc' ? -diff : diff;
          }
          if (typeof av === 'number' && typeof bv === 'number') {
            return dir === -1 || dir === 'desc' ? bv - av : av - bv;
          }
          const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
          if (cmp !== 0) return dir === -1 || dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }
    return this;
  }
  limit(n) {
    if (typeof n === 'number' && n > 0) {
      this.items = this.items.slice(0, n);
    }
    return this;
  }
  skip(n) {
    if (typeof n === 'number' && n > 0) {
      this.items = this.items.slice(n);
    }
    return this;
  }
  select() {
    return this;
  }
  lean() {
    return this;
  }
  exec() {
    return Promise.resolve(this.items);
  }
  then(resolve, reject) {
    return Promise.resolve(this.items).then(resolve, reject);
  }
}

function createHybridModel(collectionKey, mongooseModel, defaults = {}) {
  const wrapDoc = (doc) => {
    if (!doc) return null;
    const obj = { ...doc };
    Object.defineProperty(obj, 'save', {
      enumerable: false,
      value: async function () {
        const list = localStore[collectionKey] || [];
        const idx = list.findIndex((item) => String(item._id) === String(this._id));
        this.updatedAt = new Date().toISOString();
        this.version = (this.version || 1) + 1;
        const plain = { ...this };
        if (idx >= 0) {
          list[idx] = plain;
        } else {
          list.push(plain);
        }
        localStore[collectionKey] = list;
        saveLocalStore();
        return wrapDoc(plain);
      }
    });
    Object.defineProperty(obj, 'toObject', {
      enumerable: false,
      value: function () {
        return { ...this };
      }
    });
    return obj;
  };

  return {
    get isMongo() {
      return dbState.mode === 'mongodb';
    },
    find(query = {}) {
      if (this.isMongo) return mongooseModel.find(query);
      const list = (localStore[collectionKey] || []).filter((doc) => matchesQuery(doc, query)).map(wrapDoc);
      return new LocalQueryChain(list);
    },
    async findOne(query = {}) {
      if (this.isMongo) return mongooseModel.findOne(query);
      const found = (localStore[collectionKey] || []).find((doc) => matchesQuery(doc, query));
      return found ? wrapDoc(found) : null;
    },
    async findById(id) {
      if (!id) return null;
      if (this.isMongo) return mongooseModel.findById(id);
      const found = (localStore[collectionKey] || []).find((doc) => String(doc._id) === String(id));
      return found ? wrapDoc(found) : null;
    },
    async create(data) {
      if (this.isMongo) return mongooseModel.create(data);
      const now = new Date().toISOString();
      const resolvedDefaults = {};
      for (const [k, v] of Object.entries(defaults)) {
        resolvedDefaults[k] = typeof v === 'function' ? v() : v;
      }
      const doc = {
        _id: data._id || generateObjectId(),
        ...resolvedDefaults,
        ...data,
        version: data.version || 1,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now
      };
      if (!localStore[collectionKey]) localStore[collectionKey] = [];
      localStore[collectionKey].push(doc);
      saveLocalStore();
      return wrapDoc(doc);
    },
    async findByIdAndUpdate(id, update = {}, options = { new: true }) {
      if (this.isMongo) return mongooseModel.findByIdAndUpdate(id, update, options);
      const list = localStore[collectionKey] || [];
      const idx = list.findIndex((doc) => String(doc._id) === String(id));
      if (idx === -1) return null;
      const current = { ...list[idx] };
      const setFields = update.$set ? update.$set : update;
      const incFields = update.$inc || {};
      const next = {
        ...current,
        ...setFields,
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1
      };
      delete next.$set;
      delete next.$inc;
      for (const [k, v] of Object.entries(incFields)) {
        next[k] = (Number(next[k]) || 0) + Number(v);
      }
      list[idx] = next;
      saveLocalStore();
      return wrapDoc(options.new === false ? current : next);
    },
    async findOneAndUpdate(query = {}, update = {}, options = { new: true, upsert: false }) {
      if (this.isMongo) return mongooseModel.findOneAndUpdate(query, update, options);
      const list = localStore[collectionKey] || [];
      const idx = list.findIndex((doc) => matchesQuery(doc, query));
      if (idx === -1) {
        if (options.upsert) {
          const setFields = update.$set ? update.$set : update;
          return this.create({ ...query, ...setFields });
        }
        return null;
      }
      return this.findByIdAndUpdate(list[idx]._id, update, options);
    },
    async findByIdAndDelete(id) {
      if (this.isMongo) return mongooseModel.findByIdAndDelete(id);
      const list = localStore[collectionKey] || [];
      const idx = list.findIndex((doc) => String(doc._id) === String(id));
      if (idx === -1) return null;
      const [removed] = list.splice(idx, 1);
      saveLocalStore();
      return removed;
    },
    async deleteMany(query = {}) {
      if (this.isMongo) return mongooseModel.deleteMany(query);
      const list = localStore[collectionKey] || [];
      const remaining = list.filter((doc) => !matchesQuery(doc, query));
      const deletedCount = list.length - remaining.length;
      localStore[collectionKey] = remaining;
      saveLocalStore();
      return { deletedCount };
    },
    async countDocuments(query = {}) {
      if (this.isMongo) return mongooseModel.countDocuments(query);
      return (localStore[collectionKey] || []).filter((doc) => matchesQuery(doc, query)).length;
    }
  };
}

async function connectDB(customUri) {
  if (mongoose.connection.readyState === 1 && dbState.mode === 'mongodb' && !customUri) {
    return dbState;
  }
  const uri = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/apex_shareholder_portal';
  dbState.uri = uri.replace(/:([^:@]+)@/, ':****@');
  loadLocalStore();

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: uri.includes('127.0.0.1') || uri.includes('localhost') ? 2500 : 10000
    });
    dbState.mode = 'mongodb';
    dbState.connectedAt = new Date().toISOString();
    dbState.lastError = null;
    console.log('✅ Connected to MongoDB via Mongoose:', dbState.uri);
    return dbState;
  } catch (err) {
    dbState.mode = 'persistent-local';
    dbState.connectedAt = new Date().toISOString();
    dbState.lastError = err.message;
    console.log('ℹ️ MongoDB fallback active — using Persistent Local JSON-Document Engine. Configure MONGODB_URI for Atlas/remote MongoDB at any time.');
    return dbState;
  }
}

module.exports = {
  connectDB,
  dbState,
  createHybridModel,
  saveLocalStore
};

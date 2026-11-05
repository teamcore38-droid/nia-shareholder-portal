require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, dbState } = require('../config/db');
const {
  CompanySettings,
  User,
  RolePermission,
  Shareholder,
  ShareMovement,
  ShareValuation,
  Publication,
  SupportRequest,
  AuditLog
} = require('../models');

async function syncLocalToMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('127.0.0.1') || uri.includes('localhost')) {
    console.error('Please set MONGODB_URI to your MongoDB Atlas connection string first.');
    process.exit(1);
  }

  await connectDB(uri);
  if (dbState.mode !== 'mongodb') {
    console.error('Could not connect to MongoDB Atlas:', dbState.lastError);
    process.exit(1);
  }

  const dbFile = path.join(__dirname, '../../data/portal_db.json');
  if (!fs.existsSync(dbFile)) {
    console.log('No local portal_db.json found to migrate.');
    process.exit(0);
  }

  const raw = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

  const syncCollection = async (items = [], Model, uniqueKey) => {
    let count = 0;
    for (const item of items) {
      const clean = { ...item };
      delete clean._id;
      delete clean.version;
      delete clean.__v;
      const filter =
        uniqueKey && clean[uniqueKey]
          ? { [uniqueKey]: clean[uniqueKey] }
          : { action: clean.action, timestamp: clean.timestamp, actorEmail: clean.actorEmail };
      await Model.findOneAndUpdate(filter, { $set: clean }, { upsert: true, new: true, strict: false });
      count++;
    }
    return count;
  };

  const cSettings = await syncCollection(raw.companySettings, CompanySettings, 'companyId');
  const cRoles = await syncCollection(raw.rolePermissions, RolePermission, 'role');
  const cUsers = await syncCollection(raw.users, User, 'email');
  const cHolders = await syncCollection(raw.shareholders, Shareholder, 'shareholderId');
  const cMovs = await syncCollection(raw.shareMovements, ShareMovement, 'reference');
  const cVals = await syncCollection(raw.shareValuations, ShareValuation, 'reference');
  const cPubs = await syncCollection(raw.publications, Publication, 'reference');
  const cSupp = await syncCollection(raw.supportRequests, SupportRequest, 'reference');
  const cLogs = await syncCollection(raw.auditLogs, AuditLog, null);

  console.log(
    `✅ Migrated & backed up local store to MongoDB Atlas: Settings(${cSettings}), Roles(${cRoles}), Users(${cUsers}), Shareholders(${cHolders}), Movements(${cMovs}), Valuations(${cVals}), Publications(${cPubs}), Support(${cSupp}), AuditLogs(${cLogs})`
  );
  process.exit(0);
}

if (require.main === module) {
  syncLocalToMongo().catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}

module.exports = { syncLocalToMongo };

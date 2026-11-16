const MAX_CACHE_ENTRIES = 500;

const store = new Map();
const inFlight = new Map();

const CACHE_KEYS = {
  COMPANY_SETTINGS: 'company_settings',
  ROLE_PERMISSIONS: 'role_permissions',
  REGISTER_STATE_PREFIX: 'register_state:',
  VALUATION_STATE_PREFIX: 'valuation_state:',
  PUBLISHED_PUBLICATIONS: 'published_publications',
  BOOTSTRAP_USER_COUNT: 'bootstrap_user_count',
  AUTH_USER_PREFIX: 'auth_user:'
};

function evictIfNeeded() {
  if (store.size < MAX_CACHE_ENTRIES) return;
  const firstKey = store.keys().next().value;
  if (firstKey !== undefined) {
    store.delete(firstKey);
  }
}

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs = 15000) {
  if (ttlMs <= 0) return value;
  evictIfNeeded();
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
  return value;
}

function del(key) {
  store.delete(key);
  inFlight.delete(key);
}

function invalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
  for (const key of inFlight.keys()) {
    if (key.startsWith(prefix)) {
      inFlight.delete(key);
    }
  }
}

function clearAll() {
  store.clear();
  inFlight.clear();
}

/**
 * Thundering-herd-safe cache lookup: concurrent requests for the same missing key
 * share a single in-flight promise instead of executing duplicate database scans.
 */
async function getOrCompute(key, ttlMs, computeFn) {
  const cached = get(key);
  if (cached !== undefined) {
    return cached;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = Promise.resolve()
    .then(() => computeFn())
    .then((result) => {
      set(key, result, ttlMs);
      inFlight.delete(key);
      return result;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
}

function invalidateCompanyCaches() {
  del(CACHE_KEYS.COMPANY_SETTINGS);
  invalidatePrefix(CACHE_KEYS.REGISTER_STATE_PREFIX);
  invalidatePrefix(CACHE_KEYS.VALUATION_STATE_PREFIX);
}

function invalidateLedgerCaches() {
  invalidatePrefix(CACHE_KEYS.REGISTER_STATE_PREFIX);
}

function invalidateValuationCaches() {
  invalidatePrefix(CACHE_KEYS.VALUATION_STATE_PREFIX);
}

function invalidatePublicationCaches() {
  del(CACHE_KEYS.PUBLISHED_PUBLICATIONS);
}

function invalidateRolePermissionCaches() {
  del(CACHE_KEYS.ROLE_PERMISSIONS);
}

function invalidateAuthUserCache(userId) {
  if (userId) {
    del(`${CACHE_KEYS.AUTH_USER_PREFIX}${String(userId)}`);
  } else {
    invalidatePrefix(CACHE_KEYS.AUTH_USER_PREFIX);
  }
}

module.exports = {
  CACHE_KEYS,
  get,
  set,
  del,
  invalidatePrefix,
  clearAll,
  getOrCompute,
  invalidateCompanyCaches,
  invalidateLedgerCaches,
  invalidateValuationCaches,
  invalidatePublicationCaches,
  invalidateRolePermissionCaches,
  invalidateAuthUserCache
};

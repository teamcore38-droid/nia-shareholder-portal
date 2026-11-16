const { IS_PRODUCTION } = require('../config/env');

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively strips MongoDB query operators ($...) and prototype-pollution keys
 * from untrusted request payloads to mitigate NoSQL injection and object pollution.
 */
function stripUnsafeKeys(value, depth = 0) {
  if (depth > 12 || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = stripUnsafeKeys(value[i], depth + 1);
    }
    return value;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key)) {
      delete value[key];
      continue;
    }
    value[key] = stripUnsafeKeys(value[key], depth + 1);
  }
  return value;
}

function sanitizeRequestInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    stripUnsafeKeys(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    stripUnsafeKeys(req.query);
  }
  next();
}

function isPlainString(val, maxLen = 2000) {
  return typeof val === 'string' && val.length <= maxLen;
}

function validatePasswordPolicy(password) {
  if (typeof password !== 'string') {
    return 'Password must be a valid string.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 128) {
    return 'Password must not exceed 128 characters.';
  }
  return null;
}

/**
 * Validates document/logo URLs so only empty, internal /uploads/... paths,
 * or http(s) URLs are stored (prevents javascript:/data: XSS link injection).
 */
function sanitizeSafeUrl(rawUrl) {
  if (rawUrl === undefined || rawUrl === null) return '';
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/uploads/') && !trimmed.includes('..') && !trimmed.includes('\0')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Strips internal infrastructure and seed governance fields from CompanySettings
 * before returning to public or shareholder endpoints.
 */
function sanitizePublicCompanySettings(settings) {
  if (!settings) return null;
  const obj = typeof settings.toObject === 'function' ? settings.toObject() : { ...settings };
  delete obj.cloudflareAccountId;
  delete obj.cloudflareR2Bucket;
  delete obj.cloudflareR2PublicUrl;
  delete obj.seedDataBlocked;
  delete obj.seedDataBlockedPermanently;
  delete obj.seedDataBlockedBy;
  delete obj.seedDataBlockedAt;
  delete obj.hasSeedData;
  return obj;
}

function sendSafeError(res, err, fallbackMessage = 'Request could not be completed. Please try again.') {
  const status = err?.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
  if (status >= 500) {
    console.error('[API Error]', err?.message || err);
  }
  const message =
    status < 500 || !IS_PRODUCTION
      ? err?.message || fallbackMessage
      : fallbackMessage;
  return res.status(status).json({ message });
}

module.exports = {
  stripUnsafeKeys,
  sanitizeRequestInputs,
  isPlainString,
  validatePasswordPolicy,
  sanitizeSafeUrl,
  sanitizePublicCompanySettings,
  sendSafeError
};

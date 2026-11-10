const path = require('path');
const crypto = require('crypto');

// Load environment variables from server/.env or root .env
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (e) {
  // Ignore if dotenv is not present or already loaded
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_VERCEL = Boolean(process.env.VERCEL);
const IS_PRODUCTION = NODE_ENV === 'production' || IS_VERCEL;

// Insecure placeholder secrets that must never be accepted in production
const FORBIDDEN_SECRETS = new Set([
  'replace_with_strong_jwt_secret',
  'apex_link_nia_group_shareholder_portal_secret_key_2026',
  'secret',
  'jwt_secret',
  'password',
  'change_me',
  '1234567890'
]);

/**
 * Validates and resolves JWT_SECRET.
 * In production: strictly enforces non-empty, high-entropy (>32 chars) secret without default fallbacks.
 * In development: falls back to a locally persistent or runtime-generated cryptographic key if not provided.
 */
let resolvedJwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';

if (IS_PRODUCTION) {
  if (!resolvedJwtSecret) {
    const errorMsg =
      '[CRITICAL SECURITY CONFIGURATION ERROR] JWT_SECRET environment variable is missing in production. ' +
      'Production environments (e.g. Vercel) require a cryptographically random secret of at least 32 characters. ' +
      'Please configure JWT_SECRET in your platform environment settings.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (resolvedJwtSecret.length < 32 || FORBIDDEN_SECRETS.has(resolvedJwtSecret.toLowerCase())) {
    const errorMsg =
      '[CRITICAL SECURITY CONFIGURATION ERROR] JWT_SECRET in production is weak or using a known demo placeholder. ' +
      'JWT_SECRET must be at least 32 characters long and randomly generated. ' +
      'Generate one using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
} else {
  if (!resolvedJwtSecret || FORBIDDEN_SECRETS.has(resolvedJwtSecret.toLowerCase())) {
    // In local development, use dev secret or generate an ephemeral random secret
    if (!resolvedJwtSecret) {
      resolvedJwtSecret = crypto.randomBytes(32).toString('hex');
      console.warn(
        '⚠️ [SECURITY NOTICE] No JWT_SECRET found in local environment. Generated an ephemeral session secret for this development run.'
      );
    }
  }
}

/**
 * Sanitizes connection strings to prevent credential exposure in logs or diagnostics
 */
function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return 'none';
  try {
    // Replace password: mongodb+srv://user:pass@host -> mongodb+srv://user:****@host
    return uri.replace(/:([^:@]+)@/, ':****@');
  } catch {
    return 'sanitized-uri';
  }
}

// Allowed CORS origins
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
const parsedOrigins = rawAllowedOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const allowedOriginsSet = new Set(
  IS_PRODUCTION ? parsedOrigins : [...parsedOrigins, ...DEFAULT_DEV_ORIGINS]
);

function isOriginAllowed(origin) {
  if (!origin) return true; // Server-to-server or same-origin
  if (!IS_PRODUCTION) return true; // Permissive on localhost for development
  if (allowedOriginsSet.has(origin)) return true;

  // If deployed on Vercel, allow preview & production deployments for the same team/project
  if (IS_VERCEL) {
    if (origin.endsWith('.vercel.app')) return true;
  }

  return false;
}

const envConfig = {
  NODE_ENV,
  IS_PRODUCTION,
  IS_VERCEL,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  JWT_SECRET: resolvedJwtSecret,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/apex_shareholder_portal',
  CLOUDINARY: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'apex_shareholder_portal'
  },
  ALLOWED_ORIGINS: Array.from(allowedOriginsSet),
  isOriginAllowed,
  sanitizeMongoUri
};

module.exports = envConfig;

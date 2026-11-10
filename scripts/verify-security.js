/**
 * Automated Security Audit & Verification Script
 * Validates environment isolation, secret redaction, git protection, and endpoint hardening.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Starting Apex Link Portal Security Audit...\n');

let failedTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failedTests++;
  }
}

// =============================================================================
// TEST SUITE 1: Git Repository & Secret Hygiene
// =============================================================================
console.log('--- 1. Git Repository & Secret Hygiene ---');

try {
  const trackedEnvFiles = execSync('git ls-files "*env*"', { encoding: 'utf8' })
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => {
      if (!f || f.endsWith('.example')) return false;
      const base = path.basename(f);
      // Only match actual env configuration files like .env, .env.local, .env.prod
      return base === '.env' || base.startsWith('.env.');
    });

  assert(
    trackedEnvFiles.length === 0,
    'No real .env files are tracked by Git',
    `Found tracked files: ${trackedEnvFiles.join(', ')}`
  );
} catch (e) {
  assert(false, 'Git ls-files execution succeeded', e.message);
}

const gitignorePath = path.join(__dirname, '../.gitignore');
const gitignoreContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';

assert(
  gitignoreContent.includes('.env') &&
    gitignoreContent.includes('server/.env*') &&
    gitignoreContent.includes('client/.env*'),
  '.gitignore contains comprehensive .env exclusions'
);

assert(
  gitignoreContent.includes('*.pem') &&
    gitignoreContent.includes('*.key') &&
    gitignoreContent.includes('credentials.json'),
  '.gitignore contains cryptographic and credentials file exclusions'
);

// =============================================================================
// TEST SUITE 2: Environment Variable Sanitization & Redaction
// =============================================================================
console.log('\n--- 2. Environment Variable Sanitization & Masking ---');

const { sanitizeMongoUri, isOriginAllowed } = require('../server/src/config/env');

const testMongoUri = 'mongodb+srv://admin_user:super_secret_password_123@cluster0.abcde.mongodb.net/prod_db';
const sanitized = sanitizeMongoUri(testMongoUri);

assert(
  !sanitized.includes('super_secret_password_123'),
  'MongoDB URI sanitizer masks passwords completely',
  `Sanitized output: ${sanitized}`
);
assert(
  sanitized.includes('admin_user:****@cluster0.abcde.mongodb.net'),
  'MongoDB URI sanitizer preserves non-sensitive structural details safely',
  `Sanitized output: ${sanitized}`
);

// =============================================================================
// TEST SUITE 3: CORS & Origin Validation
// =============================================================================
console.log('\n--- 3. CORS & Origin Boundary Protection ---');

assert(isOriginAllowed(null), 'Allows server-to-server or same-origin requests (origin === null)');
assert(isOriginAllowed(''), 'Allows server-to-server with empty origin');

// =============================================================================
// TEST SUITE 4: Backend Endpoint Security & CWE-200 Leak Prevention
// =============================================================================
console.log('\n--- 4. Backend Health & Route Information Leak Checks ---');

const app = require('../server/src/index');

// Verify Express configuration
assert(
  app.get('x-powered-by') === false,
  'X-Powered-By header is disabled on Express app'
);

// Mock request / response to test /api/health
const mockReq = { headers: {}, cookies: {}, query: {}, params: {} };
let healthResponseData = null;
const mockRes = {
  json: (data) => {
    healthResponseData = data;
    return mockRes;
  },
  status: () => mockRes
};

const healthRouteHandler = app._router.stack
  .filter((r) => r.route && r.route.path === '/api/health')
  .map((r) => r.route.stack[0].handle)[0];

if (healthRouteHandler) {
  healthRouteHandler(mockReq, mockRes);
  assert(Boolean(healthResponseData), '/api/health responds with status');
  const serialized = JSON.stringify(healthResponseData);

  assert(
    !serialized.includes('mongodb+srv') && !serialized.includes('teamcore38_db_user'),
    '/api/health does NOT expose MongoDB connection URIs or database usernames',
    `Response: ${serialized}`
  );

  assert(
    !serialized.includes('api_secret') && !serialized.includes('api_key'),
    '/api/health does NOT expose Cloudinary API secrets or keys',
    `Response: ${serialized}`
  );
} else {
  assert(false, 'Found /api/health route handler');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n=============================================================================');
console.log(`Security Audit Summary: ${passedTests} Passed, ${failedTests} Failed.`);
if (failedTests > 0) {
  console.error('❌ Some security controls failed! Review details above.');
  process.exit(1);
} else {
  console.log('🛡️ All security controls and protections are VERIFIED & INTACT!');
  process.exit(0);
}

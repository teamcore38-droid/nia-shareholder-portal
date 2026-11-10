const {
  PORT,
  IS_PRODUCTION,
  ALLOWED_ORIGINS,
  isOriginAllowed
} = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { connectDB, dbState } = require('./config/db');
const { configureCloudinary, getCloudinaryStatus, UPLOADS_DIR } = require('./config/cloudinary');
const { ensureCoreSystemConfig } = require('./utils/ledgerEngine');
const { authenticate } = require('./middleware/auth');
const { Publication, ShareMovement } = require('./models');

const authRoutes = require('./routes/authRoutes');
const shareholderPortalRoutes = require('./routes/shareholderPortalRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Enterprise HTTP Security Headers (OWASP Recommended)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://res.cloudinary.com', ...ALLOWED_ORIGINS],
        frameAncestors: ["'none'"]
      }
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    hsts: IS_PRODUCTION
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false
  })
);

app.use(compression());

// Strict Cross-Origin Resource Sharing (CORS) Protection
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Cross-Origin Request Blocked by Security Policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Ensure DB & Core Config are initialized on every serverless cold start
let initPromise = null;
async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await connectDB();
      configureCloudinary();
      await ensureCoreSystemConfig();
    })().catch((err) => {
      initPromise = null;
      console.error('Initialization error:', err.message);
    });
  }
  return initPromise;
}

app.use(async (req, res, next) => {
  await ensureInitialized();
  next();
});

// Protected private file delivery
app.get('/uploads/:filename', async (req, res) => {
  const safeFilename = path.basename(req.params.filename || '');
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Requested file not found.' });
  }

  if (safeFilename.startsWith('company_branding_')) {
    return res.sendFile(filePath);
  }

  authenticate(req, res, async () => {
    try {
      const isStaff = ['Administrator', 'Data officer', 'Approver'].includes(req.user.role);
      if (isStaff) {
        return res.sendFile(filePath);
      }

      const shId = req.user.shareholderId;
      const targetUrl = `/uploads/${safeFilename}`;

      const pub = await Publication.findOne({ fileUrl: targetUrl, status: 'Published' });
      if (pub) {
        if (
          pub.audienceType === 'All shareholders' ||
          (pub.audienceType === 'Specific shareholder' && pub.targetShareholderId === shId)
        ) {
          return res.sendFile(filePath);
        }
        return res.status(403).json({
          message: 'Access denied: You are not authorised to access another shareholder’s private document.'
        });
      }

      const mov = await ShareMovement.findOne({
        supportingDocumentUrl: targetUrl,
        status: 'Published'
      });
      if (mov) {
        if (mov.fromShareholderId === shId || mov.toShareholderId === shId) {
          return res.sendFile(filePath);
        }
        return res.status(403).json({
          message: 'Access denied: Supporting movement document belongs to another shareholder.'
        });
      }

      return res.status(403).json({
        message: 'Access denied: Private file requires explicit shareholder permission.'
      });
    } catch (err) {
      return res.status(500).json({ message: 'Error verifying file access permissions.' });
    }
  });
});

// Global rate limiter across all API routes to mitigate DoS & scanning attacks
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this address. Please try again shortly.' }
});

// Dedicated strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication requests, please try again shortly.' }
});

app.use('/api', globalApiLimiter);

// Public root status (zero internal configuration or path exposure)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NIA Group of Company — Nexus International Alliance (NIA) Digital Portal API',
    healthEndpoint: '/api/health'
  });
});

// Sanitized Health & Diagnostics Endpoint (CWE-200 Prevention: zero internal URI or secret exposure)
app.get('/api/health', (req, res) => {
  const clStatus = getCloudinaryStatus();
  res.json({
    status: 'healthy',
    service: 'Nexus International Alliance (NIA) — Digital Shareholder Portal API',
    environment: IS_PRODUCTION ? 'production' : 'development',
    database: {
      status: dbState.status || (dbState.mode ? 'connected' : 'initializing'),
      mode: dbState.mode
    },
    storage: {
      configured: Boolean(clStatus.configured),
      provider: clStatus.mode === 'cloudinary-cloud' ? 'cloudinary' : 'local-storage'
    },
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/portal', shareholderPortalRoutes);
app.use('/api/admin', adminRoutes);

// Fallback 404 for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Requested API endpoint not found.' });
});

// Centralized Secure Error Handling Middleware (CWE-209 Prevention: Never leak stack traces in production)
app.use((err, req, res, next) => {
  const errorId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
  console.error(`[Security Log - Error ID: ${errorId}]`, err);

  if (err.message === 'Cross-Origin Request Blocked by Security Policy') {
    return res.status(403).json({ message: err.message });
  }

  res.status(err.status || 500).json({
    message: IS_PRODUCTION
      ? 'An unexpected error occurred. Please contact system support.'
      : (err.message || 'Internal Server Error'),
    ...(IS_PRODUCTION ? { errorId } : { error: err.message, stack: err.stack })
  });
});

if (!process.env.VERCEL && require.main === module) {
  ensureInitialized().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Apex Link Shareholder Portal API running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;

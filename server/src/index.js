require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { connectDB, dbState } = require('./config/db');
const { configureCloudinary, getCloudinaryStatus, UPLOADS_DIR } = require('./config/cloudinary');
const { ensureCoreSystemConfig } = require('./utils/ledgerEngine');
const { authenticate } = require('./middleware/auth');
const { Publication, ShareMovement } = require('./models');

const authRoutes = require('./routes/authRoutes');
const shareholderPortalRoutes = require('./routes/shareholderPortalRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true
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

// Rate limit auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication requests, please try again shortly.' }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Apex Link Shareholder Portal API',
    proposalRef: 'ALG-SP-2026-16',
    database: dbState,
    cloudinary: getCloudinaryStatus(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/portal', shareholderPortalRoutes);
app.use('/api/admin', adminRoutes);

if (!process.env.VERCEL) {
  ensureInitialized().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Apex Link Shareholder Portal API running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;

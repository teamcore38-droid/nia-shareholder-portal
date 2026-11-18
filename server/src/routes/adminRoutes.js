const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const {
  CompanySettings,
  User,
  RolePermission,
  Shareholder,
  ShareMovement,
  ShareValuation,
  Publication,
  SupportRequest,
  AuditLog,
  getNextReference
} = require('../models');
const {
  ensureCoreSystemConfig,
  getTodayDateString,
  logAuditEvent,
  calculateRegisterState,
  getEffectiveValuationState
} = require('../utils/ledgerEngine');
const path = require('path');
const { authenticate, requireStaff, requireRoles, checkRolePermission } = require('../middleware/auth');
const {
  configureCloudflare,
  getCloudflareStatus,
  uploadToCloudflare
} = require('../config/cloudflare');
const { dbState } = require('../config/db');
const { generateAdminReportPDF } = require('../utils/pdfGenerator');
const {
  getSeedStatus,
  toggleSeedBlock,
  clearSeedData,
  insertSeedData,
  DEMO_ACCOUNTS
} = require('../utils/seedData');
const {
  CACHE_KEYS,
  del,
  getOrCompute,
  invalidateAdminWorkspaceCache,
  invalidatePortalWorkspaceCache,
  invalidateCompanyCaches,
  invalidateLedgerCaches,
  invalidateValuationCaches,
  invalidatePublicationCaches,
  invalidateRolePermissionCaches,
  invalidateAuthUserCache
} = require('../utils/cache');
const {
  escapeCsvCell,
  isPlainString,
  validatePasswordPolicy,
  sanitizeSafeUrl,
  sendSafeError
} = require('../utils/security');

const BCRYPT_ROUNDS = 10;

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: { message: 'Upload rate limit exceeded. Please wait before uploading more files.' }
});

const adminExportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: { message: 'Too many report export requests. Please wait a few minutes.' }
});

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.doc',
  '.docx'
]);

const router = express.Router();

// Fail-Safe Defense-in-Depth: Enforce authentication & authorised staff role across ALL admin routes
router.use(authenticate);
router.use(requireStaff);

// Automatically invalidate workspace caches synchronously before any successful admin mutation responds
router.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const origJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) {
        invalidateAdminWorkspaceCache();
        invalidatePortalWorkspaceCache();
      }
      return origJson(body);
    };
  }
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new Error(
          'Unsupported file type. Only PDF, PNG, JPG, WebP, SVG, and Word documents are permitted.'
        )
      );
    }
    cb(null, true);
  }
});

// Cloudflare R2 File / Image Upload Route (with file-type validation per Page 34)
router.post('/upload', authenticate, requireStaff, uploadLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'File upload rejected by security check.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided for upload.' });
    }
    const folder = req.body.folder || 'documents';
    const result = await uploadToCloudflare(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Uploaded file (${result.provider})`,
      reference: result.publicId,
      entityType: 'FileUpload',
      newValue: `${req.file.originalname} -> ${result.url}`
    });

    res.json({
      message: `File uploaded successfully via ${result.provider === 'cloudflare-r2' ? 'Cloudflare R2 Storage' : 'Local Storage'}.`,
      file: result
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

// Combined Single-Request Endpoint for Administration Workspace (reduces 10 HTTP requests & 140+ DB queries to 1 parallel round-trip + thundering-herd cache)
router.get('/workspace', authenticate, requireStaff, async (req, res) => {
  try {
    const payload = await getOrCompute(CACHE_KEYS.ADMIN_WORKSPACE, 10000, async () => {
      const [
        settings,
        allShareholders,
        allMovements,
        allValuations,
        allPublications,
        allSupportRequests,
        allUsers,
        rolePermissions,
        auditLogs,
        auditLogsTotalCount
      ] = await Promise.all([
        ensureCoreSystemConfig(null, { lean: true }),
        Shareholder.find({}).sort({ shareholderId: 1 }).lean(),
        ShareMovement.find({}).select('-snapshotBefore -snapshotAfter').sort({ createdAt: -1 }).lean(),
        ShareValuation.find({}).sort({ effectiveDate: -1, createdAt: -1 }).lean(),
        Publication.find({}).sort({ createdAt: -1 }).lean(),
        SupportRequest.find({}).sort({ createdAt: -1 }).limit(500).lean(),
        User.find({})
          .select('_id email fullName role status shareholderId inviteToken verificationEnabled lastLoginAt createdAt isSeed')
          .lean(),
        RolePermission.find({}).lean(),
        AuditLog.find({}).sort({ createdAt: -1 }).limit(200).lean(),
        AuditLog.countDocuments({})
      ]);

    const [registerState, valuationState, seedStatus] = await Promise.all([
      calculateRegisterState(getTodayDateString(), {
        settings,
        allMovements,
        allShareholders
      }),
      getEffectiveValuationState(getTodayDateString(), {
        settings,
        allValuations
      }),
      getSeedStatus({
        settings,
        allShareholders,
        allMovements,
        allValuations,
        allPublications,
        allSupportRequests,
        allUsers
      })
    ]);

    const activeShareholders = allShareholders.filter((s) => s.accountStatus === 'Active').length;
    const inactiveShareholders = allShareholders.filter((s) => s.accountStatus !== 'Active').length;
    const openSupportCount = allSupportRequests.filter((r) => r.status !== 'Resolved').length;

    // 1. Overview pending items
    const pendingItems = [];
    for (const v of allValuations.filter((x) => ['Draft', 'Submitted', 'Scheduled'].includes(x.status))) {
      pendingItems.push({
        id: v._id,
        itemType: 'valuation',
        reference: v.reference,
        label: `${v.reference} | Value ${v.currency} ${Number(v.valuePerShare).toFixed(2)}`,
        enteredBy: v.enteredByRole || v.enteredBy || 'Data officer',
        enteredByEmail: v.enteredByEmail,
        effectiveDate: v.effectiveDate,
        status: v.status,
        nextAction: v.status === 'Scheduled' ? 'Publish on effective date' : 'Review draft'
      });
    }

    for (const m of allMovements.filter((x) => ['Draft', 'Submitted', 'Scheduled'].includes(x.status))) {
      pendingItems.push({
        id: m._id,
        itemType: 'movement',
        reference: m.reference,
        label: `${m.reference} | ${m.movementType} ${Number(m.quantity).toLocaleString()} shares`,
        enteredBy: m.enteredByRole || m.enteredBy || 'Data officer',
        enteredByEmail: m.enteredByEmail,
        effectiveDate: m.effectiveDate,
        status: m.status,
        nextAction: 'Review draft'
      });
    }

    for (const sh of allShareholders.filter((x) => ['Draft', 'Submitted', 'Invited'].includes(x.accountStatus))) {
      pendingItems.push({
        id: sh._id,
        itemType: 'shareholder',
        reference: sh.shareholderId,
        label: `${sh.shareholderId} | ${sh.fullName}`,
        enteredBy: sh.enteredBy || 'Administrator',
        enteredByEmail: sh.enteredByEmail,
        effectiveDate: sh.accountStatus === 'Invited' ? 'Invitation pending' : 'Not yet active',
        status: sh.accountStatus,
        nextAction: 'Review profile'
      });
    }

    for (const pub of allPublications.filter((x) => ['Draft', 'Submitted'].includes(x.status))) {
      pendingItems.push({
        id: pub._id,
        itemType: 'publication',
        reference: pub.reference,
        label: `${pub.reference} | ${pub.title}`,
        enteredBy: pub.enteredBy || 'Data officer',
        effectiveDate: pub.periodOrDate || 'Upon approval',
        status: pub.status,
        nextAction: 'Review publication'
      });
    }

    // 2. Shareholders enrichment (0 N+1 queries)
    const issuedTotal = registerState.issuedSharesTotal || 0;
    const valPerShare = valuationState.currentPublishedValuation
      ? Number(valuationState.currentPublishedValuation.valuePerShare)
      : 0;

    const userByShareholderId = {};
    for (const u of allUsers) {
      if (u.shareholderId) userByShareholderId[u.shareholderId] = u;
    }

    const movementCountByShareholderId = {};
    for (const m of allMovements) {
      if (m.fromShareholderId) {
        movementCountByShareholderId[m.fromShareholderId] =
          (movementCountByShareholderId[m.fromShareholderId] || 0) + 1;
      }
      if (m.toShareholderId && m.toShareholderId !== m.fromShareholderId) {
        movementCountByShareholderId[m.toShareholderId] =
          (movementCountByShareholderId[m.toShareholderId] || 0) + 1;
      }
    }

    let maxShNum = 0;
    const enrichedShareholders = allShareholders.map((sh) => {
      const obj = sh.toObject ? sh.toObject() : sh;
      const match = String(sh.shareholderId || '').match(/SH-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxShNum) maxShNum = n;
      }
      const shares = registerState.holdingsByShareholder[sh.shareholderId] || 0;
      const ownershipPercent =
        issuedTotal > 0 ? Number(((shares / issuedTotal) * 100).toFixed(2)) : 0;
      const holdingValue = Number((shares * valPerShare).toFixed(2));
      const ledgerCount = (registerState.ledgerByShareholder[sh.shareholderId] || []).length;
      const linkedMovementsCount = movementCountByShareholderId[sh.shareholderId] || 0;
      const linkedUser = userByShareholderId[sh.shareholderId] || null;

      return {
        ...obj,
        shares,
        ownershipPercent,
        holdingValue,
        ledgerCount,
        hasLinkedHistory: linkedMovementsCount > 0 || ledgerCount > 0,
        inviteToken: linkedUser ? linkedUser.inviteToken : null,
        userStatus: linkedUser ? linkedUser.status : obj.accountStatus
      };
    });
    const nextShareholderId = `SH-${String(maxShNum + 1).padStart(3, '0')}`;

    // 3. Valuations nextReference
    let maxValNum = 0;
    for (const v of allValuations) {
      const m = String(v.reference || '').match(/VAL-(\d+)/i);
      if (m && parseInt(m[1], 10) > maxValNum) maxValNum = parseInt(m[1], 10);
    }
    const nextValuationReference = `VAL-${String(maxValNum + 1).padStart(3, '0')}`;

    // 4. Approvals queue enrichment
    const approvalMovements = allMovements
      .filter((m) => ['Submitted', 'Draft', 'Scheduled', 'Returned'].includes(m.status))
      .map((m) => {
        const obj = m.toObject ? m.toObject() : m;
        const qty = Number(m.quantity) || 0;
        const fromCurr = m.fromShareholderId
          ? registerState.holdingsByShareholder[m.fromShareholderId] || 0
          : null;
        const toCurr = m.toShareholderId
          ? registerState.holdingsByShareholder[m.toShareholderId] || 0
          : null;
        const issuedCurr = registerState.issuedSharesTotal;

        const fromProposed = fromCurr !== null ? fromCurr - qty : null;
        const toProposed = toCurr !== null ? toCurr + qty : null;
        let issuedProposed = issuedCurr;
        if (m.affectsIssuedTotal) {
          if (['Opening', 'Allocation'].includes(m.movementType)) issuedProposed = issuedCurr + qty;
          else if (m.movementType === 'Cancellation') issuedProposed = Math.max(0, issuedCurr - qty);
        }

        return {
          ...obj,
          liveComparison: {
            fromShareholderId: m.fromShareholderId,
            fromShareholderName: m.fromShareholderName,
            fromCurrent: fromCurr,
            fromProposed,
            toShareholderId: m.toShareholderId,
            toShareholderName: m.toShareholderName,
            toCurrent: toCurr,
            toProposed,
            issuedCurrent: issuedCurr,
            issuedProposed
          }
        };
      });

    const approvalValuations = allValuations.filter((v) =>
      ['Submitted', 'Draft', 'Scheduled', 'Returned'].includes(v.status)
    );
    const approvalPublications = allPublications.filter((p) =>
      ['Submitted', 'Draft'].includes(p.status)
    );
    const approvalShareholders = allShareholders.filter((s) =>
      ['Submitted', 'Draft'].includes(s.accountStatus)
    );

    // 5. Staff members
    const staffMembers = allUsers
      .filter((u) => ['Administrator', 'Data officer', 'Approver'].includes(u.role))
      .map((u) => ({
        _id: u._id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status,
        verificationEnabled: u.verificationEnabled !== false,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt
      }));

    return {
      overview: {
        company: settings,
        summary: {
          issuedShares: registerState.issuedSharesTotal,
          allocatedShares: registerState.allocatedSharesTotal,
          totalShareholders: allShareholders.length,
          activeShareholders,
          inactiveShareholders,
          publishedValuation: valuationState.currentPublishedValuation,
          pendingReviewsCount: pendingItems.length,
          openSupportCount
        },
        pendingItems,
        registerChecks: {
          allocatedShares: registerState.allocatedSharesTotal,
          issuedShares: registerState.issuedSharesTotal,
          difference: registerState.difference,
          hasNegativeBalances: registerState.hasNegativeBalances,
          isReconciled: registerState.isReconciled
        },
        publishedValueHistory: valuationState.publishedHistory,
        seedStatus
      },
      shareholders: {
        shareholders: enrichedShareholders,
        nextShareholderId,
        issuedSharesTotal: issuedTotal,
        currency: settings.baseCurrency || 'LKR'
      },
      movements: {
        movements: allMovements,
        holdingsByShareholder: registerState.holdingsByShareholder,
        issuedSharesTotal: registerState.issuedSharesTotal,
        allocatedSharesTotal: registerState.allocatedSharesTotal,
        isReconciled: registerState.isReconciled,
        difference: registerState.difference
      },
      valuations: {
        valuations: allValuations,
        currentPublishedValuation: valuationState.currentPublishedValuation,
        publishedHistory: valuationState.publishedHistory,
        nextReference: nextValuationReference,
        currency: valuationState.currency,
        shareClass: valuationState.shareClass
      },
      approvals: {
        company: settings,
        currentPublishedValuation: valuationState.currentPublishedValuation,
        movements: approvalMovements,
        valuations: approvalValuations,
        publications: approvalPublications,
        shareholders: approvalShareholders
      },
      publications: {
        publications: allPublications,
        activeShareholdersCount: activeShareholders,
        totalShareholdersCount: allShareholders.length
      },
      staff: {
        staffMembers,
        rolePermissions
      },
      supportRequests: {
        supportRequests: allSupportRequests
      },
      auditLogs: {
        auditLogs,
        totalCount: auditLogsTotalCount
      },
      settings: {
        settings,
        cloudflareStatus: getCloudflareStatus(),
        databaseStatus: dbState,
        seedStatus
      }
    };
    });
    res.json(payload);
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load administration workspace.');
  }
});

// Desktop Interface 08 & Mobile M05: Company Overview
router.get('/overview', authenticate, requireStaff, async (req, res) => {
  try {
    const [
      settings,
      allShareholders,
      allMovements,
      allValuations,
      allPublications,
      allSupportRequests,
      allUsers
    ] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      Shareholder.find({}).lean(),
      ShareMovement.find({}).lean(),
      ShareValuation.find({}).lean(),
      Publication.find({}).lean(),
      SupportRequest.find({}).lean(),
      User.find({}).select('_id role status isSeed').lean()
    ]);

    const [registerState, valuationState, seedStatus] = await Promise.all([
      calculateRegisterState(getTodayDateString(), { settings, allMovements, allShareholders }),
      getEffectiveValuationState(getTodayDateString(), { settings, allValuations }),
      getSeedStatus({
        settings,
        allShareholders,
        allMovements,
        allValuations,
        allPublications,
        allSupportRequests,
        allUsers
      })
    ]);

    const openSupportCount = allSupportRequests.filter((r) => r.status !== 'Resolved').length;
    const activeShareholders = allShareholders.filter((s) => s.accountStatus === 'Active').length;
    const inactiveShareholders = allShareholders.filter((s) => s.accountStatus !== 'Active').length;

    // Pending items for review queue
    const pendingItems = [];
    for (const v of allValuations.filter((x) => ['Draft', 'Submitted', 'Scheduled'].includes(x.status))) {
      pendingItems.push({
        id: v._id,
        itemType: 'valuation',
        reference: v.reference,
        label: `${v.reference} | Value ${v.currency} ${Number(v.valuePerShare).toFixed(2)}`,
        enteredBy: v.enteredByRole || v.enteredBy || 'Data officer',
        enteredByEmail: v.enteredByEmail,
        effectiveDate: v.effectiveDate,
        status: v.status,
        nextAction: v.status === 'Scheduled' ? 'Publish on effective date' : 'Review draft'
      });
    }

    for (const m of allMovements.filter((x) => ['Draft', 'Submitted', 'Scheduled'].includes(x.status))) {
      pendingItems.push({
        id: m._id,
        itemType: 'movement',
        reference: m.reference,
        label: `${m.reference} | ${m.movementType} ${Number(m.quantity).toLocaleString()} shares`,
        enteredBy: m.enteredByRole || m.enteredBy || 'Data officer',
        enteredByEmail: m.enteredByEmail,
        effectiveDate: m.effectiveDate,
        status: m.status,
        nextAction: 'Review draft'
      });
    }

    for (const sh of allShareholders.filter((x) => ['Draft', 'Submitted', 'Invited'].includes(x.accountStatus))) {
      pendingItems.push({
        id: sh._id,
        itemType: 'shareholder',
        reference: sh.shareholderId,
        label: `${sh.shareholderId} | ${sh.fullName}`,
        enteredBy: sh.enteredBy || 'Administrator',
        enteredByEmail: sh.enteredByEmail,
        effectiveDate: sh.accountStatus === 'Invited' ? 'Invitation pending' : 'Not yet active',
        status: sh.accountStatus,
        nextAction: 'Review profile'
      });
    }

    for (const pub of allPublications.filter((x) => ['Draft', 'Submitted'].includes(x.status))) {
      pendingItems.push({
        id: pub._id,
        itemType: 'publication',
        reference: pub.reference,
        label: `${pub.reference} | ${pub.title}`,
        enteredBy: pub.enteredBy || 'Data officer',
        effectiveDate: pub.periodOrDate || 'Upon approval',
        status: pub.status,
        nextAction: 'Review publication'
      });
    }

    res.json({
      company: registerState.settings,
      summary: {
        issuedShares: registerState.issuedSharesTotal,
        allocatedShares: registerState.allocatedSharesTotal,
        totalShareholders: allShareholders.length,
        activeShareholders,
        inactiveShareholders,
        publishedValuation: valuationState.currentPublishedValuation,
        pendingReviewsCount: pendingItems.length,
        openSupportCount
      },
      pendingItems,
      registerChecks: {
        allocatedShares: registerState.allocatedSharesTotal,
        issuedShares: registerState.issuedSharesTotal,
        difference: registerState.difference,
        hasNegativeBalances: registerState.hasNegativeBalances,
        isReconciled: registerState.isReconciled
      },
      publishedValueHistory: valuationState.publishedHistory,
      seedStatus
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

// Desktop Interfaces 09 & 10: Shareholders Directory & Creation/Management
router.get('/shareholders', authenticate, requireStaff, async (req, res) => {
  try {
    const { search, status } = req.query;
    const [settings, allShareholders, allMovements, allValuations, allUsers] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      Shareholder.find({}).sort({ shareholderId: 1 }).lean(),
      ShareMovement.find({}).lean(),
      ShareValuation.find({}).lean(),
      User.find({ shareholderId: { $ne: null } })
        .select('shareholderId inviteToken status isSeed')
        .lean()
    ]);

    const [registerState, valuationState] = await Promise.all([
      calculateRegisterState(getTodayDateString(), { settings, allMovements, allShareholders }),
      getEffectiveValuationState(getTodayDateString(), { settings, allValuations })
    ]);

    let shareholders = [...allShareholders];

    if (status && status !== 'All') {
      shareholders = shareholders.filter((s) => s.accountStatus === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      shareholders = shareholders.filter(
        (s) =>
          String(s.shareholderId || '').toLowerCase().includes(q) ||
          String(s.fullName || '').toLowerCase().includes(q) ||
          String(s.email || '').toLowerCase().includes(q)
      );
    }

    const issuedTotal = registerState.issuedSharesTotal || 0;
    const valPerShare = valuationState.currentPublishedValuation
      ? Number(valuationState.currentPublishedValuation.valuePerShare)
      : 0;

    const userByShareholderId = {};
    for (const u of allUsers) {
      if (u.shareholderId) userByShareholderId[u.shareholderId] = u;
    }

    const movementCountByShareholderId = {};
    for (const m of allMovements) {
      if (m.fromShareholderId) {
        movementCountByShareholderId[m.fromShareholderId] =
          (movementCountByShareholderId[m.fromShareholderId] || 0) + 1;
      }
      if (m.toShareholderId && m.toShareholderId !== m.fromShareholderId) {
        movementCountByShareholderId[m.toShareholderId] =
          (movementCountByShareholderId[m.toShareholderId] || 0) + 1;
      }
    }

    // Enrich with live ledger shares & ownership % in-memory (0 N+1 queries)
    const enriched = shareholders.map((sh) => {
      const obj = sh.toObject ? sh.toObject() : sh;
      const shares = registerState.holdingsByShareholder[sh.shareholderId] || 0;
      const ownershipPercent =
        issuedTotal > 0 ? Number(((shares / issuedTotal) * 100).toFixed(2)) : 0;
      const holdingValue = Number((shares * valPerShare).toFixed(2));
      const ledgerCount = (registerState.ledgerByShareholder[sh.shareholderId] || []).length;
      const linkedMovementsCount = movementCountByShareholderId[sh.shareholderId] || 0;
      const linkedUser = userByShareholderId[sh.shareholderId] || null;

      return {
        ...obj,
        shares,
        ownershipPercent,
        holdingValue,
        ledgerCount,
        hasLinkedHistory: linkedMovementsCount > 0 || ledgerCount > 0,
        inviteToken: linkedUser ? linkedUser.inviteToken : null,
        userStatus: linkedUser ? linkedUser.status : obj.accountStatus
      };
    });

    // Compute next suggested Shareholder ID (e.g. SH-001, SH-002...)
    let maxNum = 0;
    for (const s of allShareholders) {
      const match = String(s.shareholderId || '').match(/SH-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const nextShareholderId = `SH-${String(maxNum + 1).padStart(3, '0')}`;

    res.json({
      shareholders: enriched,
      nextShareholderId,
      issuedSharesTotal: issuedTotal,
      currency: registerState.settings.baseCurrency || 'LKR'
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

// Create Shareholder Profile (Interface 10)
router.post('/shareholders', authenticate, requireStaff, async (req, res) => {
  try {
    const canEdit = await checkRolePermission(req.user.role, 'shareholderProfiles', 'createEditDraft');
    if (!canEdit) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to create shareholder profiles.`
      });
    }

    const {
      shareholderId,
      fullName,
      email,
      phone,
      postalAddress,
      shareholderType,
      votingRights,
      kycDocumentUrl,
      kycDocumentName,
      actionType, // 'invite' | 'draft' | 'active'
      initialPassword
    } = req.body;

    if (!isPlainString(fullName, 160) || !fullName.trim() || !isPlainString(email, 254) || !email.trim()) {
      return res.status(400).json({ message: 'Full name/entity name and email address are required.' });
    }

    const safeKycUrl = sanitizeSafeUrl(kycDocumentUrl);
    if (safeKycUrl === null) {
      return res.status(400).json({ message: 'Invalid KYC document URL format.' });
    }

    if (initialPassword) {
      const pwdError = validatePasswordPolicy(initialPassword);
      if (pwdError) return res.status(400).json({ message: pwdError });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingEmail = await Shareholder.findOne({ email: cleanEmail }).select('shareholderId').lean();
    if (existingEmail) {
      return res.status(400).json({
        message: `A shareholder profile with email ${cleanEmail} already exists (${existingEmail.shareholderId}).`
      });
    }

    // Generate or validate shareholderId atomically
    let finalId = isPlainString(shareholderId, 40) ? shareholderId.trim().toUpperCase() : '';
    if (!finalId) {
      finalId = await getNextReference('shareholder_SH', 'SH', 3, Shareholder, 'shareholderId', /SH-(\d+)/i);
    } else {
      const existingId = await Shareholder.findOne({ shareholderId: finalId }).select('_id').lean();
      if (existingId) {
        return res.status(400).json({ message: `Shareholder ID ${finalId} is already in use.` });
      }
    }

    const isInvite = actionType === 'invite';
    const isActive = actionType === 'active';
    const accountStatus = isActive ? 'Active' : isInvite ? 'Invited' : 'Draft';

    const shareholder = await Shareholder.create({
      shareholderId: finalId,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: isPlainString(phone, 50) ? phone.trim() : '',
      postalAddress: isPlainString(postalAddress, 500) ? postalAddress.trim() : '',
      shareholderType: shareholderType || 'Individual',
      accountStatus,
      votingRights: isPlainString(votingRights, 160) && votingRights ? votingRights : 'Per company rules',
      kycDocumentUrl: safeKycUrl,
      kycDocumentName: isPlainString(kycDocumentName, 255) ? kycDocumentName : '',
      enteredBy: req.user.role,
      enteredByEmail: req.user.email
    });

    // Create or update corresponding User login account if Invited or Active
    let inviteToken = null;
    if (isInvite || isActive) {
      inviteToken = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const existingUser = await User.findOne({ email: cleanEmail }).select('_id').lean();
      const passwordHash = initialPassword ? await bcrypt.hash(initialPassword, BCRYPT_ROUNDS) : '';
      if (!existingUser) {
        await User.create({
          email: cleanEmail,
          fullName: fullName.trim(),
          role: 'Shareholder',
          status: initialPassword ? 'Active' : 'Invited',
          shareholderId: finalId,
          passwordHash,
          inviteToken: initialPassword ? null : inviteToken,
          inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          verificationEnabled: false
        });
        del(CACHE_KEYS.BOOTSTRAP_USER_COUNT);
      }
    }

    invalidateLedgerCaches();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: isInvite ? 'Created shareholder profile and sent invitation' : 'Saved shareholder profile draft',
      reference: finalId,
      entityType: 'Shareholder',
      newValue: `${finalId} (${fullName.trim()}) - Status: ${accountStatus}`
    });

    res.status(201).json({
      message: isInvite
        ? `Shareholder ${finalId} created and invitation issued.`
        : `Shareholder ${finalId} saved as ${accountStatus}.`,
      shareholder,
      inviteToken
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to create shareholder profile.');
  }
});

// Update Shareholder Profile or Account Status (Interface 09 & 10)
router.put('/shareholders/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const canEdit = await checkRolePermission(req.user.role, 'shareholderProfiles', 'createEditDraft');
    if (!canEdit) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to update shareholder profiles.`
      });
    }

    const shareholder = await Shareholder.findById(req.params.id);
    if (!shareholder) {
      return res.status(404).json({ message: 'Shareholder not found.' });
    }

    // Optimistic concurrency check (Page 32: Each save checks the record version)
    if (req.body.version && Number(req.body.version) !== Number(shareholder.version)) {
      return res.status(409).json({
        message: 'Stale edit detected: Another staff member has updated this shareholder record. Please reload and compare before saving.'
      });
    }

    const prevStatus = shareholder.accountStatus;
    const {
      fullName,
      email,
      phone,
      postalAddress,
      shareholderType,
      accountStatus,
      votingRights,
      kycDocumentUrl,
      kycDocumentName,
      resetInvite,
      newPassword
    } = req.body;

    if (kycDocumentUrl !== undefined) {
      const safeKycUrl = sanitizeSafeUrl(kycDocumentUrl);
      if (safeKycUrl === null) {
        return res.status(400).json({ message: 'Invalid KYC document URL format.' });
      }
      shareholder.kycDocumentUrl = safeKycUrl;
    }

    if (newPassword) {
      const pwdError = validatePasswordPolicy(newPassword);
      if (pwdError) return res.status(400).json({ message: pwdError });
    }

    if (isPlainString(fullName, 160)) shareholder.fullName = fullName.trim();
    if (isPlainString(email, 254)) shareholder.email = email.toLowerCase().trim();
    if (isPlainString(phone, 50)) shareholder.phone = phone.trim();
    if (isPlainString(postalAddress, 500)) shareholder.postalAddress = postalAddress.trim();
    if (shareholderType !== undefined) shareholder.shareholderType = shareholderType;
    if (accountStatus !== undefined) shareholder.accountStatus = accountStatus;
    if (votingRights !== undefined) shareholder.votingRights = votingRights;
    if (isPlainString(kycDocumentName, 255)) shareholder.kycDocumentName = kycDocumentName;

    await shareholder.save();

    // Sync linked User login record
    let linkedUser = await User.findOne({ shareholderId: shareholder.shareholderId });
    if (!linkedUser && ['Active', 'Invited'].includes(shareholder.accountStatus)) {
      const inviteToken = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      linkedUser = await User.create({
        email: shareholder.email,
        fullName: shareholder.fullName,
        role: 'Shareholder',
        status: newPassword ? 'Active' : 'Invited',
        shareholderId: shareholder.shareholderId,
        passwordHash: newPassword ? await bcrypt.hash(newPassword, BCRYPT_ROUNDS) : '',
        inviteToken: newPassword ? null : inviteToken,
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        verificationEnabled: false
      });
      del(CACHE_KEYS.BOOTSTRAP_USER_COUNT);
    } else if (linkedUser) {
      linkedUser.fullName = shareholder.fullName;
      linkedUser.email = shareholder.email;
      if (accountStatus === 'Suspended' || accountStatus === 'Inactive') {
        linkedUser.status = accountStatus;
        // Page 12 & 31: Suspended users lose active sessions
        linkedUser.sessionVersion = (linkedUser.sessionVersion || 1) + 1;
      } else if (accountStatus === 'Active') {
        linkedUser.status = 'Active';
      }
      if (resetInvite) {
        linkedUser.inviteToken = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        linkedUser.inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        linkedUser.status = 'Invited';
      }
      if (newPassword) {
        linkedUser.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        linkedUser.status = 'Active';
        linkedUser.sessionVersion = (linkedUser.sessionVersion || 1) + 1;
      }
      await linkedUser.save();
      invalidateAuthUserCache(linkedUser._id);
    }

    invalidateLedgerCaches();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: resetInvite ? 'Reset shareholder invitation' : 'Updated shareholder profile',
      reference: shareholder.shareholderId,
      entityType: 'Shareholder',
      previousValue: `${prevStatus}`,
      newValue: `${shareholder.accountStatus} (${shareholder.fullName})`
    });

    res.json({
      message: `Shareholder ${shareholder.shareholderId} updated.`,
      shareholder,
      inviteToken: linkedUser ? linkedUser.inviteToken : null
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to update shareholder profile.');
  }
});

// Delete Unused Shareholder Profile (Page 14 & 31: Delete is available only for eligible records without linked financial history)
router.delete('/shareholders/:id', authenticate, requireRoles('Administrator'), async (req, res) => {
  try {
    const shareholder = await Shareholder.findById(req.params.id);
    if (!shareholder) {
      return res.status(404).json({ message: 'Shareholder not found.' });
    }

    const linkedMovements = await ShareMovement.countDocuments({
      $or: [
        { fromShareholderId: shareholder.shareholderId },
        { toShareholderId: shareholder.shareholderId }
      ]
    });

    if (linkedMovements > 0) {
      return res.status(400).json({
        message: `Cannot delete ${shareholder.shareholderId}: This shareholder has ${linkedMovements} linked share register record(s). Per governance rules, profiles with linked financial history must be deactivated or suspended rather than deleted.`
      });
    }

    const linkedUsers = await User.find({ shareholderId: shareholder.shareholderId }).select('_id').lean();
    await User.deleteMany({ shareholderId: shareholder.shareholderId });
    for (const u of linkedUsers) invalidateAuthUserCache(u._id);
    await Shareholder.findByIdAndDelete(shareholder._id);
    invalidateLedgerCaches();
    del(CACHE_KEYS.BOOTSTRAP_USER_COUNT);

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'Deleted unused shareholder profile without linked history',
      reference: shareholder.shareholderId,
      entityType: 'Shareholder',
      previousValue: `${shareholder.shareholderId} (${shareholder.fullName})`,
      newValue: 'Deleted'
    });

    res.json({ message: `Unused profile ${shareholder.shareholderId} deleted.` });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to delete shareholder profile.');
  }
});

// Desktop Interfaces 11 & 12 & Mobile M06: Share Register Ledger & Movement Entry
router.get('/movements', authenticate, requireStaff, async (req, res) => {
  try {
    const { status, movementType } = req.query;
    const registerState = await calculateRegisterState();
    let movements = [...(registerState.allMovements || [])].sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );

    if (status && status !== 'All') {
      movements = movements.filter((m) => m.status === status);
    }
    if (movementType && movementType !== 'All') {
      movements = movements.filter((m) => m.movementType === movementType);
    }

    res.json({
      movements,
      holdingsByShareholder: registerState.holdingsByShareholder,
      issuedSharesTotal: registerState.issuedSharesTotal,
      allocatedSharesTotal: registerState.allocatedSharesTotal,
      isReconciled: registerState.isReconciled,
      difference: registerState.difference
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

router.post('/movements', authenticate, requireStaff, async (req, res) => {
  try {
    const canEdit = await checkRolePermission(req.user.role, 'shareMovements', 'createEditDraft');
    if (!canEdit) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to create share movements.`
      });
    }

    const {
      reference,
      movementType, // 'Opening' | 'Allocation' | 'Transfer' | 'Correction' | 'Cancellation'
      shareClass,
      fromShareholderId,
      toShareholderId,
      quantity,
      effectiveDate,
      reason,
      linkedReference,
      supportingDocumentUrl,
      supportingDocumentName,
      affectsIssuedTotal,
      submitForApproval // boolean: true -> 'Submitted', false -> 'Draft'
    } = req.body;

    const safeDocUrl = sanitizeSafeUrl(supportingDocumentUrl);
    if (safeDocUrl === null) {
      return res.status(400).json({ message: 'Invalid supporting document URL format.' });
    }

    const numQty = Number(quantity);
    if (!movementType || !effectiveDate || !numQty || numQty <= 0 || !Number.isInteger(numQty)) {
      return res.status(400).json({
        message: 'Movement type, effective date, and a positive whole share quantity are required.'
      });
    }

    const registerState = await calculateRegisterState();
    const holdings = registerState.holdingsByShareholder;

    // Validate movement-specific rules (Page 16, 17, 32, 33, 35)
    if (movementType === 'Transfer') {
      if (!fromShareholderId || !toShareholderId) {
        return res.status(400).json({ message: 'Both source (From) and recipient (To) shareholders are required for a transfer.' });
      }
      if (fromShareholderId === toShareholderId) {
        return res.status(400).json({ message: 'Source and recipient shareholders must be distinct.' });
      }
      const sourceBalance = holdings[fromShareholderId] || 0;
      if (numQty > sourceBalance) {
        return res.status(400).json({
          message: `Insufficient balance: ${fromShareholderId} holds ${sourceBalance.toLocaleString()} shares, so a transfer of ${numQty.toLocaleString()} shares cannot be submitted.`
        });
      }
    } else if (movementType === 'Opening' || movementType === 'Allocation') {
      if (!toShareholderId) {
        return res.status(400).json({ message: 'Recipient shareholder is required for an Opening or Allocation entry.' });
      }
    } else if (movementType === 'Cancellation') {
      if (!fromShareholderId) {
        return res.status(400).json({ message: 'Source shareholder is required for a Share Cancellation entry.' });
      }
      const sourceBalance = holdings[fromShareholderId] || 0;
      if (numQty > sourceBalance) {
        return res.status(400).json({
          message: `Insufficient balance: ${fromShareholderId} holds ${sourceBalance.toLocaleString()} shares.`
        });
      }
    } else if (movementType === 'Correction') {
      if (!fromShareholderId && !toShareholderId) {
        return res.status(400).json({ message: 'At least one affected shareholder is required for a Correction entry.' });
      }
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'A mandatory reason and linked reference are required for corrections.' });
      }
      if (fromShareholderId) {
        const sourceBalance = holdings[fromShareholderId] || 0;
        if (numQty > sourceBalance) {
          return res.status(400).json({
            message: `Insufficient balance for correction deduction: ${fromShareholderId} holds ${sourceBalance.toLocaleString()} shares.`
          });
        }
      }
    }

    // Generate atomic reference if not supplied
    const prefixMap = {
      Opening: 'OPEN',
      Allocation: 'AL',
      Transfer: 'TR',
      Correction: 'COR',
      Cancellation: 'CAN'
    };
    const prefix = prefixMap[movementType] || 'MOV';
    let finalRef = isPlainString(reference, 40) ? reference.trim().toUpperCase() : '';
    if (!finalRef) {
      finalRef = await getNextReference(
        `mov_${prefix}`,
        prefix,
        3,
        ShareMovement,
        'reference',
        new RegExp(`${prefix}-(\\d+)`, 'i')
      );
    } else {
      const dup = await ShareMovement.findOne({ reference: finalRef }).select('_id').lean();
      if (dup) {
        return res.status(400).json({ message: `Movement reference ${finalRef} already exists.` });
      }
    }

    const [fromSh, toSh] = await Promise.all([
      fromShareholderId ? Shareholder.findOne({ shareholderId: fromShareholderId }).select('fullName').lean() : Promise.resolve(null),
      toShareholderId ? Shareholder.findOne({ shareholderId: toShareholderId }).select('fullName').lean() : Promise.resolve(null)
    ]);

    const fromBefore = fromShareholderId ? holdings[fromShareholderId] || 0 : null;
    const toBefore = toShareholderId ? holdings[toShareholderId] || 0 : null;
    const issuedBefore = registerState.issuedSharesTotal;

    const willAffectIssued =
      movementType === 'Transfer'
        ? false
        : affectsIssuedTotal !== undefined
        ? Boolean(affectsIssuedTotal)
        : ['Opening', 'Allocation', 'Cancellation'].includes(movementType);

    const fromAfter = fromBefore !== null ? fromBefore - numQty : null;
    const toAfter = toBefore !== null ? toBefore + numQty : null;
    let issuedAfter = issuedBefore;
    if (willAffectIssued) {
      if (movementType === 'Opening' || movementType === 'Allocation' || (movementType === 'Correction' && toShareholderId && !fromShareholderId)) {
        issuedAfter = issuedBefore + numQty;
      } else if (movementType === 'Cancellation' || (movementType === 'Correction' && fromShareholderId && !toShareholderId)) {
        issuedAfter = Math.max(0, issuedBefore - numQty);
      }
    }

    const status = submitForApproval ? 'Submitted' : 'Draft';

    const movement = await ShareMovement.create({
      reference: finalRef,
      movementType,
      shareClass: shareClass || registerState.settings.shareClass || 'Ordinary',
      fromShareholderId: fromShareholderId || null,
      fromShareholderName: fromSh ? fromSh.fullName : '',
      toShareholderId: toShareholderId || null,
      toShareholderName: toSh ? toSh.fullName : '',
      quantity: numQty,
      effectiveDate,
      reason: isPlainString(reason, 1000) ? reason.trim() : '',
      linkedReference: isPlainString(linkedReference, 80) ? linkedReference.trim() : '',
      supportingDocumentUrl: safeDocUrl,
      supportingDocumentName: isPlainString(supportingDocumentName, 255) ? supportingDocumentName : '',
      status,
      affectsIssuedTotal: willAffectIssued,
      snapshotBefore: {
        fromBalance: fromBefore,
        toBalance: toBefore,
        issuedShares: issuedBefore
      },
      snapshotAfter: {
        fromBalance: fromAfter,
        toBalance: toAfter,
        issuedShares: issuedAfter
      },
      enteredBy: req.user.fullName,
      enteredByEmail: req.user.email,
      enteredByRole: req.user.role,
      submittedAt: submitForApproval ? new Date().toISOString() : null
    });

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: submitForApproval ? `Submitted ${movementType.toLowerCase()} for approval` : `Created ${movementType.toLowerCase()} draft`,
      reference: finalRef,
      entityType: 'ShareMovement',
      previousValue: fromShareholderId ? `${fromShareholderId}: ${fromBefore}` : `Issued: ${issuedBefore}`,
      newValue: `${movementType} ${numQty.toLocaleString()} shares (${status})`,
      reason: reason || ''
    });

    res.status(201).json({
      message: submitForApproval
        ? `Movement ${finalRef} submitted for independent approval.`
        : `Movement ${finalRef} saved as draft.`,
      movement
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to create share movement.');
  }
});

// Update Draft/Returned Movement
router.put('/movements/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const canEdit = await checkRolePermission(req.user.role, 'shareMovements', 'createEditDraft');
    if (!canEdit) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to modify share movements.`
      });
    }

    const mov = await ShareMovement.findById(req.params.id);
    if (!mov) return res.status(404).json({ message: 'Movement record not found.' });

    if (mov.status === 'Published') {
      return res.status(400).json({
        message: 'Published share register records are immutable. Use a linked Correction/Reversal entry instead.'
      });
    }

    if (req.body.version && Number(req.body.version) !== Number(mov.version)) {
      return res.status(409).json({
        message: 'Stale edit detected: This movement was modified by another user. Please reload first.'
      });
    }

    const {
      movementType,
      fromShareholderId,
      toShareholderId,
      quantity,
      effectiveDate,
      reason,
      linkedReference,
      supportingDocumentUrl,
      supportingDocumentName,
      affectsIssuedTotal,
      submitForApproval
    } = req.body;

    if (movementType && ['Opening', 'Allocation', 'Transfer', 'Correction', 'Cancellation'].includes(movementType)) {
      mov.movementType = movementType;
    }
    if (fromShareholderId !== undefined) mov.fromShareholderId = fromShareholderId || null;
    if (toShareholderId !== undefined) mov.toShareholderId = toShareholderId || null;
    if (linkedReference !== undefined && isPlainString(linkedReference, 80)) {
      mov.linkedReference = linkedReference.trim();
    }
    if (affectsIssuedTotal !== undefined) {
      mov.affectsIssuedTotal = mov.movementType === 'Transfer' ? false : Boolean(affectsIssuedTotal);
    }
    if (quantity !== undefined) {
      const numQty = Number(quantity);
      if (!numQty || numQty <= 0 || !Number.isInteger(numQty)) {
        return res.status(400).json({ message: 'Quantity must be a positive whole integer.' });
      }
      mov.quantity = numQty;
    }
    if (effectiveDate !== undefined) mov.effectiveDate = effectiveDate;
    if (reason !== undefined && isPlainString(reason, 1000)) mov.reason = reason.trim();
    if (supportingDocumentUrl !== undefined) {
      const safeDocUrl = sanitizeSafeUrl(supportingDocumentUrl);
      if (safeDocUrl === null) {
        return res.status(400).json({ message: 'Invalid supporting document URL format.' });
      }
      mov.supportingDocumentUrl = safeDocUrl;
    }
    if (supportingDocumentName !== undefined && isPlainString(supportingDocumentName, 255)) {
      mov.supportingDocumentName = supportingDocumentName;
    }

    const [fromSh, toSh] = await Promise.all([
      mov.fromShareholderId ? Shareholder.findOne({ shareholderId: mov.fromShareholderId }).select('fullName').lean() : Promise.resolve(null),
      mov.toShareholderId ? Shareholder.findOne({ shareholderId: mov.toShareholderId }).select('fullName').lean() : Promise.resolve(null)
    ]);
    mov.fromShareholderName = fromSh ? fromSh.fullName : '';
    mov.toShareholderName = toSh ? toSh.fullName : '';

    if (submitForApproval !== undefined) {
      if (submitForApproval && ['Transfer', 'Cancellation', 'Correction'].includes(mov.movementType) && mov.fromShareholderId) {
        const registerState = await calculateRegisterState();
        const currentBal = registerState.holdingsByShareholder[mov.fromShareholderId] || 0;
        if (Number(mov.quantity) > currentBal) {
          return res.status(400).json({
            message: `Insufficient balance: ${mov.fromShareholderId} currently holds ${currentBal.toLocaleString()} shares.`
          });
        }
      }
      mov.status = submitForApproval ? 'Submitted' : 'Draft';
      if (submitForApproval) mov.submittedAt = new Date().toISOString();
    }

    await mov.save();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Updated share movement (${mov.status})`,
      reference: mov.reference,
      entityType: 'ShareMovement',
      newValue: `${mov.quantity} shares effective ${mov.effectiveDate}`
    });

    res.json({ message: `Movement ${mov.reference} updated (${mov.status}).`, movement: mov });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to update share movement.');
  }
});

// Delete Draft / Returned / Rejected Share Movement (Published records remain strictly immutable)
router.delete('/movements/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const canEdit = await checkRolePermission(req.user.role, 'shareMovements', 'createEditDraft');
    if (!canEdit) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to delete share movement drafts.`
      });
    }
    const mov = await ShareMovement.findById(req.params.id);
    if (!mov) return res.status(404).json({ message: 'Movement record not found.' });
    if (mov.status === 'Published' || mov.status === 'Scheduled') {
      return res.status(400).json({
        message: 'Published or scheduled share movements cannot be deleted. Use a linked Correction entry instead.'
      });
    }
    await ShareMovement.findByIdAndDelete(mov._id);
    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Deleted ${mov.status.toLowerCase()} share movement`,
      reference: mov.reference,
      entityType: 'ShareMovement',
      previousValue: `${mov.movementType} ${mov.quantity} shares (${mov.status})`,
      newValue: 'Deleted'
    });
    res.json({ message: `Draft movement ${mov.reference} deleted.` });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to delete share movement.');
  }
});

// Desktop Interface 13: Share Values Management
router.get('/valuations', authenticate, requireStaff, async (req, res) => {
  try {
    const valuationState = await getEffectiveValuationState();
    const allValuations = [...(valuationState.allValuations || [])].sort((a, b) => {
      if (a.effectiveDate !== b.effectiveDate) {
        return a.effectiveDate < b.effectiveDate ? 1 : -1;
      }
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    // Suggest next valuation reference (VAL-001, VAL-002...)
    let maxNum = 0;
    for (const v of allValuations) {
      const m = String(v.reference || '').match(/VAL-(\d+)/i);
      if (m && parseInt(m[1], 10) > maxNum) maxNum = parseInt(m[1], 10);
    }
    const nextReference = `VAL-${String(maxNum + 1).padStart(3, '0')}`;

    res.json({
      valuations: allValuations,
      currentPublishedValuation: valuationState.currentPublishedValuation,
      publishedHistory: valuationState.publishedHistory,
      nextReference,
      currency: valuationState.currency,
      shareClass: valuationState.shareClass
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

router.post('/valuations', authenticate, requireStaff, async (req, res) => {
  try {
    const canEdit = await checkRolePermission(req.user.role, 'shareValues', 'createEditDraft');
    if (!canEdit) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to create share valuations.`
      });
    }

    const {
      reference,
      shareClass,
      valuePerShare,
      effectiveDate,
      basis,
      supportingDocumentUrl,
      supportingDocumentName,
      submitForApproval
    } = req.body;

    const safeDocUrl = sanitizeSafeUrl(supportingDocumentUrl);
    if (safeDocUrl === null) {
      return res.status(400).json({ message: 'Invalid supporting document URL format.' });
    }

    const numVal = Number(valuePerShare);
    if (!effectiveDate || !isPlainString(basis, 2000) || !basis.trim() || isNaN(numVal) || numVal <= 0) {
      return res.status(400).json({
        message: 'A positive value per share, effective date, and valuation basis/rationale are required.'
      });
    }

    const [valuationState, settings] = await Promise.all([
      getEffectiveValuationState(),
      ensureCoreSystemConfig(null, { lean: true })
    ]);

    // Check duplicate effectiveDate for published/active valuation (Page 32: duplicate dates are rejected)
    const existingSameDate = await ShareValuation.findOne({
      effectiveDate,
      status: { $in: ['Submitted', 'Approved', 'Scheduled', 'Published'] }
    }).select('reference').lean();
    if (existingSameDate) {
      return res.status(400).json({
        message: `A valuation (${existingSameDate.reference}) already exists for effective date ${effectiveDate}.`
      });
    }

    let finalRef = isPlainString(reference, 40) ? reference.trim().toUpperCase() : '';
    if (!finalRef) {
      finalRef = await getNextReference('val_VAL', 'VAL', 3, ShareValuation, 'reference', /VAL-(\d+)/i);
    } else {
      const dup = await ShareValuation.findOne({ reference: finalRef }).select('_id').lean();
      if (dup) {
        return res.status(400).json({ message: `Valuation reference ${finalRef} already exists.` });
      }
    }

    const prevPublished = valuationState.currentPublishedValuation;
    const prevValue = prevPublished ? Number(prevPublished.valuePerShare) : null;
    const changePercent =
      prevValue !== null && prevValue > 0
        ? Number((((numVal - prevValue) / prevValue) * 100).toFixed(2))
        : null;

    const status = submitForApproval ? 'Submitted' : 'Draft';

    const valuation = await ShareValuation.create({
      reference: finalRef,
      shareClass: shareClass || settings.shareClass || 'Ordinary',
      currency: settings.baseCurrency || 'LKR',
      valuePerShare: numVal,
      previousValuePerShare: prevValue,
      changePercent,
      effectiveDate,
      basis: basis.trim(),
      supportingDocumentUrl: safeDocUrl,
      supportingDocumentName: isPlainString(supportingDocumentName, 255) ? supportingDocumentName : '',
      status,
      enteredBy: req.user.fullName,
      enteredByEmail: req.user.email,
      enteredByRole: req.user.role,
      submittedAt: submitForApproval ? new Date().toISOString() : null
    });

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: submitForApproval ? 'Submitted share valuation for approval' : 'Prepared share valuation draft',
      reference: finalRef,
      entityType: 'ShareValuation',
      previousValue: prevValue !== null ? `${settings.baseCurrency} ${prevValue.toFixed(2)}` : 'None',
      newValue: `${settings.baseCurrency} ${numVal.toFixed(2)} (Effective: ${effectiveDate})`,
      reason: basis.trim()
    });

    res.status(201).json({
      message: submitForApproval
        ? `Valuation ${finalRef} submitted for approval.`
        : `Valuation ${finalRef} saved as draft.`,
      valuation
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to create share valuation.');
  }
});

// Update Draft / Returned Share Valuation
router.put('/valuations/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const canEdit = await checkRolePermission(req.user.role, 'shareValues', 'createEditDraft');
    if (!canEdit) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to modify share valuations.`
      });
    }

    const val = await ShareValuation.findById(req.params.id);
    if (!val) return res.status(404).json({ message: 'Valuation record not found.' });
    if (val.status === 'Published') {
      return res.status(400).json({ message: 'Published share valuations are immutable.' });
    }

    if (req.body.version && Number(req.body.version) !== Number(val.version)) {
      return res.status(409).json({
        message: 'Stale edit detected: This valuation was modified by another user. Please reload first.'
      });
    }

    const { valuePerShare, effectiveDate, basis, supportingDocumentUrl, supportingDocumentName, submitForApproval } = req.body;
    if (valuePerShare !== undefined) {
      const numVal = Number(valuePerShare);
      if (isNaN(numVal) || numVal <= 0) {
        return res.status(400).json({ message: 'Value per share must be a positive number.' });
      }
      val.valuePerShare = numVal;
      if (val.previousValuePerShare !== null && val.previousValuePerShare > 0) {
        val.changePercent = Number((((numVal - val.previousValuePerShare) / val.previousValuePerShare) * 100).toFixed(2));
      }
    }
    if (effectiveDate !== undefined) val.effectiveDate = effectiveDate;
    if (basis !== undefined && isPlainString(basis, 2000) && basis.trim()) val.basis = basis.trim();
    if (supportingDocumentUrl !== undefined) {
      const safeDocUrl = sanitizeSafeUrl(supportingDocumentUrl);
      if (safeDocUrl === null) {
        return res.status(400).json({ message: 'Invalid supporting document URL format.' });
      }
      val.supportingDocumentUrl = safeDocUrl;
    }
    if (supportingDocumentName !== undefined && isPlainString(supportingDocumentName, 255)) {
      val.supportingDocumentName = supportingDocumentName;
    }
    if (submitForApproval !== undefined) {
      val.status = submitForApproval ? 'Submitted' : 'Draft';
      if (submitForApproval) val.submittedAt = new Date().toISOString();
    }

    await val.save();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Updated share valuation (${val.status})`,
      reference: val.reference,
      entityType: 'ShareValuation',
      newValue: `${val.currency} ${Number(val.valuePerShare).toFixed(2)} (Effective: ${val.effectiveDate})`
    });

    res.json({ message: `Valuation ${val.reference} updated (${val.status}).`, valuation: val });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to update share valuation.');
  }
});

// Delete Draft / Returned / Rejected Share Valuation
router.delete('/valuations/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const canEdit = await checkRolePermission(req.user.role, 'shareValues', 'createEditDraft');
    if (!canEdit) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to delete valuation drafts.`
      });
    }
    const val = await ShareValuation.findById(req.params.id);
    if (!val) return res.status(404).json({ message: 'Valuation record not found.' });
    if (val.status === 'Published' || val.status === 'Scheduled') {
      return res.status(400).json({ message: 'Published or scheduled valuations cannot be deleted.' });
    }
    await ShareValuation.findByIdAndDelete(val._id);
    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Deleted ${val.status.toLowerCase()} share valuation`,
      reference: val.reference,
      entityType: 'ShareValuation',
      previousValue: `${val.currency} ${Number(val.valuePerShare).toFixed(2)} (${val.status})`,
      newValue: 'Deleted'
    });
    res.json({ message: `Draft valuation ${val.reference} deleted.` });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to delete share valuation.');
  }
});

// Desktop Interface 14 & Mobile M07: Approvals Center
router.get('/approvals', authenticate, requireStaff, async (req, res) => {
  try {
    const [settings, allShareholders, allMovements, allValuations, allPublications] =
      await Promise.all([
        ensureCoreSystemConfig(null, { lean: true }),
        Shareholder.find({}).sort({ createdAt: -1 }).lean(),
        ShareMovement.find({}).sort({ createdAt: -1 }).lean(),
        ShareValuation.find({}).sort({ createdAt: -1 }).lean(),
        Publication.find({}).sort({ createdAt: -1 }).lean()
      ]);

    const [registerState, valuationState] = await Promise.all([
      calculateRegisterState(getTodayDateString(), { settings, allMovements, allShareholders }),
      getEffectiveValuationState(getTodayDateString(), { settings, allValuations })
    ]);

    const movements = allMovements.filter((m) =>
      ['Submitted', 'Draft', 'Scheduled', 'Returned'].includes(m.status)
    );
    const valuations = allValuations.filter((v) =>
      ['Submitted', 'Draft', 'Scheduled', 'Returned'].includes(v.status)
    );
    const publications = allPublications.filter((p) =>
      ['Submitted', 'Draft'].includes(p.status)
    );
    const shareholders = allShareholders.filter((s) =>
      ['Submitted', 'Draft'].includes(s.accountStatus)
    );

    // Enrich movements with live before/after balances for the Reviewer comparison table (Interface 14 & M07)
    const enrichedMovements = movements.map((m) => {
      const obj = m.toObject ? m.toObject() : m;
      const qty = Number(m.quantity) || 0;
      const fromCurr = m.fromShareholderId ? registerState.holdingsByShareholder[m.fromShareholderId] || 0 : null;
      const toCurr = m.toShareholderId ? registerState.holdingsByShareholder[m.toShareholderId] || 0 : null;
      const issuedCurr = registerState.issuedSharesTotal;

      const fromProposed = fromCurr !== null ? fromCurr - qty : null;
      const toProposed = toCurr !== null ? toCurr + qty : null;
      let issuedProposed = issuedCurr;
      if (m.affectsIssuedTotal) {
        if (['Opening', 'Allocation'].includes(m.movementType)) issuedProposed = issuedCurr + qty;
        else if (m.movementType === 'Cancellation') issuedProposed = Math.max(0, issuedCurr - qty);
      }

      return {
        ...obj,
        liveComparison: {
          fromShareholderId: m.fromShareholderId,
          fromShareholderName: m.fromShareholderName,
          fromCurrent: fromCurr,
          fromProposed,
          toShareholderId: m.toShareholderId,
          toShareholderName: m.toShareholderName,
          toCurrent: toCurr,
          toProposed,
          issuedCurrent: issuedCurr,
          issuedProposed
        }
      };
    });

    res.json({
      company: registerState.settings,
      currentPublishedValuation: valuationState.currentPublishedValuation,
      movements: enrichedMovements,
      valuations,
      publications,
      shareholders
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

// Process Approval Action: Approve & Publish / Schedule, Return for Correction, or Reject
router.post('/approvals/action', authenticate, requireStaff, async (req, res) => {
  try {
    const { itemType, itemId, decision, reviewerComment, forcePublishScheduled } = req.body;
    // decision: 'approve' | 'return' | 'reject'
    if (!itemType || !itemId || !decision) {
      return res.status(400).json({ message: 'itemType, itemId, and decision are required.' });
    }

    if ((decision === 'return' || decision === 'reject') && (!reviewerComment || !reviewerComment.trim())) {
      return res.status(400).json({
        message: 'A reviewer comment/reason is mandatory when returning for correction or rejecting a submission.'
      });
    }

    const settings = await ensureCoreSystemConfig();
    const today = getTodayDateString();

    // Enforce server-side RolePermission matrix for approval/publication (Page 20 & 31)
    const resourceMap = {
      movement: 'shareMovements',
      valuation: 'shareValues',
      shareholder: 'shareholderProfiles',
      publication: 'shareValues'
    };
    const resourceKey = resourceMap[itemType] || 'shareMovements';
    const canApprove = await checkRolePermission(req.user.role, resourceKey, 'approvePublish');
    if (!canApprove) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" is not permitted to approve, publish, or reject ${itemType} records.`
      });
    }

    if (itemType === 'movement') {
      const mov = await ShareMovement.findById(itemId);
      if (!mov) return res.status(404).json({ message: 'Share movement not found.' });

      // Separation of duties check (Page 19, 31, 35: Submitter cannot approve their own financial update)
      const isSelfApproval =
        mov.enteredByEmail &&
        mov.enteredByEmail.toLowerCase() === req.user.email.toLowerCase();

      if (decision === 'approve' && isSelfApproval) {
        if (settings.financialApprovalPolicy !== 'Single-operator exception logged') {
          return res.status(403).json({
            message:
              'Separation of duties policy: Submitter cannot approve their own financial submission. An independent Approver must review this entry (or enable Single-Operator Exception in Settings if authorised).'
          });
        } else {
          await logAuditEvent({
            actor: req.user.fullName,
            actorEmail: req.user.email,
            actorRole: req.user.role,
            action: 'Single-operator exception invoked for movement approval',
            reference: mov.reference,
            entityType: 'PolicyException',
            reason: reviewerComment || 'Single-operator policy exception'
          });
        }
      }

      if (decision === 'return') {
        mov.status = 'Returned';
        mov.reviewedBy = req.user.fullName;
        mov.reviewedByEmail = req.user.email;
        mov.reviewerComment = reviewerComment.trim();
        await mov.save();

        await logAuditEvent({
          actor: req.user.fullName,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: 'Returned share movement for correction',
          reference: mov.reference,
          entityType: 'ShareMovement',
          previousValue: 'Submitted',
          newValue: 'Returned',
          reason: reviewerComment.trim()
        });

        return res.json({ message: `Movement ${mov.reference} returned for correction.`, movement: mov });
      }

      if (decision === 'reject') {
        mov.status = 'Rejected';
        mov.reviewedBy = req.user.fullName;
        mov.reviewedByEmail = req.user.email;
        mov.reviewerComment = reviewerComment.trim();
        await mov.save();

        await logAuditEvent({
          actor: req.user.fullName,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: 'Rejected share movement',
          reference: mov.reference,
          entityType: 'ShareMovement',
          previousValue: 'Submitted',
          newValue: 'Rejected',
          reason: reviewerComment.trim()
        });

        return res.json({ message: `Movement ${mov.reference} rejected.`, movement: mov });
      }

      // Approve: Repeat balance check at posting time (Page 19 & 32)
      const registerState = await calculateRegisterState();
      if (['Transfer', 'Cancellation', 'Correction'].includes(mov.movementType) && mov.fromShareholderId) {
        const currentBal = registerState.holdingsByShareholder[mov.fromShareholderId] || 0;
        if (Number(mov.quantity) > currentBal) {
          return res.status(400).json({
            message: `Revalidation exception: ${mov.fromShareholderId} currently holds ${currentBal.toLocaleString()} shares, which is insufficient for ${mov.reference} (${Number(mov.quantity).toLocaleString()} shares). Posting blocked to prevent a negative holding.`
          });
        }
      }

      const isFuture = mov.effectiveDate > today && !forcePublishScheduled;
      mov.status = isFuture ? 'Scheduled' : 'Published';
      mov.reviewedBy = req.user.fullName;
      mov.reviewedByEmail = req.user.email;
      mov.reviewerComment = (reviewerComment || 'Approved and verified against supporting documentation').trim();
      mov.approvedAt = new Date().toISOString();
      if (!isFuture) {
        mov.publishedAt = new Date().toISOString();
        // If explicit CompanySettings.issuedSharesTotal was set and movement affects issued total, sync it
        if (mov.affectsIssuedTotal && Number(settings.issuedSharesTotal) > 0) {
          if (['Opening', 'Allocation'].includes(mov.movementType)) {
            settings.issuedSharesTotal = Number(settings.issuedSharesTotal) + Number(mov.quantity);
            await settings.save();
            invalidateCompanyCaches();
          } else if (mov.movementType === 'Cancellation') {
            settings.issuedSharesTotal = Math.max(0, Number(settings.issuedSharesTotal) - Number(mov.quantity));
            await settings.save();
            invalidateCompanyCaches();
          }
        }
      }
      await mov.save();
      invalidateLedgerCaches();

      await logAuditEvent({
        actor: req.user.fullName,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: isFuture ? 'Approved and scheduled share movement' : 'Approved and published share movement',
        reference: mov.reference,
        entityType: 'ShareMovement',
        previousValue: 'Submitted',
        newValue: `${mov.status} (${mov.movementType} ${Number(mov.quantity).toLocaleString()} shares, Effective: ${mov.effectiveDate})`,
        reason: mov.reviewerComment
      });

      return res.json({
        message: isFuture
          ? `Movement ${mov.reference} approved and scheduled for ${mov.effectiveDate}.`
          : `Movement ${mov.reference} approved and published to the share register.`,
        movement: mov
      });
    }

    if (itemType === 'valuation') {
      const val = await ShareValuation.findById(itemId);
      if (!val) return res.status(404).json({ message: 'Valuation record not found.' });

      const isSelfApproval =
        val.enteredByEmail &&
        val.enteredByEmail.toLowerCase() === req.user.email.toLowerCase();

      if (decision === 'approve' && isSelfApproval) {
        if (settings.financialApprovalPolicy !== 'Single-operator exception logged') {
          return res.status(403).json({
            message:
              'Separation of duties policy: Submitter cannot approve their own valuation update. An independent Approver must review this entry.'
          });
        } else {
          await logAuditEvent({
            actor: req.user.fullName,
            actorEmail: req.user.email,
            actorRole: req.user.role,
            action: 'Single-operator exception invoked for valuation approval',
            reference: val.reference,
            entityType: 'PolicyException',
            reason: reviewerComment || 'Single-operator policy exception'
          });
        }
      }

      if (decision === 'return') {
        val.status = 'Returned';
        val.reviewedBy = req.user.fullName;
        val.reviewedByEmail = req.user.email;
        val.reviewerComment = reviewerComment.trim();
        await val.save();

        await logAuditEvent({
          actor: req.user.fullName,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: 'Returned share valuation for correction',
          reference: val.reference,
          entityType: 'ShareValuation',
          previousValue: 'Submitted',
          newValue: 'Returned',
          reason: reviewerComment.trim()
        });

        return res.json({ message: `Valuation ${val.reference} returned for correction.`, valuation: val });
      }

      if (decision === 'reject') {
        val.status = 'Rejected';
        val.reviewedBy = req.user.fullName;
        val.reviewedByEmail = req.user.email;
        val.reviewerComment = reviewerComment.trim();
        await val.save();

        await logAuditEvent({
          actor: req.user.fullName,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: 'Rejected share valuation',
          reference: val.reference,
          entityType: 'ShareValuation',
          previousValue: 'Submitted',
          newValue: 'Rejected',
          reason: reviewerComment.trim()
        });

        return res.json({ message: `Valuation ${val.reference} rejected.`, valuation: val });
      }

      // Future-dated valuations remain 'Scheduled' unless effectiveDate <= today or explicitly forced
      const isFuture = val.effectiveDate > today && !forcePublishScheduled;
      val.status = isFuture ? 'Scheduled' : 'Published';
      val.reviewedBy = req.user.fullName;
      val.reviewedByEmail = req.user.email;
      val.reviewerComment = (reviewerComment || 'Approved valuation basis').trim();
      val.approvedAt = new Date().toISOString();
      if (!isFuture) {
        val.publishedAt = new Date().toISOString();

        // Automatically publish an in-app Announcement for shareholders (Page 11 Example)
        const noticeRef = await getNextReference('pub_NOTICE', 'NOTICE', 3, Publication, 'reference', /NOTICE-(\d+)/i);
        await Publication.create({
          reference: noticeRef,
          contentType: 'Announcement',
          category: 'Share value update',
          title: 'Latest share value published',
          summary: `The ${val.shareClass.toLowerCase()} share value is ${val.currency} ${Number(val.valuePerShare).toFixed(2)}, effective ${val.effectiveDate}.`,
          periodOrDate: val.effectiveDate,
          audienceType: 'All shareholders',
          status: 'Published',
          enteredBy: req.user.fullName,
          reviewedBy: req.user.fullName,
          publishedDate: val.effectiveDate
        });
        invalidatePublicationCaches();
      }
      await val.save();
      invalidateValuationCaches();

      await logAuditEvent({
        actor: req.user.fullName,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: isFuture ? 'Approved and scheduled share value' : 'Approved and published share value',
        reference: val.reference,
        entityType: 'ShareValuation',
        previousValue: val.previousValuePerShare ? `${val.currency} ${Number(val.previousValuePerShare).toFixed(2)}` : 'None',
        newValue: `${val.currency} ${Number(val.valuePerShare).toFixed(2)} (Effective: ${val.effectiveDate}, Status: ${val.status})`,
        reason: val.reviewerComment
      });

      return res.json({
        message: isFuture
          ? `Valuation ${val.reference} approved and scheduled for ${val.effectiveDate} (hidden from shareholders until effective date).`
          : `Valuation ${val.reference} approved and published.`,
        valuation: val
      });
    }

    if (itemType === 'publication') {
      const pub = await Publication.findById(itemId);
      if (!pub) return res.status(404).json({ message: 'Publication not found.' });

      const isSelfApproval =
        pub.enteredByEmail &&
        pub.enteredByEmail.toLowerCase() === req.user.email.toLowerCase();

      if (decision === 'approve' && isSelfApproval) {
        if (settings.financialApprovalPolicy !== 'Single-operator exception logged') {
          return res.status(403).json({
            message:
              'Separation of duties policy: Submitter cannot approve their own publication submission. An independent Approver must review this entry.'
          });
        } else {
          await logAuditEvent({
            actor: req.user.fullName,
            actorEmail: req.user.email,
            actorRole: req.user.role,
            action: 'Single-operator exception invoked for publication approval',
            reference: pub.reference,
            entityType: 'PolicyException',
            reason: reviewerComment || 'Single-operator policy exception'
          });
        }
      }

      pub.status = decision === 'approve' ? 'Published' : decision === 'return' ? 'Returned' : 'Rejected';
      pub.reviewedBy = req.user.fullName;
      pub.reviewerComment = (reviewerComment || '').trim();
      if (decision === 'approve') pub.publishedDate = getTodayDateString();
      await pub.save();
      invalidatePublicationCaches();

      await logAuditEvent({
        actor: req.user.fullName,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: `${pub.status} publication (${pub.contentType})`,
        reference: pub.reference,
        entityType: 'Publication',
        newValue: `${pub.title} (${pub.audienceType})`
      });

      return res.json({ message: `Publication ${pub.reference} marked as ${pub.status}.`, publication: pub });
    }

    if (itemType === 'shareholder') {
      const sh = await Shareholder.findById(itemId);
      if (!sh) return res.status(404).json({ message: 'Shareholder not found.' });

      const isSelfApproval =
        sh.enteredByEmail &&
        sh.enteredByEmail.toLowerCase() === req.user.email.toLowerCase();

      if (decision === 'approve' && isSelfApproval) {
        if (settings.financialApprovalPolicy !== 'Single-operator exception logged') {
          return res.status(403).json({
            message:
              'Separation of duties policy: Submitter cannot approve their own shareholder profile submission. An independent Approver must review this entry.'
          });
        }
      }

      sh.accountStatus = decision === 'approve' ? 'Active' : decision === 'return' ? 'Returned' : 'Rejected';
      sh.reviewedBy = req.user.fullName;
      sh.reviewerComment = (reviewerComment || '').trim();
      await sh.save();

      if (decision === 'approve') {
        const existingUser = await User.findOne({
          $or: [{ shareholderId: sh.shareholderId }, { email: sh.email.toLowerCase() }]
        });
        if (!existingUser) {
          const inviteToken = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          await User.create({
            email: sh.email.toLowerCase(),
            fullName: sh.fullName,
            role: 'Shareholder',
            status: 'Invited',
            shareholderId: sh.shareholderId,
            passwordHash: '',
            inviteToken,
            inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            verificationEnabled: false
          });
          del(CACHE_KEYS.BOOTSTRAP_USER_COUNT);
        } else if (existingUser.status === 'Suspended' || existingUser.status === 'Inactive') {
          existingUser.status = 'Active';
          await existingUser.save();
          invalidateAuthUserCache(existingUser._id);
        }
      }

      invalidateLedgerCaches();

      await logAuditEvent({
        actor: req.user.fullName,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: `Reviewed shareholder profile (${sh.accountStatus})`,
        reference: sh.shareholderId,
        entityType: 'Shareholder',
        newValue: `${sh.shareholderId} - ${sh.accountStatus}`
      });

      return res.json({ message: `Shareholder ${sh.shareholderId} is now ${sh.accountStatus}.`, shareholder: sh });
    }

    res.status(400).json({ message: 'Unsupported approval itemType.' });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to process approval decision.');
  }
});

// Desktop Interfaces 15 & 19: Staff Accounts & Role Permissions Matrix
router.get('/staff', authenticate, requireStaff, async (req, res) => {
  try {
    const [staffUsers, rolePermissions] = await Promise.all([
      User.find({ role: { $in: ['Administrator', 'Data officer', 'Approver'] } })
        .select('_id email fullName role status verificationEnabled lastLoginAt createdAt')
        .lean(),
      RolePermission.find({}).lean()
    ]);

    res.json({
      staffMembers: staffUsers,
      rolePermissions
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load staff directory.');
  }
});

router.post('/staff/invite', authenticate, requireRoles('Administrator'), async (req, res) => {
  try {
    const { fullName, email, role, initialPassword } = req.body;
    if (!isPlainString(fullName, 160) || !fullName.trim() || !isPlainString(email, 254) || !email.trim() || !['Administrator', 'Data officer', 'Approver'].includes(role)) {
      return res.status(400).json({ message: 'Full name, email, and a valid staff role are required.' });
    }

    if (initialPassword) {
      const pwdError = validatePasswordPolicy(initialPassword);
      if (pwdError) return res.status(400).json({ message: pwdError });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail }).select('_id').lean();
    if (existing) {
      return res.status(400).json({ message: `An account with email ${cleanEmail} already exists.` });
    }

    const inviteToken = `STAFF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const verificationCode = String(crypto.randomInt(100000, 999999));
    const recoveryCode = `NIA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const passwordHash = initialPassword ? await bcrypt.hash(initialPassword, BCRYPT_ROUNDS) : '';

    const staffUser = await User.create({
      email: cleanEmail,
      fullName: fullName.trim(),
      role,
      status: initialPassword ? 'Active' : 'Invited',
      passwordHash,
      inviteToken: initialPassword ? null : inviteToken,
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      verificationEnabled: true,
      verificationCode,
      recoveryCode
    });
    del(CACHE_KEYS.BOOTSTRAP_USER_COUNT);

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'Invited staff member',
      reference: staffUser.email,
      entityType: 'Staff',
      newValue: `${staffUser.fullName} (${role}) - ${staffUser.status}`
    });

    res.status(201).json({
      message: `Staff account for ${staffUser.email} (${role}) created. 2FA Code: ${verificationCode}`,
      staff: {
        _id: staffUser._id,
        fullName: staffUser.fullName,
        email: staffUser.email,
        role: staffUser.role,
        status: staffUser.status,
        verificationEnabled: staffUser.verificationEnabled
      },
      inviteToken,
      staffVerificationCode: verificationCode
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to invite staff member.');
  }
});

// Update Staff Role, Status, or Revoke Sessions (Interface 19)
router.put('/staff/:id', authenticate, requireRoles('Administrator'), async (req, res) => {
  try {
    const staffUser = await User.findById(req.params.id);
    if (!staffUser) return res.status(404).json({ message: 'Staff account not found.' });

    const { role, status, verificationEnabled, revokeSessions, newPassword } = req.body;

    if (newPassword) {
      const pwdError = validatePasswordPolicy(newPassword);
      if (pwdError) return res.status(400).json({ message: pwdError });
    }

    // Page 24 rule: "Removing the final active administrator requires a replacement first."
    if (
      staffUser.role === 'Administrator' &&
      staffUser.status === 'Active' &&
      ((role && role !== 'Administrator') || (status && status !== 'Active'))
    ) {
      const activeAdminCount = await User.countDocuments({ role: 'Administrator', status: 'Active' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          message: 'Governance control: Removing or suspending the final active Administrator requires an active replacement first.'
        });
      }
    }

    const prevSummary = `${staffUser.role} / ${staffUser.status}`;

    if (role && ['Administrator', 'Data officer', 'Approver'].includes(role)) {
      staffUser.role = role;
    }
    if (status && ['Active', 'Suspended', 'Inactive', 'Invited'].includes(status)) {
      staffUser.status = status;
      if (status === 'Suspended' || status === 'Inactive') {
        staffUser.sessionVersion = (staffUser.sessionVersion || 1) + 1;
      }
    }
    if (verificationEnabled !== undefined) {
      staffUser.verificationEnabled = Boolean(verificationEnabled);
    }
    if (revokeSessions) {
      staffUser.sessionVersion = (staffUser.sessionVersion || 1) + 1;
    }
    if (newPassword) {
      staffUser.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      staffUser.status = 'Active';
      staffUser.failedLoginAttempts = 0;
      staffUser.failed2faAttempts = 0;
      staffUser.lockUntil = null;
      staffUser.sessionVersion = (staffUser.sessionVersion || 1) + 1;
    }

    await staffUser.save();
    invalidateAuthUserCache(staffUser._id);

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: revokeSessions ? 'Revoked active staff sessions' : 'Updated staff role / account status',
      reference: staffUser.email,
      entityType: 'Staff',
      previousValue: prevSummary,
      newValue: `${staffUser.role} / ${staffUser.status}`
    });

    res.json({
      message: `Updated staff account ${staffUser.email}.`,
      staff: {
        _id: staffUser._id,
        fullName: staffUser.fullName,
        email: staffUser.email,
        role: staffUser.role,
        status: staffUser.status,
        verificationEnabled: staffUser.verificationEnabled
      }
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to update staff account.');
  }
});

// Save Role Permissions Matrix (Interface 15)
const ALLOWED_PERMISSION_RESOURCES = new Set([
  'shareholderProfiles',
  'shareMovements',
  'shareValues',
  'staffAndRoles',
  'reportsAndExports',
  'auditHistory'
]);
const ALLOWED_PERMISSION_ACTIONS = new Set(['view', 'createEditDraft', 'approvePublish']);

router.put('/role-permissions/:role', authenticate, requireRoles('Administrator'), async (req, res) => {
  try {
    const { role } = req.params;
    if (!['Administrator', 'Data officer', 'Approver', 'Shareholder'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role name.' });
    }
    const { permissions, scope } = req.body;
    const rp = await RolePermission.findOne({ role });
    if (!rp) return res.status(404).json({ message: 'Role permission record not found.' });

    const sanitizedPermissions = { ...(rp.permissions || {}) };
    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
      for (const [resKey, actions] of Object.entries(permissions)) {
        if (!ALLOWED_PERMISSION_RESOURCES.has(resKey) || !actions || typeof actions !== 'object') continue;
        const cleanActions = { ...(sanitizedPermissions[resKey] || {}) };
        for (const [actKey, val] of Object.entries(actions)) {
          if (ALLOWED_PERMISSION_ACTIONS.has(actKey) && typeof val === 'string' && val.length <= 40) {
            cleanActions[actKey] = val;
          }
        }
        sanitizedPermissions[resKey] = cleanActions;
      }
    }

    rp.permissions = sanitizedPermissions;
    if (isPlainString(scope, 160) && scope.trim()) rp.scope = scope.trim();
    await rp.save();
    invalidateRolePermissionCaches();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Updated role permissions matrix for ${role}`,
      reference: `ROLE-${role.toUpperCase()}`,
      entityType: 'RolePermission',
      newValue: JSON.stringify(sanitizedPermissions)
    });

    res.json({
      message: `Permissions for ${role} saved and enforced on server.`,
      rolePermission: rp
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to update role permissions.');
  }
});

// Desktop Interface 16: Reports & Exports (Dated PDF & CSV)
router.get('/reports/preview', authenticate, requireStaff, async (req, res) => {
  try {
    const asAtDate = req.query.asAtDate || getTodayDateString();
    const [registerState, valuationState, shareholdersCount] = await Promise.all([
      calculateRegisterState(asAtDate),
      getEffectiveValuationState(asAtDate),
      Shareholder.countDocuments({})
    ]);

    res.json({
      asAtDate,
      shareClass: registerState.settings.shareClass || 'Ordinary',
      currency: registerState.settings.baseCurrency || 'LKR',
      allocatedShares: registerState.allocatedSharesTotal,
      issuedShares: registerState.issuedSharesTotal,
      difference: registerState.difference,
      isReconciled: registerState.isReconciled,
      hasNegativeBalances: registerState.hasNegativeBalances,
      shareholdersCount,
      applicableValuation: valuationState.currentPublishedValuation
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to preview report.');
  }
});

router.get('/reports/export', authenticate, requireStaff, adminExportLimiter, async (req, res) => {
  try {
    const { reportType = 'shareholder-register', format = 'pdf', asAtDate = getTodayDateString() } = req.query;
    const [registerState, valuationState, allShareholders] = await Promise.all([
      calculateRegisterState(asAtDate),
      getEffectiveValuationState(asAtDate),
      Shareholder.find({}).sort({ shareholderId: 1 }).lean()
    ]);
    const settings = registerState.settings;
    const valPerShare = valuationState.currentPublishedValuation
      ? Number(valuationState.currentPublishedValuation.valuePerShare)
      : 0;
    const issued = registerState.issuedSharesTotal || 0;

    let title = 'Shareholder Register Report';
    let columns = [];
    let rows = [];
    let summaryNote = `${registerState.allocatedSharesTotal.toLocaleString()} allocated shares / ${issued.toLocaleString()} issued shares / Difference: ${registerState.difference.toLocaleString()}`;

    if (reportType === 'shareholder-register' || reportType === 'statement-batch') {
      title =
        reportType === 'statement-batch'
          ? 'Dated Holding Statement Batch Summary'
          : 'Authorised Shareholder Register';
      columns = [
        { header: 'Holder ID', key: 'shareholderId' },
        { header: 'Shareholder Name', key: 'fullName' },
        { header: 'Shares Held', key: 'shares' },
        { header: 'Ownership %', key: 'ownership' },
        { header: `Holding Value (${settings.baseCurrency})`, key: 'holdingValue' },
        { header: 'Status', key: 'accountStatus' }
      ];
      rows = allShareholders.map((sh) => {
        const shShares = registerState.holdingsByShareholder[sh.shareholderId] || 0;
        const own = issued > 0 ? `${((shShares / issued) * 100).toFixed(2)}%` : 'N/A';
        const hVal = (shShares * valPerShare).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return {
          shareholderId: sh.shareholderId,
          fullName: sh.fullName,
          shares: shShares.toLocaleString(),
          ownership: own,
          holdingValue: hVal,
          accountStatus: sh.accountStatus
        };
      });
    } else if (reportType === 'holdings-reconciliation') {
      title = 'Holdings Reconciliation Report';
      columns = [
        { header: 'Reference', key: 'reference' },
        { header: 'Effective Date', key: 'effectiveDate' },
        { header: 'Type', key: 'movementType' },
        { header: 'From / To', key: 'holders' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Status', key: 'status' }
      ];
      rows = registerState.publishedMovements.map((m) => ({
        reference: m.reference,
        effectiveDate: m.effectiveDate,
        movementType: m.movementType,
        holders: [m.fromShareholderId, m.toShareholderId].filter(Boolean).join(' -> '),
        quantity: Number(m.quantity).toLocaleString(),
        status: m.status
      }));
    } else if (reportType === 'share-value-history') {
      title = 'Published Share Value History Report';
      columns = [
        { header: 'Reference', key: 'reference' },
        { header: 'Effective Date', key: 'effectiveDate' },
        { header: `Value (${settings.baseCurrency})`, key: 'valuePerShare' },
        { header: 'Change %', key: 'change' },
        { header: 'Valuation Basis', key: 'basis' }
      ];
      rows = valuationState.publishedHistory.map((v) => ({
        reference: v.reference,
        effectiveDate: v.effectiveDate,
        valuePerShare: Number(v.valuePerShare).toFixed(2),
        change: v.changePercent !== null ? `${v.changePercent >= 0 ? '+' : ''}${v.changePercent}%` : 'Opening',
        basis: v.basis
      }));
    }

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Generated ${format.toUpperCase()} report: ${title}`,
      reference: `REP-${reportType.toUpperCase()}`,
      entityType: 'ReportExport',
      newValue: `As at ${asAtDate} (${rows.length} rows)`
    });

    if (String(format).toLowerCase() === 'csv') {
      const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(',');
      const dataLines = rows.map((r) =>
        columns.map((c) => escapeCsvCell(r[c.key] ?? '')).join(',')
      );
      const csvContent = [headerLine, ...dataLines].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${asAtDate}.csv"`);
      return res.send(csvContent);
    }

    generateAdminReportPDF(res, {
      reportType,
      title,
      asAtDate,
      settings,
      columns,
      rows,
      summaryNote
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

// Desktop Interface 17: Audit Log (Bounded & Paginated for High Scale)
router.get('/audit-logs', authenticate, requireStaff, async (req, res) => {
  try {
    const { actor, action, search } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    let logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(1000).lean();

    if (actor && actor !== 'All') {
      logs = logs.filter(
        (l) =>
          String(l.actorRole || '').toLowerCase() === actor.toLowerCase() ||
          String(l.actor || '').toLowerCase().includes(actor.toLowerCase())
      );
    }
    if (action && action !== 'All') {
      logs = logs.filter((l) => String(l.action || '').toLowerCase().includes(action.toLowerCase()));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      logs = logs.filter(
        (l) =>
          String(l.reference || '').toLowerCase().includes(q) ||
          String(l.action || '').toLowerCase().includes(q) ||
          String(l.actor || '').toLowerCase().includes(q) ||
          String(l.newValue || '').toLowerCase().includes(q)
      );
    }

    const total = logs.length;
    const paginated = logs.slice(skip, skip + limit);
    res.json({ auditLogs: paginated, total, page, limit });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load audit logs.');
  }
});

// Desktop Interface 18: Publications (Documents & Announcements)
router.get('/publications', authenticate, requireStaff, async (req, res) => {
  try {
    const [publications, activeShareholdersCount, totalShareholdersCount] = await Promise.all([
      Publication.find({}).sort({ createdAt: -1 }).lean(),
      Shareholder.countDocuments({ accountStatus: 'Active' }),
      Shareholder.countDocuments({})
    ]);

    res.json({
      publications,
      activeShareholdersCount,
      totalShareholdersCount
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load publications.');
  }
});

router.post('/publications', authenticate, requireStaff, async (req, res) => {
  try {
    const {
      contentType, // 'Document' | 'Announcement'
      category,
      title,
      summary,
      periodOrDate,
      audienceType, // 'All shareholders' | 'Specific shareholder'
      targetShareholderId,
      fileUrl,
      fileName,
      fileProvider,
      actionType // 'publish' | 'submit' | 'draft'
    } = req.body;

    if (!contentType || !isPlainString(title, 200) || !title.trim()) {
      return res.status(400).json({ message: 'Content type and title are required.' });
    }
    if (audienceType === 'Specific shareholder' && !targetShareholderId) {
      return res.status(400).json({ message: 'Please select a target shareholder for a private publication.' });
    }

    const safeFileUrl = sanitizeSafeUrl(fileUrl);
    if (safeFileUrl === null) {
      return res.status(400).json({ message: 'Invalid publication file URL format.' });
    }

    if (actionType === 'publish') {
      const canPublish = await checkRolePermission(req.user.role, 'shareValues', 'approvePublish');
      if (!canPublish) {
        return res.status(403).json({
          message: `Access control: Role "${req.user.role}" cannot publish directly. Please use "Preview and submit for review" or "Save draft".`
        });
      }
    }

    const prefix = contentType === 'Document' ? 'DOC' : 'ANN';
    const reference = await getNextReference(
      `pub_${prefix}`,
      prefix,
      3,
      Publication,
      'reference',
      new RegExp(`${prefix}-(\\d+)`, 'i')
    );

    const status =
      actionType === 'publish'
        ? 'Published'
        : actionType === 'submit'
        ? 'Submitted'
        : 'Draft';

    const pub = await Publication.create({
      reference,
      contentType,
      category: category || (contentType === 'Document' ? 'Holding confirmation' : 'General notice'),
      title: title.trim(),
      summary: isPlainString(summary, 2000) ? summary.trim() : '',
      periodOrDate: periodOrDate || getTodayDateString(),
      audienceType: audienceType || 'All shareholders',
      targetShareholderId: audienceType === 'Specific shareholder' ? targetShareholderId : null,
      fileUrl: safeFileUrl,
      fileName: isPlainString(fileName, 255) ? fileName : '',
      fileProvider: isPlainString(fileProvider, 60) ? fileProvider : '',
      status,
      enteredBy: req.user.fullName,
      enteredByEmail: req.user.email,
      publishedDate: status === 'Published' ? getTodayDateString() : ''
    });

    if (status === 'Published') invalidatePublicationCaches();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Created ${contentType.toLowerCase()} (${status})`,
      reference,
      entityType: 'Publication',
      newValue: `${title.trim()} -> ${audienceType === 'Specific shareholder' ? targetShareholderId : 'All shareholders'}`
    });

    res.status(201).json({
      message: `Publication ${reference} (${status}) saved.`,
      publication: pub
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to create publication.');
  }
});

// Update Draft / Returned Publication
router.put('/publications/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const pub = await Publication.findById(req.params.id);
    if (!pub) return res.status(404).json({ message: 'Publication not found.' });

    const {
      contentType,
      category,
      title,
      summary,
      periodOrDate,
      audienceType,
      targetShareholderId,
      fileUrl,
      fileName,
      fileProvider,
      actionType
    } = req.body;

    if (actionType === 'publish') {
      const canPublish = await checkRolePermission(req.user.role, 'shareValues', 'approvePublish');
      if (!canPublish) {
        return res.status(403).json({
          message: `Access control: Role "${req.user.role}" cannot publish directly. Please submit for review.`
        });
      }
    }

    if (contentType && ['Document', 'Announcement'].includes(contentType)) pub.contentType = contentType;
    if (category) pub.category = category;
    if (isPlainString(title, 200) && title.trim()) pub.title = title.trim();
    if (summary !== undefined && isPlainString(summary, 2000)) pub.summary = summary.trim();
    if (periodOrDate !== undefined && isPlainString(periodOrDate, 80)) pub.periodOrDate = periodOrDate;
    if (audienceType && ['All shareholders', 'Specific shareholder'].includes(audienceType)) {
      pub.audienceType = audienceType;
      pub.targetShareholderId = audienceType === 'Specific shareholder' ? targetShareholderId || null : null;
    }
    if (fileUrl !== undefined) {
      const safeFileUrl = sanitizeSafeUrl(fileUrl);
      if (safeFileUrl === null) {
        return res.status(400).json({ message: 'Invalid publication file URL format.' });
      }
      pub.fileUrl = safeFileUrl;
    }
    if (fileName !== undefined && isPlainString(fileName, 255)) pub.fileName = fileName;
    if (fileProvider !== undefined && isPlainString(fileProvider, 60)) pub.fileProvider = fileProvider;

    if (actionType) {
      pub.status =
        actionType === 'publish'
          ? 'Published'
          : actionType === 'submit'
          ? 'Submitted'
          : 'Draft';
      if (pub.status === 'Published') {
        pub.publishedDate = getTodayDateString();
      }
    }

    await pub.save();
    invalidatePublicationCaches();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Updated publication (${pub.status})`,
      reference: pub.reference,
      entityType: 'Publication',
      newValue: `${pub.title} (${pub.status})`
    });

    res.json({ message: `Publication ${pub.reference} updated (${pub.status}).`, publication: pub });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to update publication.');
  }
});

// Delete Draft / Returned / Rejected Publication
router.delete('/publications/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const pub = await Publication.findById(req.params.id);
    if (!pub) return res.status(404).json({ message: 'Publication not found.' });
    if (pub.status === 'Published' && req.user.role !== 'Administrator') {
      return res.status(403).json({
        message: 'Only an Administrator can remove a published document or announcement.'
      });
    }
    await Publication.findByIdAndDelete(pub._id);
    invalidatePublicationCaches();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `Deleted publication (${pub.status})`,
      reference: pub.reference,
      entityType: 'Publication',
      previousValue: `${pub.title} (${pub.status})`,
      newValue: 'Deleted'
    });

    res.json({ message: `Publication ${pub.reference} deleted.` });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to delete publication.');
  }
});

// Desktop Interface 20: Support Requests
router.get('/support-requests', authenticate, requireStaff, async (req, res) => {
  try {
    const { status, owner, search } = req.query;
    let requests = await SupportRequest.find({}).sort({ createdAt: -1 }).limit(500).lean();

    if (status && status !== 'All') {
      requests = requests.filter((r) => r.status === status);
    }
    if (owner && owner !== 'All staff') {
      requests = requests.filter((r) => r.owner === owner);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      requests = requests.filter(
        (r) =>
          String(r.reference || '').toLowerCase().includes(q) ||
          String(r.shareholderId || '').toLowerCase().includes(q) ||
          String(r.subject || '').toLowerCase().includes(q)
      );
    }

    res.json({ supportRequests: requests });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load support requests.');
  }
});

router.put('/support-requests/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const ticket = await SupportRequest.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support request not found.' });

    const { replyMessage, status, owner, approveProfileChanges } = req.body;

    if (owner) ticket.owner = owner;
    if (status) ticket.status = status;

    if (replyMessage && replyMessage.trim()) {
      const replies = Array.isArray(ticket.replies) ? [...ticket.replies] : [];
      replies.push({
        id: `rep-${Date.now()}`,
        senderName: req.user.fullName,
        senderRole: req.user.role,
        message: replyMessage.trim(),
        createdAt: new Date().toISOString()
      });
      ticket.replies = replies;
      if (ticket.status === 'Open' && !status) {
        ticket.status = 'In progress';
      }
    }

    // If this support request is a Profile Update Request and staff approves applying the verified contact details
    if (approveProfileChanges && ticket.requestedChanges && ticket.shareholderId) {
      const sh = await Shareholder.findOne({ shareholderId: ticket.shareholderId });
      if (sh) {
        const changes = ticket.requestedChanges;
        if (changes.fullName) sh.fullName = changes.fullName;
        if (changes.email) sh.email = changes.email.toLowerCase().trim();
        if (changes.phone !== undefined) sh.phone = changes.phone;
        if (changes.postalAddress !== undefined) sh.postalAddress = changes.postalAddress;
        sh.pendingProfileUpdate = null;
        await sh.save();

        const linkedUser = await User.findOne({ shareholderId: sh.shareholderId });
        if (linkedUser) {
          linkedUser.fullName = sh.fullName;
          linkedUser.email = sh.email;
          await linkedUser.save();
          invalidateAuthUserCache(linkedUser._id);
        }
        invalidateLedgerCaches();
      }
      ticket.status = 'Resolved';
    }

    await ticket.save();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: approveProfileChanges
        ? 'Approved shareholder verified contact detail changes'
        : `Updated support request (${ticket.status})`,
      reference: ticket.reference,
      entityType: 'SupportRequest',
      newValue: replyMessage ? `Reply: ${replyMessage.slice(0, 80)}` : `Status: ${ticket.status}`
    });

    res.json({
      message: `Support request ${ticket.reference} updated.`,
      supportRequest: ticket
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

// Desktop Interface 21: Settings & Infrastructure Status
router.get('/settings', authenticate, requireStaff, async (req, res) => {
  try {
    const [settings, seedStatus] = await Promise.all([
      ensureCoreSystemConfig(),
      getSeedStatus()
    ]);
    res.json({
      settings,
      cloudflareStatus: getCloudflareStatus(),
      databaseStatus: dbState,
      seedStatus
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

router.put('/settings', authenticate, requireRoles('Administrator'), async (req, res) => {
  try {
    const settings = await ensureCoreSystemConfig();
    const {
      companyDisplayName,
      legalName,
      businessTimezone,
      financialApprovalPolicy,
      supportEmail,
      supportPhone,
      companyLogoUrl,
      companyLogoPublicId,
      issuedSharesTotal,
      votingRights,
      materialValuationChangeThresholdPercent,
      cloudflareAccountId,
      cloudflareR2Bucket,
      cloudflareR2PublicUrl,
      cloudflareR2AccessKeyId,
      cloudflareR2SecretAccessKey
    } = req.body;

    if (companyDisplayName !== undefined && isPlainString(companyDisplayName, 160)) {
      settings.companyDisplayName = companyDisplayName.trim();
    }
    if (legalName !== undefined && isPlainString(legalName, 200)) settings.legalName = legalName.trim();
    if (businessTimezone !== undefined && isPlainString(businessTimezone, 80)) {
      settings.businessTimezone = businessTimezone;
    }
    if (financialApprovalPolicy !== undefined) settings.financialApprovalPolicy = financialApprovalPolicy;
    if (supportEmail !== undefined && isPlainString(supportEmail, 254)) settings.supportEmail = supportEmail.trim();
    if (supportPhone !== undefined && isPlainString(supportPhone, 50)) settings.supportPhone = supportPhone.trim();
    if (companyLogoUrl !== undefined) {
      const safeLogoUrl = sanitizeSafeUrl(companyLogoUrl);
      if (safeLogoUrl === null) {
        return res.status(400).json({ message: 'Invalid company logo URL format.' });
      }
      settings.companyLogoUrl = safeLogoUrl;
    }
    if (companyLogoPublicId !== undefined && isPlainString(companyLogoPublicId, 300)) {
      settings.companyLogoPublicId = companyLogoPublicId;
    }
    if (issuedSharesTotal !== undefined) settings.issuedSharesTotal = Number(issuedSharesTotal) || 0;
    if (votingRights !== undefined && isPlainString(votingRights, 200)) settings.votingRights = votingRights;
    if (materialValuationChangeThresholdPercent !== undefined) {
      settings.materialValuationChangeThresholdPercent = Number(materialValuationChangeThresholdPercent) || 10;
    }

    if (cloudflareR2PublicUrl !== undefined && String(cloudflareR2PublicUrl || '').trim()) {
      const safePublicUrl = sanitizeSafeUrl(cloudflareR2PublicUrl);
      if (!safePublicUrl || !/^https?:\/\//i.test(safePublicUrl)) {
        return res.status(400).json({ message: 'Cloudflare R2 Public URL must be a valid http(s) URL.' });
      }
    }

    // Dynamic Cloudflare R2 configuration if provided
    if (
      cloudflareAccountId !== undefined ||
      cloudflareR2Bucket !== undefined ||
      cloudflareR2PublicUrl !== undefined ||
      cloudflareR2AccessKeyId ||
      cloudflareR2SecretAccessKey
    ) {
      configureCloudflare({
        accountId: cloudflareAccountId,
        bucketName: cloudflareR2Bucket,
        publicUrl: cloudflareR2PublicUrl,
        accessKeyId: cloudflareR2AccessKeyId,
        secretAccessKey: cloudflareR2SecretAccessKey
      });
      if (typeof cloudflareAccountId === 'string' && cloudflareAccountId.trim()) {
        settings.cloudflareAccountId = cloudflareAccountId.trim();
      }
      if (typeof cloudflareR2Bucket === 'string' && cloudflareR2Bucket.trim()) {
        settings.cloudflareR2Bucket = cloudflareR2Bucket.trim();
      }
      if (cloudflareR2PublicUrl !== undefined) {
        settings.cloudflareR2PublicUrl = String(cloudflareR2PublicUrl || '')
          .trim()
          .replace(/\/+$/, '');
      }
    }

    await settings.save();
    invalidateCompanyCaches();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'Updated company operational settings',
      reference: 'SETTINGS',
      entityType: 'CompanySettings',
      newValue: `${settings.companyDisplayName} | Policy: ${settings.financialApprovalPolicy} | Issued baseline: ${settings.issuedSharesTotal}`
    });

    res.json({
      message: 'Permitted company settings saved.',
      settings,
      cloudflareStatus: getCloudflareStatus()
    });
  } catch (err) {
    return sendSafeError(res, err);
  }
});

// ============================================================================
// SEED DATA GOVERNANCE & 1-CLICK OPERATIONS (Admin Only)
// ============================================================================

router.get('/seed-data/status', authenticate, requireStaff, async (req, res) => {
  try {
    const status = await getSeedStatus();
    res.json(status);
  } catch (err) {
    return sendSafeError(res, err);
  }
});

router.post('/seed-data/insert', authenticate, requireRoles('Administrator'), async (req, res) => {
  try {
    const result = await insertSeedData(req.user, req.body);
    invalidateCompanyCaches();
    invalidateLedgerCaches();
    invalidateValuationCaches();
    invalidatePublicationCaches();
    invalidateAuthUserCache();
    del(CACHE_KEYS.BOOTSTRAP_USER_COUNT);
    res.json(result);
  } catch (err) {
    const code = err.statusCode || 500;
    res.status(code).json({
      message: err.message,
      blocked: Boolean(err.blocked)
    });
  }
});

router.post('/seed-data/clear', authenticate, requireRoles('Administrator'), async (req, res) => {
  try {
    const result = await clearSeedData(req.user);
    invalidateCompanyCaches();
    invalidateLedgerCaches();
    invalidateValuationCaches();
    invalidatePublicationCaches();
    invalidateAuthUserCache();
    del(CACHE_KEYS.BOOTSTRAP_USER_COUNT);
    res.json(result);
  } catch (err) {
    return sendSafeError(res, err, 'Failed to clear seed data.');
  }
});

router.post('/seed-data/toggle-block', authenticate, requireRoles('Administrator'), async (req, res) => {
  try {
    const status = await toggleSeedBlock(req.user, req.body.blocked, req.body.reason);
    invalidateCompanyCaches();
    res.json({
      message: req.body.blocked
        ? 'Seed data generation has been permanently blocked by Administrator.'
        : 'Seed data generation has been unlocked.',
      status
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to update seed data policy.');
  }
});

module.exports = router;

const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  Shareholder,
  Publication,
  SupportRequest,
  getNextReference
} = require('../models');
const {
  ensureCoreSystemConfig,
  getTodayDateString,
  logAuditEvent,
  calculateRegisterState,
  getEffectiveValuationState,
  getCachedPublishedRegisterState,
  getCachedPublishedValuationState,
  getShareholderPersonalHistory
} = require('../utils/ledgerEngine');
const { authenticate } = require('../middleware/auth');
const { generateHoldingStatementPDF } = require('../utils/pdfGenerator');
const {
  CACHE_KEYS,
  getOrCompute,
  invalidateAdminWorkspaceCache,
  invalidatePortalWorkspaceCache,
  invalidatePublicationCaches,
  invalidateLedgerCaches
} = require('../utils/cache');
const {
  isPlainString,
  sanitizePublicCompanySettings,
  sendSafeError
} = require('../utils/security');

const router = express.Router();

// Automatically invalidate shareholder & admin workspace caches before any successful portal mutation responds
router.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const origJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) {
        invalidatePortalWorkspaceCache(req.user?.shareholderId || null);
        invalidateAdminWorkspaceCache();
      }
      return origJson(body);
    };
  }
  next();
});

const pdfExportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: { message: 'Too many statement PDF downloads in a short period. Please wait a few minutes.' }
});

async function getCachedPublishedPublications() {
  return getOrCompute(CACHE_KEYS.PUBLISHED_PUBLICATIONS, 15000, () =>
    Publication.find({ status: 'Published' }).sort({ createdAt: -1 }).lean()
  );
}

function sanitizePublicationForShareholder(pub, shareholderId) {
  const { readByShareholders, enteredByEmail, reviewedByEmail, ...safePub } = pub;
  return {
    ...safePub,
    isRead: shareholderId ? (readByShareholders || []).includes(shareholderId) : false
  };
}

// Resolve the target shareholderId with strict server-side privacy enforcement (Page 35)
function resolvePermittedShareholderId(req) {
  if (req.user.role === 'Shareholder') {
    // A shareholder can ONLY ever access their own shareholderId, ignoring any query param!
    return req.user.shareholderId;
  }
  // Authorised staff can inspect a shareholder workspace if specified
  return req.query.shareholderId || req.user.shareholderId || null;
}

// Combined Single-Request Endpoint for Shareholder Workspace (O(1) cached ledger/valuation + single-holder query)
router.get('/workspace', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const today = getTodayDateString();
    const cacheKey = `${CACHE_KEYS.PORTAL_WORKSPACE_PREFIX}${shareholderId || 'none'}:${today}`;
    const payload = await getOrCompute(cacheKey, 10000, async () => {
    const [
      settings,
      shareholder,
      registerState,
      valuationState,
      allPubs,
      mySupportRequests
    ] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      shareholderId ? Shareholder.findOne({ shareholderId }).lean() : Promise.resolve(null),
      getCachedPublishedRegisterState(today),
      getCachedPublishedValuationState(today),
      getCachedPublishedPublications(),
      shareholderId
        ? SupportRequest.find({ shareholderId }).sort({ createdAt: -1 }).limit(100).lean()
        : Promise.resolve([])
    ]);

    const personalHistory = shareholderId
      ? await getShareholderPersonalHistory(shareholderId, today, {
          registerState,
          valuationState
        })
      : [];

    const myShares = shareholderId ? registerState.holdingsByShareholder[shareholderId] || 0 : 0;
    const issuedShares = registerState.issuedSharesTotal || 0;
    const ownershipPercent =
      issuedShares > 0 ? Number(((myShares / issuedShares) * 100).toFixed(2)) : null;

    const currentValuation = valuationState.currentPublishedValuation;
    const valuePerShare = currentValuation ? Number(currentValuation.valuePerShare) : 0;
    const myHoldingValue = Number((myShares * valuePerShare).toFixed(2));
    const myLedger = shareholderId ? registerState.ledgerByShareholder[shareholderId] || [] : [];

    const myPubs = allPubs.filter(
      (p) =>
        p.audienceType === 'All shareholders' ||
        (p.audienceType === 'Specific shareholder' && p.targetShareholderId === shareholderId)
    );

    const latestActivity = [];
    if (currentValuation) {
      const prevTxt =
        currentValuation.previousValuePerShare !== null
          ? `${settings.baseCurrency} ${Number(currentValuation.previousValuePerShare).toFixed(2)} -> `
          : '';
      latestActivity.push({
        id: `val-${currentValuation.reference}`,
        activity: 'Value update published',
        effectiveDate: currentValuation.effectiveDate,
        details: `${prevTxt}${settings.baseCurrency} ${Number(currentValuation.valuePerShare).toFixed(2)}`,
        type: 'valuation',
        reference: currentValuation.reference
      });
    }

    if (myShares > 0) {
      latestActivity.push({
        id: 'stmt-latest',
        activity: 'Statement available',
        effectiveDate: currentValuation ? currentValuation.effectiveDate : today,
        details: 'Download dated holding statement (PDF)',
        type: 'statement'
      });
    }

    for (const mov of [...myLedger].reverse().slice(0, 4)) {
      latestActivity.push({
        id: `mov-${mov.reference}`,
        activity: `${mov.movementType} (${mov.reference})`,
        effectiveDate: mov.effectiveDate,
        details: `${mov.movementDisplay} shares • Running balance: ${Number(mov.balanceAfter).toLocaleString()}`,
        type: 'movement',
        reference: mov.reference
      });
    }

    const unreadAnnouncementsCount = myPubs.filter(
      (p) =>
        p.contentType === 'Announcement' &&
        shareholderId &&
        !(p.readByShareholders || []).includes(shareholderId)
    ).length;

    const supportingDocuments = myPubs
      .filter((p) => p.contentType === 'Document')
      .map((d) => sanitizePublicationForShareholder(d, shareholderId));
    const permittedAnnouncements = myPubs
      .filter((p) => p.contentType === 'Announcement')
      .map((a) => sanitizePublicationForShareholder(a, shareholderId));
    const publicCompany = sanitizePublicCompanySettings(settings);

    return {
      overview: {
        shareholder,
        company: publicCompany,
        summary: {
          myShares,
          issuedCompanyShares: issuedShares,
          ownershipPercent,
          currency: settings.baseCurrency || 'LKR',
          shareClass: settings.shareClass || 'Ordinary',
          valuePerShare,
          valuationEffectiveDate: currentValuation ? currentValuation.effectiveDate : null,
          valuationReference: currentValuation ? currentValuation.reference : null,
          myHoldingValue,
          hasPublishedHoldings: myShares > 0 || myLedger.length > 0
        },
        publishedValueHistory: valuationState.publishedHistory,
        personalHistory,
        latestActivity,
        unreadAnnouncementsCount
      },
      holdings: {
        shareholder,
        company: publicCompany,
        summary: {
          ordinaryShares: myShares,
          issuedCompanyShares: issuedShares,
          ownershipPercent,
          latestValuationDate: currentValuation ? currentValuation.effectiveDate : null,
          latestValuePerShare: currentValuation ? Number(currentValuation.valuePerShare) : 0,
          currency: settings.baseCurrency || 'LKR',
          shareClass: settings.shareClass || 'Ordinary',
          votingRights:
            (shareholder && shareholder.votingRights) ||
            settings.votingRights ||
            'Per company rules'
        },
        ledger: myLedger,
        supportingDocuments
      },
      history: {
        company: publicCompany,
        shareClass: settings.shareClass || 'Ordinary',
        currency: settings.baseCurrency || 'LKR',
        valueHistory: valuationState.publishedHistory,
        personalHistory
      },
      documents: {
        company: publicCompany,
        shareholderId,
        documents: supportingDocuments
      },
      announcements: {
        announcements: permittedAnnouncements,
        supportRequests: mySupportRequests
      }
    };
    });
    res.json(payload);
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load shareholder workspace.');
  }
});

// Desktop Interface 02 & Mobile M01/M04: Shareholder Overview
router.get('/overview', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const today = getTodayDateString();
    const [settings, shareholder, registerState, valuationState, allPubs] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      shareholderId ? Shareholder.findOne({ shareholderId }).lean() : Promise.resolve(null),
      getCachedPublishedRegisterState(today),
      getCachedPublishedValuationState(today),
      getCachedPublishedPublications()
    ]);

    const myShares = shareholderId ? registerState.holdingsByShareholder[shareholderId] || 0 : 0;
    const issuedShares = registerState.issuedSharesTotal || 0;
    const ownershipPercent =
      issuedShares > 0 ? Number(((myShares / issuedShares) * 100).toFixed(2)) : null;

    const currentValuation = valuationState.currentPublishedValuation;
    const valuePerShare = currentValuation ? Number(currentValuation.valuePerShare) : 0;
    const myHoldingValue = Number((myShares * valuePerShare).toFixed(2));

    const myLedger = shareholderId ? registerState.ledgerByShareholder[shareholderId] || [] : [];

    // Permitted publications (Documents + Announcements)
    const myPubs = allPubs.filter(
      (p) =>
        p.audienceType === 'All shareholders' ||
        (p.audienceType === 'Specific shareholder' && p.targetShareholderId === shareholderId)
    );

    // Build Latest Activity feed (Page 7)
    const latestActivity = [];
    if (currentValuation) {
      const prevTxt =
        currentValuation.previousValuePerShare !== null
          ? `${settings.baseCurrency} ${Number(currentValuation.previousValuePerShare).toFixed(2)} -> `
          : '';
      latestActivity.push({
        id: `val-${currentValuation.reference}`,
        activity: 'Value update published',
        effectiveDate: currentValuation.effectiveDate,
        details: `${prevTxt}${settings.baseCurrency} ${Number(currentValuation.valuePerShare).toFixed(2)}`,
        type: 'valuation',
        reference: currentValuation.reference
      });
    }

    if (myShares > 0) {
      latestActivity.push({
        id: 'stmt-latest',
        activity: 'Statement available',
        effectiveDate: currentValuation ? currentValuation.effectiveDate : today,
        details: 'Download dated holding statement (PDF)',
        type: 'statement'
      });
    }

    for (const mov of [...myLedger].reverse().slice(0, 4)) {
      latestActivity.push({
        id: `mov-${mov.reference}`,
        activity: `${mov.movementType} (${mov.reference})`,
        effectiveDate: mov.effectiveDate,
        details: `${mov.movementDisplay} shares • Running balance: ${Number(mov.balanceAfter).toLocaleString()}`,
        type: 'movement',
        reference: mov.reference
      });
    }

    const personalHistory = shareholderId
      ? await getShareholderPersonalHistory(shareholderId, today, {
          registerState,
          valuationState
        })
      : [];

    const unreadAnnouncementsCount = myPubs.filter(
      (p) =>
        p.contentType === 'Announcement' &&
        shareholderId &&
        !(p.readByShareholders || []).includes(shareholderId)
    ).length;

    res.json({
      shareholder,
      company: sanitizePublicCompanySettings(settings),
      summary: {
        myShares,
        issuedCompanyShares: issuedShares,
        ownershipPercent,
        currency: settings.baseCurrency || 'LKR',
        shareClass: settings.shareClass || 'Ordinary',
        valuePerShare,
        valuationEffectiveDate: currentValuation ? currentValuation.effectiveDate : null,
        valuationReference: currentValuation ? currentValuation.reference : null,
        myHoldingValue,
        hasPublishedHoldings: myShares > 0 || myLedger.length > 0
      },
      publishedValueHistory: valuationState.publishedHistory,
      personalHistory,
      latestActivity,
      unreadAnnouncementsCount
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load shareholder overview.');
  }
});

// Desktop Interface 03: My Holdings
router.get('/holdings', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const today = getTodayDateString();
    const [settings, shareholder, registerState, valuationState, allPubs] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      shareholderId ? Shareholder.findOne({ shareholderId }).lean() : Promise.resolve(null),
      getCachedPublishedRegisterState(today),
      getCachedPublishedValuationState(today),
      getCachedPublishedPublications()
    ]);

    const myShares = shareholderId ? registerState.holdingsByShareholder[shareholderId] || 0 : 0;
    const issuedShares = registerState.issuedSharesTotal || 0;
    const ownershipPercent =
      issuedShares > 0 ? Number(((myShares / issuedShares) * 100).toFixed(2)) : null;
    const currentValuation = valuationState.currentPublishedValuation;
    const ledger = shareholderId ? registerState.ledgerByShareholder[shareholderId] || [] : [];

    const supportingDocuments = allPubs
      .filter(
        (p) =>
          p.contentType === 'Document' &&
          (p.audienceType === 'All shareholders' ||
            (p.audienceType === 'Specific shareholder' && p.targetShareholderId === shareholderId))
      )
      .map((d) => sanitizePublicationForShareholder(d, shareholderId));

    res.json({
      shareholder,
      company: sanitizePublicCompanySettings(settings),
      summary: {
        ordinaryShares: myShares,
        issuedCompanyShares: issuedShares,
        ownershipPercent,
        latestValuationDate: currentValuation ? currentValuation.effectiveDate : null,
        latestValuePerShare: currentValuation ? Number(currentValuation.valuePerShare) : 0,
        currency: settings.baseCurrency || 'LKR',
        shareClass: settings.shareClass || 'Ordinary',
        votingRights: (shareholder && shareholder.votingRights) || settings.votingRights || 'Per company rules'
      },
      ledger,
      supportingDocuments
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load holdings.');
  }
});

// Desktop Interface 04 & Mobile M02: Share History
router.get('/history', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const { fromDate, toDate } = req.query;
    const today = getTodayDateString();
    const [settings, registerState, valuationState] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      getCachedPublishedRegisterState(today),
      getCachedPublishedValuationState(today)
    ]);

    const personalHistory = shareholderId
      ? await getShareholderPersonalHistory(shareholderId, today, {
          registerState,
          valuationState
        })
      : [];

    let valueHistory = [...valuationState.publishedHistory];
    if (fromDate) valueHistory = valueHistory.filter((v) => v.effectiveDate >= fromDate);
    if (toDate) valueHistory = valueHistory.filter((v) => v.effectiveDate <= toDate);

    let filteredPersonal = [...personalHistory];
    if (fromDate) filteredPersonal = filteredPersonal.filter((p) => p.effectiveDate >= fromDate);
    if (toDate) filteredPersonal = filteredPersonal.filter((p) => p.effectiveDate <= toDate);

    res.json({
      company: sanitizePublicCompanySettings(settings),
      shareClass: settings.shareClass || 'Ordinary',
      currency: settings.baseCurrency || 'LKR',
      valueHistory,
      personalHistory: filteredPersonal
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load share history.');
  }
});

// Desktop Interface 05 & Mobile M03: Documents & Dated Statements
router.get('/documents', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const [settings, allPubs] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      getCachedPublishedPublications()
    ]);

    const permittedDocs = allPubs
      .filter(
        (doc) =>
          doc.contentType === 'Document' &&
          (doc.audienceType === 'All shareholders' ||
            (doc.audienceType === 'Specific shareholder' && doc.targetShareholderId === shareholderId))
      )
      .map((d) => sanitizePublicationForShareholder(d, shareholderId));

    res.json({
      company: sanitizePublicCompanySettings(settings),
      shareholderId,
      documents: permittedDocs
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load documents.');
  }
});

// Download Dated Holding Statement PDF (Interface 03, 05, M03)
router.get('/statement-pdf', authenticate, pdfExportLimiter, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    if (!shareholderId) {
      return res.status(400).json({ message: 'No shareholder ID associated with this request.' });
    }

    const shareholder = await Shareholder.findOne({ shareholderId }).lean();
    if (!shareholder) {
      return res.status(404).json({ message: 'Shareholder profile not found.' });
    }

    const today = getTodayDateString();
    const asAtDate = isPlainString(req.query.asAtDate, 20) && req.query.asAtDate ? req.query.asAtDate : today;
    const isToday = asAtDate === today;
    const [registerState, valuationState] = await Promise.all([
      isToday ? getCachedPublishedRegisterState(today) : calculateRegisterState(asAtDate),
      isToday ? getCachedPublishedValuationState(today) : getEffectiveValuationState(asAtDate)
    ]);

    const sharesHeld = registerState.holdingsByShareholder[shareholderId] || 0;
    const issuedSharesTotal = registerState.issuedSharesTotal || 0;
    const ownershipPercent =
      issuedSharesTotal > 0 ? Number(((sharesHeld / issuedSharesTotal) * 100).toFixed(2)) : null;
    const valuation = valuationState.currentPublishedValuation;
    const valuePerShare = valuation ? Number(valuation.valuePerShare) : 0;
    const holdingValue = Number((sharesHeld * valuePerShare).toFixed(2));
    const ledgerEntries = registerState.ledgerByShareholder[shareholderId] || [];

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'Downloaded dated holding statement PDF',
      reference: shareholderId,
      entityType: 'Statement',
      newValue: `As at ${asAtDate} (${sharesHeld.toLocaleString()} shares)`
    });

    generateHoldingStatementPDF(res, {
      settings: registerState.settings,
      shareholder,
      asAtDate,
      sharesHeld,
      issuedSharesTotal,
      ownershipPercent,
      valuation,
      holdingValue,
      ledgerEntries
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to generate holding statement PDF.');
  }
});

// Desktop Interface 06: Announcements & Support Queries
router.get('/announcements', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const [allPubs, mySupportRequests] = await Promise.all([
      getCachedPublishedPublications(),
      shareholderId
        ? SupportRequest.find({ shareholderId }).sort({ createdAt: -1 }).limit(100).lean()
        : Promise.resolve([])
    ]);

    const permitted = allPubs
      .filter(
        (a) =>
          a.contentType === 'Announcement' &&
          (a.audienceType === 'All shareholders' ||
            (a.audienceType === 'Specific shareholder' && a.targetShareholderId === shareholderId))
      )
      .map((a) => sanitizePublicationForShareholder(a, shareholderId));

    res.json({
      announcements: permitted,
      supportRequests: mySupportRequests
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to load announcements.');
  }
});

router.post('/announcements/:id/read', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const pub = await Publication.findById(req.params.id).lean();
    if (!pub || pub.status !== 'Published') {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    const isPermitted =
      pub.audienceType === 'All shareholders' ||
      (pub.audienceType === 'Specific shareholder' && pub.targetShareholderId === shareholderId);
    if (!isPermitted) {
      return res.status(403).json({ message: 'Access denied: You are not authorised to view this announcement.' });
    }

    if (shareholderId && !(pub.readByShareholders || []).includes(shareholderId)) {
      await Publication.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { readByShareholders: shareholderId } },
        { new: true }
      );
      invalidatePublicationCaches();
    }

    res.json({
      message: 'Marked as read.',
      publication: sanitizePublicationForShareholder(pub, shareholderId)
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to update announcement status.');
  }
});

// Create Support Request (Interface 06 & M04)
router.post('/support', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req) || 'SH-UNASSIGNED';
    const { subject, message, requestType } = req.body;
    if (!isPlainString(subject, 200) || !subject.trim() || !isPlainString(message, 4000) || !message.trim()) {
      return res.status(400).json({ message: 'Valid subject and message are required.' });
    }

    const allowedTypes = new Set(['General query', 'Profile update request', 'Statement query']);
    const safeType = allowedTypes.has(requestType) ? requestType : 'General query';
    const reference = await getNextReference('support_Q', 'Q', 3, SupportRequest, 'reference', /Q-(\d+)/i);

    const ticket = await SupportRequest.create({
      reference,
      shareholderId,
      shareholderName: req.user.fullName,
      shareholderEmail: req.user.email,
      requestType: safeType,
      subject: subject.trim(),
      message: message.trim(),
      owner: 'Shareholder support',
      status: 'Open',
      replies: []
    });

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'Created support request',
      reference,
      entityType: 'SupportRequest',
      newValue: subject.trim()
    });

    res.status(201).json({
      message: `Support request ${reference} created.`,
      supportRequest: ticket
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to submit support request.');
  }
});

// Shareholder Reply to Own Support Request
router.post('/support/:id/reply', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const { message } = req.body;
    if (!isPlainString(message, 4000) || !message.trim()) {
      return res.status(400).json({ message: 'Please enter a reply message.' });
    }

    const ticket = await SupportRequest.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Support request not found.' });
    }

    const isStaff = ['Administrator', 'Data officer', 'Approver'].includes(req.user.role);
    if (!isStaff && ticket.shareholderId !== shareholderId) {
      return res.status(403).json({
        message: 'Access denied: You can only reply to your own support requests.'
      });
    }

    const replies = Array.isArray(ticket.replies) ? [...ticket.replies] : [];
    replies.push({
      id: `rep-${Date.now()}`,
      senderName: req.user.fullName,
      senderRole: req.user.role,
      message: message.trim(),
      createdAt: new Date().toISOString()
    });
    ticket.replies = replies;
    if (ticket.status === 'Resolved') {
      ticket.status = 'Open';
    }
    await ticket.save();

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'Added reply to support request',
      reference: ticket.reference,
      entityType: 'SupportRequest',
      newValue: message.trim().slice(0, 80)
    });

    res.json({
      message: `Reply posted to ${ticket.reference}.`,
      supportRequest: ticket
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to post support reply.');
  }
});

// Desktop Interface 07: Profile & Security — Request Profile Update
router.post('/profile-update-request', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    if (!shareholderId) {
      return res.status(400).json({ message: 'No linked shareholder profile found.' });
    }

    const shareholder = await Shareholder.findOne({ shareholderId });
    if (!shareholder) {
      return res.status(404).json({ message: 'Shareholder profile not found.' });
    }

    const { fullName, email, phone, postalAddress, reason } = req.body;
    const requestedChanges = {
      fullName: isPlainString(fullName, 160) && fullName.trim() ? fullName.trim() : shareholder.fullName,
      email: isPlainString(email, 254) && email.trim() ? email.toLowerCase().trim() : shareholder.email,
      phone: isPlainString(phone, 50) ? phone.trim() : shareholder.phone,
      postalAddress: isPlainString(postalAddress, 500) ? postalAddress.trim() : shareholder.postalAddress,
      reason: isPlainString(reason, 1000) && reason.trim() ? reason.trim() : 'Shareholder requested contact/identity detail update',
      requestedAt: new Date().toISOString()
    };

    shareholder.pendingProfileUpdate = requestedChanges;
    await shareholder.save();
    invalidateLedgerCaches();

    const reference = await getNextReference('support_Q', 'Q', 3, SupportRequest, 'reference', /Q-(\d+)/i);

    const supportTicket = await SupportRequest.create({
      reference,
      shareholderId,
      shareholderName: shareholder.fullName,
      shareholderEmail: shareholder.email,
      requestType: 'Profile update request',
      subject: 'Update contact / verified identity details',
      message: `Requested profile update — Name: ${requestedChanges.fullName}, Email: ${requestedChanges.email}, Phone: ${requestedChanges.phone}, Address: ${requestedChanges.postalAddress}. Reason: ${requestedChanges.reason}`,
      requestedChanges,
      owner: 'Administrator',
      status: 'Open',
      replies: []
    });

    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'Submitted profile update request for company verification',
      reference: `${shareholderId} / ${reference}`,
      entityType: 'Shareholder',
      previousValue: `${shareholder.email} | ${shareholder.phone}`,
      newValue: `${requestedChanges.email} | ${requestedChanges.phone}`
    });

    res.status(201).json({
      message: `Profile update request (${reference}) submitted for company verification.`,
      shareholder,
      supportRequest: supportTicket
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to submit profile update request.');
  }
});

module.exports = router;

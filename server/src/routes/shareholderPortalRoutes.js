const express = require('express');
const {
  Shareholder,
  ShareMovement,
  ShareValuation,
  Publication,
  SupportRequest
} = require('../models');
const {
  ensureCoreSystemConfig,
  getTodayDateString,
  logAuditEvent,
  calculateRegisterState,
  getEffectiveValuationState,
  getShareholderPersonalHistory
} = require('../utils/ledgerEngine');
const { authenticate } = require('../middleware/auth');
const { generateHoldingStatementPDF } = require('../utils/pdfGenerator');

const router = express.Router();

// Resolve the target shareholderId with strict server-side privacy enforcement (Page 35)
function resolvePermittedShareholderId(req) {
  if (req.user.role === 'Shareholder') {
    // A shareholder can ONLY ever access their own shareholderId, ignoring any query param!
    return req.user.shareholderId;
  }
  // Authorised staff can inspect a shareholder workspace if specified
  return req.query.shareholderId || req.user.shareholderId || null;
}

// Combined Single-Request Endpoint for Shareholder Workspace (reduces 5 HTTP requests & 110+ DB queries to 1 parallel round-trip)
router.get('/workspace', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const [
      settings,
      allShareholders,
      allMovements,
      allValuations,
      allPubs,
      mySupportRequests
    ] = await Promise.all([
      ensureCoreSystemConfig(),
      Shareholder.find({}),
      ShareMovement.find({}),
      ShareValuation.find({}),
      Publication.find({ status: 'Published' }).sort({ createdAt: -1 }),
      shareholderId
        ? SupportRequest.find({ shareholderId }).sort({ createdAt: -1 })
        : Promise.resolve([])
    ]);

    const [registerState, valuationState] = await Promise.all([
      calculateRegisterState(getTodayDateString(), {
        settings,
        allMovements,
        allShareholders
      }),
      getEffectiveValuationState(getTodayDateString(), {
        settings,
        allValuations
      })
    ]);

    const personalHistory = shareholderId
      ? await getShareholderPersonalHistory(shareholderId, getTodayDateString(), {
          registerState,
          valuationState
        })
      : [];

    const shareholder = shareholderId
      ? allShareholders.find((s) => s.shareholderId === shareholderId) || null
      : null;

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
        effectiveDate: currentValuation ? currentValuation.effectiveDate : getTodayDateString(),
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

    const supportingDocuments = myPubs.filter((p) => p.contentType === 'Document');
    const permittedAnnouncements = myPubs
      .filter((p) => p.contentType === 'Announcement')
      .map((a) => {
        const obj = a.toObject ? a.toObject() : a;
        return {
          ...obj,
          isRead: shareholderId ? (obj.readByShareholders || []).includes(shareholderId) : false
        };
      });

    res.json({
      overview: {
        shareholder,
        company: settings,
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
        company: settings,
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
        company: settings,
        shareClass: settings.shareClass || 'Ordinary',
        currency: settings.baseCurrency || 'LKR',
        valueHistory: valuationState.publishedHistory,
        personalHistory
      },
      documents: {
        company: settings,
        shareholderId,
        documents: supportingDocuments
      },
      announcements: {
        announcements: permittedAnnouncements,
        supportRequests: mySupportRequests
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Desktop Interface 02 & Mobile M01/M04: Shareholder Overview
router.get('/overview', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const [settings, allShareholders, allMovements, allValuations, allPubs] = await Promise.all([
      ensureCoreSystemConfig(),
      Shareholder.find({}),
      ShareMovement.find({}),
      ShareValuation.find({}),
      Publication.find({ status: 'Published' })
    ]);

    const [registerState, valuationState] = await Promise.all([
      calculateRegisterState(getTodayDateString(), { settings, allMovements, allShareholders }),
      getEffectiveValuationState(getTodayDateString(), { settings, allValuations })
    ]);

    const shareholder = shareholderId
      ? allShareholders.find((s) => s.shareholderId === shareholderId) || null
      : null;

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
        effectiveDate: currentValuation ? currentValuation.effectiveDate : getTodayDateString(),
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
      ? await getShareholderPersonalHistory(shareholderId, getTodayDateString(), {
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
      company: settings,
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
    res.status(500).json({ message: err.message });
  }
});

// Desktop Interface 03: My Holdings
router.get('/holdings', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const [settings, allShareholders, allMovements, allValuations, allPubs] = await Promise.all([
      ensureCoreSystemConfig(),
      Shareholder.find({}),
      ShareMovement.find({}),
      ShareValuation.find({}),
      Publication.find({ status: 'Published', contentType: 'Document' })
    ]);

    const [registerState, valuationState] = await Promise.all([
      calculateRegisterState(getTodayDateString(), { settings, allMovements, allShareholders }),
      getEffectiveValuationState(getTodayDateString(), { settings, allValuations })
    ]);

    const shareholder = shareholderId
      ? allShareholders.find((s) => s.shareholderId === shareholderId) || null
      : null;
    const myShares = shareholderId ? registerState.holdingsByShareholder[shareholderId] || 0 : 0;
    const issuedShares = registerState.issuedSharesTotal || 0;
    const ownershipPercent =
      issuedShares > 0 ? Number(((myShares / issuedShares) * 100).toFixed(2)) : null;
    const currentValuation = valuationState.currentPublishedValuation;
    const ledger = shareholderId ? registerState.ledgerByShareholder[shareholderId] || [] : [];

    // Permitted supporting documents assigned to this shareholder
    const supportingDocuments = allPubs.filter(
      (p) =>
        p.audienceType === 'All shareholders' ||
        (p.audienceType === 'Specific shareholder' && p.targetShareholderId === shareholderId)
    );

    res.json({
      shareholder,
      company: settings,
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
    res.status(500).json({ message: err.message });
  }
});

// Desktop Interface 04 & Mobile M02: Share History
router.get('/history', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const { fromDate, toDate } = req.query;
    const [settings, allShareholders, allMovements, allValuations] = await Promise.all([
      ensureCoreSystemConfig(),
      Shareholder.find({}),
      ShareMovement.find({}),
      ShareValuation.find({})
    ]);

    const [registerState, valuationState] = await Promise.all([
      calculateRegisterState(getTodayDateString(), { settings, allMovements, allShareholders }),
      getEffectiveValuationState(getTodayDateString(), { settings, allValuations })
    ]);

    const personalHistory = shareholderId
      ? await getShareholderPersonalHistory(shareholderId, getTodayDateString(), {
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
      company: settings,
      shareClass: settings.shareClass || 'Ordinary',
      currency: settings.baseCurrency || 'LKR',
      valueHistory,
      personalHistory: filteredPersonal
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Desktop Interface 05 & Mobile M03: Documents & Dated Statements
router.get('/documents', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const [settings, allDocs] = await Promise.all([
      ensureCoreSystemConfig(),
      Publication.find({ status: 'Published', contentType: 'Document' }).sort({
        createdAt: -1
      })
    ]);

    // Strict privacy check: only documents for All shareholders or explicitly assigned to this shareholderId
    const permittedDocs = allDocs.filter(
      (doc) =>
        doc.audienceType === 'All shareholders' ||
        (doc.audienceType === 'Specific shareholder' && doc.targetShareholderId === shareholderId)
    );

    res.json({
      company: settings,
      shareholderId,
      documents: permittedDocs
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Download Dated Holding Statement PDF (Interface 03, 05, M03)
router.get('/statement-pdf', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    if (!shareholderId) {
      return res.status(400).json({ message: 'No shareholder ID associated with this request.' });
    }

    const shareholder = await Shareholder.findOne({ shareholderId });
    if (!shareholder) {
      return res.status(404).json({ message: 'Shareholder profile not found.' });
    }

    const asAtDate = req.query.asAtDate || getTodayDateString();
    const registerState = await calculateRegisterState(asAtDate);
    const valuationState = await getEffectiveValuationState(asAtDate);

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
    res.status(500).json({ message: err.message });
  }
});

// Desktop Interface 06: Announcements & Support Queries
router.get('/announcements', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const [allAnnouncements, mySupportRequests] = await Promise.all([
      Publication.find({
        status: 'Published',
        contentType: 'Announcement'
      }).sort({ createdAt: -1 }),
      shareholderId
        ? SupportRequest.find({ shareholderId }).sort({ createdAt: -1 })
        : Promise.resolve([])
    ]);

    const permitted = allAnnouncements
      .filter(
        (a) =>
          a.audienceType === 'All shareholders' ||
          (a.audienceType === 'Specific shareholder' && a.targetShareholderId === shareholderId)
      )
      .map((a) => {
        const obj = a.toObject ? a.toObject() : a;
        return {
          ...obj,
          isRead: shareholderId ? (obj.readByShareholders || []).includes(shareholderId) : false
        };
      });

    res.json({
      announcements: permitted,
      supportRequests: mySupportRequests
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/announcements/:id/read', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req);
    const pub = await Publication.findById(req.params.id);
    if (!pub) return res.status(404).json({ message: 'Announcement not found.' });

    if (shareholderId && !(pub.readByShareholders || []).includes(shareholderId)) {
      pub.readByShareholders = [...(pub.readByShareholders || []), shareholderId];
      await pub.save();
    }

    res.json({ message: 'Marked as read.', publication: pub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create Support Request (Interface 06 & M04)
router.post('/support', authenticate, async (req, res) => {
  try {
    const shareholderId = resolvePermittedShareholderId(req) || 'SH-UNASSIGNED';
    const { subject, message, requestType } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }

    const count = await SupportRequest.countDocuments({});
    const reference = `Q-${String(count + 1).padStart(3, '0')}`;

    const ticket = await SupportRequest.create({
      reference,
      shareholderId,
      shareholderName: req.user.fullName,
      shareholderEmail: req.user.email,
      requestType: requestType || 'General query',
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
    res.status(500).json({ message: err.message });
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
      fullName: fullName || shareholder.fullName,
      email: email || shareholder.email,
      phone: phone !== undefined ? phone : shareholder.phone,
      postalAddress: postalAddress !== undefined ? postalAddress : shareholder.postalAddress,
      reason: reason || 'Shareholder requested contact/identity detail update',
      requestedAt: new Date().toISOString()
    };

    shareholder.pendingProfileUpdate = requestedChanges;
    await shareholder.save();

    // Also create a linked Support Request in Interface 20 ("Track shareholder questions and verified profile changes")
    const count = await SupportRequest.countDocuments({});
    const reference = `Q-${String(count + 1).padStart(3, '0')}`;

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
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

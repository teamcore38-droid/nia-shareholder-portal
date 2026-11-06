const {
  CompanySettings,
  RolePermission,
  Shareholder,
  ShareMovement,
  ShareValuation,
  AuditLog
} = require('../models');

const DEFAULT_ROLE_PERMISSIONS = [
  {
    role: 'Administrator',
    scope: 'NIA Group of Company',
    permissions: {
      shareholderProfiles: { view: 'Yes', createEditDraft: 'Yes', approvePublish: 'Yes' },
      shareMovements: { view: 'Yes', createEditDraft: 'Assigned', approvePublish: 'If assigned' },
      shareValues: { view: 'Yes', createEditDraft: 'Assigned', approvePublish: 'If assigned' },
      staffAndRoles: { view: 'Yes', createEditDraft: 'Yes', approvePublish: 'Yes' },
      reportsAndExports: { view: 'Assigned', createEditDraft: 'Not applicable', approvePublish: 'Not applicable' },
      auditHistory: { view: 'Yes' }
    }
  },
  {
    role: 'Data officer',
    scope: 'NIA Group of Company',
    permissions: {
      shareholderProfiles: { view: 'Yes', createEditDraft: 'Assigned', approvePublish: 'No' },
      shareMovements: { view: 'Yes', createEditDraft: 'Yes', approvePublish: 'No' },
      shareValues: { view: 'Yes', createEditDraft: 'Yes', approvePublish: 'No' },
      staffAndRoles: { view: 'No', createEditDraft: 'No', approvePublish: 'No' },
      reportsAndExports: { view: 'Assigned', createEditDraft: 'Not applicable', approvePublish: 'Not applicable' },
      auditHistory: { view: 'Assigned' }
    }
  },
  {
    role: 'Approver',
    scope: 'NIA Group of Company',
    permissions: {
      shareholderProfiles: { view: 'Yes', createEditDraft: 'Review if assigned', approvePublish: 'Yes' },
      shareMovements: { view: 'Yes', createEditDraft: 'Assigned', approvePublish: 'Yes' },
      shareValues: { view: 'Yes', createEditDraft: 'Assigned', approvePublish: 'Yes' },
      staffAndRoles: { view: 'No', createEditDraft: 'No', approvePublish: 'No' },
      reportsAndExports: { view: 'Assigned', createEditDraft: 'Not applicable', approvePublish: 'Not applicable' },
      auditHistory: { view: 'Yes' }
    }
  },
  {
    role: 'Shareholder',
    scope: 'Own Holding Only',
    permissions: {
      shareholderProfiles: { view: 'Own only', createEditDraft: 'Request update', approvePublish: 'No' },
      shareMovements: { view: 'Own only', createEditDraft: 'No', approvePublish: 'No' },
      shareValues: { view: 'Published only', createEditDraft: 'No', approvePublish: 'No' },
      staffAndRoles: { view: 'No', createEditDraft: 'No', approvePublish: 'No' },
      reportsAndExports: { view: 'Own statement', createEditDraft: 'Not applicable', approvePublish: 'Not applicable' },
      auditHistory: { view: 'No' }
    }
  }
];

let rolePermissionsInitialized = false;

async function ensureCoreSystemConfig(preloadedSettings = null) {
  let settings = preloadedSettings;
  let existingRoles = null;

  if (!settings && !rolePermissionsInitialized) {
    [settings, existingRoles] = await Promise.all([
      CompanySettings.findOne({ companyId: 'COMP-NIA-01' }),
      RolePermission.find({})
    ]);
  } else if (!settings) {
    settings = await CompanySettings.findOne({ companyId: 'COMP-NIA-01' });
  } else if (!rolePermissionsInitialized) {
    existingRoles = await RolePermission.find({});
  }

  if (!settings) {
    settings = await CompanySettings.create({
      companyId: 'COMP-NIA-01',
      companyDisplayName: 'NIA Group of Company',
      legalName: 'NIA Group of Company Ltd',
      proposalRef: 'ALG-SP-2026-16',
      baseCurrency: 'LKR',
      businessTimezone: 'Asia/Colombo',
      financialApprovalPolicy: 'Independent approver required',
      shareClassId: 'ORD-01',
      shareClass: 'Ordinary',
      shareUnits: 'Whole shares',
      votingRights: 'Per company rules (1 vote per Ordinary share)',
      issuedSharesTotal: 0,
      supportEmail: 'support@niagroup.com',
      supportPhone: '+94 11 234 5678',
      materialValuationChangeThresholdPercent: 10
    });
  }

  if (!rolePermissionsInitialized && existingRoles) {
    const existingSet = new Set(existingRoles.map((r) => r.role));
    const missing = DEFAULT_ROLE_PERMISSIONS.filter((rp) => !existingSet.has(rp.role));
    if (missing.length > 0) {
      await Promise.all(missing.map((rp) => RolePermission.create(rp)));
    }
    rolePermissionsInitialized = true;
  }

  return settings;
}

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatSLSTTimestamp(date = new Date()) {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

async function logAuditEvent({
  actor = 'System',
  actorEmail = '',
  actorRole = '',
  action,
  reference = '',
  entityType = '',
  previousValue = '',
  newValue = '',
  details = '',
  reason = ''
}) {
  return AuditLog.create({
    timestamp: formatSLSTTimestamp(new Date()),
    actor,
    actorEmail,
    actorRole,
    action,
    reference,
    entityType,
    previousValue: String(previousValue || ''),
    newValue: String(newValue || ''),
    details: String(details || ''),
    reason: String(reason || '')
  });
}

/**
 * Computes shareholder holdings, running ledger, and company reconciliation as at an optional date.
 * Only movements with status === 'Published' and effectiveDate <= asAtDate are included.
 */
async function calculateRegisterState(asAtDate = null, preloaded = {}) {
  const [settings, allMovements, allShareholders] = await Promise.all([
    preloaded.settings ? Promise.resolve(preloaded.settings) : ensureCoreSystemConfig(),
    preloaded.allMovements ? Promise.resolve(preloaded.allMovements) : ShareMovement.find({}),
    preloaded.allShareholders ? Promise.resolve(preloaded.allShareholders) : Shareholder.find({})
  ]);

  const publishedMovements = allMovements
    .filter((m) => {
      if (m.status !== 'Published') return false;
      if (asAtDate && m.effectiveDate > asAtDate) return false;
      return true;
    })
    .sort((a, b) => {
      const dateCmp = String(a.effectiveDate).localeCompare(String(b.effectiveDate));
      if (dateCmp !== 0) return dateCmp;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

  const holdingsByShareholder = {};
  const ledgerByShareholder = {};
  for (const sh of allShareholders) {
    holdingsByShareholder[sh.shareholderId] = 0;
    ledgerByShareholder[sh.shareholderId] = [];
  }

  let ledgerIssuedShares = 0;

  for (const mov of publishedMovements) {
    const qty = Number(mov.quantity) || 0;
    const type = mov.movementType;

    if (type === 'Opening' || type === 'Allocation') {
      const toId = mov.toShareholderId;
      if (toId) {
        holdingsByShareholder[toId] = (holdingsByShareholder[toId] || 0) + qty;
        if (!ledgerByShareholder[toId]) ledgerByShareholder[toId] = [];
        ledgerByShareholder[toId].push({
          _id: mov._id,
          reference: mov.reference,
          movementType: type,
          effectiveDate: mov.effectiveDate,
          movementDisplay: `+${qty.toLocaleString()}`,
          signedQuantity: qty,
          balanceAfter: holdingsByShareholder[toId],
          status: mov.status,
          reason: mov.reason,
          linkedReference: mov.linkedReference || '',
          supportingDocumentUrl: mov.supportingDocumentUrl || '',
          supportingDocumentName: mov.supportingDocumentName || ''
        });
      }
      if (mov.affectsIssuedTotal !== false) {
        ledgerIssuedShares += qty;
      }
    } else if (type === 'Cancellation') {
      const fromId = mov.fromShareholderId;
      if (fromId) {
        holdingsByShareholder[fromId] = (holdingsByShareholder[fromId] || 0) - qty;
        if (!ledgerByShareholder[fromId]) ledgerByShareholder[fromId] = [];
        ledgerByShareholder[fromId].push({
          _id: mov._id,
          reference: mov.reference,
          movementType: type,
          effectiveDate: mov.effectiveDate,
          movementDisplay: `-${qty.toLocaleString()}`,
          signedQuantity: -qty,
          balanceAfter: holdingsByShareholder[fromId],
          status: mov.status,
          reason: mov.reason,
          linkedReference: mov.linkedReference || '',
          supportingDocumentUrl: mov.supportingDocumentUrl || '',
          supportingDocumentName: mov.supportingDocumentName || ''
        });
      }
      if (mov.affectsIssuedTotal !== false) {
        ledgerIssuedShares = Math.max(0, ledgerIssuedShares - qty);
      }
    } else if (type === 'Transfer') {
      const fromId = mov.fromShareholderId;
      const toId = mov.toShareholderId;
      if (fromId) {
        holdingsByShareholder[fromId] = (holdingsByShareholder[fromId] || 0) - qty;
        if (!ledgerByShareholder[fromId]) ledgerByShareholder[fromId] = [];
        ledgerByShareholder[fromId].push({
          _id: mov._id,
          reference: mov.reference,
          movementType: `Transfer to ${toId}`,
          effectiveDate: mov.effectiveDate,
          movementDisplay: `-${qty.toLocaleString()}`,
          signedQuantity: -qty,
          balanceAfter: holdingsByShareholder[fromId],
          status: mov.status,
          reason: mov.reason,
          linkedReference: mov.linkedReference || '',
          supportingDocumentUrl: mov.supportingDocumentUrl || '',
          supportingDocumentName: mov.supportingDocumentName || ''
        });
      }
      if (toId) {
        holdingsByShareholder[toId] = (holdingsByShareholder[toId] || 0) + qty;
        if (!ledgerByShareholder[toId]) ledgerByShareholder[toId] = [];
        ledgerByShareholder[toId].push({
          _id: mov._id,
          reference: mov.reference,
          movementType: `Transfer from ${fromId}`,
          effectiveDate: mov.effectiveDate,
          movementDisplay: `+${qty.toLocaleString()}`,
          signedQuantity: qty,
          balanceAfter: holdingsByShareholder[toId],
          status: mov.status,
          reason: mov.reason,
          linkedReference: mov.linkedReference || '',
          supportingDocumentUrl: mov.supportingDocumentUrl || '',
          supportingDocumentName: mov.supportingDocumentName || ''
        });
      }
    } else if (type === 'Correction') {
      // Correction can move shares from fromShareholderId and/or add to toShareholderId
      const fromId = mov.fromShareholderId;
      const toId = mov.toShareholderId;
      if (fromId) {
        holdingsByShareholder[fromId] = (holdingsByShareholder[fromId] || 0) - qty;
        if (!ledgerByShareholder[fromId]) ledgerByShareholder[fromId] = [];
        ledgerByShareholder[fromId].push({
          _id: mov._id,
          reference: mov.reference,
          movementType: `Correction (${mov.linkedReference || 'Adjustment'})`,
          effectiveDate: mov.effectiveDate,
          movementDisplay: `-${qty.toLocaleString()}`,
          signedQuantity: -qty,
          balanceAfter: holdingsByShareholder[fromId],
          status: mov.status,
          reason: mov.reason,
          linkedReference: mov.linkedReference || '',
          supportingDocumentUrl: mov.supportingDocumentUrl || '',
          supportingDocumentName: mov.supportingDocumentName || ''
        });
        if (!toId && mov.affectsIssuedTotal) {
          ledgerIssuedShares = Math.max(0, ledgerIssuedShares - qty);
        }
      }
      if (toId) {
        holdingsByShareholder[toId] = (holdingsByShareholder[toId] || 0) + qty;
        if (!ledgerByShareholder[toId]) ledgerByShareholder[toId] = [];
        ledgerByShareholder[toId].push({
          _id: mov._id,
          reference: mov.reference,
          movementType: `Correction (${mov.linkedReference || 'Adjustment'})`,
          effectiveDate: mov.effectiveDate,
          movementDisplay: `+${qty.toLocaleString()}`,
          signedQuantity: qty,
          balanceAfter: holdingsByShareholder[toId],
          status: mov.status,
          reason: mov.reason,
          linkedReference: mov.linkedReference || '',
          supportingDocumentUrl: mov.supportingDocumentUrl || '',
          supportingDocumentName: mov.supportingDocumentName || ''
        });
        if (!fromId && mov.affectsIssuedTotal) {
          ledgerIssuedShares += qty;
        }
      }
    }
  }

  const allocatedSharesTotal = Object.values(holdingsByShareholder).reduce((sum, v) => sum + v, 0);
  // If CompanySettings has an explicit issuedSharesTotal > 0, use it; otherwise use ledgerIssuedShares
  const issuedSharesTotal =
    Number(settings.issuedSharesTotal) > 0 ? Number(settings.issuedSharesTotal) : ledgerIssuedShares;

  const hasNegativeBalances = Object.values(holdingsByShareholder).some((v) => v < 0);
  const difference = issuedSharesTotal - allocatedSharesTotal;
  const isReconciled = difference === 0 && !hasNegativeBalances;

  return {
    settings,
    holdingsByShareholder,
    ledgerByShareholder,
    allocatedSharesTotal,
    issuedSharesTotal,
    ledgerIssuedShares,
    difference,
    hasNegativeBalances,
    isReconciled,
    publishedMovements,
    allMovements,
    allShareholders
  };
}

/**
 * Returns the effective published valuation as at `asAtDate` (defaults to today, or latest published if none specified),
 * and the full chronological series of published valuations with step-change percentages.
 */
async function getEffectiveValuationState(asAtDate = null, preloaded = {}) {
  const [settings, allValuations] = await Promise.all([
    preloaded.settings ? Promise.resolve(preloaded.settings) : ensureCoreSystemConfig(),
    preloaded.allValuations ? Promise.resolve(preloaded.allValuations) : ShareValuation.find({})
  ]);
  const cutoffDate = asAtDate || getTodayDateString();

  // Published valuations that are effective on or before cutoffDate
  // Note: If all published valuations have effectiveDate <= cutoffDate, or if a user enters dates in 2026
  // (current date is 2026-11-05), any published valuation with effectiveDate <= cutoffDate is active.
  const publishedEffective = allValuations
    .filter((v) => v.status === 'Published' && String(v.effectiveDate) <= String(cutoffDate))
    .sort((a, b) => {
      const cmp = String(a.effectiveDate).localeCompare(String(b.effectiveDate));
      if (cmp !== 0) return cmp;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

  // Compute step-by-step change % across published valuations
  const historyWithChanges = publishedEffective.map((val, idx) => {
    const prev = idx > 0 ? publishedEffective[idx - 1] : null;
    const prevAmount = prev ? Number(prev.valuePerShare) : null;
    const currAmount = Number(val.valuePerShare);
    let changePercent = null;
    if (prevAmount !== null && prevAmount > 0) {
      changePercent = Number((((currAmount - prevAmount) / prevAmount) * 100).toFixed(2));
    }
    return {
      ...(val.toObject ? val.toObject() : val),
      previousValuePerShare: prevAmount,
      changePercent
    };
  });

  const currentPublishedValuation =
    historyWithChanges.length > 0 ? historyWithChanges[historyWithChanges.length - 1] : null;

  return {
    currency: settings.baseCurrency || 'LKR',
    shareClass: settings.shareClass || 'Ordinary',
    currentPublishedValuation,
    publishedHistory: historyWithChanges,
    allValuations
  };
}

/**
 * Computes personal holding history for a specific shareholder, combining discrete valuation dates
 * and share balance changes without presenting share allocations as investment profit (Page 4).
 */
async function getShareholderPersonalHistory(shareholderId, asAtDate = null, preloaded = {}) {
  const [registerState, valuationState] = await Promise.all([
    preloaded.registerState
      ? Promise.resolve(preloaded.registerState)
      : calculateRegisterState(asAtDate, preloaded),
    preloaded.valuationState
      ? Promise.resolve(preloaded.valuationState)
      : getEffectiveValuationState(asAtDate, preloaded)
  ]);
  const ledger = registerState.ledgerByShareholder[shareholderId] || [];
  const publishedVals = valuationState.publishedHistory || [];

  // Collect all unique effective dates from both shareholder ledger and published valuations
  const dateSet = new Set();
  for (const item of ledger) dateSet.add(item.effectiveDate);
  for (const val of publishedVals) dateSet.add(val.effectiveDate);

  const sortedDates = Array.from(dateSet).sort();

  let prevShares = null;
  let prevValuePerShare = null;

  const points = sortedDates.map((dateStr) => {
    // Shares held as of dateStr
    let sharesAtDate = 0;
    for (const entry of ledger) {
      if (entry.effectiveDate <= dateStr) {
        sharesAtDate = entry.balanceAfter;
      }
    }

    // Applicable value per share as of dateStr
    let valueAtDate = 0;
    let valuationRef = '';
    for (const v of publishedVals) {
      if (v.effectiveDate <= dateStr) {
        valueAtDate = Number(v.valuePerShare) || 0;
        valuationRef = v.reference;
      }
    }

    const holdingValue = Number((sharesAtDate * valueAtDate).toFixed(2));
    const allocationChanged = prevShares !== null && prevShares !== sharesAtDate;

    // Page 4: "Changes in allocations must not be presented as investment profit.
    // No percentage change is displayed when a valid comparison value is absent or zero."
    let valueChangePercent = null;
    if (!allocationChanged && prevValuePerShare !== null && prevValuePerShare > 0 && valueAtDate > 0) {
      valueChangePercent = Number((((valueAtDate - prevValuePerShare) / prevValuePerShare) * 100).toFixed(2));
    }

    prevShares = sharesAtDate;
    prevValuePerShare = valueAtDate;

    return {
      effectiveDate: dateStr,
      sharesHeld: sharesAtDate,
      valuePerShare: valueAtDate,
      holdingValue,
      valuationReference: valuationRef,
      allocationChanged,
      valueChangePercent
    };
  });

  return points;
}

module.exports = {
  ensureCoreSystemConfig,
  getTodayDateString,
  formatSLSTTimestamp,
  logAuditEvent,
  calculateRegisterState,
  getEffectiveValuationState,
  getShareholderPersonalHistory
};

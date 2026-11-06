const bcrypt = require('bcryptjs');
const {
  CompanySettings,
  User,
  Shareholder,
  ShareMovement,
  ShareValuation,
  Publication,
  SupportRequest,
  AuditLog
} = require('../models');
const { calculateRegisterState, ensureCoreSystemConfig, logAuditEvent } = require('./ledgerEngine');

// Predefined Demo Seed Accounts
const DEMO_ACCOUNTS = [
  {
    role: 'Data officer',
    fullName: 'Kamal Senanayake',
    email: 'dataofficer@niagroup.com',
    password: 'Officer@2026',
    description: 'Enters draft movements, draft valuations, and shareholder registrations'
  },
  {
    role: 'Approver',
    fullName: 'Dharshini Gunawardena',
    email: 'approver@niagroup.com',
    password: 'Approver@2026',
    description: 'Independent Maker-Checker review and formal registry publishing'
  },
  {
    role: 'Shareholder',
    fullName: 'Dr. Keerthi Wickramasinghe',
    email: 'shareholder1@niagroup.com',
    shareholderId: 'SH-001',
    password: 'Shareholder@2026',
    description: 'Founding Individual Shareholder (325,000 Ordinary shares)'
  },
  {
    role: 'Shareholder',
    fullName: 'Apex Horizon Holdings (Pvt) Ltd',
    email: 'shareholder2@niagroup.com',
    shareholderId: 'SH-002',
    password: 'Shareholder@2026',
    description: 'Institutional Corporate Shareholder (250,000 Ordinary shares)'
  }
];

async function getSeedStatus(preloaded = {}) {
  const [
    settings,
    shareholders,
    movements,
    valuations,
    publications,
    supportRequests,
    users
  ] = await Promise.all([
    preloaded.settings ? Promise.resolve(preloaded.settings) : ensureCoreSystemConfig(),
    preloaded.allShareholders
      ? Promise.resolve(preloaded.allShareholders.filter((x) => x.isSeed).length)
      : Shareholder.countDocuments({ isSeed: true }),
    preloaded.allMovements
      ? Promise.resolve(preloaded.allMovements.filter((x) => x.isSeed).length)
      : ShareMovement.countDocuments({ isSeed: true }),
    preloaded.allValuations
      ? Promise.resolve(preloaded.allValuations.filter((x) => x.isSeed).length)
      : ShareValuation.countDocuments({ isSeed: true }),
    preloaded.allPublications
      ? Promise.resolve(preloaded.allPublications.filter((x) => x.isSeed).length)
      : Publication.countDocuments({ isSeed: true }),
    preloaded.allSupportRequests
      ? Promise.resolve(preloaded.allSupportRequests.filter((x) => x.isSeed).length)
      : SupportRequest.countDocuments({ isSeed: true }),
    preloaded.allUsers
      ? Promise.resolve(preloaded.allUsers.filter((x) => x.isSeed).length)
      : User.countDocuments({ isSeed: true })
  ]);

  const total = shareholders + movements + valuations + publications + supportRequests + users;

  return {
    hasSeedData: total > 0,
    seedDataBlocked: Boolean(settings.seedDataBlocked || settings.seedDataBlockedPermanently),
    seedDataBlockedPermanently: Boolean(settings.seedDataBlockedPermanently),
    seedDataBlockedBy: settings.seedDataBlockedBy || null,
    seedDataBlockedAt: settings.seedDataBlockedAt || null,
    counts: {
      shareholders,
      movements,
      valuations,
      publications,
      supportRequests,
      users,
      total
    },
    demoAccounts: DEMO_ACCOUNTS
  };
}

async function toggleSeedBlock(actorUser, blocked, reason = '') {
  const settings = await ensureCoreSystemConfig();
  const isBlocked = Boolean(blocked);

  settings.seedDataBlocked = isBlocked;
  settings.seedDataBlockedPermanently = isBlocked;
  settings.seedDataBlockedBy = isBlocked ? (actorUser?.email || 'admin@niagroup.com') : null;
  settings.seedDataBlockedAt = isBlocked ? new Date() : null;
  await settings.save();

  await logAuditEvent({
    actor: actorUser?.fullName || 'System Administrator',
    actorEmail: actorUser?.email || 'admin@niagroup.com',
    actorRole: actorUser?.role || 'Administrator',
    action: isBlocked
      ? 'Permanently locked seed data insertion (Admin Policy)'
      : 'Unlocked seed data generation (Admin Override)',
    reference: 'SEC-SEED-POLICY',
    entityType: 'SecurityPolicy',
    previousValue: isBlocked ? 'Unlocked' : 'Blocked Permanently',
    newValue: isBlocked ? 'Blocked Permanently' : 'Unlocked',
    reason: reason || (isBlocked ? 'Production Registry Lockdown' : 'Administrative Maintenance')
  });

  return getSeedStatus();
}

async function clearSeedData(actorUser) {
  const [
    shRes,
    movRes,
    valRes,
    pubRes,
    supRes,
    userRes
  ] = await Promise.all([
    Shareholder.deleteMany({ isSeed: true }),
    ShareMovement.deleteMany({ isSeed: true }),
    ShareValuation.deleteMany({ isSeed: true }),
    Publication.deleteMany({ isSeed: true }),
    SupportRequest.deleteMany({ isSeed: true }),
    User.deleteMany({
      isSeed: true,
      role: { $ne: 'Administrator' },
      email: { $ne: actorUser?.email || '' }
    }),
    AuditLog.deleteMany({ isSeed: true })
  ]);

  // Re-calculate register state from any remaining legitimate movements
  const registerState = await calculateRegisterState();
  const settings = await ensureCoreSystemConfig();
  settings.issuedSharesTotal = registerState.issuedSharesTotal || 0;
  settings.hasSeedData = false;
  await settings.save();

  await logAuditEvent({
    actor: actorUser?.fullName || 'System Administrator',
    actorEmail: actorUser?.email || 'admin@niagroup.com',
    actorRole: actorUser?.role || 'Administrator',
    action: 'Purged all demo seed data with 1-click',
    reference: 'SEED-PURGE-1CLICK',
    entityType: 'DataManagement',
    details: `Cleaned up ${shRes.deletedCount || 0} shareholders, ${movRes.deletedCount || 0} share movements, ${valRes.deletedCount || 0} valuations, ${pubRes.deletedCount || 0} publications, ${supRes.deletedCount || 0} support queries, ${userRes.deletedCount || 0} demo users.`,
    reason: 'One-click administrator seed data removal'
  });

  const status = await getSeedStatus();
  return {
    success: true,
    message: 'All demo seed data was successfully removed in one click.',
    deletedCounts: {
      shareholders: shRes.deletedCount || 0,
      movements: movRes.deletedCount || 0,
      valuations: valRes.deletedCount || 0,
      publications: pubRes.deletedCount || 0,
      supportRequests: supRes.deletedCount || 0,
      users: userRes.deletedCount || 0
    },
    status
  };
}

async function insertSeedData(actorUser, options = {}) {
  const settings = await ensureCoreSystemConfig();
  const isBlocked = Boolean(settings.seedDataBlocked || settings.seedDataBlockedPermanently);

  if (isBlocked && !options.forceAdminOverride) {
    const error = new Error(
      'Seed data generation is permanently blocked by administrator policy to safeguard the registry. Only an authenticated Administrator can unlock this policy or provide explicit override authorization.'
    );
    error.statusCode = 403;
    error.blocked = true;
    throw error;
  }

  // First, safely purge any previous seed data to prevent duplicate keys
  await Promise.all([
    Shareholder.deleteMany({ isSeed: true }),
    ShareMovement.deleteMany({ isSeed: true }),
    ShareValuation.deleteMany({ isSeed: true }),
    Publication.deleteMany({ isSeed: true }),
    SupportRequest.deleteMany({ isSeed: true }),
    User.deleteMany({
      isSeed: true,
      role: { $ne: 'Administrator' },
      email: { $ne: actorUser?.email || '' }
    }),
    AuditLog.deleteMany({ isSeed: true })
  ]);

  // 1. Seed Shareholders (7 diverse corporate, individual, joint, trust holders)
  const seedShareholders = [
    {
      shareholderId: 'SH-001',
      fullName: 'Dr. Keerthi Wickramasinghe',
      email: 'shareholder1@niagroup.com',
      phone: '+94 77 123 4567',
      postalAddress: 'No. 42, Ward Place, Colombo 07, Sri Lanka',
      shareholderType: 'Individual',
      accountStatus: 'Active',
      votingRights: 'Per company rules (1 vote per Ordinary share)',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      shareholderId: 'SH-002',
      fullName: 'Apex Horizon Holdings (Pvt) Ltd',
      email: 'shareholder2@niagroup.com',
      phone: '+94 11 258 9630',
      postalAddress: 'Level 18, World Trade Center, Echelon Square, Colombo 01, Sri Lanka',
      shareholderType: 'Corporate',
      accountStatus: 'Active',
      votingRights: 'Per company rules (1 vote per Ordinary share)',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      shareholderId: 'SH-003',
      fullName: 'Mrs. Anoma D. Perera',
      email: 'anoma.perera@example.com',
      phone: '+94 71 889 2244',
      postalAddress: '15/4, Gregory’s Road, Colombo 07, Sri Lanka',
      shareholderType: 'Individual',
      accountStatus: 'Active',
      votingRights: 'Per company rules (1 vote per Ordinary share)',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      shareholderId: 'SH-004',
      fullName: 'Serendib Capital Private Trust',
      email: 'trustees@serendibcapital.lk',
      phone: '+94 11 472 8800',
      postalAddress: '88 Dharmapala Mawatha, Colombo 03, Sri Lanka',
      shareholderType: 'Trust',
      accountStatus: 'Active',
      votingRights: 'Per company rules (1 vote per Ordinary share)',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      shareholderId: 'SH-005',
      fullName: 'Ranjan & Priyanthi De Silva',
      email: 'desilva.family@example.com',
      phone: '+94 77 345 6789',
      postalAddress: '72 Lady Gordon’s Drive, Kandy, Sri Lanka',
      shareholderType: 'Joint',
      accountStatus: 'Active',
      votingRights: 'Per company rules (1 vote per Ordinary share)',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      shareholderId: 'SH-006',
      fullName: 'Colombo Heritage Investments Ltd',
      email: 'investments@colomboheritage.com',
      phone: '+94 11 233 4455',
      postalAddress: '24 Rampart Street, Fort, Galle, Sri Lanka',
      shareholderType: 'Corporate',
      accountStatus: 'Active',
      votingRights: 'Per company rules (1 vote per Ordinary share)',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      shareholderId: 'SH-007',
      fullName: 'Dilshan Fernando',
      email: 'dilshan.fernando@example.com',
      phone: '+94 76 990 1234',
      postalAddress: '18/2, Barnes Place, Colombo 07, Sri Lanka',
      shareholderType: 'Individual',
      accountStatus: 'Active',
      votingRights: 'Per company rules (1 vote per Ordinary share)',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    }
  ];

  await Promise.all(seedShareholders.map((sh) => Shareholder.create(sh)));

  // 2. Seed Share Movements (Published ledger transactions totaling 1,000,000 Ordinary shares)
  const seedMovements = [
    {
      reference: 'MOV-2024-001',
      movementType: 'Opening',
      toShareholderId: 'SH-001',
      toShareholderName: 'Dr. Keerthi Wickramasinghe',
      quantity: 350000,
      effectiveDate: '2024-01-15',
      reason: 'Initial founding subscriber ordinary share allocation',
      status: 'Published',
      affectsIssuedTotal: true,
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2024-01-15T10:00:00Z'),
      isSeed: true
    },
    {
      reference: 'MOV-2024-002',
      movementType: 'Opening',
      toShareholderId: 'SH-002',
      toShareholderName: 'Apex Horizon Holdings (Pvt) Ltd',
      quantity: 250000,
      effectiveDate: '2024-01-15',
      reason: 'Founding institutional subscriber allotment',
      status: 'Published',
      affectsIssuedTotal: true,
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2024-01-15T10:00:00Z'),
      isSeed: true
    },
    {
      reference: 'MOV-2024-003',
      movementType: 'Opening',
      toShareholderId: 'SH-003',
      toShareholderName: 'Mrs. Anoma D. Perera',
      quantity: 150000,
      effectiveDate: '2024-01-15',
      reason: 'Founding ordinary share subscriber allotment',
      status: 'Published',
      affectsIssuedTotal: true,
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2024-01-15T10:00:00Z'),
      isSeed: true
    },
    {
      reference: 'MOV-2024-004',
      movementType: 'Allocation',
      toShareholderId: 'SH-004',
      toShareholderName: 'Serendib Capital Private Trust',
      quantity: 100000,
      effectiveDate: '2024-06-20',
      reason: 'Series A Strategic Trust Capital allotment approved under Board Resolution BR-2024-06',
      status: 'Published',
      affectsIssuedTotal: true,
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2024-06-20T11:30:00Z'),
      isSeed: true
    },
    {
      reference: 'MOV-2025-001',
      movementType: 'Allocation',
      toShareholderId: 'SH-005',
      toShareholderName: 'Ranjan & Priyanthi De Silva',
      quantity: 100000,
      effectiveDate: '2025-02-10',
      reason: 'Private placement allotment approved under Board Resolution BR-2025-02',
      status: 'Published',
      affectsIssuedTotal: true,
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2025-02-10T09:15:00Z'),
      isSeed: true
    },
    {
      reference: 'MOV-2025-002',
      movementType: 'Allocation',
      toShareholderId: 'SH-006',
      toShareholderName: 'Colombo Heritage Investments Ltd',
      quantity: 50000,
      effectiveDate: '2025-08-14',
      reason: 'Institutional equity placement allotment approved under Board Resolution BR-2025-08',
      status: 'Published',
      affectsIssuedTotal: true,
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2025-08-14T14:00:00Z'),
      isSeed: true
    },
    {
      reference: 'MOV-2026-001',
      movementType: 'Transfer',
      fromShareholderId: 'SH-001',
      fromShareholderName: 'Dr. Keerthi Wickramasinghe',
      toShareholderId: 'SH-007',
      toShareholderName: 'Dilshan Fernando',
      quantity: 25000,
      effectiveDate: '2026-01-20',
      reason: 'Secondary market private transfer executed pursuant to Form 13 Share Transfer Instrument',
      status: 'Published',
      affectsIssuedTotal: false,
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2026-01-20T16:45:00Z'),
      isSeed: true
    }
  ];

  await Promise.all(seedMovements.map((mov) => ShareMovement.create(mov)));

  // 3. Seed Share Valuations (Stepped progression 125.00 -> 145.00 -> 170.00 -> 195.00 -> 225.00 LKR)
  const seedValuations = [
    {
      reference: 'VAL-2024-01',
      currency: 'LKR',
      valuePerShare: 125.0,
      previousValuePerShare: null,
      changePercent: null,
      effectiveDate: '2024-01-15',
      basis: 'Inaugural Net Asset Value Assessment by BDO Sri Lanka (Incorporation baseline)',
      status: 'Published',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2024-01-15T09:00:00Z'),
      isSeed: true
    },
    {
      reference: 'VAL-2024-02',
      currency: 'LKR',
      valuePerShare: 145.0,
      previousValuePerShare: 125.0,
      changePercent: 16.0,
      effectiveDate: '2024-07-01',
      basis: 'Mid-year Real Estate Division Land Acquisition and Capital Growth Revaluation',
      status: 'Published',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2024-07-01T10:00:00Z'),
      isSeed: true
    },
    {
      reference: 'VAL-2025-01',
      currency: 'LKR',
      valuePerShare: 170.0,
      previousValuePerShare: 145.0,
      changePercent: 17.24,
      effectiveDate: '2025-01-15',
      basis: 'Audited Financial Statement NAV Adoption & Construction Sector Project Completions',
      status: 'Published',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2025-01-15T10:00:00Z'),
      isSeed: true
    },
    {
      reference: 'VAL-2025-02',
      currency: 'LKR',
      valuePerShare: 195.0,
      previousValuePerShare: 170.0,
      changePercent: 14.71,
      effectiveDate: '2025-08-01',
      basis: 'Trading Division Expansion & International Commodity Export Revenue Surge',
      status: 'Published',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2025-08-01T10:00:00Z'),
      isSeed: true
    },
    {
      reference: 'VAL-2026-01',
      currency: 'LKR',
      valuePerShare: 225.0,
      previousValuePerShare: 195.0,
      changePercent: 15.38,
      effectiveDate: '2026-01-15',
      basis: 'Consolidated Group Valuation & 2026 Multi-Sector Asset Capitalization Assessment',
      status: 'Published',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      reviewedByEmail: 'approver@niagroup.com',
      publishedAt: new Date('2026-01-15T10:00:00Z'),
      isSeed: true
    }
  ];

  await Promise.all(seedValuations.map((val) => ShareValuation.create(val)));

  // 4. Seed Publications (Corporate Announcements and Official Financial Documents)
  const seedPublications = [
    {
      reference: 'PUB-2026-001',
      contentType: 'Announcement',
      category: 'General notice',
      title: 'Notice of 4th Annual General Meeting (AGM) 2026',
      summary:
        'Notice is hereby given that the 4th Annual General Meeting of NIA Group of Company Ltd will be held at Cinnamon Grand Colombo on 28th November 2026 at 10:00 AM.',
      periodOrDate: '2026-11-28',
      audienceType: 'All shareholders',
      status: 'Published',
      publishedDate: '2026-10-15',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      reference: 'PUB-2026-002',
      contentType: 'Announcement',
      category: 'Share value update',
      title: 'Interim Dividend Declaration — LKR 6.50 per Ordinary Share',
      summary:
        'The Board of Directors is pleased to approve an interim dividend distribution of LKR 6.50 per ordinary share for the fiscal period ended September 2026, payable on 15th December 2026.',
      periodOrDate: '2026-12-15',
      audienceType: 'All shareholders',
      status: 'Published',
      publishedDate: '2026-11-01',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      reference: 'DOC-2025-001',
      contentType: 'Document',
      category: 'Company reports',
      title: 'Annual Report & Audited Financial Statements FY 2025',
      summary:
        'Audited consolidated financial statements, statutory auditor opinion, and comprehensive operational report for the year ended 31st December 2025.',
      periodOrDate: 'FY 2025',
      audienceType: 'All shareholders',
      status: 'Published',
      publishedDate: '2026-03-31',
      fileName: 'NIA_Group_Annual_Report_FY2025.pdf',
      fileUrl: '/uploads/NIA_Group_Annual_Report_FY2025.pdf',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      reference: 'DOC-2026-001',
      contentType: 'Document',
      category: 'Company reports',
      title: 'Corporate Sector Performance & Q3 2026 Strategic Review',
      summary:
        'Strategic review covering progress across Real Estate, Construction, Investment, Trading, Consultancy, and Services divisions.',
      periodOrDate: 'Q3 2026',
      audienceType: 'All shareholders',
      status: 'Published',
      publishedDate: '2026-10-10',
      fileName: 'NIA_Group_Q3_2026_Review.pdf',
      fileUrl: '/uploads/NIA_Group_Q3_2026_Review.pdf',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    },
    {
      reference: 'DOC-SH001-001',
      contentType: 'Document',
      category: 'Holding confirmation',
      title: 'Certified Shareholding Certificate & Registry Extract',
      summary:
        'Official registry holding extract confirming 325,000 Ordinary shares in NIA Group of Company Ltd for Dr. Keerthi Wickramasinghe.',
      periodOrDate: 'As at 2026-11-01',
      audienceType: 'Specific shareholder',
      targetShareholderId: 'SH-001',
      status: 'Published',
      publishedDate: '2026-11-01',
      fileName: 'Certified_Holding_Certificate_SH001.pdf',
      fileUrl: '/uploads/Certified_Holding_Certificate_SH001.pdf',
      enteredBy: 'Kamal Senanayake',
      enteredByEmail: 'dataofficer@niagroup.com',
      reviewedBy: 'Dharshini Gunawardena',
      isSeed: true
    }
  ];

  await Promise.all(seedPublications.map((pub) => Publication.create(pub)));

  // 5. Seed Support Requests (Shareholder communication tickets)
  const seedSupportRequests = [
    {
      reference: 'Q-2026-001',
      shareholderId: 'SH-001',
      shareholderName: 'Dr. Keerthi Wickramasinghe',
      shareholderEmail: 'shareholder1@niagroup.com',
      requestType: 'General query',
      subject: 'Dividend mandate bank account verification',
      message:
        'Could registry administration please confirm if my updated Commercial Bank account is registered for direct electronic dividend transfer for the upcoming dividend distribution?',
      owner: 'Shareholder support',
      status: 'Resolved',
      replies: [
        {
          id: 'rep-001',
          senderName: 'Kamal Senanayake',
          senderRole: 'Data officer',
          message:
            'Dear Dr. Wickramasinghe, we confirm that your Commercial Bank account ending in 4589 is active and verified for direct electronic dividend crediting.',
          createdAt: new Date('2026-11-02T10:15:00Z').toISOString()
        }
      ],
      isSeed: true
    },
    {
      reference: 'Q-2026-002',
      shareholderId: 'SH-002',
      shareholderName: 'Apex Horizon Holdings (Pvt) Ltd',
      shareholderEmail: 'shareholder2@niagroup.com',
      requestType: 'Profile update request',
      subject: 'Update of official corporate delivery address',
      message:
        'We have expanded our corporate office to Level 22, World Trade Center. Please update our corporate postal address on the official register.',
      owner: 'Shareholder support',
      status: 'Open',
      replies: [],
      isSeed: true
    },
    {
      reference: 'Q-2026-003',
      shareholderId: 'SH-003',
      shareholderName: 'Mrs. Anoma D. Perera',
      shareholderEmail: 'anoma.perera@example.com',
      requestType: 'Statement query',
      subject: 'Inquiry on upcoming rights issue participation timeline',
      message:
        'I would like to inquire about the timeline and procedure for participating in the proposed capital expansion for 2027.',
      owner: 'Shareholder support',
      status: 'In progress',
      replies: [
        {
          id: 'rep-002',
          senderName: 'Dharshini Gunawardena',
          senderRole: 'Approver',
          message:
            'Dear Mrs. Perera, formal prospectus documents and subscription entitlement forms will be circulated to all active shareholders 21 days prior to the Extraordinary General Meeting.',
          createdAt: new Date('2026-11-04T14:30:00Z').toISOString()
        }
      ],
      isSeed: true
    }
  ];

  await Promise.all([
    ...seedSupportRequests.map((sup) => SupportRequest.create(sup)),
    ...DEMO_ACCOUNTS.map(async (acc) => {
      const existing = await User.findOne({ email: acc.email.toLowerCase() });
      if (!existing) {
        const passwordHash = await bcrypt.hash(acc.password, 10);
        await User.create({
          email: acc.email.toLowerCase(),
          passwordHash,
          fullName: acc.fullName,
          role: acc.role,
          shareholderId: acc.shareholderId || null,
          status: 'Active',
          verificationEnabled: true,
          verificationCode: '246810',
          recoveryCode: 'APEX-RECOVERY-2026',
          isSeed: true
        });
      }
    })
  ]);

  // 7. Recalculate Register State & Update Company Issued Shares
  const registerState = await calculateRegisterState();
  settings.issuedSharesTotal = registerState.issuedSharesTotal || 1000000;
  settings.hasSeedData = true;
  await settings.save();

  await logAuditEvent({
    actor: actorUser?.fullName || 'System Administrator',
    actorEmail: actorUser?.email || 'admin@niagroup.com',
    actorRole: actorUser?.role || 'Administrator',
    action:
      isBlocked && options.forceAdminOverride
        ? 'Inserted comprehensive demo seed data via Administrator Override'
        : 'Inserted comprehensive demo seed data',
    reference: 'SEED-INSERT',
    entityType: 'DataManagement',
    newValue:
      '7 shareholders, 7 movements (1,000,000 ordinary shares), 5 valuations (225.00 LKR), 5 publications, 3 support queries, 4 demo testing accounts',
    reason: options.reason || 'Demonstration and registry testing dataset initialization'
  });

  const status = await getSeedStatus();
  return {
    success: true,
    message: 'Comprehensive demo seed data successfully populated.',
    status,
    summary: {
      shareholders: seedShareholders.length,
      movements: seedMovements.length,
      valuations: seedValuations.length,
      publications: seedPublications.length,
      supportRequests: seedSupportRequests.length,
      demoAccounts: DEMO_ACCOUNTS.length,
      issuedSharesTotal: settings.issuedSharesTotal,
      currentValuation: 225.0
    }
  };
}

module.exports = {
  getSeedStatus,
  toggleSeedBlock,
  clearSeedData,
  insertSeedData,
  DEMO_ACCOUNTS
};

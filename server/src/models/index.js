const mongoose = require('mongoose');
const { createHybridModel } = require('../config/db');

// 1. Company Settings Schema (Page 26 & 33)
const companySettingsSchema = new mongoose.Schema(
  {
    companyId: { type: String, default: 'COMP-NIA-01', unique: true },
    companyDisplayName: { type: String, default: 'NIA Group of Company' },
    legalName: { type: String, default: 'NIA Group of Company Ltd' },
    proposalRef: { type: String, default: 'ALG-SP-2026-16' },
    baseCurrency: { type: String, default: 'LKR' },
    businessTimezone: { type: String, default: 'Asia/Colombo' },
    financialApprovalPolicy: {
      type: String,
      enum: ['Independent approver required', 'Single-operator exception logged'],
      default: 'Independent approver required'
    },
    shareClassId: { type: String, default: 'ORD-01' },
    shareClass: { type: String, default: 'Ordinary' },
    shareUnits: { type: String, default: 'Whole shares' },
    votingRights: { type: String, default: 'Per company rules (1 vote per Ordinary share)' },
    issuedSharesTotal: { type: Number, default: 0 },
    companyLogoUrl: { type: String, default: '' },
    companyLogoPublicId: { type: String, default: '' },
    supportEmail: { type: String, default: 'support@niagroup.com' },
    supportPhone: { type: String, default: '+94 11 234 5678' },
    materialValuationChangeThresholdPercent: { type: Number, default: 10 },
    cloudinaryCloudName: { type: String, default: '' },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// 2. User Account & Staff Schema (Page 6, 19, 24, 30, 31)
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: '' },
    fullName: { type: String, required: true },
    role: {
      type: String,
      enum: ['Administrator', 'Data officer', 'Approver', 'Shareholder'],
      required: true
    },
    status: {
      type: String,
      enum: ['Active', 'Invited', 'Suspended', 'Inactive'],
      default: 'Active'
    },
    shareholderId: { type: String, default: null }, // e.g., SH-001 if role === 'Shareholder'
    companyId: { type: String, default: 'COMP-NIA-01' },
    verificationEnabled: { type: Boolean, default: true },
    verificationCode: { type: String, default: '246810' },
    recoveryCode: { type: String, default: 'APEX-RECOVERY-2026' },
    inviteToken: { type: String, default: null },
    inviteExpiresAt: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    avatarUrl: { type: String, default: '' },
    lastLoginAt: { type: Date, default: null },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// 3. Role Permissions Schema (Page 20 & 31)
const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['Administrator', 'Data officer', 'Approver', 'Shareholder'],
      required: true,
      unique: true
    },
    scope: { type: String, default: 'NIA Group of Company' },
    permissions: {
      shareholderProfiles: {
        view: { type: String, default: 'Yes' },
        createEditDraft: { type: String, default: 'No' },
        approvePublish: { type: String, default: 'No' }
      },
      shareMovements: {
        view: { type: String, default: 'Yes' },
        createEditDraft: { type: String, default: 'No' },
        approvePublish: { type: String, default: 'No' }
      },
      shareValues: {
        view: { type: String, default: 'Yes' },
        createEditDraft: { type: String, default: 'No' },
        approvePublish: { type: String, default: 'No' }
      },
      staffAndRoles: {
        view: { type: String, default: 'No' },
        createEditDraft: { type: String, default: 'No' },
        approvePublish: { type: String, default: 'No' }
      },
      reportsAndExports: {
        view: { type: String, default: 'Assigned' },
        createEditDraft: { type: String, default: 'Not applicable' },
        approvePublish: { type: String, default: 'Not applicable' }
      },
      auditHistory: {
        view: { type: String, default: 'Yes' }
      }
    },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// 4. Shareholder Profile Schema (Page 8, 12, 14, 15, 33)
const shareholderSchema = new mongoose.Schema(
  {
    shareholderId: { type: String, required: true, unique: true }, // e.g., SH-001
    companyId: { type: String, default: 'COMP-NIA-01' },
    shareClass: { type: String, default: 'Ordinary' },
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    postalAddress: { type: String, default: '' },
    shareholderType: {
      type: String,
      enum: ['Individual', 'Corporate', 'Joint', 'Trust'],
      default: 'Individual'
    },
    accountStatus: {
      type: String,
      enum: ['Draft', 'Submitted', 'Active', 'Invited', 'Suspended', 'Inactive', 'Returned', 'Rejected'],
      default: 'Draft'
    },
    votingRights: { type: String, default: 'Per company rules' },
    avatarUrl: { type: String, default: '' },
    kycDocumentUrl: { type: String, default: '' },
    kycDocumentName: { type: String, default: '' },
    enteredBy: { type: String, default: '' },
    enteredByEmail: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewerComment: { type: String, default: '' },
    pendingProfileUpdate: { type: Object, default: null },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// 5. Share Movement / Ledger Schema (Page 8, 16, 17, 19, 32, 33)
const shareMovementSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true }, // OPEN-001, AL-002, TR-014, COR-001
    companyId: { type: String, default: 'COMP-NIA-01' },
    movementType: {
      type: String,
      enum: ['Opening', 'Allocation', 'Transfer', 'Correction', 'Cancellation'],
      required: true
    },
    shareClass: { type: String, default: 'Ordinary' },
    fromShareholderId: { type: String, default: null }, // For Transfer, Correction, Cancellation
    fromShareholderName: { type: String, default: '' },
    toShareholderId: { type: String, default: null }, // For Opening, Allocation, Transfer, Correction
    toShareholderName: { type: String, default: '' },
    quantity: { type: Number, required: true },
    effectiveDate: { type: String, required: true }, // YYYY-MM-DD
    reason: { type: String, default: '' },
    linkedReference: { type: String, default: '' }, // For Corrections/Reversals
    supportingDocumentUrl: { type: String, default: '' },
    supportingDocumentName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Scheduled', 'Published', 'Returned', 'Rejected'],
      default: 'Draft'
    },
    affectsIssuedTotal: { type: Boolean, default: false }, // True for Opening, Allocation, Cancellation
    snapshotBefore: { type: Object, default: {} },
    snapshotAfter: { type: Object, default: {} },
    enteredBy: { type: String, default: '' },
    enteredByEmail: { type: String, default: '' },
    enteredByRole: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewedByEmail: { type: String, default: '' },
    reviewerComment: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// 6. Share Valuation Schema (Page 4, 7, 9, 18, 32, 33)
const shareValuationSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true }, // VAL-001, VAL-007
    companyId: { type: String, default: 'COMP-NIA-01' },
    shareClass: { type: String, default: 'Ordinary' },
    currency: { type: String, default: 'LKR' },
    valuePerShare: { type: Number, required: true },
    previousValuePerShare: { type: Number, default: null },
    changePercent: { type: Number, default: null },
    effectiveDate: { type: String, required: true }, // YYYY-MM-DD
    basis: { type: String, required: true },
    supportingDocumentUrl: { type: String, default: '' },
    supportingDocumentName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Scheduled', 'Published', 'Returned', 'Rejected'],
      default: 'Draft'
    },
    enteredBy: { type: String, default: '' },
    enteredByEmail: { type: String, default: '' },
    enteredByRole: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewedByEmail: { type: String, default: '' },
    reviewerComment: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// 7. Publications (Documents & Announcements) Schema (Page 10, 11, 23)
const publicationSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true }, // PUB-001, DOC-001
    companyId: { type: String, default: 'COMP-NIA-01' },
    contentType: {
      type: String,
      enum: ['Document', 'Announcement'],
      required: true
    },
    category: {
      type: String,
      enum: ['Statements', 'Certificates', 'Holding confirmation', 'Company reports', 'Share value update', 'General notice'],
      default: 'General notice'
    },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    periodOrDate: { type: String, default: '' },
    audienceType: {
      type: String,
      enum: ['All shareholders', 'Specific shareholder'],
      default: 'All shareholders'
    },
    targetShareholderId: { type: String, default: null }, // e.g. SH-001 if Specific shareholder
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileProvider: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Published', 'Returned', 'Rejected'],
      default: 'Draft'
    },
    readByShareholders: { type: [String], default: [] },
    enteredBy: { type: String, default: '' },
    enteredByEmail: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewerComment: { type: String, default: '' },
    publishedDate: { type: String, default: '' },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// 8. Support Requests Schema (Page 11, 12, 25)
const supportRequestSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true }, // Q-001
    companyId: { type: String, default: 'COMP-NIA-01' },
    shareholderId: { type: String, required: true },
    shareholderName: { type: String, default: '' },
    shareholderEmail: { type: String, default: '' },
    requestType: {
      type: String,
      enum: ['General query', 'Profile update request', 'Statement query'],
      default: 'General query'
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    requestedChanges: { type: Object, default: null }, // For Profile update requests
    owner: { type: String, default: 'Shareholder support' },
    status: {
      type: String,
      enum: ['Open', 'In progress', 'Resolved'],
      default: 'Open'
    },
    replies: {
      type: [
        {
          id: String,
          senderName: String,
          senderRole: String,
          message: String,
          createdAt: String
        }
      ],
      default: []
    },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// 9. Audit Log Schema (Page 22, 31, 32, 33)
const auditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: String, required: true },
    actor: { type: String, required: true }, // Role or User Name
    actorEmail: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true },
    reference: { type: String, default: '' },
    entityType: { type: String, default: '' },
    previousValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    details: { type: String, default: '' },
    reason: { type: String, default: '' }
  },
  { timestamps: true }
);

const CompanySettingsModel = mongoose.models.CompanySettings || mongoose.model('CompanySettings', companySettingsSchema);
const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
const RolePermissionModel = mongoose.models.RolePermission || mongoose.model('RolePermission', rolePermissionSchema);
const ShareholderModel = mongoose.models.Shareholder || mongoose.model('Shareholder', shareholderSchema);
const ShareMovementModel = mongoose.models.ShareMovement || mongoose.model('ShareMovement', shareMovementSchema);
const ShareValuationModel = mongoose.models.ShareValuation || mongoose.model('ShareValuation', shareValuationSchema);
const PublicationModel = mongoose.models.Publication || mongoose.model('Publication', publicationSchema);
const SupportRequestModel = mongoose.models.SupportRequest || mongoose.model('SupportRequest', supportRequestSchema);
const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  CompanySettings: createHybridModel('companySettings', CompanySettingsModel, {
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
  }),
  User: createHybridModel('users', UserModel, {
    status: 'Active',
    companyId: 'COMP-NIA-01',
    verificationEnabled: true,
    verificationCode: '246810',
    recoveryCode: 'APEX-RECOVERY-2026',
    sessionVersion: 1
  }),
  RolePermission: createHybridModel('rolePermissions', RolePermissionModel, {
    scope: 'NIA Group of Company'
  }),
  Shareholder: createHybridModel('shareholders', ShareholderModel, {
    companyId: 'COMP-NIA-01',
    shareClass: 'Ordinary',
    shareholderType: 'Individual',
    accountStatus: 'Draft',
    votingRights: 'Per company rules'
  }),
  ShareMovement: createHybridModel('shareMovements', ShareMovementModel, {
    companyId: 'COMP-NIA-01',
    shareClass: 'Ordinary',
    status: 'Draft',
    affectsIssuedTotal: false,
    snapshotBefore: {},
    snapshotAfter: {}
  }),
  ShareValuation: createHybridModel('shareValuations', ShareValuationModel, {
    companyId: 'COMP-NIA-01',
    shareClass: 'Ordinary',
    currency: 'LKR',
    status: 'Draft'
  }),
  Publication: createHybridModel('publications', PublicationModel, {
    companyId: 'COMP-NIA-01',
    audienceType: 'All shareholders',
    status: 'Draft',
    readByShareholders: []
  }),
  SupportRequest: createHybridModel('supportRequests', SupportRequestModel, {
    companyId: 'COMP-NIA-01',
    requestType: 'General query',
    owner: 'Shareholder support',
    status: 'Open',
    replies: []
  }),
  AuditLog: createHybridModel('auditLogs', AuditLogModel, {})
};

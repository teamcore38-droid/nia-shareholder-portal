import React, { useState, useEffect } from 'react';
import {
  Send,
  UserCog,
  FileSpreadsheet,
  HelpCircle,
  History,
  Settings,
  Download,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Cloud,
  Database,
  ExternalLink,
  Trash2,
  Lock,
  Unlock,
  ShieldAlert,
  Key,
  Sparkles,
  Copy,
  Check,
  X
} from 'lucide-react';
import api, { getDownloadUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import FileUploader from '../../components/FileUploader';
import PasswordInput from '../../components/PasswordInput';

const DEMO_ACCOUNTS = [
  {
    role: 'Administrator',
    fullName: 'Company Administrator',
    email: 'admin@niagroup.com',
    password: 'Admin@2026',
    description: 'Full portal governance, security settings, and approvals'
  },
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

export default function AdminGovernanceTabs({
  activeTab,
  publicationsData,
  staffData,
  supportData,
  auditLogsData,
  settingsData,
  shareholdersList = [],
  onRefresh
}) {
  const { user, company, setCompany, notify } = useAuth();
  const isAdmin = user?.role === 'Administrator';

  // Seed Data Governance State
  const [showClearSeedConfirm, setShowClearSeedConfirm] = useState(false);
  const [showDemoAccountsModal, setShowDemoAccountsModal] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [seedActionLoading, setSeedActionLoading] = useState(false);
  const [copiedAccountEmail, setCopiedAccountEmail] = useState('');

  const handleClearSeedData = async () => {
    setSeedActionLoading(true);
    try {
      const res = await api.post('/admin/seed-data/clear');
      notify(res.data.message || 'All demo seed data has been removed in one click.');
      setShowClearSeedConfirm(false);
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to clear seed data.', 'error');
    } finally {
      setSeedActionLoading(false);
    }
  };

  const handleInsertSeedData = async (forceAdminOverride = false) => {
    setSeedActionLoading(true);
    try {
      const res = await api.post('/admin/seed-data/insert', { forceAdminOverride });
      notify(res.data.message || 'Comprehensive demo seed data successfully populated.');
      setShowOverrideConfirm(false);
      onRefresh();
    } catch (err) {
      if (err.response?.data?.blocked) {
        setShowOverrideConfirm(true);
      } else {
        notify(err.response?.data?.message || 'Failed to insert seed data.', 'error');
      }
    } finally {
      setSeedActionLoading(false);
    }
  };

  const handleToggleSeedBlock = async (blocked) => {
    setSeedActionLoading(true);
    try {
      const res = await api.post('/admin/seed-data/toggle-block', { blocked });
      notify(res.data.message);
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update seed policy.', 'error');
    } finally {
      setSeedActionLoading(false);
    }
  };

  const handleCopyCredentials = (text, email) => {
    navigator.clipboard?.writeText(text);
    setCopiedAccountEmail(email);
    setTimeout(() => setCopiedAccountEmail(''), 2500);
    notify('Copied demo credentials to clipboard.');
  };

  // ============================================================================
  // STATE FOR INTERFACE 18 (PUBLICATIONS)
  // ============================================================================
  const [pubForm, setPubForm] = useState({
    contentType: 'Document', // 'Document' | 'Announcement'
    category: 'Holding confirmation',
    title: '',
    summary: '',
    periodOrDate: new Date().toISOString().slice(0, 10),
    audienceType: 'All shareholders', // 'All shareholders' | 'Specific shareholder'
    targetShareholderId: '',
    fileUrl: '',
    fileName: '',
    fileProvider: ''
  });

  // ============================================================================
  // STATE FOR INTERFACES 15 & 19 (STAFF & ROLES)
  // ============================================================================
  const [showInviteStaff, setShowInviteStaff] = useState(false);
  const [staffInviteForm, setStaffInviteForm] = useState({
    fullName: '',
    email: '',
    role: 'Data officer',
    initialPassword: ''
  });
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState('Data officer');
  const [matrixState, setMatrixState] = useState(null);

  useEffect(() => {
    const rpList = staffData?.rolePermissions || [];
    const found = rpList.find((r) => r.role === selectedRoleForMatrix);
    if (found) {
      setMatrixState(JSON.parse(JSON.stringify(found.permissions)));
    }
  }, [staffData, selectedRoleForMatrix]);

  // ============================================================================
  // STATE FOR INTERFACE 16 (REPORTS)
  // ============================================================================
  const [reportAsAtDate, setReportAsAtDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportFormat, setReportFormat] = useState('pdf'); // 'pdf' | 'csv'
  const [reportPreview, setReportPreview] = useState(null);

  useEffect(() => {
    if (activeTab === 'reports') {
      api
        .get(`/admin/reports/preview?asAtDate=${reportAsAtDate}`)
        .then((res) => setReportPreview(res.data))
        .catch(() => {});
    }
  }, [activeTab, reportAsAtDate]);

  // ============================================================================
  // STATE FOR INTERFACE 20 (SUPPORT REQUESTS)
  // ============================================================================
  const [supportStatusFilter, setSupportStatusFilter] = useState('All');
  const [supportOwnerFilter, setSupportOwnerFilter] = useState('All staff');
  const [supportSearch, setSupportSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');

  // ============================================================================
  // STATE FOR INTERFACE 17 (AUDIT LOG)
  // ============================================================================
  const [auditActorFilter, setAuditActorFilter] = useState('All');
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedAuditEvent, setSelectedAuditEvent] = useState(null);

  // ============================================================================
  // STATE FOR INTERFACE 21 (SETTINGS)
  // ============================================================================
  const [settingsForm, setSettingsForm] = useState({
    companyDisplayName: '',
    legalName: '',
    businessTimezone: 'Asia/Colombo',
    financialApprovalPolicy: 'Independent approver required',
    supportEmail: '',
    supportPhone: '',
    companyLogoUrl: '',
    companyLogoPublicId: '',
    issuedSharesTotal: 0,
    votingRights: '',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: ''
  });

  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setSettingsForm({
        companyDisplayName: s.companyDisplayName || 'NIA Group of Company',
        legalName: s.legalName || 'NIA Group of Company Ltd',
        businessTimezone: s.businessTimezone || 'Asia/Colombo',
        financialApprovalPolicy: s.financialApprovalPolicy || 'Independent approver required',
        supportEmail: s.supportEmail || 'support@niagroup.com',
        supportPhone: s.supportPhone || '',
        companyLogoUrl: s.companyLogoUrl || '',
        companyLogoPublicId: s.companyLogoPublicId || '',
        issuedSharesTotal: s.issuedSharesTotal || 0,
        votingRights: s.votingRights || 'Per company rules',
        cloudinaryCloudName: s.cloudinaryCloudName || settingsData?.cloudinaryStatus?.cloudName || '',
        cloudinaryApiKey: '',
        cloudinaryApiSecret: ''
      });
    }
  }, [settingsData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleSavePublication = async (actionType) => {
    try {
      const res = await api.post('/admin/publications', {
        ...pubForm,
        actionType
      });
      notify(res.data.message);
      setPubForm({
        contentType: 'Document',
        category: 'Holding confirmation',
        title: '',
        summary: '',
        periodOrDate: new Date().toISOString().slice(0, 10),
        audienceType: 'All shareholders',
        targetShareholderId: '',
        fileUrl: '',
        fileName: '',
        fileProvider: ''
      });
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not save publication.', 'error');
    }
  };

  const handleInviteStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/staff/invite', staffInviteForm);
      notify(res.data.message);
      setShowInviteStaff(false);
      setStaffInviteForm({
        fullName: '',
        email: '',
        role: 'Data officer',
        initialPassword: ''
      });
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to invite staff member.', 'error');
    }
  };

  const handleStaffAction = async (staff, updates) => {
    try {
      const res = await api.put(`/admin/staff/${staff._id}`, updates);
      notify(res.data.message);
      setSelectedStaff(res.data.staff);
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Staff action failed.', 'error');
    }
  };

  const handleSaveRoleMatrix = async () => {
    try {
      const res = await api.put(`/admin/role-permissions/${selectedRoleForMatrix}`, {
        permissions: matrixState
      });
      notify(res.data.message);
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to save role permissions.', 'error');
    }
  };

  const handleGenerateReport = (reportType) => {
    const url = getDownloadUrl(
      `/admin/reports/export?reportType=${reportType}&format=${reportFormat}&asAtDate=${reportAsAtDate}`
    );
    window.open(url, '_blank');
    notify(
      `Generating ${reportType} (${reportFormat.toUpperCase()}) as at ${reportAsAtDate}...`,
      'info'
    );
    setTimeout(() => onRefresh(), 1000);
  };

  const handleUpdateSupportTicket = async (ticketId, payload) => {
    try {
      const res = await api.put(`/admin/support-requests/${ticketId}`, payload);
      notify(res.data.message);
      setSelectedTicket(res.data.supportRequest);
      setReplyText('');
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not update support request.', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/admin/settings', settingsForm);
      if (res.data.settings) setCompany(res.data.settings);
      notify(res.data.message);
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to save settings.', 'error');
    }
  };

  // ============================================================================
  // TAB 6: PUBLICATIONS (Desktop Interface 18)
  // ============================================================================
  if (activeTab === 'publications') {
    const pubs = publicationsData?.publications || [];
    const recipientCount =
      pubForm.audienceType === 'Specific shareholder'
        ? pubForm.targetShareholderId
          ? 1
          : 0
        : publicationsData?.totalShareholdersCount || shareholdersList.length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Publications</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Prepare a document or announcement with an explicit audience
          </p>
        </div>

        {/* Publication Form Card (Interface 18) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Content type</label>
              <select
                value={pubForm.contentType}
                onChange={(e) => {
                  const ct = e.target.value;
                  setPubForm({
                    ...pubForm,
                    contentType: ct,
                    category: ct === 'Document' ? 'Holding confirmation' : 'Share value update'
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
              >
                <option value="Document">Document (PDF / Statement / Certificate)</option>
                <option value="Announcement">Announcement (In-app Notice)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={pubForm.category}
                onChange={(e) => setPubForm({ ...pubForm, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Holding confirmation">Holding confirmation</option>
                <option value="Statements">Statements</option>
                <option value="Certificates">Certificates</option>
                <option value="Company reports">Company reports</option>
                <option value="Share value update">Share value update</option>
                <option value="General notice">General notice</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              placeholder="e.g. Allocation confirmation AL-002 or Company annual report 2025/2026"
              value={pubForm.title}
              onChange={(e) => setPubForm({ ...pubForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Summary / Notice text
            </label>
            <textarea
              rows={2}
              placeholder="Summary description or announcement body..."
              value={pubForm.summary}
              onChange={(e) => setPubForm({ ...pubForm, summary: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Audience</label>
              <select
                value={pubForm.audienceType}
                onChange={(e) => setPubForm({ ...pubForm, audienceType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="All shareholders">All shareholders</option>
                <option value="Specific shareholder">Specific shareholder (Private)</option>
              </select>
            </div>

            {pubForm.audienceType === 'Specific shareholder' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specific shareholder *
                </label>
                <select
                  value={pubForm.targetShareholderId}
                  onChange={(e) =>
                    setPubForm({ ...pubForm, targetShareholderId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="">Select recipient shareholder...</option>
                  {shareholdersList.map((s) => (
                    <option key={s.shareholderId} value={s.shareholderId}>
                      {s.shareholderId} — {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Period or publication date
                </label>
                <input
                  type="text"
                  placeholder="e.g. November 2026 or 2025 / 2026"
                  value={pubForm.periodOrDate}
                  onChange={(e) => setPubForm({ ...pubForm, periodOrDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              File and publication attachment (Cloudinary)
            </label>
            <FileUploader
              folder="publications"
              label="Upload document / PDF / image to Cloudinary"
              currentUrl={pubForm.fileUrl}
              currentName={pubForm.fileName}
              onUploaded={(file) =>
                setPubForm({
                  ...pubForm,
                  fileUrl: file.url,
                  fileName: file.name,
                  fileProvider: file.provider
                })
              }
            />
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Audience preview: <strong className="text-slate-800">{recipientCount} shareholder(s)</strong>. Private documents are not shared company-wide.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleSavePublication('publish')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4AF37]/20 cursor-pointer"
            >
              Publish immediately
            </button>
            <button
              type="button"
              onClick={() => handleSavePublication('submit')}
              className="px-5 py-2.5 rounded-xl bg-[#080C16] hover:bg-slate-800 text-[#FDE047] border border-[#D4AF37]/40 text-xs font-bold cursor-pointer"
            >
              Preview and submit for review
            </button>
            <button
              type="button"
              onClick={() => handleSavePublication('draft')}
              className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
            >
              Save draft
            </button>
          </div>
        </div>

        {/* Existing Publications List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Published & draft publications</h3>
          </div>
          {pubs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No publications created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-6">Reference</th>
                    <th className="py-3 px-6">Title & category</th>
                    <th className="py-3 px-6">Audience</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pubs.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-6 font-mono-num font-bold text-slate-900">
                        {p.reference}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">{p.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.contentType} • {p.category}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-700">
                        {p.audienceType === 'Specific shareholder'
                          ? `Specific: ${p.targetShareholderId}`
                          : 'All shareholders'}
                      </td>
                      <td className="py-3.5 px-6 font-mono-num text-slate-600">
                        {p.periodOrDate || p.publishedDate}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            p.status === 'Published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 7: STAFF AND ROLES (Desktop Interfaces 15 & 19)
  // ============================================================================
  if (activeTab === 'staff') {
    const staffMembers = staffData?.staffMembers || [];
    const roleMemberCount = staffMembers.filter((s) => s.role === selectedRoleForMatrix).length;

    return (
      <div className="space-y-8">
        {/* PART A: Desktop Interface 19 — Staff Accounts & Invitations */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Staff and roles</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage staff invitations, account status, assigned roles and role permissions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteStaff(!showInviteStaff)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4AF37]/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Invite staff member
            </button>
          </div>

          {showInviteStaff && (
            <form
              onSubmit={handleInviteStaff}
              className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4 max-w-3xl"
            >
              <h3 className="text-sm font-bold text-slate-900">Invite authorised staff member</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Staff full name"
                  value={staffInviteForm.fullName}
                  onChange={(e) =>
                    setStaffInviteForm({ ...staffInviteForm, fullName: e.target.value })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="email"
                  required
                  placeholder="officer@example.com"
                  value={staffInviteForm.email}
                  onChange={(e) =>
                    setStaffInviteForm({ ...staffInviteForm, email: e.target.value })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
                <select
                  value={staffInviteForm.role}
                  onChange={(e) =>
                    setStaffInviteForm({ ...staffInviteForm, role: e.target.value })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                >
                  <option value="Data officer">Data officer</option>
                  <option value="Approver">Approver</option>
                  <option value="Administrator">Administrator</option>
                </select>
                <PasswordInput
                  placeholder="Optional initial password (or leave blank for invite)"
                  showStrength
                  autoComplete="new-password"
                  value={staffInviteForm.initialPassword}
                  onChange={(e) =>
                    setStaffInviteForm({ ...staffInviteForm, initialPassword: e.target.value })
                  }
                  inputClassName="text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#080C16] text-[#FDE047] border border-[#D4AF37]/40 text-xs font-bold cursor-pointer"
              >
                Create staff account
              </button>
            </form>
          )}

          {/* Staff Accounts Table (Interface 19) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-6">Staff account</th>
                    <th className="py-3 px-6">Role</th>
                    <th className="py-3 px-6">Verification</th>
                    <th className="py-3 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {staffMembers.map((st) => (
                    <tr
                      key={st._id}
                      onClick={() => setSelectedStaff(st)}
                      className={`hover:bg-slate-50/90 cursor-pointer ${
                        selectedStaff?._id === st._id ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">{st.email}</div>
                        <div className="text-[11px] text-slate-500">{st.fullName}</div>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800">{st.role}</td>
                      <td className="py-3.5 px-6 text-slate-700">
                        {st.verificationEnabled ? 'Enabled (6-digit 2FA)' : 'Disabled'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            st.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : st.status === 'Suspended'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Account Actions Card (Interface 19) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-2">
            <h3 className="text-base font-bold text-slate-900">
              Selected account actions{' '}
              {selectedStaff && (
                <span className="text-blue-700 font-mono-num text-xs ml-1">
                  ({selectedStaff.email})
                </span>
              )}
            </h3>
            {selectedStaff ? (
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Change assigned role:</span>
                  <select
                    value={selectedStaff.role}
                    onChange={(e) => handleStaffAction(selectedStaff, { role: e.target.value })}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-900"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Data officer">Data officer</option>
                    <option value="Approver">Approver</option>
                  </select>
                </div>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleStaffAction(selectedStaff, { revokeSessions: true })}
                  className="text-[#9A7B2C] hover:underline cursor-pointer"
                >
                  Revoke sessions
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() =>
                    handleStaffAction(selectedStaff, {
                      status: selectedStaff.status === 'Suspended' ? 'Active' : 'Suspended'
                    })
                  }
                  className="text-red-600 hover:underline cursor-pointer"
                >
                  {selectedStaff.status === 'Suspended' ? 'Restore account' : 'Suspend account'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Select a staff row above to change role, revoke active sessions, or suspend access.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Removing or suspending the final active administrator requires a replacement first.
            </p>
          </div>
        </div>

        {/* PART B: Desktop Interface 15 — Role Permissions Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Control access by role, company and permitted action
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Role:</span>
                  <select
                    value={selectedRoleForMatrix}
                    onChange={(e) => setSelectedRoleForMatrix(e.target.value)}
                    className="px-3 py-1 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="Data officer">Data officer</option>
                    <option value="Approver">Approver</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Shareholder">Shareholder</option>
                  </select>
                </div>
                <span>
                  Members: <strong>{roleMemberCount}</strong>
                </span>
                <span>
                  Scope: <strong>{company?.companyDisplayName || 'NIA Group of Company'}</strong>
                </span>
              </div>
            </div>
          </div>

          {matrixState && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Permission</th>
                    <th className="py-3 px-5">View</th>
                    <th className="py-3 px-5">Create / edit draft</th>
                    <th className="py-3 px-5">Approve / publish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {[
                    { key: 'shareholderProfiles', label: 'Shareholder profiles' },
                    { key: 'shareMovements', label: 'Share movements' },
                    { key: 'shareValues', label: 'Share values' },
                    { key: 'staffAndRoles', label: 'Staff and roles' },
                    { key: 'reportsAndExports', label: 'Reports and exports' }
                  ].map((row) => {
                    const cell = matrixState[row.key] || {};
                    const options = ['Yes', 'Assigned', 'If assigned', 'No', 'Not applicable'];
                    return (
                      <tr key={row.key} className="hover:bg-slate-50/80">
                        <td className="py-3 px-5 font-bold text-slate-900">{row.label}</td>
                        {['view', 'createEditDraft', 'approvePublish'].map((col) => (
                          <td key={col} className="py-3 px-5">
                            <select
                              value={cell[col] || 'No'}
                              onChange={(e) =>
                                setMatrixState({
                                  ...matrixState,
                                  [row.key]: {
                                    ...matrixState[row.key],
                                    [col]: e.target.value
                                  }
                                })
                              }
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                            >
                              {options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Least access by default. Server checks apply to every action and record.
          </p>

          <button
            type="button"
            onClick={handleSaveRoleMatrix}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4AF37]/20 cursor-pointer"
          >
            Save role permissions
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 8: REPORTS & EXPORTS (Desktop Interface 16)
  // ============================================================================
  if (activeTab === 'reports') {
    const reportsList = [
      {
        id: 'shareholder-register',
        name: 'Shareholder register',
        scope: 'All authorised shareholder records'
      },
      {
        id: 'holdings-reconciliation',
        name: 'Holdings reconciliation',
        scope: 'Allocated vs issued shares'
      },
      {
        id: 'share-value-history',
        name: 'Share value history',
        scope: 'Effective published values'
      },
      {
        id: 'statement-batch',
        name: 'Statement batch',
        scope: 'Selected shareholders and date'
      }
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dated reports for reconciliation and shareholder communication
          </p>
        </div>

        {/* Filter Bar (Interface 16) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">As at:</span>
            <input
              type="date"
              value={reportAsAtDate}
              onChange={(e) => setReportAsAtDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 font-mono-num font-bold text-slate-900"
            />
          </div>

          <div>
            Share class: <strong className="text-slate-900">{company?.shareClass || 'Ordinary'}</strong>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Format:</span>
            <select
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>

        {/* Reports Table (Interface 16) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Report</th>
                  <th className="py-3 px-6">Scope</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {reportsList.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/80">
                    <td className="py-4 px-6 font-bold text-slate-900">{rep.name}</td>
                    <td className="py-4 px-6 text-slate-600">{rep.scope}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleGenerateReport(rep.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs font-extrabold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Generate ({reportFormat.toUpperCase()})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Preview Card (Interface 16) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900">Report preview</h3>
          <div className="mt-2 text-xs font-mono-num font-bold text-blue-800">
            {Number(reportPreview?.allocatedShares || 0).toLocaleString()} allocated shares /{' '}
            {Number(reportPreview?.issuedShares || 0).toLocaleString()} issued shares / Difference:{' '}
            {Number(reportPreview?.difference || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Exports are restricted by permission and recorded in the audit log. Later transfers do not change the share balances used for a dated report.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 9: SUPPORT REQUESTS (Desktop Interface 20)
  // ============================================================================
  if (activeTab === 'support') {
    const tickets = (supportData?.supportRequests || []).filter((r) => {
      if (supportStatusFilter !== 'All' && r.status !== supportStatusFilter) return false;
      if (supportOwnerFilter !== 'All staff' && r.owner !== supportOwnerFilter) return false;
      if (supportSearch.trim()) {
        const q = supportSearch.trim().toLowerCase();
        return (
          String(r.reference || '').toLowerCase().includes(q) ||
          String(r.shareholderId || '').toLowerCase().includes(q) ||
          String(r.subject || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    const activeTicket = selectedTicket || tickets[0] || null;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Support requests</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track shareholder questions and verified profile changes
          </p>
        </div>

        {/* Filter Bar (Interface 20) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Status:</span>
            <select
              value={supportStatusFilter}
              onChange={(e) => setSupportStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
            >
              <option value="All">All</option>
              <option value="Open">Open</option>
              <option value="In progress">In progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Assigned to:</span>
            <select
              value={supportOwnerFilter}
              onChange={(e) => setSupportOwnerFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
            >
              <option value="All staff">All staff</option>
              <option value="Shareholder support">Shareholder support</option>
              <option value="Administrator">Administrator</option>
              <option value="Data officer">Data officer</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Search by reference or holder ID..."
            value={supportSearch}
            onChange={(e) => setSupportSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-200"
          />
        </div>

        {/* Support Requests Table (Interface 20) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No support requests or profile change queries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-6">Reference / shareholder</th>
                    <th className="py-3 px-6">Subject</th>
                    <th className="py-3 px-6">Owner</th>
                    <th className="py-3 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {tickets.map((t) => (
                    <tr
                      key={t._id}
                      onClick={() => setSelectedTicket(t)}
                      className={`hover:bg-slate-50/90 cursor-pointer ${
                        activeTicket?._id === t._id ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6 font-mono-num font-bold text-slate-900">
                        {t.reference} / {t.shareholderId}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800">{t.subject}</td>
                      <td className="py-3.5 px-6 text-slate-600">{t.owner}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            t.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.status === 'In progress'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Support Ticket Conversation & Reply Panel (Bottom of Interface 20) */}
        {activeTicket && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                {activeTicket.reference} | {activeTicket.subject}
              </h3>
              <span className="text-xs text-slate-500">
                From: <strong>{activeTicket.shareholderName}</strong> ({activeTicket.shareholderId})
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
              <strong>Shareholder:</strong> {activeTicket.message}
            </div>

            {activeTicket.replies && activeTicket.replies.length > 0 && (
              <div className="space-y-2">
                {activeTicket.replies.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-800"
                  >
                    <strong>
                      {rep.senderName} ({rep.senderRole}):
                    </strong>{' '}
                    {rep.message}
                  </div>
                ))}
              </div>
            )}

            <div>
              <input
                type="text"
                placeholder="Reply: Explain the dated valuation or confirm profile verification..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  handleUpdateSupportTicket(activeTicket._id, {
                    replyMessage: replyText || 'Reviewed by shareholder support.'
                  })
                }
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs font-extrabold cursor-pointer"
              >
                Save reply
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateSupportTicket(activeTicket._id, {
                    replyMessage: replyText || undefined,
                    status: 'Resolved'
                  })
                }
                className="px-4 py-2 rounded-xl bg-[#0A1128] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Mark resolved
              </button>
              {activeTicket.requestedChanges && activeTicket.status !== 'Resolved' && (
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateSupportTicket(activeTicket._id, {
                      replyMessage:
                        replyText || 'Verified and applied requested contact detail updates.',
                      approveProfileChanges: true
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Approve & apply verified profile changes
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // TAB 10: AUDIT LOG (Desktop Interface 17)
  // ============================================================================
  if (activeTab === 'audit') {
    const logs = (auditLogsData?.auditLogs || []).filter((l) => {
      if (auditActorFilter !== 'All' && l.actorRole !== auditActorFilter) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.trim().toLowerCase();
        return (
          String(l.action || '').toLowerCase().includes(q) ||
          String(l.reference || '').toLowerCase().includes(q) ||
          String(l.actor || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    const inspectedLog = selectedAuditEvent || logs[0] || null;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Audit log</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            A permanent record of important system actions
          </p>
        </div>

        {/* Filter Bar (Interface 17) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Filters:</span>
            <select
              value={auditActorFilter}
              onChange={(e) => setAuditActorFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
            >
              <option value="All">All users</option>
              <option value="Administrator">Administrator</option>
              <option value="Data officer">Data officer</option>
              <option value="Approver">Approver</option>
              <option value="Shareholder">Shareholder</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Filter by action or reference (e.g. VAL-001, TR-014)..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg border border-slate-200"
          />
        </div>

        {/* Audit Events Table (Interface 17) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching audit events found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-6">Timestamp SLST</th>
                    <th className="py-3 px-6">Actor</th>
                    <th className="py-3 px-6">Action</th>
                    <th className="py-3 px-6">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => (
                    <tr
                      key={log._id}
                      onClick={() => setSelectedAuditEvent(log)}
                      className={`hover:bg-slate-50/90 cursor-pointer ${
                        inspectedLog?._id === log._id ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6 font-mono-num text-slate-600">
                        {log.timestamp}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-bold text-slate-900">{log.actorRole || log.actor}</span>
                        {log.actorEmail && (
                          <span className="text-[11px] text-slate-400 ml-1.5">
                            ({log.actorEmail})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800">{log.action}</td>
                      <td className="py-3.5 px-6 font-mono-num font-bold text-blue-700">
                        {log.reference || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Event Details Inspector Card (Bottom of Interface 17) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900">Event details</h3>
          {inspectedLog ? (
            <div className="mt-2 space-y-1 text-xs">
              <div className="font-semibold text-slate-800">
                Action: <span className="font-bold">{inspectedLog.action}</span> • Reference:{' '}
                <span className="font-mono-num font-bold">{inspectedLog.reference || 'N/A'}</span>
              </div>
              {(inspectedLog.previousValue || inspectedLog.newValue) && (
                <div className="font-mono-num text-slate-700">
                  Value changed:{' '}
                  {inspectedLog.previousValue ? `${inspectedLog.previousValue} → ` : ''}
                  <strong className="text-slate-900">{inspectedLog.newValue}</strong>
                </div>
              )}
              {inspectedLog.reason && (
                <div className="text-slate-600">Reason / Basis: {inspectedLog.reason}</div>
              )}
            </div>
          ) : null}
          <p className="text-xs text-slate-500 mt-2">
            Audit records cannot be edited or deleted through normal administration. Sensitive values such as passwords and verification codes are never logged.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 11: SETTINGS (Desktop Interface 21)
  // ============================================================================
  const clStatus = settingsData?.cloudinaryStatus || {};
  const dbStatus = settingsData?.databaseStatus || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Company identity, display preferences, Cloudinary image storage and operational policy
        </p>
      </div>

      {/* Infrastructure Status Banner (MongoDB + Cloudinary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#9A7B2C] flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              Cloudinary Media & Document Storage
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {clStatus.configured
                ? `Connected to Cloudinary Cloud (${clStatus.cloudName})`
                : 'Ready — Enter Cloudinary API credentials below or in server/.env (using safe local fallback until configured)'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">MERN Database Engine</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Mode: <strong className="text-slate-800">{dbStatus.mode || 'Active'}</strong> • Zero unwanted seed data
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form Card (Desktop Interface 21) */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs max-w-4xl space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Company display name
            </label>
            <input
              type="text"
              value={settingsForm.companyDisplayName}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, companyDisplayName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Base currency (controlled after launch)
            </label>
            <input
              type="text"
              readOnly
              value={company?.baseCurrency || 'LKR'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm font-mono-num font-bold text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Business timezone
            </label>
            <input
              type="text"
              value={settingsForm.businessTimezone}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, businessTimezone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Financial approval policy
            </label>
            <select
              value={settingsForm.financialApprovalPolicy}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, financialApprovalPolicy: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
            >
              <option value="Independent approver required">Independent approver required</option>
              <option value="Single-operator exception logged">
                Single-operator exception logged
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Share class</label>
            <input
              type="text"
              readOnly
              value={company?.shareClass || 'Ordinary'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Share units</label>
            <input
              type="text"
              readOnly
              value="Whole shares"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Authorised / Issued ordinary shares denominator (0 = auto-derived from ledger)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={settingsForm.issuedSharesTotal}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, issuedSharesTotal: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Support contact email
            </label>
            <input
              type="email"
              value={settingsForm.supportEmail}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, supportEmail: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>

        {/* Company Logo Upload via Cloudinary */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Company logo and brand identity (Uploaded via Cloudinary)
          </label>
          <FileUploader
            folder="company_branding"
            accept=".png,.jpg,.jpeg,.webp,.svg"
            label="Upload company logo (PNG / SVG / WebP)"
            currentUrl={settingsForm.companyLogoUrl}
            currentName={settingsForm.companyLogoUrl ? 'client_logo' : ''}
            onUploaded={(file) =>
              setSettingsForm({
                ...settingsForm,
                companyLogoUrl: file.url,
                companyLogoPublicId: file.publicId
              })
            }
          />
        </div>

        {/* Optional Runtime Cloudinary Credentials Config */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Cloudinary API Configuration (Optional runtime override for server/.env)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Cloud Name"
              value={settingsForm.cloudinaryCloudName}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, cloudinaryCloudName: e.target.value })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-num"
            />
            <input
              type="text"
              placeholder="API Key"
              value={settingsForm.cloudinaryApiKey}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, cloudinaryApiKey: e.target.value })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono-num"
            />
            <PasswordInput
              placeholder="API Secret"
              autoComplete="off"
              value={settingsForm.cloudinaryApiSecret}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, cloudinaryApiSecret: e.target.value })
              }
              inputClassName="py-2 text-xs font-mono-num border-slate-200"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Changing financial structure (currency or share classes) after launch requires a separately reviewed migration rather than simply relabelling historical values.
        </p>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4AF37]/20 cursor-pointer"
        >
          Save permitted settings
        </button>
      </form>

      {/* SEED DATA & REGISTRY SAFEGUARD GOVERNANCE SECTION */}
      {(() => {
        const seed = settingsData?.seedStatus || {};
        const isBlocked = seed.seedDataBlocked || seed.seedDataBlockedPermanently;
        const hasData = seed.hasSeedData;
        const total = seed.counts?.total || 0;

        return (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0B101E] to-[#1E293B] border border-[#D4AF37]/50 flex items-center justify-center text-[#FDE047]">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Seed Data & Registry Safeguard Governance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Permanent administrator security locking, 1-click removal, and demo dataset controls.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isBlocked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <Lock className="w-3.5 h-3.5" />
                    Permanently Blocked by Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Unlock className="w-3.5 h-3.5" />
                    Seeding Unlocked
                  </span>
                )}
              </div>
            </div>

            {/* 3 Metric Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Seed Data Status
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {hasData ? `${total} Records Active` : '0 Seed Records'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {hasData
                    ? '7 Holders • 7 Movements • 5 Valuations • 5 Pubs • 3 Queries • 4 Users'
                    : 'Clean registry state — no dummy data'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Administrator Policy
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {isBlocked ? 'Permanently Locked' : 'Unlocked'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {isBlocked
                    ? `Enforced by ${seed.seedDataBlockedBy || 'Administrator'}`
                    : 'Permits Administrator seed insertion'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  One-Click Purge
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  Safe Demo Cleanup
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Purges sample records while keeping Admin credentials safe
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDemoAccountsModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#FDE047] border border-[#D4AF37]/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  View Demo Accounts
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleToggleSeedBlock(!isBlocked)}
                    disabled={seedActionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    {isBlocked ? (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-600" />
                        <span>Unlock Seed Insertion</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-rose-600" />
                        <span>Permanently Block Seeding</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {isAdmin && hasData && (
                  <button
                    type="button"
                    onClick={() => setShowClearSeedConfirm(true)}
                    disabled={seedActionLoading}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/25 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Seed Data (1-Click)</span>
                  </button>
                )}

                {isAdmin && !hasData && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isBlocked) {
                        setShowOverrideConfirm(true);
                      } else {
                        handleInsertSeedData(false);
                      }
                    }}
                    disabled={seedActionLoading}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4AF37]/25 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isBlocked ? 'Admin Override & Insert' : 'Insert Comprehensive Seed Data'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 1: Clear Seed Data Confirmation */}
      {showClearSeedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border-2 border-rose-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Remove All Seed Data in 1 Click?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              This action will permanently purge all <strong>31 sample seed records</strong>:
            </p>
            <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc pl-5">
              <li>7 Sample Shareholders (SH-001 through SH-007)</li>
              <li>7 Published Share Movements (1,000,000 shares)</li>
              <li>5 Historical Share Valuations</li>
              <li>5 Publications & Announcements</li>
              <li>3 Sample Support Queries</li>
              <li>4 Demo Testing User Accounts</li>
            </ul>
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              <strong>Safe Guarantee:</strong> Your Administrator account (<strong>{user?.email}</strong>) and company configuration will remain completely safe. The register issued shares will reset to 0.
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowClearSeedConfirm(false)}
                disabled={seedActionLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearSeedData}
                disabled={seedActionLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{seedActionLoading ? 'Removing...' : 'Yes, Purge Seed Data (1-Click)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Demo Testing Accounts */}
      {showDemoAccountsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border-2 border-[#D4AF37]/50 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B101E] border border-[#D4AF37] text-[#FDE047] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Predefined Demo Testing Credentials
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use these accounts to test dual-control Maker-Checker approvals and shareholder portal access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoAccountsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <div
                  key={acc.email}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-amber-50/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{acc.fullName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          acc.role === 'Administrator'
                            ? 'bg-purple-100 text-purple-800'
                            : acc.role === 'Approver'
                            ? 'bg-emerald-100 text-emerald-800'
                            : acc.role === 'Data officer'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {acc.role}
                      </span>
                    </div>
                    <div className="text-slate-500 font-mono-num">{acc.email}</div>
                    <div className="text-[11px] text-slate-400">{acc.description}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-mono-num font-bold text-slate-800 text-[11px]">
                      {acc.password}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(`${acc.email} | ${acc.password}`, acc.email)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[#FDE047] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAccountEmail === acc.email ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Staff 2FA code: <strong className="font-mono-num text-slate-800">246810</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowDemoAccountsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Admin Override Insertion when Blocked */}
      {showOverrideConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border-2 border-[#D4AF37]/60 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-[#B8860B] flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Seed Data is Permanently Blocked
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Permanent administrator policy is currently active to safeguard the production share register from accidental demo seeding.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              As an authenticated <strong>Administrator</strong>, would you like to execute an <strong>Administrator Override</strong> to insert the comprehensive seed data anyway?
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowOverrideConfirm(false)}
                disabled={seedActionLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleInsertSeedData(true)}
                disabled={seedActionLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4AF37]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{seedActionLoading ? 'Populating...' : 'Confirm Admin Override & Insert'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

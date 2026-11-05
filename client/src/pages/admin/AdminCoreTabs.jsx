import React, { useState, useMemo } from 'react';
import {
  Users,
  BookOpen,
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  ExternalLink,
  Layers,
  Coins,
  Calendar,
  X
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import FileUploader from '../../components/FileUploader';
import SteppedValuationChart from '../../components/SteppedValuationChart';
import PasswordInput from '../../components/PasswordInput';

export default function AdminCoreTabs({
  activeTab,
  setActiveTab,
  overviewData,
  shareholdersData,
  movementsData,
  valuationsData,
  approvalsData,
  onRefresh,
  onInspectShareholderPortal
}) {
  const { user, company, notify } = useAuth();
  const currency = company?.baseCurrency || 'LKR';

  // ============================================================================
  // STATE FOR SHAREHOLDERS (INTERFACES 09 & 10)
  // ============================================================================
  const [shSearch, setShSearch] = useState('');
  const [shStatusFilter, setShStatusFilter] = useState('All');
  const [showShForm, setShowShForm] = useState(false);
  const [editingSh, setEditingSh] = useState(null);
  const [selectedShForActions, setSelectedShForActions] = useState(null);
  const [shForm, setShForm] = useState({
    shareholderId: '',
    fullName: '',
    email: '',
    phone: '+94 ',
    postalAddress: '',
    shareholderType: 'Individual',
    votingRights: 'Per company rules',
    kycDocumentUrl: '',
    kycDocumentName: '',
    initialPassword: ''
  });

  // ============================================================================
  // STATE FOR SHARE REGISTER & MOVEMENT ENTRY (INTERFACES 11, 12 & M06)
  // ============================================================================
  const [movStatusFilter, setMovStatusFilter] = useState('All');
  const [movTypeFilter, setMovTypeFilter] = useState('All');
  const [showMovForm, setShowMovForm] = useState(false);
  const [movForm, setMovForm] = useState({
    reference: '',
    movementType: 'Transfer',
    shareClass: 'Ordinary',
    fromShareholderId: '',
    toShareholderId: '',
    quantity: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: '',
    linkedReference: '',
    supportingDocumentUrl: '',
    supportingDocumentName: '',
    affectsIssuedTotal: false
  });

  // ============================================================================
  // STATE FOR VALUATION UPDATE WIZARD (INTERFACE 13 — MATCHES BOTTOM-RIGHT MOCKUP)
  // ============================================================================
  const [valStep, setValStep] = useState(1); // 1: Enter Details, 2: Add Evidence, 3: Review & Submit
  const [valForm, setValForm] = useState({
    reference: '',
    shareClass: 'Ordinary',
    valuePerShare: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    basis: '',
    supportingDocumentUrl: '',
    supportingDocumentName: ''
  });

  // ============================================================================
  // STATE FOR APPROVALS CENTER (INTERFACE 14 — MATCHES MIDDLE-RIGHT MOCKUP)
  // ============================================================================
  const [approvalSubTab, setApprovalSubTab] = useState('Pending'); // 'Pending' | 'Approved' | 'Rejected' | 'History'
  const [selectedApprovalItem, setSelectedApprovalItem] = useState(null);
  const [reviewerComments, setReviewerComments] = useState({});

  const shareholders = shareholdersData?.shareholders || [];
  const filteredShareholders = useMemo(() => {
    return shareholders.filter((s) => {
      if (shStatusFilter !== 'All' && s.accountStatus !== shStatusFilter) return false;
      if (shSearch.trim()) {
        const q = shSearch.trim().toLowerCase();
        return (
          String(s.shareholderId || '').toLowerCase().includes(q) ||
          String(s.fullName || '').toLowerCase().includes(q) ||
          String(s.email || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [shareholders, shStatusFilter, shSearch]);

  const openCreateShareholder = () => {
    setEditingSh(null);
    setShForm({
      shareholderId: shareholdersData?.nextShareholderId || 'SH-001',
      fullName: '',
      email: '',
      phone: '+94 ',
      postalAddress: '',
      shareholderType: 'Individual',
      votingRights: 'Per company rules',
      kycDocumentUrl: '',
      kycDocumentName: '',
      initialPassword: ''
    });
    setShowShForm(true);
  };

  const openEditShareholder = (sh) => {
    setEditingSh(sh);
    setShForm({
      shareholderId: sh.shareholderId,
      fullName: sh.fullName,
      email: sh.email,
      phone: sh.phone || '+94 ',
      postalAddress: sh.postalAddress || '',
      shareholderType: sh.shareholderType || 'Individual',
      votingRights: sh.votingRights || 'Per company rules',
      kycDocumentUrl: sh.kycDocumentUrl || '',
      kycDocumentName: sh.kycDocumentName || '',
      initialPassword: ''
    });
    setShowShForm(true);
  };

  const handleSaveShareholder = async (actionType) => {
    try {
      if (editingSh) {
        const res = await api.put(`/admin/shareholders/${editingSh._id}`, {
          ...shForm,
          accountStatus:
            actionType === 'invite'
              ? 'Invited'
              : actionType === 'active'
              ? 'Active'
              : editingSh.accountStatus,
          newPassword: shForm.initialPassword || undefined,
          version: editingSh.version
        });
        notify(res.data.message);
      } else {
        const res = await api.post('/admin/shareholders', {
          ...shForm,
          actionType
        });
        notify(res.data.message);
      }
      setShowShForm(false);
      setEditingSh(null);
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not save shareholder profile.', 'error');
    }
  };

  const handleShareholderAccountAction = async (sh, action) => {
    try {
      if (action === 'delete') {
        if (!window.confirm(`Delete unused profile ${sh.shareholderId} (${sh.fullName})?`)) return;
        const res = await api.delete(`/admin/shareholders/${sh._id}`);
        notify(res.data.message);
        setSelectedShForActions(null);
      } else if (action === 'suspend') {
        const nextStatus = sh.accountStatus === 'Suspended' ? 'Active' : 'Suspended';
        const res = await api.put(`/admin/shareholders/${sh._id}`, {
          accountStatus: nextStatus
        });
        notify(res.data.message);
      } else if (action === 'reset-invite') {
        const res = await api.put(`/admin/shareholders/${sh._id}`, {
          resetInvite: true,
          accountStatus: 'Invited'
        });
        notify(`Invitation reset. Invite token: ${res.data.inviteToken || 'Generated'}`);
      }
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Action failed.', 'error');
    }
  };

  const handleSaveMovement = async (submitForApproval) => {
    try {
      const res = await api.post('/admin/movements', {
        ...movForm,
        quantity: Number(movForm.quantity),
        submitForApproval
      });
      notify(res.data.message);
      setShowMovForm(false);
      setMovForm({
        reference: '',
        movementType: 'Transfer',
        shareClass: 'Ordinary',
        fromShareholderId: '',
        toShareholderId: '',
        quantity: '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: '',
        linkedReference: '',
        supportingDocumentUrl: '',
        supportingDocumentName: '',
        affectsIssuedTotal: false
      });
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to save share movement.', 'error');
    }
  };

  const handleSaveValuation = async (submitForApproval) => {
    if (!valForm.valuePerShare || Number(valForm.valuePerShare) <= 0) {
      notify('Please enter a valid positive value per share.', 'error');
      return;
    }
    try {
      const res = await api.post('/admin/valuations', {
        ...valForm,
        reference: valForm.reference || valuationsData?.nextReference || '',
        basis: valForm.basis || 'Updated based on the latest board-approved valuation.',
        valuePerShare: Number(valForm.valuePerShare),
        submitForApproval
      });
      notify(res.data.message);
      setValForm({
        reference: '',
        shareClass: 'Ordinary',
        valuePerShare: '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        basis: '',
        supportingDocumentUrl: '',
        supportingDocumentName: ''
      });
      setValStep(1);
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to save valuation.', 'error');
    }
  };

  const handleApprovalDecision = async (itemType, itemId, decision, forcePublishScheduled = false) => {
    const comment = reviewerComments[itemId] || '';
    try {
      const res = await api.post('/admin/approvals/action', {
        itemType,
        itemId,
        decision,
        reviewerComment: comment,
        forcePublishScheduled
      });
      notify(res.data.message);
      setSelectedApprovalItem(null);
      onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || 'Approval action failed.', 'error');
    }
  };

  // ============================================================================
  // TAB 1: DASHBOARD / COMPANY OVERVIEW (Interface 08 & Mobile M05)
  // ============================================================================
  if (activeTab === 'overview') {
    const sum = overviewData?.summary || {};
    const checks = overviewData?.registerChecks || {};
    const pendingItems = overviewData?.pendingItems || [];
    const pubVal = sum.publishedValuation;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Administration Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Company-wide share register, reconciliation checks, and pending approvals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('shareholders');
                openCreateShareholder();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#6D28D9]" />
              Add Shareholder
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setShowMovForm(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] hover:from-[#5B21B6] hover:to-[#6D28D9] text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Share Movement
            </button>
          </div>
        </div>

        {/* 4 Pastel-Tinted KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-white via-[#F5F3FF] to-[#EDE9FE] border border-purple-200/70 p-5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-300/50 flex items-center justify-center text-[#6D28D9]">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono-num mt-3">
              {Number(sum.issuedShares || 0).toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              Issued {company?.shareClass || 'Ordinary'} Shares
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-white via-[#EFF6FF] to-[#DBEAFE] border border-blue-200/70 p-5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-300/50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono-num mt-3">
              {Number(sum.totalShareholders || 0).toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              Shareholders ({sum.activeShareholders || 0} Active)
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-white via-[#FFFBEB] to-[#FEF3C7] border border-amber-200/70 p-5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-300/60 flex items-center justify-center text-amber-600">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono-num mt-3">
              {pubVal
                ? `${currency} ${Number(pubVal.valuePerShare).toFixed(2)}`
                : `${currency} 0.00`}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              {pubVal ? `Published Value (${pubVal.effectiveDate})` : 'No Published Valuation Yet'}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('approvals')}
            className="rounded-2xl bg-gradient-to-br from-[#6D28D9] via-[#7C3AED] to-[#4F46E5] text-white p-5 shadow-lg shadow-purple-700/25 cursor-pointer hover:scale-[1.01] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono-num mt-3">
              {sum.pendingReviewsCount || 0}
            </div>
            <div className="text-xs font-semibold text-purple-100 mt-0.5">
              Pending Approvals →
            </div>
          </div>
        </div>

        {/* Pending Items Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Pending Review & Draft Queue
              </h3>
              <p className="text-xs text-slate-500">
                Draft and submitted items remain hidden from shareholder views until approved and published
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className="text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] cursor-pointer"
            >
              Open Approvals →
            </button>
          </div>

          {pendingItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No pending drafts or submissions awaiting review.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-6">Pending Item</th>
                    <th className="py-3 px-6">Requested By</th>
                    <th className="py-3 px-6">Effective Date</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pendingItems.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50/30">
                      <td className="py-3.5 px-6 font-bold text-slate-900 font-mono-num">
                        {item.label}
                      </td>
                      <td className="py-3.5 px-6 text-slate-600">{item.enteredBy}</td>
                      <td className="py-3.5 px-6 font-mono-num text-slate-600">
                        {item.effectiveDate}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#6D28D9] border border-purple-200">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTab(item.itemType === 'shareholder' ? 'shareholders' : 'approvals')
                          }
                          className="px-3.5 py-1.5 rounded-lg border border-[#7C3AED] text-[#6D28D9] hover:bg-[#6D28D9] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Register Checks Bar */}
        <div
          className={`rounded-2xl border p-6 shadow-xs flex flex-wrap items-center justify-between gap-4 ${
            checks.isReconciled
              ? 'bg-white border-emerald-200/90'
              : 'bg-amber-50/70 border-amber-300'
          }`}
        >
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              {checks.isReconciled ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              Register Reconciliation Checks
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-700 font-medium">
              <span>
                Allocated{' '}
                <strong className="font-mono-num text-slate-900">
                  {Number(checks.allocatedShares || 0).toLocaleString()}
                </strong>{' '}
                / Issued{' '}
                <strong className="font-mono-num text-slate-900">
                  {Number(checks.issuedShares || 0).toLocaleString()}
                </strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                {checks.hasNegativeBalances ? (
                  <strong className="text-rose-600">Negative balance detected</strong>
                ) : (
                  'No negative balances'
                )}
              </span>
              <span className="text-slate-300">•</span>
              <span
                className={`font-bold ${
                  checks.isReconciled ? 'text-emerald-700' : 'text-amber-800'
                }`}
              >
                {checks.isReconciled
                  ? 'Reconciled'
                  : `Unallocated difference: ${Number(checks.difference || 0).toLocaleString()} shares`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className="px-4 py-2 rounded-xl bg-[#0D1127] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            Run Reconciliation Report
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 2: SHAREHOLDERS DIRECTORY & CREATION (Interfaces 09 & 10)
  // ============================================================================
  if (activeTab === 'shareholders') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Shareholders</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {showShForm
                ? `Create or maintain verified shareholder profile / ${shForm.shareholderId}`
                : 'Search, create and maintain shareholder accounts separately from their financial ledger.'}
            </p>
          </div>
          {!showShForm ? (
            <button
              type="button"
              onClick={openCreateShareholder}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Shareholder
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowShForm(false);
                setEditingSh(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
            >
              ← Back to Shareholder List
            </button>
          )}
        </div>

        {showShForm ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs max-w-4xl">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              {editingSh
                ? `Edit Shareholder Profile / ${editingSh.shareholderId}`
                : `Create Shareholder Profile / ${shForm.shareholderId}`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shareholder ID
                </label>
                <input
                  type="text"
                  readOnly={Boolean(editingSh)}
                  value={shForm.shareholderId}
                  onChange={(e) => setShForm({ ...shForm, shareholderId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono-num text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account status
                </label>
                <input
                  type="text"
                  readOnly
                  value={editingSh ? editingSh.accountStatus : 'Invited / Active upon creation'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full name or entity name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anura Perera"
                  value={shForm.fullName}
                  onChange={(e) => setShForm({ ...shForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="new.holder@example.com"
                  value={shForm.email}
                  onChange={(e) => setShForm({ ...shForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone number
                </label>
                <input
                  type="text"
                  placeholder="+94 77 123 4567"
                  value={shForm.phone}
                  onChange={(e) => setShForm({ ...shForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shareholder type
                </label>
                <select
                  value={shForm.shareholderType}
                  onChange={(e) => setShForm({ ...shForm, shareholderType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="Individual">Individual</option>
                  <option value="Corporate">Corporate Entity</option>
                  <option value="Joint">Joint Holders</option>
                  <option value="Trust">Trust / Nominee</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Postal address
              </label>
              <input
                type="text"
                placeholder="Enter verified address"
                value={shForm.postalAddress}
                onChange={(e) => setShForm({ ...shForm, postalAddress: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional initial login password (leave blank to require Invite Activation)
                </label>
                <PasswordInput
                  placeholder="Optional direct password (min 8 chars)"
                  showStrength
                  autoComplete="new-password"
                  value={shForm.initialPassword}
                  onChange={(e) => setShForm({ ...shForm, initialPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Identity / KYC verification document (Cloudinary)
                </label>
                <FileUploader
                  folder="shareholder_kyc"
                  label="Attach KYC / Identity Document"
                  currentUrl={shForm.kycDocumentUrl}
                  currentName={shForm.kycDocumentName}
                  onUploaded={(file) =>
                    setShForm({
                      ...shForm,
                      kycDocumentUrl: file.url,
                      kycDocumentName: file.name
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  handleSaveShareholder(shForm.initialPassword ? 'active' : 'invite')
                }
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer"
              >
                {shForm.initialPassword ? 'Save & Activate' : 'Save & Invite'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveShareholder('draft')}
                className="px-5 py-2.5 rounded-xl bg-[#0D1127] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Save Draft
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, Shareholder ID or email..."
                  value={shSearch}
                  onChange={(e) => setShSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {['All', 'Active', 'Invited', 'Draft', 'Suspended'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setShStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      shStatusFilter === st
                        ? 'bg-[#6D28D9] text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Shareholders Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {filteredShareholders.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No shareholder profiles found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &ldquo;Add Shareholder&rdquo; to create your first verified shareholder profile.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-6">ID & Shareholder</th>
                        <th className="py-3 px-6">Shares</th>
                        <th className="py-3 px-6">Ownership</th>
                        <th className="py-3 px-6">Account Status</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredShareholders.map((sh) => (
                        <tr
                          key={sh._id}
                          onClick={() => setSelectedShForActions(sh)}
                          className={`hover:bg-purple-50/30 cursor-pointer transition-colors ${
                            selectedShForActions?._id === sh._id ? 'bg-purple-50/60' : ''
                          }`}
                        >
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono-num font-bold text-[#6D28D9] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                                {sh.shareholderId}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900">{sh.fullName}</div>
                                <div className="text-[11px] text-slate-500">{sh.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 font-mono-num font-bold text-slate-900">
                            {Number(sh.shares || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-6 font-mono-num font-semibold text-slate-700">
                            {Number(sh.ownershipPercent || 0).toFixed(2)}%
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                sh.accountStatus === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : sh.accountStatus === 'Invited'
                                  ? 'bg-purple-50 text-[#6D28D9] border border-purple-200'
                                  : sh.accountStatus === 'Suspended'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {sh.accountStatus}
                            </span>
                            {sh.inviteToken && (
                              <span className="ml-2 text-[10px] font-mono-num text-slate-500">
                                Code: {sh.inviteToken}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditShareholder(sh);
                              }}
                              className="px-3 py-1 rounded-lg border border-[#7C3AED] text-[#6D28D9] hover:bg-[#6D28D9] hover:text-white font-bold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspectShareholderPortal &&
                                  onInspectShareholderPortal(sh.shareholderId);
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                            >
                              Portal View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Account Actions Panel */}
            {selectedShForActions && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Selected: {selectedShForActions.shareholderId} — {selectedShForActions.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Delete is available only for eligible records without linked financial history.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() =>
                      handleShareholderAccountAction(selectedShForActions, 'reset-invite')
                    }
                    className="px-3 py-1.5 rounded-lg bg-purple-50 text-[#6D28D9] hover:bg-purple-100 cursor-pointer"
                  >
                    Reset Invitation
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleShareholderAccountAction(selectedShForActions, 'suspend')
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer"
                  >
                    {selectedShForActions.accountStatus === 'Suspended'
                      ? 'Restore Access'
                      : 'Suspend Access'}
                  </button>
                  {!selectedShForActions.hasLinkedHistory && (
                    <button
                      type="button"
                      onClick={() =>
                        handleShareholderAccountAction(selectedShForActions, 'delete')
                      }
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                    >
                      Delete Unused Profile
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ============================================================================
  // TAB 3: SHARE REGISTER LEDGER & NEW MOVEMENT (Interfaces 11, 12 & Mobile M06)
  // ============================================================================
  if (activeTab === 'register') {
    const movements = (movementsData?.movements || []).filter((m) => {
      if (movStatusFilter !== 'All' && m.status !== movStatusFilter) return false;
      if (movTypeFilter !== 'All' && m.movementType !== movTypeFilter) return false;
      return true;
    });
    const holdings = movementsData?.holdingsByShareholder || {};
    const issuedTotal = movementsData?.issuedSharesTotal || 0;

    const qtyNum = Number(movForm.quantity) || 0;
    const fromCurr = movForm.fromShareholderId ? holdings[movForm.fromShareholderId] || 0 : null;
    const toCurr = movForm.toShareholderId ? holdings[movForm.toShareholderId] || 0 : null;
    const fromAfter = fromCurr !== null ? fromCurr - qtyNum : null;
    const toAfter = toCurr !== null ? toCurr + qtyNum : null;
    const hasBalanceError =
      ['Transfer', 'Cancellation', 'Correction'].includes(movForm.movementType) &&
      fromCurr !== null &&
      qtyNum > fromCurr;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Share Register
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {showMovForm
                ? `New ${movForm.movementType.toLowerCase()} entry • Live impact preview before submission`
                : 'Every allocation, transfer, and correction has a traceable reference.'}
            </p>
          </div>
          {!showMovForm ? (
            <button
              type="button"
              onClick={() => setShowMovForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Movement
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowMovForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
            >
              ← Back to Share Register
            </button>
          )}
        </div>

        {showMovForm ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Movement type
                </label>
                <select
                  value={movForm.movementType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setMovForm({
                      ...movForm,
                      movementType: nextType,
                      affectsIssuedTotal: ['Opening', 'Allocation', 'Cancellation'].includes(nextType)
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold"
                >
                  <option value="Opening">Opening balance (OPEN)</option>
                  <option value="Allocation">New allocation / issue (AL)</option>
                  <option value="Transfer">Share transfer between holders (TR)</option>
                  <option value="Correction">Approved correction / adjustment (COR)</option>
                  <option value="Cancellation">Share cancellation / buyback (CAN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Share class
                </label>
                <select
                  value={movForm.shareClass}
                  onChange={(e) => setMovForm({ ...movForm, shareClass: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="Ordinary">Ordinary</option>
                </select>
              </div>

              {['Transfer', 'Cancellation', 'Correction'].includes(movForm.movementType) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    From shareholder {movForm.movementType === 'Correction' ? '(if deducting)' : '*'}
                  </label>
                  <select
                    value={movForm.fromShareholderId}
                    onChange={(e) =>
                      setMovForm({ ...movForm, fromShareholderId: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="">Select source shareholder...</option>
                    {shareholders.map((s) => (
                      <option key={s.shareholderId} value={s.shareholderId}>
                        {s.shareholderId} / {s.fullName} (Balance: {Number(s.shares || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {['Opening', 'Allocation', 'Transfer', 'Correction'].includes(
                movForm.movementType
              ) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    To shareholder {movForm.movementType === 'Correction' ? '(if adding)' : '*'}
                  </label>
                  <select
                    value={movForm.toShareholderId}
                    onChange={(e) =>
                      setMovForm({ ...movForm, toShareholderId: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="">Select recipient shareholder...</option>
                    {shareholders.map((s) => (
                      <option key={s.shareholderId} value={s.shareholderId}>
                        {s.shareholderId} / {s.fullName} (Balance: {Number(s.shares || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity (Whole shares) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 2500"
                  value={movForm.quantity}
                  onChange={(e) => setMovForm({ ...movForm, quantity: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Effective date *
                </label>
                <input
                  type="date"
                  value={movForm.effectiveDate}
                  onChange={(e) => setMovForm({ ...movForm, effectiveDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num"
                />
              </div>
            </div>

            {movForm.movementType === 'Correction' && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Linked original movement reference *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AL-002 or TR-014"
                  value={movForm.linkedReference}
                  onChange={(e) => setMovForm({ ...movForm, linkedReference: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num"
                />
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason and supporting document
              </label>
              <input
                type="text"
                placeholder="e.g. Approved transfer request / Board allocation resolution"
                value={movForm.reason}
                onChange={(e) => setMovForm({ ...movForm, reason: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm mb-2.5"
              />
              <FileUploader
                folder="share_movements"
                label="Attach supporting document (PDF / Image via Cloudinary)"
                currentUrl={movForm.supportingDocumentUrl}
                currentName={movForm.supportingDocumentName}
                onUploaded={(file) =>
                  setMovForm({
                    ...movForm,
                    supportingDocumentUrl: file.url,
                    supportingDocumentName: file.name
                  })
                }
              />
            </div>

            {/* Live Impact Preview Banner */}
            <div
              className={`mt-5 p-4 rounded-xl border text-xs font-semibold ${
                hasBalanceError
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-[#F6F5FF] border-purple-200 text-purple-950'
              }`}
            >
              {hasBalanceError ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Insufficient balance error: {movForm.fromShareholderId} holds{' '}
                    {Number(fromCurr).toLocaleString()} shares, so {qtyNum.toLocaleString()} shares cannot be deducted.
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-num">
                  <span className="font-bold text-[#6D28D9]">Impact Preview:</span>
                  {movForm.fromShareholderId && (
                    <span>
                      {movForm.fromShareholderId}: {Number(fromCurr).toLocaleString()} →{' '}
                      <strong>{Number(fromAfter).toLocaleString()}</strong>
                    </span>
                  )}
                  {movForm.toShareholderId && (
                    <span>
                      {movForm.toShareholderId}: {Number(toCurr).toLocaleString()} →{' '}
                      <strong>{Number(toAfter).toLocaleString()}</strong>
                    </span>
                  )}
                  <span>
                    |{' '}
                    {movForm.movementType === 'Transfer'
                      ? 'Issued total unchanged'
                      : `Company issued total: ${issuedTotal.toLocaleString()} → ${(
                          issuedTotal +
                          (movForm.movementType === 'Cancellation' ? -qtyNum : qtyNum)
                        ).toLocaleString()}`}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={hasBalanceError}
                onClick={() => handleSaveMovement(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
              >
                Submit for Approval
              </button>
              <button
                type="button"
                disabled={hasBalanceError}
                onClick={() => handleSaveMovement(false)}
                className="px-5 py-2.5 rounded-xl bg-[#0D1127] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Save Draft
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1.5 rounded-lg bg-purple-50 font-bold text-[#6D28D9]">
                  Class: {company?.shareClass || 'Ordinary'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600">Status:</span>
                  <select
                    value={movStatusFilter}
                    onChange={(e) => setMovStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="All">All statuses</option>
                    <option value="Published">Published</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Returned">Returned</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600">Type:</span>
                  <select
                    value={movTypeFilter}
                    onChange={(e) => setMovTypeFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="All">All types</option>
                    <option value="Opening">Opening</option>
                    <option value="Allocation">Allocation</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Correction">Correction</option>
                  </select>
                </div>
              </div>
              <div className="text-slate-500 font-medium">
                Total records: <strong className="text-slate-900">{movements.length}</strong>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {movements.length === 0 ? (
                <div className="p-10 text-center">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No share movements recorded yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &ldquo;New Movement&rdquo; to enter an Opening balance, Allocation, or Transfer.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-6">Reference / Type</th>
                        <th className="py-3 px-6">Holder</th>
                        <th className="py-3 px-6">Quantity</th>
                        <th className="py-3 px-6">Effective Date</th>
                        <th className="py-3 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {movements.map((m) => (
                        <tr key={m._id} className="hover:bg-purple-50/30">
                          <td className="py-3.5 px-6">
                            <div className="font-mono-num font-bold text-slate-900">
                              {m.reference} • {m.movementType}
                            </div>
                            {m.reason && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{m.reason}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-6 font-mono-num font-semibold text-slate-800">
                            {m.movementType === 'Transfer'
                              ? `${m.fromShareholderId} → ${m.toShareholderId}`
                              : m.toShareholderId || m.fromShareholderId}
                          </td>
                          <td className="py-3.5 px-6 font-mono-num font-bold text-slate-900">
                            {['Opening', 'Allocation'].includes(m.movementType)
                              ? `+${Number(m.quantity).toLocaleString()}`
                              : Number(m.quantity).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-6 font-mono-num text-slate-600">
                            {m.effectiveDate}
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                m.status === 'Published'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : m.status === 'Submitted'
                                  ? 'bg-purple-50 text-[#6D28D9] border border-purple-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ============================================================================
  // TAB 4: VALUATION UPDATE (Matches Bottom-Right Desktop Screen in Reference Image)
  // ============================================================================
  if (activeTab === 'values') {
    const currPub = valuationsData?.currentPublishedValuation;
    const currValNum = currPub ? Number(currPub.valuePerShare) : null;
    const enteredNum = Number(valForm.valuePerShare) || (currValNum || 125);
    const issuedOrdinaryShares = Number(
      overviewData?.summary?.issuedShares || movementsData?.issuedSharesTotal || 0
    );
    const indicativeCompanyValue = issuedOrdinaryShares * enteredNum;

    // Sample shareholder impact row (matches "SH-001 Holding (12,500) -> LKR 1,562,500" in reference image)
    const sampleShareholder = shareholders[0] || {
      shareholderId: 'SH-001',
      shares: 12500
    };
    const sampleShares = Number(sampleShareholder.shares) || 0;
    const sampleHoldingValue = sampleShares * enteredNum;

    const nextRef = valuationsData?.nextReference || 'VAL-001';
    const allValuations = valuationsData?.valuations || [];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Valuation Update
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Prepare and submit a new value per share for approval.
          </p>
        </div>

        {/* Main Valuation Update Card (Matches Bottom-Right Mockup) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          {/* 3-Step Horizontal Stepper Bar */}
          <div className="flex items-center justify-center max-w-xl mx-auto mb-8">
            {[
              { step: 1, label: 'Enter Details' },
              { step: 2, label: 'Add Evidence' },
              { step: 3, label: 'Review & Submit' }
            ].map((item, idx) => {
              const isActive = valStep === item.step;
              const isCompleted = valStep > item.step;
              return (
                <React.Fragment key={item.step}>
                  <button
                    type="button"
                    onClick={() => setValStep(item.step)}
                    className="flex items-center gap-2.5 text-xs sm:text-sm font-bold cursor-pointer group"
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                        isActive
                          ? 'bg-[#6D28D9] text-white shadow-md shadow-purple-500/30'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.step}
                    </span>
                    <span
                      className={
                        isActive
                          ? 'text-[#6D28D9] font-extrabold'
                          : 'text-slate-500 group-hover:text-slate-800'
                      }
                    >
                      {item.label}
                    </span>
                  </button>
                  {idx < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 sm:mx-5 rounded-full ${
                        valStep > item.step ? 'bg-[#6D28D9]' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* 2-Column Split: Form Inputs (Left) + Impact (Illustrative) Panel (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Form Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Effective Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={valForm.effectiveDate}
                      onChange={(e) => setValForm({ ...valForm, effectiveDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Value per Share ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="125.00"
                    value={valForm.valuePerShare}
                    onChange={(e) => setValForm({ ...valForm, valuePerShare: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Notes / Valuation Basis (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Updated based on the latest board-approved valuation."
                  value={valForm.basis}
                  onChange={(e) => setValForm({ ...valForm, basis: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              {/* Supporting Document Uploader (Step 2 or always accessible) */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Valuation Evidence / Board Resolution (Cloudinary) — Reference: {valForm.reference || nextRef}
                </label>
                <FileUploader
                  folder="valuations"
                  label="Attach Board Valuation Resolution / Evidence"
                  currentUrl={valForm.supportingDocumentUrl}
                  currentName={valForm.supportingDocumentName}
                  onUploaded={(file) =>
                    setValForm({
                      ...valForm,
                      supportingDocumentUrl: file.url,
                      supportingDocumentName: file.name
                    })
                  }
                />
              </div>
            </div>

            {/* Right Column: "Impact (Illustrative)" Summary Card (Matches Reference Image Bottom-Right) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
              <div className="rounded-2xl bg-[#F6F5FF] border border-purple-200/80 p-5 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Impact (Illustrative)</h3>

                <div className="space-y-3 text-xs sm:text-sm divide-y divide-purple-200/50">
                  <div className="flex items-center justify-between pb-2.5">
                    <span className="text-slate-600 font-medium">Issued Ordinary Shares</span>
                    <span className="font-mono-num font-extrabold text-slate-900">
                      {issuedOrdinaryShares.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-600 font-medium">Indicative Company Value</span>
                    <span className="font-mono-num font-extrabold text-slate-900">
                      {currency}{' '}
                      {indicativeCompanyValue.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <span className="text-slate-600 font-medium">
                      {sampleShareholder.shareholderId} Holding ({sampleShares.toLocaleString()})
                    </span>
                    <span className="font-mono-num font-extrabold text-[#6D28D9]">
                      {currency}{' '}
                      {sampleHoldingValue.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveValuation(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveValuation(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] hover:from-[#5B21B6] hover:to-[#4F46E5] text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
                >
                  <span>Continue & Submit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stepped Valuation History Chart */}
        <SteppedValuationChart
          data={valuationsData?.publishedHistory || []}
          currency={currency}
          title="Published Valuation History"
          subtitle="Active effective valuation points visible to shareholders"
        />

        {/* All Valuation Versions Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">All Valuation Versions</h3>
          </div>
          {allValuations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No share valuations entered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-6">Reference</th>
                    <th className="py-3 px-6">Value ({currency})</th>
                    <th className="py-3 px-6">Effective Date</th>
                    <th className="py-3 px-6">Basis</th>
                    <th className="py-3 px-6">Requested By</th>
                    <th className="py-3 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {allValuations.map((v) => (
                    <tr key={v._id} className="hover:bg-purple-50/30">
                      <td className="py-3.5 px-6 font-mono-num font-bold text-slate-900">
                        {v.reference}
                      </td>
                      <td className="py-3.5 px-6 font-mono-num font-bold text-slate-900">
                        {v.currency} {Number(v.valuePerShare).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-6 font-mono-num text-slate-600">
                        {v.effectiveDate}
                      </td>
                      <td className="py-3.5 px-6 text-slate-700">{v.basis}</td>
                      <td className="py-3.5 px-6 text-slate-600">
                        {v.enteredByRole || v.enteredBy}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            v.status === 'Published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : v.status === 'Submitted'
                              ? 'bg-purple-50 text-[#6D28D9] border border-purple-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {v.status}
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
  // TAB 5: APPROVALS (Matches Middle-Right Desktop Screen in Reference Image)
  // ============================================================================
  const pendingMovements = approvalsData?.movements || [];
  const pendingValuations = approvalsData?.valuations || [];
  const pendingPublications = approvalsData?.publications || [];
  const pendingShareholders = approvalsData?.shareholders || [];

  // Unified Pending Rows matching Reference Image Table ("Reference | Request | Details | Requested By | Date | Actions")
  const unifiedPendingRows = [
    ...pendingMovements.map((mov) => ({
      id: mov._id,
      itemType: 'movement',
      reference: mov.reference,
      requestLabel:
        mov.movementType === 'Transfer'
          ? 'Share Transfer'
          : mov.movementType === 'Allocation'
          ? 'Share Allocation'
          : `Share ${mov.movementType}`,
      details:
        mov.movementType === 'Transfer'
          ? `Transfer ${Number(mov.quantity).toLocaleString()} shares ${mov.fromShareholderId} → ${mov.toShareholderId}`
          : `${mov.movementType} ${Number(mov.quantity).toLocaleString()} shares to ${
              mov.toShareholderId || mov.fromShareholderId
            }`,
      requestedBy: mov.enteredByRole || mov.enteredBy || 'Data Officer',
      date: mov.effectiveDate,
      raw: mov
    })),
    ...pendingValuations.map((val) => ({
      id: val._id,
      itemType: 'valuation',
      reference: val.reference,
      requestLabel: 'Value Update',
      details: `Update value per share to ${val.currency} ${Number(val.valuePerShare).toFixed(2)}`,
      requestedBy: val.enteredByRole || val.enteredBy || 'Data Officer',
      date: val.effectiveDate,
      raw: val
    })),
    ...pendingPublications.map((pub) => ({
      id: pub._id,
      itemType: 'publication',
      reference: pub.reference,
      requestLabel: pub.contentType || 'Publication',
      details: `${pub.title} (${
        pub.audienceType === 'Specific shareholder'
          ? pub.targetShareholderId
          : 'All shareholders'
      })`,
      requestedBy: pub.enteredByRole || pub.enteredBy || 'Data Officer',
      date: pub.periodOrDate || pub.publishedDate,
      raw: pub
    })),
    ...pendingShareholders.map((sh) => ({
      id: sh._id,
      itemType: 'shareholder',
      reference: sh.shareholderId,
      requestLabel: 'Profile Verification',
      details: `Verify shareholder profile for ${sh.fullName}`,
      requestedBy: sh.enteredBy || 'Shareholder',
      date: new Date(sh.updatedAt || Date.now()).toISOString().slice(0, 10),
      raw: sh
    }))
  ];

  // Historical / Approved / Rejected rows from movements & valuations
  const approvedHistoryRows = [
    ...(movementsData?.movements || [])
      .filter((m) => m.status === 'Published' || m.status === 'Scheduled')
      .map((m) => ({
        id: m._id,
        reference: m.reference,
        requestLabel: `Share ${m.movementType}`,
        details: `${Number(m.quantity).toLocaleString()} shares (${
          m.toShareholderId || m.fromShareholderId
        })`,
        requestedBy: m.enteredByRole || m.enteredBy || 'Staff',
        date: m.effectiveDate,
        status: m.status
      })),
    ...(valuationsData?.valuations || [])
      .filter((v) => v.status === 'Published' || v.status === 'Scheduled')
      .map((v) => ({
        id: v._id,
        reference: v.reference,
        requestLabel: 'Value Update',
        details: `${v.currency} ${Number(v.valuePerShare).toFixed(2)} per share`,
        requestedBy: v.enteredByRole || v.enteredBy || 'Staff',
        date: v.effectiveDate,
        status: v.status
      }))
  ];

  const rejectedHistoryRows = [
    ...(movementsData?.movements || [])
      .filter((m) => m.status === 'Rejected' || m.status === 'Returned')
      .map((m) => ({
        id: m._id,
        reference: m.reference,
        requestLabel: `Share ${m.movementType}`,
        details: `${Number(m.quantity).toLocaleString()} shares`,
        requestedBy: m.enteredByRole || m.enteredBy || 'Staff',
        date: m.effectiveDate,
        status: m.status
      })),
    ...(valuationsData?.valuations || [])
      .filter((v) => v.status === 'Rejected' || v.status === 'Returned')
      .map((v) => ({
        id: v._id,
        reference: v.reference,
        requestLabel: 'Value Update',
        details: `${v.currency} ${Number(v.valuePerShare).toFixed(2)} per share`,
        requestedBy: v.enteredByRole || v.enteredBy || 'Staff',
        date: v.effectiveDate,
        status: v.status
      }))
  ];

  const activeReviewRow =
    selectedApprovalItem &&
    unifiedPendingRows.find((r) => r.id === selectedApprovalItem.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Approvals</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Review and approve pending changes before publication.
        </p>
      </div>

      {/* Main Approvals Card (Matches Middle-Right Mockup) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Sub-Tabs Bar: Pending (N) | Approved | Rejected | History */}
        <div className="px-6 pt-4 border-b border-slate-200/80 flex items-center gap-6 overflow-x-auto">
          {[
            { id: 'Pending', label: `Pending (${unifiedPendingRows.length})` },
            { id: 'Approved', label: 'Approved' },
            { id: 'Rejected', label: 'Rejected' },
            { id: 'History', label: 'History' }
          ].map((tab) => {
            const active = approvalSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setApprovalSubTab(tab.id);
                  setSelectedApprovalItem(null);
                }}
                className={`pb-3.5 text-xs sm:text-sm font-bold whitespace-nowrap relative transition-colors cursor-pointer ${
                  active ? 'text-[#6D28D9]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 rounded-full bg-[#6D28D9]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Table Content */}
        {approvalSubTab === 'Pending' ? (
          unifiedPendingRows.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-900">All caught up!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                There are no pending share movements, valuation updates, or publications awaiting review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 pl-6 pr-2 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        className="w-4 h-4 rounded border-slate-300 text-[#6D28D9]"
                      />
                    </th>
                    <th className="py-3.5 px-4">Reference</th>
                    <th className="py-3.5 px-4">Request</th>
                    <th className="py-3.5 px-4">Details</th>
                    <th className="py-3.5 px-4">Requested By</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {unifiedPendingRows.map((row) => {
                    const isSelected = activeReviewRow?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-purple-50/30 transition-colors ${
                          isSelected ? 'bg-purple-50/60' : ''
                        }`}
                      >
                        <td className="py-4 pl-6 pr-2">
                          <input
                            type="checkbox"
                            checked={Boolean(isSelected)}
                            onChange={() =>
                              setSelectedApprovalItem(isSelected ? null : row)
                            }
                            className="w-4 h-4 rounded border-slate-300 text-[#6D28D9]"
                          />
                        </td>
                        <td className="py-4 px-4 font-mono-num font-extrabold text-slate-900">
                          {row.reference}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-800">
                          {row.requestLabel}
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-medium">
                          {row.details}
                        </td>
                        <td className="py-4 px-4 text-slate-600">{row.requestedBy}</td>
                        <td className="py-4 px-4 font-mono-num text-slate-600">{row.date}</td>
                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedApprovalItem(isSelected ? null : row)
                            }
                            className={`px-4 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#6D28D9] border-[#6D28D9] text-white shadow-sm'
                                : 'border-[#7C3AED] text-[#6D28D9] hover:bg-[#6D28D9] hover:text-white'
                            }`}
                          >
                            {isSelected ? 'Reviewing' : 'Review'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Approved / Rejected / History Sub-tabs */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Reference</th>
                  <th className="py-3.5 px-4">Request</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">Requested By</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {(approvalSubTab === 'Rejected'
                  ? rejectedHistoryRows
                  : approvedHistoryRows
                ).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-6 font-mono-num font-bold text-slate-900">
                      {row.reference}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {row.requestLabel}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{row.details}</td>
                    <td className="py-3.5 px-4 text-slate-500">{row.requestedBy}</td>
                    <td className="py-3.5 px-4 font-mono-num text-slate-500">{row.date}</td>
                    <td className="py-3.5 px-6 text-right">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          row.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expanded Before-and-After Review Panel (Opens when clicking "Review" on any Pending row, or shows first pending item) */}
      {(activeReviewRow || unifiedPendingRows[0]) && approvalSubTab === 'Pending' && (() => {
        const target = activeReviewRow || unifiedPendingRows[0];
        const raw = target.raw;
        const cmp = raw.liveComparison || {};

        return (
          <div className="bg-white rounded-2xl border-2 border-[#7C3AED]/40 p-6 sm:p-7 shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D28D9] text-[11px] font-bold mb-1.5">
                  Before & After Approval Inspection
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Review {target.requestLabel}: {target.reference}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requested by <strong>{target.requestedBy}</strong> • Effective Date:{' '}
                  <strong className="font-mono-num">{target.date}</strong>
                </p>
              </div>
              {selectedApprovalItem && (
                <button
                  type="button"
                  onClick={() => setSelectedApprovalItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Before-and-After Impact Table for Share Movements */}
            {target.itemType === 'movement' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-4">Record</th>
                      <th className="py-2.5 px-4">Current Balance</th>
                      <th className="py-2.5 px-4">Proposed Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono-num">
                    {cmp.fromShareholderId && (
                      <tr>
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          {cmp.fromShareholderId} ({cmp.fromShareholderName || 'Source Holder'})
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {Number(cmp.fromCurrent || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-600">
                          {Number(cmp.fromProposed || 0).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    {cmp.toShareholderId && (
                      <tr>
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          {cmp.toShareholderId} ({cmp.toShareholderName || 'Recipient Holder'})
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {Number(cmp.toCurrent || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">
                          {Number(cmp.toProposed || 0).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50/70">
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        Company Issued Shares
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {Number(cmp.issuedCurrent || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {Number(cmp.issuedProposed || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Valuation Comparison Summary */}
            {target.itemType === 'valuation' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#F6F5FF] border border-purple-200 text-xs">
                <div>
                  <span className="text-slate-500">Current Published Value:</span>
                  <div className="font-mono-num font-bold text-slate-900 text-sm mt-0.5">
                    {approvalsData?.currentPublishedValuation
                      ? `${raw.currency} ${Number(
                          approvalsData.currentPublishedValuation.valuePerShare
                        ).toFixed(2)}`
                      : 'Opening Valuation'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Proposed Value per Share:</span>
                  <div className="font-mono-num font-extrabold text-[#6D28D9] text-sm mt-0.5">
                    {raw.currency} {Number(raw.valuePerShare).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Basis / Note:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{raw.basis}</div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reviewer Comment / Audit Note
              </label>
              <input
                type="text"
                placeholder="Confirm authorisation and supporting evidence..."
                value={reviewerComments[target.id] || ''}
                onChange={(e) =>
                  setReviewerComments({ ...reviewerComments, [target.id]: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleApprovalDecision(target.itemType, target.id, 'approve', true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] hover:from-[#5B21B6] hover:to-[#6D28D9] text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer"
              >
                Approve & Publish
              </button>
              <button
                type="button"
                onClick={() => handleApprovalDecision(target.itemType, target.id, 'return')}
                className="px-4 py-2.5 rounded-xl bg-[#0D1127] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Return for Correction
              </button>
              <button
                type="button"
                onClick={() => handleApprovalDecision(target.itemType, target.id, 'reject')}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

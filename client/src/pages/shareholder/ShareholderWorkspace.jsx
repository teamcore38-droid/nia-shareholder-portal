import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  FileText,
  Bell,
  ShieldCheck,
  Download,
  ExternalLink,
  Send,
  Lock,
  LogOut,
  Calendar,
  Layers,
  ChevronRight,
  PlusCircle,
  MinusCircle,
  UserCheck,
  Coins,
  BarChart3,
  Percent,
  Sparkles
} from 'lucide-react';
import api, { getDownloadUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import SteppedValuationChart from '../../components/SteppedValuationChart';
import PasswordInput from '../../components/PasswordInput';

// Helper SVG Donut Chart for "Ownership in Company" (Matches Reference Image Top-Right & Mobile Holdings)
function OwnershipDonutChart({ ownershipPercent = 0, myShares = 0, issuedShares = 0, compact = false }) {
  const pct = Math.min(Math.max(Number(ownershipPercent) || 0, 0), 100);
  const visualPct = pct > 0 && pct < 6 ? 6 : pct; // Ensure small positive % is clearly visible on the ring
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (visualPct / 100) * circumference;
  const otherShares = Math.max(0, Number(issuedShares || 0) - Number(myShares || 0));
  const otherPct = Math.max(0, 100 - pct).toFixed(2);

  return (
    <div className={`flex ${compact ? 'flex-col items-center' : 'flex-col sm:flex-row items-center justify-between'} gap-6`}>
      <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          {/* Background Ring */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="14"
          />
          {/* Foreground Imperial Gold Arc */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#D4AF37"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <span className="text-xl font-extrabold text-slate-900 font-mono-num leading-none">
            {pct.toFixed(2)}%
          </span>
          <span className="text-[10px] font-medium text-slate-500 mt-1">
            {compact ? 'Ownership' : 'of issued shares'}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="space-y-3.5 flex-1 w-full">
          <div className="flex items-start gap-2.5">
            <span className="w-3.5 h-3.5 rounded bg-[#D4AF37] shrink-0 mt-0.5 shadow-2xs" />
            <div>
              <div className="text-xs font-extrabold text-slate-900">Your Holding</div>
              <div className="text-xs text-slate-500 font-mono-num">
                {Number(myShares || 0).toLocaleString()} shares ({pct.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-extrabold text-slate-700">Other Shareholders</div>
              <div className="text-xs text-slate-500 font-mono-num">
                {otherShares.toLocaleString()} shares ({otherPct}%)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper SVG Vertical Bar Chart for "Share Movements (Cumulative Holding)" (Matches Reference Image Middle-Left)
function CumulativeHoldingBarChart({ ledger = [], currentShares = 0 }) {
  const bars = useMemo(() => {
    const chrono = [...ledger].reverse();
    if (chrono.length === 0) {
      return [
        { label: 'Opening', value: currentShares, isCurrent: true }
      ];
    }
    const sliced = chrono.slice(-6);
    return sliced.map((item, idx) => {
      const d = new Date(item.effectiveDate);
      const label = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-GB', { month: 'short' })
        : item.reference;
      return {
        label,
        date: item.effectiveDate,
        reference: item.reference,
        value: Number(item.balanceAfter) || 0,
        isCurrent: idx === sliced.length - 1
      };
    });
  }, [ledger, currentShares]);

  const maxVal = Math.max(...bars.map((b) => b.value), 100);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));

  return (
    <div className="pt-2">
      <h4 className="text-sm font-extrabold text-slate-900 mb-4">
        Share Movements (Cumulative Holding)
      </h4>

      <div className="relative pt-6 pb-2">
        <div className="grid grid-cols-12 gap-2 items-end h-48 border-b border-slate-200/80 pb-2 px-2 relative">
          {/* Y-Axis Labels Column */}
          <div className="col-span-2 h-full flex flex-col justify-between text-[11px] font-mono-num text-slate-400 pr-2 text-right">
            {[...yTicks].reverse().map((val, i) => (
              <span key={i}>{val.toLocaleString()}</span>
            ))}
          </div>

          {/* Bars Container */}
          <div className="col-span-10 h-full flex items-end justify-around gap-3 pl-2 border-l border-slate-100">
            {bars.map((b, idx) => {
              const heightPct = maxVal > 0 ? Math.max((b.value / maxVal) * 100, 10) : 10;
              return (
                <div
                  key={idx}
                  className="flex-1 max-w-[54px] h-full flex flex-col items-center justify-end group relative"
                >
                  {/* Floating Obsidian & Gold Pill on Current Bar */}
                  {b.isCurrent && (
                    <div className="mb-1.5 px-2.5 py-0.5 rounded-lg bg-[#080C16] text-[#FDE047] border border-[#D4AF37]/40 text-[11px] font-extrabold font-mono-num shadow-md whitespace-nowrap">
                      {b.value.toLocaleString()}
                    </div>
                  )}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      b.isCurrent
                        ? 'bg-gradient-to-t from-[#9A7B2C] via-[#D4AF37] to-[#FDE047] shadow-md shadow-[#D4AF37]/25'
                        : 'bg-[#D4AF37]/35 hover:bg-[#D4AF37]/60'
                    }`}
                    title={`${b.label}: ${b.value.toLocaleString()} shares`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="grid grid-cols-12 gap-2 pt-2 px-2">
          <div className="col-span-2" />
          <div className="col-span-10 flex items-center justify-around gap-3 pl-2">
            {bars.map((b, idx) => (
              <div
                key={idx}
                className={`flex-1 max-w-[54px] text-center text-xs ${
                  b.isCurrent ? 'font-extrabold text-slate-900' : 'font-medium text-slate-500'
                }`}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// In-memory cache keyed by shareholderId so toggling workspaces or switching holders renders in 0ms
const cachedShareholderWorkspaceByHolder = new Map();

export function clearShareholderWorkspaceCache() {
  cachedShareholderWorkspaceByHolder.clear();
}

export default function ShareholderWorkspace({
  activeTab,
  setActiveTab,
  previewShareholderId,
  onBadgesUpdate
}) {
  const { user, company, notify, applySession } = useAuth();
  const cacheKey = previewShareholderId || user?.shareholderId || 'self';
  const initialCached = cachedShareholderWorkspaceByHolder.get(cacheKey);

  const [overviewData, setOverviewData] = useState(() => initialCached?.overview || null);
  const [holdingsData, setHoldingsData] = useState(() => initialCached?.holdings || null);
  const [historyData, setHistoryData] = useState(() => initialCached?.history || null);
  const [documentsData, setDocumentsData] = useState(() => initialCached?.documents || null);
  const [announcementsData, setAnnouncementsData] = useState(
    () => initialCached?.announcements || null
  );
  const [loading, setLoading] = useState(() => !initialCached);

  // My Holdings Sub-tab ('overview' | 'movements' | 'valueHistory') matching Reference Image Middle-Left
  const [holdingsSubTab, setHoldingsSubTab] = useState('overview');

  // Share History / Transactions Filters
  const [historyMetric, setHistoryMetric] = useState('valuePerShare');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Documents Category Filter & Dated Statement Snapshot
  const [docCategory, setDocCategory] = useState('All documents');
  const [statementSnapshotDate, setStatementSnapshotDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Support Request Form
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportType, setSupportType] = useState('Statement query');
  const [submittingSupport, setSubmittingSupport] = useState(false);

  // Profile & Security State
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    postalAddress: '',
    reason: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const queryParam = previewShareholderId
    ? `?shareholderId=${encodeURIComponent(previewShareholderId)}`
    : '';

  const loadWorkspaceData = useCallback(async () => {
    const existingCache = cachedShareholderWorkspaceByHolder.get(cacheKey);
    if (existingCache) {
      setOverviewData(existingCache.overview);
      setHoldingsData(existingCache.holdings);
      setHistoryData(existingCache.history);
      setDocumentsData(existingCache.documents);
      setAnnouncementsData(existingCache.announcements);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get(`/portal/workspace${queryParam}`);
      const data = res.data;
      cachedShareholderWorkspaceByHolder.set(cacheKey, data);

      setOverviewData(data.overview);
      setHoldingsData(data.holdings);
      setHistoryData(data.history);
      setDocumentsData(data.documents);
      setAnnouncementsData(data.announcements);

      const sh = data.overview?.shareholder;
      if (sh) {
        setProfileForm({
          fullName: sh.fullName || '',
          email: sh.email || '',
          phone: sh.phone || '',
          postalAddress: sh.postalAddress || '',
          reason: ''
        });
      } else if (user) {
        setProfileForm({
          fullName: user.fullName || '',
          email: user.email || '',
          phone: '',
          postalAddress: '',
          reason: ''
        });
      }

      if (onBadgesUpdate) {
        onBadgesUpdate({
          unreadAnnouncements: data.overview?.unreadAnnouncementsCount || 0
        });
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to load shareholder workspace.', 'error');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, queryParam, user, notify, onBadgesUpdate]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleDownloadStatement = (customDate) => {
    const dateToUse = customDate || statementSnapshotDate || new Date().toISOString().slice(0, 10);
    const shParam = previewShareholderId
      ? `&shareholderId=${encodeURIComponent(previewShareholderId)}`
      : '';
    const url = getDownloadUrl(`/portal/statement-pdf?asAtDate=${dateToUse}${shParam}`);
    window.open(url, '_blank');
    notify(`Generating dated holding statement PDF as at ${dateToUse}...`, 'info');
  };

  const handleExportHistoryCSV = () => {
    const rows =
      historyMetric === 'valuePerShare'
        ? historyData?.valueHistory || []
        : historyData?.personalHistory || [];
    if (rows.length === 0) {
      notify('No published history points to export.', 'info');
      return;
    }
    const headers =
      historyMetric === 'valuePerShare'
        ? ['Effective Date', 'Reference', 'Value Per Share', 'Change %', 'Basis']
        : ['Effective Date', 'Shares Held', 'Value Per Share', 'Personal Holding Value', 'Valuation Ref'];
    const lines = rows.map((r) =>
      historyMetric === 'valuePerShare'
        ? [
            r.effectiveDate,
            r.reference,
            r.valuePerShare,
            r.changePercent !== null ? `${r.changePercent}%` : 'Baseline',
            `"${(r.basis || '').replace(/"/g, '""')}"`
          ].join(',')
        : [
            r.effectiveDate,
            r.sharesHeld,
            r.valuePerShare,
            r.holdingValue,
            r.valuationReference || ''
          ].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Share_History_${historyMetric}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    notify('Exported share history CSV.');
  };

  const handleMarkAnnouncementRead = async (id) => {
    try {
      await api.post(`/portal/announcements/${id}/read${queryParam}`);
      loadWorkspaceData();
      notify('Notice marked as read.');
    } catch (err) {
      notify('Could not mark announcement as read.', 'error');
    }
  };

  const handleCreateSupportRequest = async (e) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) {
      notify('Please enter both a subject and message.', 'error');
      return;
    }
    setSubmittingSupport(true);
    try {
      const res = await api.post(`/portal/support${queryParam}`, {
        subject: supportSubject,
        message: supportMessage,
        requestType: supportType
      });
      notify(res.data.message);
      setSupportSubject('');
      setSupportMessage('');
      loadWorkspaceData();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not submit support request.', 'error');
    } finally {
      setSubmittingSupport(false);
    }
  };

  const handleRequestProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/portal/profile-update-request${queryParam}`, profileForm);
      notify(res.data.message);
      loadWorkspaceData();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to submit profile update request.', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/change-password', passwordForm);
      applySession({ token: res.data.token });
      notify(res.data.message);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setShowPasswordModal(false);
    } catch (err) {
      notify(err.response?.data?.message || 'Password change failed.', 'error');
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      const res = await api.post('/auth/revoke-other-sessions');
      applySession({ token: res.data.token });
      notify(res.data.message);
    } catch (err) {
      notify('Failed to revoke other sessions.', 'error');
    }
  };

  const handleToggleVerification = async () => {
    try {
      const res = await api.post('/auth/toggle-verification');
      notify(res.data.message);
      loadWorkspaceData();
    } catch (err) {
      notify('Failed to update verification setting.', 'error');
    }
  };

  if (loading && !overviewData) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 rounded-full border-3 border-[#D4AF37] border-t-transparent animate-spin mb-3" />
        <p className="text-sm font-medium">Loading your shareholder portal...</p>
      </div>
    );
  }

  const summary = overviewData?.summary || {};
  const shareholder = overviewData?.shareholder;
  const currency = summary.currency || company?.baseCurrency || 'LKR';
  const displayHolderId = shareholder?.shareholderId || user?.shareholderId || 'SH-001';
  const asAtFormatted = summary.valuationEffectiveDate
    ? new Date(summary.valuationEffectiveDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

  // ============================================================================
  // TAB 1: DASHBOARD (Matches Top-Right Desktop & 2nd Mobile Mockup)
  // ============================================================================
  if (activeTab === 'overview') {
    const personalHistoryPoints = historyData?.personalHistory || [];
    const chartData =
      personalHistoryPoints.length > 0
        ? personalHistoryPoints
        : overviewData?.publishedValueHistory || [];
    const chartValueKey =
      personalHistoryPoints.length > 0 ? 'holdingValue' : 'valuePerShare';

    return (
      <div className="space-y-6">
        {/* Top Greeting Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {/* Mobile Greeting */}
            <h1 className="sm:hidden text-xl font-extrabold text-slate-900">
              Hello, {displayHolderId} 👋
            </h1>
            {/* Desktop Greeting */}
            <h1 className="hidden sm:block text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, Shareholder {displayHolderId}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Here is a summary of your shareholding with{' '}
              {company?.companyDisplayName || 'NIA Group'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>As at {asAtFormatted}</span>
            </div>

            <button
              type="button"
              onClick={() => handleDownloadStatement()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Statement PDF</span>
            </button>
          </div>
        </div>

        {/* 4 NIA Group Obsidian & Gold KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Shares Held (Obsidian & Imperial Gold) */}
          <div
            onClick={() => setActiveTab('holdings')}
            className="group relative rounded-2xl bg-gradient-to-br from-[#080C16] via-[#0B101E] to-[#131C31] border border-[#D4AF37]/40 p-5 shadow-md hover:shadow-lg transition-all cursor-pointer flex sm:block items-center justify-between text-white"
          >
            <div className="flex sm:block items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#FDE047] shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="sm:mt-3.5">
                <div className="text-xl sm:text-2xl font-extrabold text-white font-mono-num tracking-tight">
                  {Number(summary.myShares || 0).toLocaleString()}
                </div>
                <div className="text-xs font-semibold text-[#F3E5AB]/80 mt-0.5">Shares Held</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#D4AF37] sm:hidden group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Card 2: Ownership (Soft Sky-Blue Tint) */}
          <div
            onClick={() => setActiveTab('holdings')}
            className="group relative rounded-2xl bg-gradient-to-br from-white via-[#EFF6FF] to-[#DBEAFE] border border-blue-200/70 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex sm:block items-center justify-between"
          >
            <div className="flex sm:block items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-300/50 flex items-center justify-center text-blue-600 shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div className="sm:mt-3.5">
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono-num tracking-tight">
                  {summary.ownershipPercent !== null && summary.ownershipPercent !== undefined
                    ? `${Number(summary.ownershipPercent).toFixed(2)}%`
                    : '0.00%'}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Ownership</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Card 3: Value per Share (Soft Warm Amber-Gold Tint) */}
          <div
            onClick={() => setActiveTab('history')}
            className="group relative rounded-2xl bg-gradient-to-br from-white via-[#FFFBEB] to-[#FEF3C7] border border-amber-200/70 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex sm:block items-center justify-between"
          >
            <div className="flex sm:block items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-300/60 flex items-center justify-center text-amber-600 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div className="sm:mt-3.5">
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono-num tracking-tight">
                  {currency}{' '}
                  {Number(summary.valuePerShare || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Value per Share</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Card 4: Holding Value (Soft Mint-Emerald Tint) */}
          <div
            onClick={() => setActiveTab('holdings')}
            className="group relative rounded-2xl bg-gradient-to-br from-white via-[#ECFDF5] to-[#D1FAE5] border border-emerald-200/70 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex sm:block items-center justify-between"
          >
            <div className="flex sm:block items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-300/60 flex items-center justify-center text-emerald-600 shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="sm:mt-3.5">
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono-num tracking-tight">
                  {currency}{' '}
                  {Number(summary.myHoldingValue || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Holding Value</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 2-Column Charts Section: "Holding Value Over Time" + "Ownership in Company" */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-7">
            <SteppedValuationChart
              data={chartData}
              currency={currency}
              title="Holding Value Over Time"
              subtitle="Published shareholding value across effective valuation dates"
              valueKey={chartValueKey}
              changeKey="changePercent"
              chartStyle="smooth"
            />
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs h-full flex flex-col justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Ownership in Company</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion of {Number(summary.issuedCompanyShares || 0).toLocaleString()} issued{' '}
                  {summary.shareClass || 'Ordinary'} shares
                </p>
              </div>

              <div className="my-auto py-4">
                <OwnershipDonutChart
                  ownershipPercent={summary.ownershipPercent || 0}
                  myShares={summary.myShares || 0}
                  issuedShares={summary.issuedCompanyShares || 0}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Share Class: <strong className="text-slate-800">{summary.shareClass || 'Ordinary'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('holdings')}
                  className="font-bold text-[#9A7B2C] hover:text-[#785E1E] inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>My Holdings Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 2: MY HOLDINGS – DETAILS (Matches Middle-Left Desktop & 3rd Mobile Screen)
  // ============================================================================
  if (activeTab === 'holdings') {
    const hSum = holdingsData?.summary || {};
    const ledger = holdingsData?.ledger || [];
    const valHistory = historyData?.valueHistory || overviewData?.publishedValueHistory || [];

    // Compute Opening Shares vs Allocated/Net Shares for the Left Breakdown Card
    const openingShares = ledger
      .filter((r) => r.movementType === 'Opening')
      .reduce((acc, r) => acc + (Number(r.signedQuantity) || 0), 0);
    const currentHolding = Number(hSum.ordinaryShares || summary.myShares || 0);
    const allocatedNetShares = currentHolding - openingShares;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              My Holdings – Details
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              A detailed view of your shareholding and value.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleDownloadStatement()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 text-xs font-extrabold shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Holding Statement</span>
          </button>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT CARD: Shareholder Account Breakdown */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            {/* Account Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#080C16] border border-[#D4AF37]/40 text-[#FDE047] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-extrabold text-slate-900 font-mono-num">
                    {displayHolderId}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Shareholder Account</div>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {shareholder?.accountStatus || 'Active'}
              </span>
            </div>

            {/* Mobile-Focused Donut Chart (Matches 3rd Phone Screen "< My Holdings") */}
            <div className="lg:hidden py-2 flex justify-center border-b border-slate-100 pb-5">
              <OwnershipDonutChart
                ownershipPercent={hSum.ownershipPercent ?? summary.ownershipPercent ?? 0}
                myShares={currentHolding}
                issuedShares={hSum.issuedCompanyShares ?? summary.issuedCompanyShares ?? 0}
                compact
              />
            </div>

            {/* Key-Value Breakdown Rows */}
            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Opening Shares</span>
                <span className="font-mono-num font-bold text-slate-900">
                  {openingShares.toLocaleString()}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Allocated Shares</span>
                <span className="font-mono-num font-bold text-slate-900">
                  {allocatedNetShares >= 0
                    ? allocatedNetShares.toLocaleString()
                    : allocatedNetShares.toLocaleString()}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between bg-slate-50/70 -mx-2 px-2 rounded-lg">
                <span className="text-slate-800 font-bold">= Current Holding</span>
                <span className="font-mono-num font-extrabold text-slate-900 text-base">
                  {currentHolding.toLocaleString()}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Ownership</span>
                <span className="font-mono-num font-bold text-slate-900">
                  {Number(hSum.ownershipPercent ?? summary.ownershipPercent ?? 0).toFixed(2)}%
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Value per Share</span>
                <span className="font-mono-num font-bold text-slate-900">
                  {currency}{' '}
                  {Number(hSum.latestValuePerShare ?? summary.valuePerShare ?? 0).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}
                </span>
              </div>

              <div className="pt-3.5 pb-1 flex items-center justify-between">
                <span className="text-slate-900 font-extrabold">Holding Value</span>
                <span className="font-mono-num font-extrabold text-[#9A7B2C] text-base">
                  {currency}{' '}
                  {Number(summary.myHoldingValue || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHoldingsSubTab('movements')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:brightness-105 text-slate-950 text-xs sm:text-sm font-extrabold shadow-md shadow-[#D4AF37]/20 transition-all cursor-pointer"
            >
              View Movements
            </button>
          </div>

          {/* RIGHT CARD: Tabbed Overview / Share Movements / Value History */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            {/* Imperial Gold Underline Sub-Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200/80 mb-5">
              {[
                { id: 'overview', label: 'Holding Overview' },
                { id: 'movements', label: 'Share Movements' },
                { id: 'valueHistory', label: 'Value History' }
              ].map((t) => {
                const active = holdingsSubTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setHoldingsSubTab(t.id)}
                    className={`pb-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
                      active
                        ? 'text-[#9A7B2C]'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                    {active && (
                      <span className="absolute bottom-0 inset-x-0 h-0.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </button>
                );
              })}
            </div>

            {holdingsSubTab === 'overview' && (
              <div className="space-y-6">
                <CumulativeHoldingBarChart ledger={ledger} currentShares={currentHolding} />

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Class: <strong className="text-slate-800">{hSum.shareClass || 'Ordinary'}</strong> • Voting:{' '}
                    <strong className="text-slate-800">{hSum.votingRights || 'Per company rules'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setHoldingsSubTab('movements')}
                    className="font-bold text-[#9A7B2C] hover:underline cursor-pointer"
                  >
                    Inspect full ledger ({ledger.length}) →
                  </button>
                </div>
              </div>
            )}

            {holdingsSubTab === 'movements' && (
              <div>
                {ledger.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No published share movements recorded for this account yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {ledger.map((row) => {
                      const isPositive = row.signedQuantity >= 0;
                      return (
                        <div
                          key={row._id || row.reference}
                          className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                isPositive
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-rose-100 text-rose-600'
                              }`}
                            >
                              {isPositive ? (
                                <PlusCircle className="w-4 h-4" />
                              ) : (
                                <MinusCircle className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                                {row.movementType}
                                <span className="ml-2 text-[11px] font-mono-num font-semibold text-slate-400">
                                  {row.reference}
                                </span>
                              </div>
                              <div
                                className={`text-xs font-extrabold font-mono-num ${
                                  isPositive ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {row.movementDisplay} shares
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono-num">
                                {row.effectiveDate}
                                {row.reason ? ` • ${row.reason}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-extrabold text-slate-900 font-mono-num">
                              Bal: {Number(row.balanceAfter).toLocaleString()}
                            </div>
                            {row.supportingDocumentUrl && (
                              <a
                                href={row.supportingDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9A7B2C] hover:underline mt-0.5"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Doc
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {holdingsSubTab === 'valueHistory' && (
              <div className="space-y-3">
                {valHistory.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No published share valuations yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {[...valHistory].reverse().map((v) => (
                      <div
                        key={v._id || v.reference}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 font-mono-num">
                            {v.effectiveDate}{' '}
                            <span className="text-slate-400 font-normal">({v.reference})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{v.basis}</div>
                        </div>
                        <div className="text-right font-mono-num">
                          <div className="font-extrabold text-slate-900">
                            {currency} {Number(v.valuePerShare).toFixed(2)}
                          </div>
                          {v.changePercent !== null && v.changePercent !== undefined && (
                            <span
                              className={`text-[11px] font-bold ${
                                v.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {v.changePercent >= 0 ? '+' : ''}
                              {v.changePercent}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 3: TRANSACTIONS & SHARE HISTORY (Matches 4th Mobile Screen & Interface 04)
  // ============================================================================
  if (activeTab === 'history') {
    const ledger = holdingsData?.ledger || [];
    const valHistory = (historyData?.valueHistory || []).filter((v) => {
      if (fromDate && v.effectiveDate < fromDate) return false;
      if (toDate && v.effectiveDate > toDate) return false;
      return true;
    });
    const persHistory = (historyData?.personalHistory || []).filter((p) => {
      if (fromDate && p.effectiveDate < fromDate) return false;
      if (toDate && p.effectiveDate > toDate) return false;
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Transactions & Value History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Traceable share movements, published valuations, and historical comparisons.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportHistoryCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 text-xs font-extrabold shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {/* Share Transactions List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Share Transactions</h3>
              <p className="text-xs text-slate-500">
                Approved allocations, transfers, and opening balances
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#9A7B2C] border border-[#D4AF37]/30 text-xs font-bold font-mono-num">
              {ledger.length} records
            </span>
          </div>

          {ledger.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No published share transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ledger.map((row) => {
                const isPositive = row.signedQuantity >= 0;
                const formattedDate = new Date(row.effectiveDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
                return (
                  <div
                    key={row._id || row.reference}
                    className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        {isPositive ? (
                          <PlusCircle className="w-5 h-5" />
                        ) : (
                          <MinusCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {row.movementType === 'Transfer'
                            ? isPositive
                              ? 'Transfer (In)'
                              : 'Transfer (Out)'
                            : row.movementType}
                        </div>
                        <div
                          className={`text-xs sm:text-sm font-extrabold font-mono-num mt-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {row.movementDisplay} shares
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {formattedDate} • Ref: <span className="font-mono-num">{row.reference}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-slate-500">Running Balance</div>
                        <div className="text-sm font-extrabold text-slate-900 font-mono-num">
                          {Number(row.balanceAfter).toLocaleString()} shares
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Date & Metric Filter Bar for Valuation History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono-num text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono-num text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Metric:</span>
              <select
                value={historyMetric}
                onChange={(e) => setHistoryMetric(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800"
              >
                <option value="valuePerShare">Value per share ({currency})</option>
                <option value="holdingValue">Personal holding value ({currency})</option>
              </select>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 text-[#9A7B2C] border border-[#D4AF37]/30 font-bold">
            Class: {historyData?.shareClass || 'Ordinary'}
          </span>
        </div>

        {historyMetric === 'valuePerShare' ? (
          <SteppedValuationChart
            data={valHistory}
            currency={currency}
            title="Published Value per Share"
            subtitle="Company value per share across effective publication dates"
            valueKey="valuePerShare"
            changeKey="changePercent"
          />
        ) : (
          <SteppedValuationChart
            data={persHistory}
            currency={currency}
            title="Personal Holding Value Over Time"
            subtitle="Shares held multiplied by the applicable published value"
            valueKey="holdingValue"
            changeKey="valueChangePercent"
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // TAB 4: DOCUMENTS (Matches 5th Mobile Screen "< Documents" & Interface 05)
  // ============================================================================
  if (activeTab === 'documents') {
    const categories = ['All documents', 'Statements', 'Certificates', 'Company reports'];
    const allDocs = documentsData?.documents || [];
    const filteredDocs = allDocs.filter((d) => {
      if (docCategory === 'All documents') return true;
      if (docCategory === 'Certificates') {
        return d.category === 'Certificates' || d.category === 'Holding confirmation';
      }
      return d.category === docCategory;
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Documents</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Official statements, share register extracts, and company publications.
          </p>
        </div>

        {/* Category Pills & Dated Statement Generator */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setDocCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  docCategory === cat
                    ? 'bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 shadow-md shadow-[#D4AF37]/20'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
            <Calendar className="w-4 h-4 text-[#B8860B]" />
            <span className="text-xs font-semibold text-slate-600">Statement as at:</span>
            <input
              type="date"
              value={statementSnapshotDate}
              onChange={(e) => setStatementSnapshotDate(e.target.value)}
              className="text-xs font-mono-num font-bold text-slate-900 border-b border-slate-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleDownloadStatement(statementSnapshotDate)}
              className="px-3 py-1.5 rounded-lg bg-[#080C16] hover:bg-slate-800 text-[#FDE047] border border-[#D4AF37]/40 text-xs font-bold transition-colors cursor-pointer"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Document Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Built-in Automated Share Statement Card */}
          {(docCategory === 'All documents' || docCategory === 'Statements') && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Coral PDF Badge */}
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex flex-col items-center justify-center text-rose-600 shrink-0">
                  <FileText className="w-5 h-5" />
                  <span className="text-[9px] font-extrabold uppercase tracking-tighter mt-0.5">
                    PDF
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    Share Statement
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    Official dated holding statement ({summary.shareClass || 'Ordinary'})
                  </div>
                  <div className="text-[11px] font-mono-num text-slate-400 mt-0.5">
                    {asAtFormatted} • Personal
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadStatement(statementSnapshotDate)}
                title="Download PDF"
                className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 hover:bg-[#080C16] text-[#9A7B2C] hover:text-[#FDE047] border border-[#D4AF37]/30 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Published Documents from Company */}
          {filteredDocs.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex flex-col items-center justify-center text-rose-600 shrink-0">
                  <FileText className="w-5 h-5" />
                  <span className="text-[9px] font-extrabold uppercase tracking-tighter mt-0.5">
                    PDF
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 truncate">{doc.title}</div>
                  {doc.summary && (
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{doc.summary}</div>
                  )}
                  <div className="text-[11px] font-mono-num text-slate-400 mt-0.5">
                    {doc.periodOrDate || doc.publishedDate} •{' '}
                    {doc.audienceType === 'Specific shareholder' ? 'Personal' : 'All shareholders'}
                  </div>
                </div>
              </div>

              {doc.fileUrl ? (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Download PDF"
                  className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 hover:bg-[#080C16] text-[#9A7B2C] hover:text-[#FDE047] border border-[#D4AF37]/30 flex items-center justify-center transition-colors shrink-0"
                >
                  <Download className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadStatement(doc.periodOrDate || statementSnapshotDate)
                  }
                  title="Download PDF"
                  className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 hover:bg-[#080C16] text-[#9A7B2C] hover:text-[#FDE047] border border-[#D4AF37]/30 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Privacy Assurance Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#B8860B] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Your documents stay private</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Only documents published to your shareholder ID or your permitted shareholder group are visible here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 5: COMPANY UPDATES (Matches 6th Mobile Screen "< Company Updates" & Interface 06)
  // ============================================================================
  if (activeTab === 'announcements') {
    const announcements = announcementsData?.announcements || [];
    const myTickets = announcementsData?.supportRequests || [];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Company Updates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Official valuation notices, AGM announcements, and shareholder support.
          </p>
        </div>

        {/* Visual Company Updates Cards (Matches 6th Mobile Screen in Reference Image) */}
        {announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-500">
            No company updates published yet. When a new share valuation or company notice is published, it will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {announcements.map((ann, idx) => (
              <div
                key={ann._id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-xs transition-all flex flex-col justify-between ${
                  ann.isRead
                    ? 'border-slate-200/80'
                    : 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20'
                }`}
              >
                {/* Decorative NIA Group Obsidian & Gold Banner Header */}
                <div
                  className={`h-32 px-6 py-4 flex flex-col justify-end relative overflow-hidden ${
                    idx % 2 === 0
                      ? 'bg-gradient-to-r from-[#080C16] via-[#0D1322] to-[#1E293B]'
                      : 'bg-gradient-to-r from-[#0B101E] via-[#131C31] to-[#262010]'
                  } text-white border-b border-[#D4AF37]/30`}
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#D4AF37]/15 blur-xl pointer-events-none" />
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D4AF37]/20 text-[#FDE047] border border-[#D4AF37]/30 backdrop-blur-xs">
                      {ann.category || 'Company Update'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ann.isRead
                          ? 'bg-white/15 text-slate-200'
                          : 'bg-[#D4AF37] text-slate-950'
                      }`}
                    >
                      {ann.isRead ? 'Read' : 'New Update'}
                    </span>
                  </div>
                  <h3 className="relative z-10 text-lg font-extrabold text-white mt-2 truncate">
                    {ann.title}
                  </h3>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {ann.summary}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono-num text-slate-400 font-medium">
                      {ann.periodOrDate || ann.publishedDate}
                    </span>
                    <div className="flex items-center gap-3 font-bold">
                      <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="text-[#9A7B2C] hover:underline cursor-pointer"
                      >
                        View History
                      </button>
                      {!ann.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkAnnouncementRead(ann._id)}
                          className="text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact the Company Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-base font-extrabold text-slate-900">Contact Support</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Raise a question regarding your holding statement, share valuations, or account records.
          </p>

          <form onSubmit={handleCreateSupportRequest} className="mt-4 space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Question about my holding statement"
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={supportType}
                  onChange={(e) => setSupportType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="Statement query">Statement query</option>
                  <option value="General query">General query</option>
                  <option value="Profile update request">Profile update query</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
              <textarea
                rows={3}
                required
                placeholder="Please explain the dated valuation or record you would like clarified..."
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              disabled={submittingSupport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4AF37]/20 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingSupport ? 'Submitting...' : 'Submit Support Request'}
            </button>
          </form>
        </div>

        {/* My Support Requests Tracker */}
        {myTickets.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Your Support Requests</h3>
            <div className="divide-y divide-slate-100">
              {myTickets.map((t) => (
                <div key={t._id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#D4AF37]/15 font-mono-num text-xs font-bold text-[#9A7B2C]">
                        {t.reference}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{t.subject}</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        t.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : t.status === 'In progress'
                          ? 'bg-[#D4AF37]/15 text-[#9A7B2C]'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{t.message}</p>
                  {t.replies && t.replies.length > 0 && (
                    <div className="pl-4 border-l-2 border-[#D4AF37] space-y-2 mt-2">
                      {t.replies.map((rep) => (
                        <div key={rep.id} className="bg-slate-50 p-3 rounded-xl text-xs">
                          <div className="font-bold text-slate-900">
                            {rep.senderName} ({rep.senderRole})
                          </div>
                          <div className="text-slate-700 mt-0.5">{rep.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // TAB 6: SUPPORT & PROFILE / SECURITY (Interface 07)
  // ============================================================================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Support, Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Keep contact information current and manage your account security.
        </p>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <form onSubmit={handleRequestProfileUpdate} className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full name</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shareholder ID</label>
              <input
                type="text"
                readOnly
                value={`${shareholder?.shareholderId || user?.shareholderId || 'STAFF'} (read only)`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-mono-num cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone number</label>
              <input
                type="text"
                placeholder="+94 7X XXX XXXX"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              placeholder="Company-verified address on file"
              value={profileForm.postalAddress}
              onChange={(e) => setProfileForm({ ...profileForm, postalAddress: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          {shareholder?.pendingProfileUpdate && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>Pending verification:</strong> You have a profile update request awaiting company administrator review.
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4AF37]/20 cursor-pointer"
          >
            Request Profile Update
          </button>
        </form>
      </div>

      {/* Security Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">Security Controls</h3>
        <div className="flex flex-wrap items-center gap-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setShowPasswordModal(!showPasswordModal)}
            className="text-[#9A7B2C] hover:text-[#785E1E] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            Change password
          </button>

          <button
            type="button"
            onClick={handleToggleVerification}
            className="text-[#9A7B2C] hover:text-[#785E1E] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            Manage verification ({user?.verificationEnabled ? 'Enabled' : 'Disabled'})
          </button>

          <button
            type="button"
            onClick={handleRevokeOtherSessions}
            className="text-[#9A7B2C] hover:text-[#785E1E] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out other sessions
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Changes to verified identity details require company review. Share quantity, ownership and share values cannot be edited by shareholders.
        </p>

        {showPasswordModal && (
          <form
            onSubmit={handleChangePassword}
            className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl items-start"
          >
            <PasswordInput
              required
              placeholder="Current password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              inputClassName="py-2 text-xs"
            />
            <PasswordInput
              required
              minLength={8}
              showStrength
              placeholder="New password (min 8 chars)"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              inputClassName="py-2 text-xs"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#080C16] hover:bg-slate-800 text-[#FDE047] border border-[#D4AF37]/40 text-xs font-bold cursor-pointer"
            >
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

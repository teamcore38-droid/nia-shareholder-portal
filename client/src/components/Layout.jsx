import React, { useState } from 'react';
import {
  Home,
  BarChart3,
  ArrowLeftRight,
  FileText,
  Bell,
  HelpCircle,
  Users,
  BookOpen,
  TrendingUp,
  CheckSquare,
  Send,
  UserCog,
  FileSpreadsheet,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Eye,
  Search,
  ChevronDown,
  ChevronLeft,
  ShieldCheck,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApexBrandLogo, SidebarWaveDecoration } from './ApexBrandLogo';

export default function Layout({
  workspaceMode, // 'admin' | 'shareholder'
  setWorkspaceMode,
  activeTab,
  setActiveTab,
  badges = {},
  previewShareholderId,
  setPreviewShareholderId,
  shareholdersList = [],
  children
}) {
  const { user, company, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  const isStaff = user && ['Administrator', 'Data officer', 'Approver'].includes(user.role);

  const shareholderNav = [
    { id: 'overview', label: 'Dashboard', mobileLabel: 'Home', icon: Home },
    { id: 'holdings', label: 'My Holdings', mobileLabel: 'Holdings', icon: BarChart3 },
    { id: 'history', label: 'Transactions', mobileLabel: 'Transactions', icon: ArrowLeftRight },
    { id: 'documents', label: 'Documents', mobileLabel: 'Docs', icon: FileText },
    {
      id: 'announcements',
      label: 'Company Updates',
      mobileLabel: 'Updates',
      icon: Bell,
      badge: badges.unreadAnnouncements
    },
    { id: 'profile', label: 'Support & Profile', mobileLabel: 'Profile', icon: HelpCircle }
  ];

  const adminNav = [
    { id: 'overview', label: 'Dashboard', mobileLabel: 'Home', icon: Home },
    { id: 'register', label: 'Share Register', mobileLabel: 'Register', icon: BookOpen },
    { id: 'values', label: 'Valuation', mobileLabel: 'Valuation', icon: TrendingUp },
    {
      id: 'approvals',
      label: 'Approvals',
      mobileLabel: 'Approvals',
      icon: CheckSquare,
      badge: badges.pendingApprovals
    },
    { id: 'shareholders', label: 'Shareholders', mobileLabel: 'Holders', icon: Users },
    { id: 'publications', label: 'Publications', mobileLabel: 'Publish', icon: Send },
    { id: 'reports', label: 'Reports', mobileLabel: 'Reports', icon: FileSpreadsheet },
    { id: 'staff', label: 'Staff & Roles', mobileLabel: 'Staff', icon: UserCog },
    {
      id: 'support',
      label: 'Support',
      mobileLabel: 'Support',
      icon: HelpCircle,
      badge: badges.openSupport
    },
    { id: 'audit', label: 'Audit Log', mobileLabel: 'Audit', icon: History },
    { id: 'settings', label: 'Settings', mobileLabel: 'Settings', icon: Settings }
  ];

  const navItems = workspaceMode === 'admin' ? adminNav : shareholderNav;

  const mobileBottomItems =
    workspaceMode === 'admin'
      ? [
          adminNav[0], // Dashboard
          adminNav[1], // Share Register
          adminNav[3], // Approvals
          adminNav[4]  // Shareholders
        ]
      : [
          shareholderNav[0], // Home
          shareholderNav[1], // Holdings
          shareholderNav[3], // Docs
          shareholderNav[2]  // Transactions
        ];

  const handleSelectTab = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setQuickSearchOpen(false);
  };

  const activeNavObj = navItems.find((n) => n.id === activeTab) || navItems[0];

  const avatarInitials =
    workspaceMode === 'shareholder'
      ? 'SH'
      : user?.role === 'Administrator'
      ? 'AD'
      : (user?.fullName || 'ST')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

  const primaryBadgeLabel =
    workspaceMode === 'shareholder'
      ? previewShareholderId || user?.shareholderId || 'SH-001'
      : user?.role || 'Administrator';

  const secondaryBadgeLabel =
    workspaceMode === 'shareholder'
      ? 'Shareholder'
      : user?.fullName || 'Staff Member';

  const filteredNavItems = quickSearchQuery.trim()
    ? navItems.filter((item) =>
        item.label.toLowerCase().includes(quickSearchQuery.trim().toLowerCase())
      )
    : navItems;

  return (
    <div className="min-h-screen flex bg-[#F4F5FB] text-slate-900">
      {/* Persistent Desktop Sidebar (Matches Reference Image Deep Indigo Sidebar) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gradient-to-b from-[#0D1127] via-[#111736] to-[#0B0F24] text-white shadow-2xl z-30 overflow-hidden">
        {/* APEX Software Solutions Brand Header */}
        <div className="px-6 pt-6 pb-5">
          <ApexBrandLogo size="md" subtitle="Software Solutions" lightText />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3.5 py-2 space-y-1 overflow-y-auto relative z-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer group ${
                  active
                    ? 'bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] text-white shadow-lg shadow-purple-950/50'
                    : 'text-slate-300/85 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full font-mono-num ${
                      active
                        ? 'bg-white/25 text-white'
                        : 'bg-[#7C3AED] text-white shadow-xs'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Wave Mesh & Sign Out */}
        <div className="relative mt-auto">
          <SidebarWaveDecoration />
          <div className="px-4 pb-4 pt-1 relative z-10 flex items-center justify-between border-t border-white/10">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-white truncate">{user?.fullName}</div>
              <div className="text-[11px] text-purple-300/90 truncate">
                {user?.shareholderId || user?.role}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-xl bg-white/8 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Clean Contextual Header (Matches Phone Mockups in Reference Image) */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {activeTab !== 'overview' ? (
              <button
                type="button"
                onClick={() => handleSelectTab('overview')}
                className="p-1.5 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Back to Dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#0D1127] flex items-center justify-center shrink-0">
                <span className="text-[11px] font-extrabold text-sky-400">A</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 truncate">
                {activeNavObj?.label || 'Dashboard'}
              </div>
              <div className="text-[10px] font-medium text-slate-500 truncate">
                {company?.companyDisplayName || 'NIA Group of company'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell on Mobile */}
            <button
              type="button"
              onClick={() =>
                handleSelectTab(workspaceMode === 'admin' ? 'approvals' : 'announcements')
              }
              className="relative w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {(badges.unreadAnnouncements > 0 || badges.pendingApprovals > 0) && (
                <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {/* User Avatar & Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-800"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6D28D9] to-[#4F46E5] text-white text-[10px] font-extrabold flex items-center justify-center">
                {avatarInitials}
              </span>
              {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Slide-Down Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="bg-[#0D1127] text-white border-b border-slate-800 px-4 py-4 space-y-2 max-h-[82vh] overflow-y-auto shadow-2xl">
            <div className="pb-3 mb-2 border-b border-white/10 flex items-center justify-between">
              <ApexBrandLogo size="sm" subtitle="Software Solutions" lightText />
              <span className="text-xs font-mono-num px-2.5 py-1 rounded-full bg-white/10 text-purple-200">
                {primaryBadgeLabel}
              </span>
            </div>

            {isStaff && (
              <div className="pb-3 mb-2 border-b border-white/10 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMode('admin');
                      setActiveTab('overview');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                      workspaceMode === 'admin'
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    Admin Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMode('shareholder');
                      setActiveTab('overview');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                      workspaceMode === 'shareholder'
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    Shareholder View
                  </button>
                </div>

                {workspaceMode === 'shareholder' && shareholdersList.length > 0 && (
                  <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2 text-xs">
                    <span className="text-purple-200 font-semibold">Inspecting:</span>
                    <select
                      value={previewShareholderId || ''}
                      onChange={(e) => setPreviewShareholderId(e.target.value)}
                      className="bg-transparent text-white font-bold font-mono-num focus:outline-none"
                    >
                      {shareholdersList.map((s) => (
                        <option key={s.shareholderId} value={s.shareholderId} className="text-slate-900">
                          {s.shareholderId} — {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                      active
                        ? 'bg-gradient-to-r from-[#6D28D9] to-[#6366F1] text-white'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    {item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-slate-300">
                <div className="font-bold text-white">{user?.fullName}</div>
                <div className="text-[11px] text-slate-400">{user?.email}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-200 text-xs font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pt-14 lg:pt-0 pb-20 lg:pb-0">
        {/* Desktop Header Bar (Matches Reference Image Top Header) */}
        <header className="hidden lg:flex bg-white/85 backdrop-blur-md border-b border-slate-200/70 sticky top-0 z-20 px-8 py-3.5 items-center justify-between gap-4">
          {/* Left: Company Name & Portal Subtitle */}
          <div>
            <div className="text-base font-extrabold text-slate-900 leading-tight">
              {company?.companyDisplayName || 'NIA Group of company'}
            </div>
            <div className="text-xs font-medium text-slate-500">
              {workspaceMode === 'admin' ? 'Administration Workspace' : 'Shareholder Portal'}
            </div>
          </div>

          {/* Right: Workspace Switcher, Search, Notification Bell & User Profile Pill */}
          <div className="flex items-center gap-3">
            {/* Staff Mode & Shareholder Preview Switcher */}
            {isStaff && (
              <div className="flex items-center gap-2 mr-1">
                {workspaceMode === 'shareholder' && shareholdersList.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200/80 rounded-xl px-3 py-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span className="text-[11px] font-semibold text-purple-900">Holder:</span>
                    <select
                      value={previewShareholderId || ''}
                      onChange={(e) => setPreviewShareholderId(e.target.value)}
                      className="text-xs font-bold text-purple-950 bg-transparent focus:outline-none font-mono-num cursor-pointer"
                    >
                      {shareholdersList.map((s) => (
                        <option key={s.shareholderId} value={s.shareholderId}>
                          {s.shareholderId} — {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMode('admin');
                      setActiveTab('overview');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      workspaceMode === 'admin'
                        ? 'bg-[#0D1127] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Admin Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMode('shareholder');
                      setActiveTab('overview');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      workspaceMode === 'shareholder'
                        ? 'bg-[#6D28D9] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Shareholder Portal
                  </button>
                </div>
              </div>
            )}

            {/* Quick Navigation Search Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setQuickSearchOpen(!quickSearchOpen)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Quick jump to section"
              >
                <Search className="w-4 h-4" />
              </button>

              {quickSearchOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2.5 z-50">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Jump to section..."
                    value={quickSearchQuery}
                    onChange={(e) => setQuickSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  <div className="mt-1.5 max-h-48 overflow-y-auto space-y-0.5">
                    {filteredNavItems.map((n) => {
                      const Icon = n.icon;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleSelectTab(n.id)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#6D28D9] cursor-pointer"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{n.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell Icon Button with Red Badge Dot */}
            <button
              type="button"
              onClick={() =>
                handleSelectTab(workspaceMode === 'admin' ? 'approvals' : 'announcements')
              }
              className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Notifications & Updates"
            >
              <Bell className="w-4 h-4" />
              {(badges.unreadAnnouncements > 0 || badges.pendingApprovals > 0) && (
                <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {/* User Profile Pill (Matches Reference Image: Purple Avatar + SH-001 / Shareholder + Chevron) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white text-xs font-extrabold flex items-center justify-center shadow-xs">
                  {avatarInitials}
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-extrabold text-slate-900 font-mono-num">
                    {primaryBadgeLabel}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">
                    {secondaryBadgeLabel}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectTab(workspaceMode === 'admin' ? 'settings' : 'profile')
                    }
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#6D28D9] flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Profile & Security
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Lightweight Footer */}
        <footer className="px-4 sm:px-8 py-3.5 border-t border-slate-200/60 bg-white/50 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700">
              {company?.companyDisplayName || 'NIA Group of company'}
            </span>{' '}
            • Shareholder & Equity Registry Portal • Base Currency:{' '}
            <span className="font-mono-num font-semibold text-slate-700">
              {company?.baseCurrency || 'LKR'}
            </span>
          </div>
          <div>
            Powered by <span className="font-semibold text-[#6D28D9]">APEX Software Solutions</span>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (Matches Phone Mockups in Reference Image) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                active ? 'text-[#6D28D9]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#6D28D9]' : 'text-slate-400'}`} />
              <span>{item.mobileLabel}</span>
              {active && (
                <span className="w-5 h-1 rounded-full bg-[#6D28D9] mt-0.5" />
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
            mobileMenuOpen ? 'text-[#6D28D9]' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

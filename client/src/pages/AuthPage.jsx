import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  ArrowRight,
  Sparkles,
  Building2,
  FileText,
  BarChart3,
  Bell,
  BadgeCheck,
  Key,
  Copy,
  Check,
  X
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { ApexBrandLogo } from '../components/ApexBrandLogo';

export default function AuthPage({ onBackToHome, initialMode = 'signin' }) {
  const { company, bootstrapStatus, applySession, notify } = useAuth();

  // Mode: 'signin' | 'verify-staff' | 'activate' | 'forgot' | 'setup-admin'
  const [mode, setMode] = useState(
    !bootstrapStatus.initialized ? 'setup-admin' : initialMode
  );

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState('');

  const DEMO_ACCOUNTS = [
    {
      role: 'Administrator',
      fullName: 'Company Administrator',
      email: 'admin@niagroup.com',
      password: 'Admin@2026',
      description: 'Full portal governance & approvals'
    },
    {
      role: 'Data officer',
      fullName: 'Kamal Senanayake',
      email: 'dataofficer@niagroup.com',
      password: 'Officer@2026',
      description: 'Enters draft movements & valuations'
    },
    {
      role: 'Approver',
      fullName: 'Dharshini Gunawardena',
      email: 'approver@niagroup.com',
      password: 'Approver@2026',
      description: 'Maker-Checker review & formal publishing'
    },
    {
      role: 'Shareholder',
      fullName: 'Dr. Keerthi Wickramasinghe',
      email: 'shareholder1@niagroup.com',
      password: 'Shareholder@2026',
      description: 'SH-001 (325,000 Ordinary shares)'
    },
    {
      role: 'Shareholder',
      fullName: 'Apex Horizon Holdings',
      email: 'shareholder2@niagroup.com',
      password: 'Shareholder@2026',
      description: 'SH-002 (250,000 Ordinary shares)'
    }
  ];

  const handleSelectDemoAccount = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setShowDemoModal(false);
    notify(`Selected demo account: ${acc.fullName} (${acc.role})`);
  };

  // Sign-In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Staff 2FA Verification state (Interface M08)
  const [preAuthData, setPreAuthData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [useRecoveryMode, setUseRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  // Activate Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [invitePassword, setInvitePassword] = useState('');

  // Forgot/Reset Password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [generatedResetDemo, setGeneratedResetDemo] = useState('');

  // First-time Admin Initialization state (when 0 users exist)
  const [adminName, setAdminName] = useState('Company Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@niagroup.com');
  const [adminPassword, setAdminPassword] = useState('Admin@2026');
  const [companyNameInput, setCompanyNameInput] = useState(
    company?.companyDisplayName || 'NIA Group of company'
  );

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', { email, password, rememberMe });
      if (res.data.requiresVerification) {
        setPreAuthData(res.data);
        setVerificationCode(res.data.demoVerificationCode || '246810');
        setMode('verify-staff');
        notify('Additional multi-factor verification required for staff sign-in.', 'info');
      } else {
        applySession(res.data);
        notify(`Welcome back, ${res.data.user.fullName}.`);
      }
    } catch (err) {
      if (err.response?.data?.requiresActivation) {
        setInviteEmail(err.response.data.email || email);
        setMode('activate');
        notify(err.response.data.message, 'info');
      } else {
        notify(err.response?.data?.message || 'Sign in failed.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/verify-staff', {
        preAuthToken: preAuthData?.preAuthToken,
        code: useRecoveryMode ? '' : verificationCode,
        recoveryCode: useRecoveryMode ? recoveryCode : ''
      });
      applySession(res.data);
      notify(`Staff identity verified. Welcome, ${res.data.user.fullName}.`);
    } catch (err) {
      notify(err.response?.data?.message || 'Verification failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/activate-invite', {
        email: inviteEmail,
        inviteCode,
        password: invitePassword
      });
      applySession(res.data);
      notify('Account invitation activated successfully!');
    } catch (err) {
      notify(err.response?.data?.message || 'Activation failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestResetToken = async () => {
    if (!resetEmail) {
      notify('Please enter your registered email address first.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail });
      if (res.data.resetTokenDemo) {
        setGeneratedResetDemo(res.data.resetTokenDemo);
        setResetToken(res.data.resetTokenDemo);
      }
      notify(res.data.message, 'info');
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to generate reset token.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteReset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: resetEmail,
        resetToken,
        newPassword: newResetPassword
      });
      notify(res.data.message);
      setEmail(resetEmail);
      setMode('signin');
    } catch (err) {
      notify(err.response?.data?.message || 'Password reset failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupInitialAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/setup-initial-admin', {
        fullName: adminName,
        email: adminEmail,
        password: adminPassword,
        companyDisplayName: companyNameInput
      });
      applySession(res.data);
      notify('Primary Administrator initialized! Welcome to the Administration Workspace.');
    } catch (err) {
      notify(err.response?.data?.message || 'Initialization failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-hidden bg-[#080C16] text-white selection:bg-[#D4AF37] selection:text-slate-950">
      {/* Official NIA Group Corporate Campus Responsive Backdrop */}
      {/* Responsive: Desktop (16:9 landscape) / Mobile (9:16 portrait) */}
      <picture className="absolute inset-0 pointer-events-none overflow-hidden block">
        <source media="(min-width: 768px)" srcSet="/nia-campus-desktop.webp" />
        <img
          src="/nia-campus-mobile.webp"
          alt="NIA Corporate Campus"
          className="w-full h-full object-cover object-top lg:object-center opacity-80 select-none"
          loading="eager"
          fetchPriority="high"
        />
      </picture>
      {/* Balanced Vignette Overlays: ensures building & sky remain clearly visible while keeping forms legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080C16]/90 via-[#080C16]/40 to-[#080C16]/75 pointer-events-none" />
      <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[#080C16]/80 via-[#080C16]/40 to-[#080C16]/80 pointer-events-none" />

      {/* Decorative Golden Wave Curves at Bottom */}
      <svg
        viewBox="0 0 1440 260"
        fill="none"
        preserveAspectRatio="none"
        className="absolute bottom-0 inset-x-0 w-full h-44 pointer-events-none opacity-65"
      >
        <defs>
          <linearGradient id="authWave1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9A7B2C" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#FDE047" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M0 190 C 320 90, 680 250, 1080 120 C 1260 65, 1380 110, 1440 90 L 1440 260 L 0 260 Z"
          fill="url(#authWave1)"
          opacity="0.18"
        />
        <path
          d="M0 190 C 320 90, 680 250, 1080 120 C 1260 65, 1380 110, 1440 90"
          stroke="url(#authWave1)"
          strokeWidth="2.5"
          fill="none"
        />
      </svg>

      {/* Top Navigation Bar with NIA Group Crest Logo */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <ApexBrandLogo size="lg" subtitle="GROUP OF COMPANY" lightText showAllianceTag />
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-[#D4AF37]/35 text-[#F3E5AB] hover:text-[#FDE047] text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-sm"
            >
              <span>← Back to Home</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="sm:hidden px-3 py-1.5 rounded-lg bg-white/10 border border-[#D4AF37]/30 text-[#FDE047] text-xs font-semibold cursor-pointer"
            >
              ← Home
            </button>
          )}
          {!bootstrapStatus.initialized && mode !== 'setup-admin' && (
            <button
              type="button"
              onClick={() => setMode('setup-admin')}
              className="px-3.5 py-1.5 rounded-full bg-[#D4AF37] text-slate-950 text-xs font-extrabold shadow-md cursor-pointer"
            >
              First-Run Setup
            </button>
          )}
        </div>
      </header>

      {/* Main Split Content */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">
        {/* Left Hero Column */}
        <div className="w-full lg:w-6/12 space-y-6 text-center lg:text-left">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121827]/90 border border-[#D4AF37]/40 text-[#FDE047] text-xs font-bold mb-3 uppercase tracking-wider">
              <span>Nexus International Alliance • E-STD 2022</span>
            </div>
            <h1
              className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.14] text-white drop-shadow-xs uppercase"
              style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
            >
              NIA Group
              <br />
              <span className="bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#F59E0B] bg-clip-text text-transparent">
                Shareholder Portal
              </span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-[#D4AF37]">
              — Building A Better Tomorrow Together —
            </p>
            <p className="mt-3 text-sm sm:text-base text-slate-200/90 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              A secure, transparent and convenient way to view your shareholding, value, history and company updates across Real Estate, Construction, Investment, Trading, Consultancy, and Services.
            </p>
          </div>

          {/* 4 Feature Icon Rows in Imperial Gold */}
          <div className="pt-2 space-y-3.5 max-w-sm mx-auto lg:mx-0 text-left">
            <div className="flex items-center gap-3.5 text-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center shrink-0 text-[#FDE047] backdrop-blur-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-medium">Secure Access</span>
            </div>

            <div className="flex items-center gap-3.5 text-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center shrink-0 text-[#FDE047] backdrop-blur-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-medium">Real-time Holdings</span>
            </div>

            <div className="flex items-center gap-3.5 text-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center shrink-0 text-[#FDE047] backdrop-blur-xs">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-medium">Official Documents</span>
            </div>

            <div className="flex items-center gap-3.5 text-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center shrink-0 text-[#FDE047] backdrop-blur-xs">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-medium">Company Updates</span>
            </div>
          </div>
        </div>

        {/* Right Floating Authentication Card with Gold Border Accent */}
        <div className="w-full max-w-[430px] shrink-0">
          {/* CARD 1: Sign in to your account (Default) */}
          {mode === 'signin' && (
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] p-7 sm:p-9 border-2 border-[#D4AF37]/60">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Sign in to your account
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Access your NIA Group shareholder dashboard
                  </p>
                </div>
                <img
                  src="/nia-logo.png"
                  alt="NIA Crest"
                  className="w-11 h-11 rounded-full border border-[#D4AF37] bg-black shrink-0"
                />
              </div>

              {!bootstrapStatus.initialized && (
                <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                  <span>First-time setup ready (0 users).</span>
                  <button
                    type="button"
                    onClick={() => setMode('setup-admin')}
                    className="px-2.5 py-1 rounded-lg bg-[#D4AF37] text-slate-950 font-bold shrink-0 cursor-pointer"
                  >
                    Initialize Admin
                  </button>
                </div>
              )}

              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Shareholder ID or Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all"
                  />
                </div>

                <div>
                  <PasswordInput
                    required
                    showLockIcon
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    inputClassName="py-3 border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="inline-flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#B8860B] focus:ring-[#D4AF37]"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email.includes('@') ? email : '');
                      setMode('forgot');
                    }}
                    className="font-bold text-[#9A7B2C] hover:text-[#785E1E] cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0B101E] via-[#131C31] to-[#0B101E] hover:from-[#151F38] hover:to-[#151F38] border border-[#D4AF37] text-[#FDE047] font-extrabold text-sm shadow-lg shadow-slate-900/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 text-[#FDE047]" />
                </button>
              </form>

              <div className="relative my-5 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs text-slate-400 font-medium">or</span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              <button
                type="button"
                onClick={() => setMode('activate')}
                className="w-full py-3 px-4 rounded-xl border border-[#D4AF37]/50 bg-amber-50/40 hover:bg-amber-50 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <BadgeCheck className="w-4 h-4 text-[#B8860B]" />
                <span>Sign in with Company SSO / Activate Invite</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="mt-2.5 w-full py-2.5 px-3 rounded-xl border border-dashed border-[#D4AF37]/60 bg-amber-50/30 hover:bg-amber-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>Quick Fill Demo Credentials (Admin / Staff / Shareholder)</span>
              </button>

              {onBackToHome && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={onBackToHome}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>← Return to Portal Home</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CARD 2: First-Time Primary Administrator Setup */}
          {mode === 'setup-admin' && (
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] p-7 sm:p-9 border-2 border-[#D4AF37]/60">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/40 text-[#9A7B2C] text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Clean Database • First-Time Setup
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Initialize Administrator
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Create your primary Administrator account to start managing shareholders, the share register, valuations, and approvals.
              </p>

              <form onSubmit={handleSetupInitialAdmin} className="mt-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company display name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={companyNameInput}
                      onChange={(e) => setCompanyNameInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrator full name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrator email address
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Master password
                  </label>
                  <PasswordInput
                    required
                    minLength={8}
                    showLockIcon
                    showStrength
                    autoComplete="new-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-[#0B101E] border border-[#D4AF37] text-[#FDE047] font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Initializing...' : 'Initialize & Enter Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* CARD 3: Staff 2FA Verification (Interface M08) */}
          {mode === 'verify-staff' && (
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] p-7 sm:p-9 border-2 border-[#D4AF37]/60">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/40 text-[#9A7B2C] text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Staff 2-Step Verification
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Verify your sign in</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your 6-digit verification code for{' '}
                <strong className="text-slate-800">{preAuthData?.email}</strong> ({preAuthData?.role})
              </p>

              <form onSubmit={handleVerifyStaff} className="mt-6 space-y-4">
                {!useRecoveryMode ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Verification code (6 digits)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-mono-num font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                      Default staff verification code:{' '}
                      <code className="font-mono-num text-slate-700 font-bold">
                        {preAuthData?.demoVerificationCode || '246810'}
                      </code>
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Emergency recovery code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="APEX-RECOVERY-2026"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono-num font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0B101E] border border-[#D4AF37] text-[#FDE047] font-extrabold text-sm shadow-lg transition-all cursor-pointer"
                >
                  {submitting ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setUseRecoveryMode(!useRecoveryMode)}
                  className="text-[#9A7B2C] font-bold hover:underline cursor-pointer"
                >
                  {useRecoveryMode ? 'Use 6-digit code' : 'Use a recovery code'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          )}

          {/* CARD 4: Activate Invitation */}
          {mode === 'activate' && (
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] p-7 sm:p-9 border-2 border-[#D4AF37]/60">
              <h2 className="text-2xl font-extrabold text-slate-900">Activate your invitation</h2>
              <p className="text-xs text-slate-500 mt-1">
                Set your secure password to activate your invited Shareholder or Staff account.
              </p>

              <form onSubmit={handleActivateInvite} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invited email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="holder@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invitation code (e.g. INV-A1B2C3)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional if pre-verified"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Create password (min 8 characters)
                  </label>
                  <PasswordInput
                    required
                    minLength={8}
                    showLockIcon
                    showStrength
                    autoComplete="new-password"
                    placeholder="Choose a strong password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0B101E] border border-[#D4AF37] text-[#FDE047] font-extrabold text-sm shadow-lg cursor-pointer"
                >
                  {submitting ? 'Activating...' : 'Activate Account & Sign In'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* CARD 5: Password Recovery */}
          {mode === 'forgot' && (
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] p-7 sm:p-9 border-2 border-[#D4AF37]/60">
              <h2 className="text-2xl font-extrabold text-slate-900">Password recovery</h2>
              <p className="text-xs text-slate-500 mt-1">
                Request a short-lived reset token to set a new account password.
              </p>

              <form onSubmit={handleCompleteReset} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registered email address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="shareholder@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={handleRequestResetToken}
                      className="px-3.5 py-2.5 rounded-xl bg-[#0B101E] border border-[#D4AF37] text-[#FDE047] text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Get Token
                    </button>
                  </div>
                </div>

                {generatedResetDemo && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-[#D4AF37]/40 text-xs text-amber-950">
                    Reset token generated:{' '}
                    <strong className="font-mono-num">{generatedResetDemo}</strong>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short-lived reset token
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-character token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New password (min 8 characters)
                  </label>
                  <PasswordInput
                    required
                    minLength={8}
                    showLockIcon
                    showStrength
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0B101E] border border-[#D4AF37] text-[#FDE047] font-extrabold text-sm shadow-lg cursor-pointer"
                >
                  {submitting ? 'Updating...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Subtle Bottom Bar */}
      <footer className="relative z-20 max-w-7xl w-full mx-auto px-6 sm:px-10 pb-5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#FDE047]" />
          <span>NIA Group of Company • Controlled Share Register & Shareholder Portal</span>
        </div>
        <div className="text-[#F3E5AB]">119 Battaramulla - Pannipitiya Rd, Battaramulla, Sri Lanka</div>
      </footer>

      {/* QUICK FILL DEMO CREDENTIALS MODAL */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border-2 border-[#D4AF37] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B101E] border border-[#D4AF37] text-[#FDE047] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Quick-Fill Demo Credentials
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any role below to automatically fill the login form.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <div
                  key={acc.email}
                  className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-amber-50/40 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{acc.fullName}</span>
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
                    <div className="text-slate-500 font-mono-num text-[11px] mt-0.5">{acc.email}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectDemoAccount(acc)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0B101E] to-[#1E293B] hover:brightness-125 border border-[#D4AF37]/50 text-[#FDE047] text-xs font-extrabold shrink-0 shadow-xs cursor-pointer"
                  >
                    Select & Fill
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Staff 2FA Verification code is: <strong className="font-mono-num text-slate-800">246810</strong></span>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

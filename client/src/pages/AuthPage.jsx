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
  BadgeCheck
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
    <div className="min-h-screen relative flex flex-col justify-between overflow-hidden bg-[#0A1026] text-white">
      {/* Architectural Glass Tower & Twilight Backdrop (Matches Reference Image Top-Left & Mobile Landing) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45 pointer-events-none"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=75")'
        }}
      />
      {/* Deep Twilight Indigo-to-Violet Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090F26]/95 via-[#0E183B]/82 to-[#1B1447]/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080C20] via-transparent to-[#090F26]/60 pointer-events-none" />

      {/* Decorative Glowing Wave Curves at Bottom */}
      <svg
        viewBox="0 0 1440 260"
        fill="none"
        preserveAspectRatio="none"
        className="absolute bottom-0 inset-x-0 w-full h-44 pointer-events-none opacity-65"
      >
        <defs>
          <linearGradient id="authWave1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.3" />
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

      {/* Top Navigation Bar with APEX Software Solutions Logo */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <ApexBrandLogo size="lg" subtitle="Software Solutions" lightText />
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 hover:text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-sm"
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
              className="sm:hidden px-3 py-1.5 rounded-lg bg-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              ← Home
            </button>
          )}
          {!bootstrapStatus.initialized && mode !== 'setup-admin' && (
            <button
              type="button"
              onClick={() => setMode('setup-admin')}
              className="px-3.5 py-1.5 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md cursor-pointer"
            >
              First-Run Setup
            </button>
          )}
        </div>
      </header>

      {/* Main Split Content */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">
        {/* Left Hero Column (Matches Reference Image Left Side) */}
        <div className="w-full lg:w-6/12 space-y-6 text-center lg:text-left">
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.14] text-white drop-shadow-xs">
              NIA Group
              <br />
              Shareholder Portal
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-200/90 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              A secure, transparent and convenient way to view your shareholding, value, history and company updates.
            </p>
          </div>

          {/* 4 Feature Icon Rows from Reference Image */}
          <div className="pt-2 space-y-3.5 max-w-sm mx-auto lg:mx-0 text-left">
            <div className="flex items-center gap-3.5 text-slate-100">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-sky-300 backdrop-blur-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-medium">Secure Access</span>
            </div>

            <div className="flex items-center gap-3.5 text-slate-100">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-purple-300 backdrop-blur-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-medium">Real-time Holdings</span>
            </div>

            <div className="flex items-center gap-3.5 text-slate-100">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-indigo-300 backdrop-blur-xs">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-medium">Official Documents</span>
            </div>

            <div className="flex items-center gap-3.5 text-slate-100">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-amber-300 backdrop-blur-xs">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-medium">Company Updates</span>
            </div>
          </div>
        </div>

        {/* Right Floating White Authentication Card (Matches Reference Image Floating Card) */}
        <div className="w-full max-w-[430px] shrink-0">
          {/* CARD 1: Sign in to your account (Default) */}
          {mode === 'signin' && (
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-7 sm:p-9 border border-white/80">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Access your shareholder dashboard
              </p>

              {!bootstrapStatus.initialized && (
                <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                  <span>First-time setup ready (0 users).</span>
                  <button
                    type="button"
                    onClick={() => setMode('setup-admin')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold shrink-0 cursor-pointer"
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-all"
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
                    inputClassName="py-3 border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-[#7C3AED]"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="inline-flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#6D28D9] focus:ring-[#7C3AED]"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email.includes('@') ? email : '');
                      setMode('forgot');
                    }}
                    className="font-semibold text-[#6D28D9] hover:text-[#5B21B6] cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] hover:from-[#5B21B6] hover:to-[#4F46E5] text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
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
                className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <BadgeCheck className="w-4 h-4 text-[#6D28D9]" />
                <span>Sign in with Company SSO / Activate Invite</span>
              </button>

              {onBackToHome && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={onBackToHome}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>← Return to Portal Home</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CARD 2: First-Time Primary Administrator Setup */}
          {mode === 'setup-admin' && (
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-7 sm:p-9 border border-white/80">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-[#6D28D9] text-xs font-bold mb-3">
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-7 sm:p-9 border border-white/80">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-[#6D28D9] text-xs font-bold mb-3">
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-mono-num font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono-num font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  {submitting ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setUseRecoveryMode(!useRecoveryMode)}
                  className="text-[#6D28D9] font-semibold hover:underline cursor-pointer"
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
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-7 sm:p-9 border border-white/80">
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
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
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
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] text-white font-bold text-sm shadow-lg shadow-purple-600/30 cursor-pointer"
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
            <div className="bg-white text-slate-900 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-7 sm:p-9 border border-white/80">
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
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                    <button
                      type="button"
                      onClick={handleRequestResetToken}
                      className="px-3.5 py-2.5 rounded-xl bg-[#0D1127] hover:bg-slate-800 text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Get Token
                    </button>
                  </div>
                </div>

                {generatedResetDemo && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
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
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] text-white font-bold text-sm shadow-lg shadow-purple-600/30 cursor-pointer"
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
      <footer className="relative z-20 max-w-7xl w-full mx-auto px-6 sm:px-10 pb-5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          <span>Controlled Share Register & Shareholder Portal</span>
        </div>
        <div>APEX Software Solutions • Ref: ALG-SP-2026-16</div>
      </footer>
    </div>
  );
}

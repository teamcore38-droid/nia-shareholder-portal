import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  TrendingUp,
  BarChart3,
  FileText,
  Bell,
  Users,
  CheckCircle2,
  ChevronDown,
  Building2,
  PieChart,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Layers,
  Award,
  Download,
  KeyRound,
  FileCheck2,
  ArrowUpRight,
  Menu,
  X
} from 'lucide-react';
import { ApexBrandLogo } from '../components/ApexBrandLogo';

export default function HomePage({ onNavigateToAuth }) {
  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Holding Calculator State
  const [simulatedShares, setSimulatedShares] = useState(12500);
  const sharePrice = 125.0; // LKR
  const totalIssuedShares = 1000000;
  const simulatedValue = simulatedShares * sharePrice;
  const simulatedOwnership = ((simulatedShares / totalIssuedShares) * 100).toFixed(2);

  // Active showcase tab: 'shareholder' | 'governance' | 'documents'
  const [activeTab, setActiveTab] = useState('shareholder');

  // FAQ open item
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: 'How do I log in to my shareholder account?',
      a: 'You can sign in using either your unique Shareholder ID (e.g. SH-001) or your registered company email address alongside your secure password. If your email was newly enrolled by the registry, select "Activate Invite" to set your permanent credentials.'
    },
    {
      q: 'Are the statements and valuation certificates legally recognized?',
      a: 'Yes. All Share Holding Statements, Share Register Extracts, and Valuation Notices exported from the portal include certified digital cryptographic metadata, authorized registry seals, and timestamp verification in compliance with corporate governance guidelines.'
    },
    {
      q: 'How are share valuations updated in the system?',
      a: 'Valuations are managed under a strict dual-control (Maker-Checker) protocol. A Data Officer enters the new board-approved value per share and attaches board resolution evidence; an authorized Approver reviews and formally publishes it across the registry.'
    },
    {
      q: 'What should I do if my registered contact details change?',
      a: 'Once logged in to the portal, navigate to the Support tab to submit an authenticated Change of Particulars request directly to the NIA Group Corporate Registry desk.'
    },
    {
      q: 'How is shareholder data and equity information secured?',
      a: 'The portal utilizes 256-bit bank-grade encryption in transit and at rest, HttpOnly same-site session handling, multi-factor authentication (2FA) for administrative staff, and an immutable ledger audit trail.'
    }
  ];

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1127] text-white flex flex-col selection:bg-[#7C3AED] selection:text-white relative overflow-x-hidden">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[640px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#7C3AED]/25 via-[#6366F1]/20 to-transparent rounded-full blur-3xl opacity-70 animate-pulse-subtle" />
        <div className="absolute top-20 right-10 w-[420px] h-[420px] bg-gradient-to-bl from-[#38BDF8]/20 via-[#4F46E5]/20 to-transparent rounded-full blur-3xl opacity-60" />
      </div>

      {/* Decorative Wave Mesh at Bottom */}
      <svg
        className="absolute bottom-0 left-0 w-full pointer-events-none opacity-20 z-0"
        viewBox="0 0 1440 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0 160 C 360 80, 720 220, 1080 120 C 1260 70, 1380 110, 1440 90 L 1440 260 L 0 260 Z"
          fill="url(#homeWave)"
        />
        <defs>
          <linearGradient id="homeWave" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>

      {/* ========================================================= */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-[#0D1127]/85 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Entity Tag */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ApexBrandLogo size="md" subtitle="Software Solutions" lightText />
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-semibold text-slate-300 tracking-wide">
                NIA Group • Institutional Equity Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-medium text-slate-300">
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Portal Capabilities
            </button>
            <button
              onClick={() => scrollToSection('simulator')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Holdings Calculator
            </button>
            <button
              onClick={() => scrollToSection('modules')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Enterprise Modules
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Governance & Security
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateToAuth('signin')}
              className="px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              Staff SSO
            </button>
            <button
              type="button"
              onClick={() => onNavigateToAuth('signin')}
              className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] hover:from-[#5B21B6] hover:to-[#4F46E5] text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToAuth('signin')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white text-xs font-bold cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/10 text-slate-300 hover:text-white focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0D1127] border-b border-white/10 px-6 py-5 space-y-4 shadow-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Navigation
            </div>
            <div className="flex flex-col space-y-3 text-sm font-medium text-slate-200">
              <button
                onClick={() => scrollToSection('features')}
                className="text-left py-1 hover:text-purple-300 transition-colors"
              >
                Portal Capabilities
              </button>
              <button
                onClick={() => scrollToSection('simulator')}
                className="text-left py-1 hover:text-purple-300 transition-colors"
              >
                Holdings Calculator
              </button>
              <button
                onClick={() => scrollToSection('modules')}
                className="text-left py-1 hover:text-purple-300 transition-colors"
              >
                Enterprise Modules
              </button>
              <button
                onClick={() => scrollToSection('security')}
                className="text-left py-1 hover:text-purple-300 transition-colors"
              >
                Governance & Security
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-left py-1 hover:text-purple-300 transition-colors"
              >
                Investor FAQ
              </button>
            </div>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <span>Access Shareholder Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================= */}
      <section className="relative z-10 pt-10 sm:pt-16 pb-16 lg:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-14">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="w-full lg:w-6/12 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold text-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Official Shareholder & Registry Platform • Ref: ALG-SP-2026-16</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Transparent Equity.
              <br />
              <span className="bg-gradient-to-r from-[#A78BFA] via-[#C084FC] to-[#38BDF8] bg-clip-text text-transparent">
                Institutional Trust.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-xl mx-auto lg:mx-0">
              A secure digital gateway for <strong>NIA Group</strong> shareholders, directors, and
              corporate registry officers to track real-time shareholdings, monitor board-approved
              valuations, and access certified equity statements instantly.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#6366F1] hover:from-[#5B21B6] hover:to-[#4F46E5] text-white font-bold text-sm shadow-xl shadow-purple-600/35 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Enter Shareholder Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('simulator')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm backdrop-blur-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <PieChart className="w-4 h-4 text-purple-300" />
                <span>Simulate Holdings</span>
              </button>
            </div>

            {/* Fast Trust Indicators */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto lg:mx-0 text-left">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 text-sky-300 text-xs font-semibold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-Bit TLS</span>
                </div>
                <p className="text-[11px] text-slate-400">Bank-grade vault</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 text-purple-300 text-xs font-semibold mb-0.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Stepped Value</span>
                </div>
                <p className="text-[11px] text-slate-400">Board resolutions</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-semibold mb-0.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Certified PDF</span>
                </div>
                <p className="text-[11px] text-slate-400">Official extracts</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dual Control</span>
                </div>
                <p className="text-[11px] text-slate-400">Maker-checker flow</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Mockup Card (Matches Prototype UI) */}
          <div className="w-full lg:w-6/12 relative">
            <div className="relative mx-auto max-w-lg rounded-3xl bg-slate-900/90 border border-white/20 p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              {/* Top Bar inside Mockup */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6D28D9] to-[#7C3AED] text-white flex items-center justify-center font-bold text-xs">
                    SH
                  </div>
                  <div>
                    <div className="font-bold text-white">Shareholder SH-001</div>
                    <div className="text-[11px] text-slate-400">Ordinary Shareholder • Active</div>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Verified Register</span>
                </div>
              </div>

              {/* 4 Pastel KPI Cards Showcase */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Shares Held */}
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] font-semibold text-purple-200 uppercase tracking-wide">
                    Shares Held
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-0.5">
                    12,500
                  </div>
                  <span className="text-[10px] text-purple-300/80">Ordinary Shares</span>
                </div>

                {/* 2. Ownership */}
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                  <span className="text-[10px] font-semibold text-sky-200 uppercase tracking-wide">
                    Ownership
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-0.5">
                    1.25%
                  </div>
                  <span className="text-[10px] text-sky-300/80">of 1,000,000</span>
                </div>

                {/* 3. Value Per Share */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-semibold text-amber-200 uppercase tracking-wide">
                    Value / Share
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-0.5">
                    LKR 125.00
                  </div>
                  <span className="text-[10px] text-amber-300/80">Board Approved</span>
                </div>

                {/* 4. Holding Value */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wide">
                    Holding Value
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-0.5">
                    1.56M
                  </div>
                  <span className="text-[10px] text-emerald-300/80">LKR 1,562,500</span>
                </div>
              </div>

              {/* Graphic Chart Simulation */}
              <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    <span>Holding Value Milestone Trajectory</span>
                  </div>
                  <div className="text-[11px] text-purple-300 font-mono-num font-bold">
                    +25.0% YTD
                  </div>
                </div>

                {/* Simulated Stepped Curve SVG */}
                <div className="relative h-28 w-full pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 380 90">
                    <defs>
                      <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area */}
                    <path
                      d="M 10 75 L 80 75 L 80 60 L 160 60 L 160 48 L 240 48 L 240 32 L 320 32 L 320 18 L 370 18 L 370 85 L 10 85 Z"
                      fill="url(#heroChartFill)"
                    />
                    {/* Stepped Stroke Line */}
                    <path
                      d="M 10 75 L 80 75 L 80 60 L 160 60 L 160 48 L 240 48 L 240 32 L 320 32 L 320 18 L 370 18"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Data Points */}
                    <circle cx="80" cy="60" r="3.5" fill="#C084FC" />
                    <circle cx="160" cy="48" r="3.5" fill="#C084FC" />
                    <circle cx="240" cy="32" r="3.5" fill="#C084FC" />
                    <circle cx="320" cy="18" r="4" fill="#38BDF8" stroke="#0D1127" strokeWidth="2" />
                  </svg>

                  {/* Floating Callout Tooltip */}
                  <div className="absolute top-0 right-2 px-2.5 py-1 rounded-lg bg-[#6D28D9] text-white text-[10px] font-mono-num font-bold shadow-lg shadow-purple-900/50">
                    Current: LKR 1,562,500
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono-num">
                  <span>Jun 2026</span>
                  <span>Aug 2026</span>
                  <span>Oct 2026</span>
                  <span className="text-purple-300 font-semibold">Nov 2026 (Active)</span>
                </div>
              </div>

              {/* Bottom Quick Row */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">
                  Last Movement: <strong className="text-slate-200">Allocation (+2,500 units)</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateToAuth('signin')}
                  className="text-purple-300 hover:text-purple-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Interactive View</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Floating Glass Pill */}
            <div className="absolute -bottom-6 -left-4 sm:left-4 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-white/20 backdrop-blur-xl shadow-xl flex items-center gap-2.5 text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white">Cloud MongoDB Atlas</div>
                <div className="text-[10px] text-slate-400">Cluster0 • High Availability</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. INSTITUTIONAL METRICS STRIP */}
      {/* ========================================================= */}
      <section className="relative z-10 border-y border-white/10 bg-[#0A0D1F]/90 backdrop-blur-lg py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num">
                1,000,000
              </div>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                Issued Ordinary Shares
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-300 font-mono-num">
                LKR 125.00
              </div>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                Indicative Share Valuation
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-300 font-mono-num">
                LKR 125.0M
              </div>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                Enterprise Capitalization
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono-num">
                100%
              </div>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                Maker-Checker Audited
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. INTERACTIVE HOLDINGS SIMULATOR */}
      {/* ========================================================= */}
      <section id="simulator" className="relative z-10 py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold mb-3">
            <PieChart className="w-3.5 h-3.5" />
            <span>Interactive Equity Calculator</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Estimate Your Shareholding & Portfolio Value
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Adjust the slider or enter your units to evaluate your proportional stake in NIA Group
            based on the latest board-approved valuation.
          </p>
        </div>

        <div className="max-w-3xl mx-auto p-6 sm:p-9 rounded-3xl bg-slate-900/90 border border-white/15 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Input Controls */}
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>Number of Ordinary Shares</span>
                  <span className="text-purple-300 font-mono-num text-sm">
                    {simulatedShares.toLocaleString()} units
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="100000"
                  step="500"
                  value={simulatedShares}
                  onChange={(e) => setSimulatedShares(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono-num">
                  <span>500 shares</span>
                  <span>50,000 shares</span>
                  <span>100,000 shares</span>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-2">
                  Quick Benchmark Samples:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[5000, 12500, 25000].map((units) => (
                    <button
                      key={units}
                      type="button"
                      onClick={() => setSimulatedShares(units)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-mono-num font-bold border transition-all cursor-pointer ${
                        simulatedShares === units
                          ? 'bg-[#6D28D9] border-purple-400 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {units.toLocaleString()} sh
                    </button>
                  ))}
                </div>
              </div>

              {/* Valuation Basis Reference */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Share Price:</span>
                  <span className="font-bold text-white font-mono-num">LKR 125.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Issued Capital:</span>
                  <span className="font-bold text-white font-mono-num">1,000,000 shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Share Class:</span>
                  <span className="font-bold text-slate-200">Voting Ordinary</span>
                </div>
              </div>
            </div>

            {/* Output Display Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 text-center space-y-4">
              <div>
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">
                  Indicative Holding Value
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono-num mt-1">
                  LKR {simulatedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-left">
                <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Company Stake
                  </span>
                  <div className="text-lg font-bold text-sky-300 font-mono-num">
                    {simulatedOwnership}%
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Voting Weight
                  </span>
                  <div className="text-lg font-bold text-purple-300 font-mono-num">
                    {simulatedShares.toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] hover:from-[#5B21B6] hover:to-[#6D28D9] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Verify Your Actual Register Record</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. CORE PORTAL CAPABILITIES (3-COLUMN GRID) */}
      {/* ========================================================= */}
      <section id="features" className="relative z-10 py-16 bg-[#0A0D1F]/60 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered for Enterprise Equity Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Comprehensive capabilities designed specifically for NIA Group shareholders and corporate governance officers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Real-Time Holdings & Movements</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                View your complete share ledger, historical cumulative movements, opening balances, and verified certificate references in real time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 hover:border-sky-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Stepped Valuation Tracking</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Interactive charts illustrate exact board-approved stepped valuation increments with resolution dates, evidence attachments, and growth metrics.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 hover:border-indigo-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Certified PDF Statements</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Generate and download signed Share Holding Statements, Share Register Extracts, and Valuation Notices with cryptographic verification.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Dual-Control Maker-Checker</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Corporate share allocations, transfers, and valuation amendments require explicit Data Officer preparation and Approver sign-off.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 hover:border-amber-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Investor Updates & AGMs</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Receive authoritative company notices, annual reports, circulars, and AGM documentation directly through targeted shareholder distribution.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Encrypted Cloud Storage</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Powered by Cloudinary and MongoDB Atlas with record-level permissions ensuring private shareholder documents are strictly isolated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. TABBED WORKSPACE PREVIEW */}
      {/* ========================================================= */}
      <section id="modules" className="relative z-10 py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Role-Tailored Digital Workspaces
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Switch views to discover how the portal adapts to both individual shareholders and executive registry administrators.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className="p-1.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md inline-flex gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('shareholder')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'shareholder'
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Shareholder Portal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('governance')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'governance'
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Administration & Registry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Document Vault
            </button>
          </div>
        </div>

        {/* Tab Content Preview */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/15 backdrop-blur-xl shadow-2xl">
          {activeTab === 'shareholder' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Interface M01 • Shareholder Overview
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Clarity on Every Unit Held
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Shareholders access an intuitive dashboard displaying their opening shares, recent allocations, transfers, and net holding value calculated against the latest company valuation.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Instant breakdown of ownership percentage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Stepped valuation curve with floating historical milestones</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Mobile-responsive bottom navigation for on-the-go review</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/10">
                  <span className="font-bold text-white">Holding Summary</span>
                  <span className="text-slate-400 font-mono-num">SH-001</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Opening Shares:</span>
                  <span className="font-mono-num font-bold text-white">10,000</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Allocated Shares:</span>
                  <span className="font-mono-num font-bold text-emerald-300">+2,500</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-white/10">
                  <span className="font-bold text-white">Current Holding:</span>
                  <span className="font-mono-num font-extrabold text-purple-300">12,500</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Current Valuation:</span>
                  <span className="font-mono-num font-extrabold text-white">LKR 1,562,500</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'governance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                  Interface M10 • Administrative Workspace
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Dual-Control Approvals & Ledger Integrity
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Registry officers manage shareholders, capture share movements, and configure company valuations. All sensitive updates are queued into the Approvals tab requiring dual-signoff.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Four-eyes approval queue (Pending, Approved, Rejected, History)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Role-based access controls (Admin, Data Officer, Approver)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Automatic notification broadcasts upon change approval</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/10">
                  <span className="font-bold text-white">Approval Queue Sample</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Pending (3)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">TX-2026-0045</span>
                    <span className="text-purple-300">Share Transfer</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Transfer 5,000 shares SH-002 → SH-003</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">VAL-2026-0012</span>
                    <span className="text-sky-300">Valuation Update</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Update value per share to LKR 125.00</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Interface M03 • Certified PDF Output
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Official Verification At Your Fingertips
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Export professional PDF documentation on official letterhead formatted to institutional legal and auditing standards.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Certified Share Statement with seal and issuance date</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Audited Share Register Extracts for compliance audits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Valuation Notices and Annual General Meeting publications</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/10">
                  <span className="font-bold text-white">Available Documents</span>
                  <span className="text-slate-400">Tamper-Proof</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span className="font-semibold text-slate-200">Share_Statement_SH001.pdf</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span className="font-semibold text-slate-200">Valuation_Notice_2026.pdf</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. SECURITY & GOVERNANCE */}
      {/* ========================================================= */}
      <section id="security" className="relative z-10 py-16 bg-[#0A0D1F]/70 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Institutional Grade Security</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Enterprise Governance & Data Protection
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Built following international security standards to guarantee the confidentiality and integrity of NIA Group equity data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <KeyRound className="w-6 h-6 text-purple-400 mb-3" />
              <h4 className="text-sm font-bold text-white mb-1">Multi-Factor 2FA</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Staff accounts are safeguarded with mandatory multi-factor authentication and emergency recovery keys.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <Lock className="w-6 h-6 text-sky-400 mb-3" />
              <h4 className="text-sm font-bold text-white mb-1">HttpOnly Cookie Tokens</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tokens are stored in protected HttpOnly same-site cookies, preventing XSS credential theft.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <FileCheck2 className="w-6 h-6 text-indigo-400 mb-3" />
              <h4 className="text-sm font-bold text-white mb-1">Immutable Audit Ledger</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every login, valuation update, and share movement is stamped with user identity, timestamp, and IP address.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="text-sm font-bold text-white mb-1">Restricted Document Isolation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Private shareholder files require verified individual authorization before files are decrypted and streamed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
      {/* ========================================================= */}
      <section id="faq" className="relative z-10 py-16 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Shareholder Support</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Everything you need to know about the NIA Group Shareholder Portal.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-white cursor-pointer hover:bg-white/5"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-purple-400 shrink-0 transition-transform ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. BOTTOM CALL TO ACTION BANNER */}
      {/* ========================================================= */}
      <section className="relative z-10 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#6D28D9]/90 via-[#7C3AED]/90 to-[#4F46E5]/90 p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Access Your Shareholder Dashboard Today
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
              Log in to view your verified equity balance, inspect recent allocations, and download your latest certified holding statement.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4 text-[#6D28D9]" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 border border-white/30 text-white font-semibold text-sm cursor-pointer"
              >
                Activate Account Invite
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. ENTERPRISE FOOTER */}
      {/* ========================================================= */}
      <footer className="relative z-10 border-t border-white/10 bg-[#070914] py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ApexBrandLogo size="sm" subtitle="Software Solutions" lightText />
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">NIA Group of Company</span>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <div>Institutional Shareholder & Registry Web Application</div>
            <div className="text-[11px] text-slate-500">
              Proposal Ref: ALG-SP-2026-16 • © {new Date().getFullYear()} APEX Software Solutions. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

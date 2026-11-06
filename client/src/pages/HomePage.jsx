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
  Sparkles,
  Download,
  KeyRound,
  FileCheck2,
  Menu,
  X,
  Home,
  HardHat,
  Globe,
  Settings,
  MapPin,
  Mail,
  Phone,
  ExternalLink
} from 'lucide-react';
import { ApexBrandLogo } from '../components/ApexBrandLogo';

export default function HomePage({ onNavigateToAuth }) {
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

  // The 6 Official Business Sectors from the NIA Group Building Facade
  const niaDivisions = [
    {
      title: 'REAL ESTATE',
      subtitle: 'Commercial & Residential Developments',
      desc: 'Premier land acquisition, luxury residential complexes, and commercial property development across Sri Lanka.',
      icon: Home
    },
    {
      title: 'CONSTRUCTION',
      subtitle: 'Civil & Structural Engineering',
      desc: 'End-to-end architectural construction, modern corporate towers, and high-standard infrastructure projects.',
      icon: HardHat
    },
    {
      title: 'INVESTMENT',
      subtitle: 'Strategic Capital & Equity Growth',
      desc: 'Disciplined capital allocation, shareholder wealth creation, and high-yield institutional portfolio management.',
      icon: TrendingUp
    },
    {
      title: 'TRADING',
      subtitle: 'International & Domestic Commerce',
      desc: 'Cross-border commodity trading, supply chain networks, and strategic import/export partnerships.',
      icon: Globe
    },
    {
      title: 'CONSULTANCY',
      subtitle: 'Corporate & Financial Advisory',
      desc: 'Enterprise structuring, project feasibility, regulatory compliance, and executive management consultancy.',
      icon: Users
    },
    {
      title: 'SERVICES',
      subtitle: 'Integrated Facility & Enterprise Solutions',
      desc: 'Comprehensive operational support, property management, and value-added corporate services.',
      icon: Settings
    }
  ];

  const faqs = [
    {
      q: 'How do I log in to my NIA Group Shareholder account?',
      a: 'You can sign in using either your unique Shareholder ID (e.g. SH-001) or your registered email address alongside your secure password. If your email was newly enrolled by the registry, select "Activate Invite" to set your permanent credentials.'
    },
    {
      q: 'Are the statements and valuation certificates legally recognized?',
      a: 'Yes. All Share Holding Statements, Share Register Extracts, and Valuation Notices exported from the NIA Group portal include certified digital cryptographic metadata, authorized registry seals, and timestamp verification.'
    },
    {
      q: 'How are share valuations updated in the system?',
      a: 'Valuations are managed under a strict dual-control (Maker-Checker) protocol. A Data Officer enters the new board-approved value per share and attaches board resolution evidence; an authorized Approver reviews and formally publishes it across the registry.'
    },
    {
      q: 'What should I do if my registered contact details change?',
      a: 'Once logged in to the portal, navigate to the Support tab to submit an authenticated Change of Particulars request directly to the NIA Group Corporate Registry desk in Battaramulla.'
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
    <div className="min-h-screen bg-[#080C16] text-white flex flex-col selection:bg-[#D4AF37] selection:text-slate-950 relative overflow-x-hidden">
      {/* ========================================================= */}
      {/* ARCHITECTURAL NIA CAMPUS HERO BACKDROP & GOLD GLOWS        */}
      {/* Responsive: Desktop (16:9 landscape) / Mobile (9:16 portrait) */}
      {/* ========================================================= */}
      <picture className="absolute top-0 inset-x-0 h-[1050px] lg:h-[1150px] pointer-events-none z-0 overflow-hidden block">
        <source media="(min-width: 768px)" srcSet="/nia-campus-desktop.webp" />
        <img
          src="/nia-campus-mobile.webp"
          alt="NIA Corporate Campus Hero Backdrop"
          className="w-full h-full object-cover object-top lg:object-center opacity-85 select-none"
          loading="eager"
          fetchPriority="high"
        />
      </picture>
      {/* Balanced Cinematic Overlays: lets campus architecture & blue sky remain clearly visible while keeping text crisp */}
      <div className="absolute top-0 inset-x-0 h-[1050px] lg:h-[1150px] bg-gradient-to-b from-[#080C16]/80 via-[#080C16]/30 to-[#080C16] pointer-events-none z-0" />
      <div className="hidden lg:block absolute top-0 inset-x-0 h-[1150px] bg-gradient-to-r from-[#080C16]/85 via-[#080C16]/40 to-transparent pointer-events-none z-0" />

      {/* Ambient Gold Spotlight Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] bg-gradient-to-br from-[#D4AF37]/20 via-[#F59E0B]/12 to-transparent rounded-full blur-3xl opacity-80 animate-pulse-subtle" />
        <div className="absolute top-24 right-10 w-[440px] h-[440px] bg-gradient-to-bl from-[#FDE047]/15 via-[#B8860B]/15 to-transparent rounded-full blur-3xl opacity-70" />
      </div>

      {/* Decorative Golden Ribbon Wave at Bottom */}
      <svg
        className="absolute bottom-0 left-0 w-full pointer-events-none opacity-25 z-0"
        viewBox="0 0 1440 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0 160 C 360 80, 720 220, 1080 120 C 1260 70, 1380 110, 1440 90 L 1440 260 L 0 260 Z"
          fill="url(#niaHomeGoldWave)"
        />
        <defs>
          <linearGradient id="niaHomeGoldWave" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9A7B2C" />
            <stop offset="50%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>
      </svg>

      {/* ========================================================= */}
      {/* 1. TOP NAVIGATION BAR (OBSIDIAN & METALLIC GOLD)          */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-[#080C16]/90 backdrop-blur-md border-b border-[#D4AF37]/25 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Official NIA Crest Logo & Alliance Tag */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ApexBrandLogo size="md" subtitle="GROUP OF COMPANY" lightText showAllianceTag />
            <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-[#D4AF37]/25">
              <span className="w-2 h-2 rounded-full bg-[#FDE047] animate-ping" />
              <span className="text-xs font-semibold text-[#F3E5AB] tracking-wide">
                E-STD 2022 • Shareholder & Equity Registry
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <button
              onClick={() => scrollToSection('divisions')}
              className="hover:text-[#FDE047] transition-colors cursor-pointer"
            >
              Our Sectors
            </button>
            <button
              onClick={() => scrollToSection('simulator')}
              className="hover:text-[#FDE047] transition-colors cursor-pointer"
            >
              Holdings Calculator
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-[#FDE047] transition-colors cursor-pointer"
            >
              Portal Capabilities
            </button>
            <button
              onClick={() => scrollToSection('modules')}
              className="hover:text-[#FDE047] transition-colors cursor-pointer"
            >
              Workspaces
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="hover:text-[#FDE047] transition-colors cursor-pointer"
            >
              Headquarters
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateToAuth('signin')}
              className="px-4 py-2 text-xs font-bold text-[#F3E5AB] hover:text-[#FDE047] transition-colors cursor-pointer"
            >
              Staff SSO
            </button>
            <button
              type="button"
              onClick={() => onNavigateToAuth('signin')}
              className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:from-[#D4AF37] hover:to-[#F59E0B] text-slate-950 text-xs font-extrabold shadow-[0_8px_25px_rgba(212,175,55,0.35)] flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
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
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/10 border border-[#D4AF37]/30 text-[#FDE047] hover:text-white focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#080C16] border-b border-[#D4AF37]/30 px-6 py-5 space-y-4 shadow-2xl">
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              NIA Group Navigation
            </div>
            <div className="flex flex-col space-y-3 text-sm font-medium text-slate-200">
              <button
                onClick={() => scrollToSection('divisions')}
                className="text-left py-1 hover:text-[#FDE047] transition-colors"
              >
                6 Business Sectors
              </button>
              <button
                onClick={() => scrollToSection('simulator')}
                className="text-left py-1 hover:text-[#FDE047] transition-colors"
              >
                Holdings Calculator
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="text-left py-1 hover:text-[#FDE047] transition-colors"
              >
                Portal Capabilities
              </button>
              <button
                onClick={() => scrollToSection('modules')}
                className="text-left py-1 hover:text-[#FDE047] transition-colors"
              >
                Enterprise Workspaces
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="text-left py-1 hover:text-[#FDE047] transition-colors"
              >
                Headquarters & Contact
              </button>
            </div>
            <div className="pt-3 border-t border-[#D4AF37]/20 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <span>Access Shareholder Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION (NIA GROUP MOTTO, CREST & LIVE PORTAL)    */}
      {/* ========================================================= */}
      <section className="relative z-10 pt-10 sm:pt-14 pb-16 lg:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
          {/* Left Column: NIA Group Identity, Motto & CTAs */}
          <div className="w-full lg:w-6/12 text-center lg:text-left space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#080C16]/80 border border-[#D4AF37]/50 backdrop-blur-md text-xs font-bold text-[#FDE047] shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-[#FDE047]" />
              <span className="tracking-wider uppercase">
                Nexus International Alliance • E-STD 2022
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-extrabold tracking-[0.25em] uppercase text-[#D4AF37] drop-shadow-md">
                — Building A Better Tomorrow Together —
              </p>
              <h1
                className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]"
                style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
              >
                NIA GROUP
                <br />
                <span className="bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#F59E0B] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                  SHAREHOLDER PORTAL
                </span>
              </h1>
            </div>

            {/* Reduced, crisp, punchy text */}
            <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed max-w-lg mx-auto lg:mx-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Official institutional equity registry and shareholder governance gateway for{' '}
              <strong className="text-[#FDE047] font-bold">NIA Group of Company</strong>.
            </p>

            {/* CTAs */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:from-[#D4AF37] hover:to-[#F59E0B] text-slate-950 font-extrabold text-sm shadow-[0_10px_30px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Enter Shareholder Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('simulator')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#080C16]/80 hover:bg-[#111827] border border-[#D4AF37]/50 text-[#F3E5AB] font-bold text-sm backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <PieChart className="w-4 h-4 text-[#FDE047]" />
                <span>Simulate Holdings</span>
              </button>
            </div>

            {/* Compact Sleek Trust Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 max-w-lg mx-auto lg:mx-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C16]/80 border border-[#D4AF37]/35 text-[#FDE047] text-xs font-semibold backdrop-blur-md shadow">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>256-Bit TLS</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C16]/80 border border-[#D4AF37]/35 text-[#D4AF37] text-xs font-semibold backdrop-blur-md shadow">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Stepped Value</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C16]/80 border border-[#D4AF37]/35 text-amber-300 text-xs font-semibold backdrop-blur-md shadow">
                <FileText className="w-3.5 h-3.5" />
                <span>Certified PDF</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C16]/80 border border-[#D4AF37]/35 text-emerald-400 text-xs font-semibold backdrop-blur-md shadow">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Dual Control</span>
              </span>
            </div>
          </div>

          {/* Right Column: NIA Crest + Live Gold-Themed Dashboard Mockup */}
          <div className="w-full lg:w-6/12 relative">
            <div className="relative mx-auto max-w-lg rounded-3xl bg-[#0B101E]/95 border-2 border-[#D4AF37]/40 p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              {/* Top Gold Header inside Mockup */}
              <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/25 text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src="/nia-logo.png"
                    alt="NIA Crest"
                    className="w-10 h-10 rounded-full border border-[#D4AF37] object-contain bg-black"
                  />
                  <div>
                    <div className="font-extrabold text-[#FDE047] tracking-wide">
                      Shareholder SH-001
                    </div>
                    <div className="text-[11px] text-slate-400">
                      NIA Group of Company • Ordinary Share Register
                    </div>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FDE047] font-bold text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FDE047]" />
                  <span>Verified</span>
                </div>
              </div>

              {/* 4 Gold & Obsidian KPI Cards */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#131B2E] border border-[#D4AF37]/30">
                  <span className="text-[10px] font-bold text-[#F3E5AB] uppercase tracking-wide">
                    Shares Held
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-0.5">
                    12,500
                  </div>
                  <span className="text-[10px] text-[#D4AF37]">Ordinary Units</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#131B2E] border border-[#D4AF37]/30">
                  <span className="text-[10px] font-bold text-[#F3E5AB] uppercase tracking-wide">
                    Ownership
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-[#FDE047] font-mono-num mt-0.5">
                    1.25%
                  </div>
                  <span className="text-[10px] text-slate-400">of 1,000,000</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#131B2E] border border-[#D4AF37]/30">
                  <span className="text-[10px] font-bold text-[#F3E5AB] uppercase tracking-wide">
                    Value / Share
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-0.5">
                    LKR 125.00
                  </div>
                  <span className="text-[10px] text-[#D4AF37]">Board Approved</span>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 to-[#B8860B]/10 border border-[#FDE047]/50">
                  <span className="text-[10px] font-bold text-[#FDE047] uppercase tracking-wide">
                    Holding Value
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-[#FDE047] font-mono-num mt-0.5">
                    1.56M
                  </div>
                  <span className="text-[10px] text-[#F3E5AB]">LKR 1,562,500</span>
                </div>
              </div>

              {/* Golden Stepped Valuation Curve */}
              <div className="mt-4 p-4 rounded-2xl bg-[#101726] border border-[#D4AF37]/25">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="font-bold text-[#F3E5AB] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FDE047]" />
                    <span>Holding Value Over Time</span>
                  </div>
                  <div className="text-[11px] text-[#FDE047] font-mono-num font-bold">
                    +25.0% Growth
                  </div>
                </div>

                <div className="relative h-28 w-full pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 380 90">
                    <defs>
                      <linearGradient id="niaHeroChartGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.48" />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 75 L 80 75 L 80 60 L 160 60 L 160 48 L 240 48 L 240 32 L 320 32 L 320 18 L 370 18 L 370 85 L 10 85 Z"
                      fill="url(#niaHeroChartGold)"
                    />
                    <path
                      d="M 10 75 L 80 75 L 80 60 L 160 60 L 160 48 L 240 48 L 240 32 L 320 32 L 320 18 L 370 18"
                      fill="none"
                      stroke="#FDE047"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="80" cy="60" r="3.5" fill="#D4AF37" />
                    <circle cx="160" cy="48" r="3.5" fill="#D4AF37" />
                    <circle cx="240" cy="32" r="3.5" fill="#D4AF37" />
                    <circle
                      cx="320"
                      cy="18"
                      r="4.5"
                      fill="#FDE047"
                      stroke="#080C16"
                      strokeWidth="2"
                    />
                  </svg>

                  <div className="absolute top-0 right-2 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-slate-950 text-[10px] font-mono-num font-extrabold shadow-lg">
                    LKR 1,562,500
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono-num">
                  <span>Jun 2026</span>
                  <span>Aug 2026</span>
                  <span>Oct 2026</span>
                  <span className="text-[#FDE047] font-bold">Nov 2026</span>
                </div>
              </div>

              {/* Bottom Quick Row */}
              <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">
                  Latest Allocation: <strong className="text-[#F3E5AB]">+2,500 Ordinary Shares</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateToAuth('signin')}
                  className="text-[#FDE047] hover:text-amber-200 font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. INSTITUTIONAL METRICS STRIP (GOLD & OBSIDIAN)          */}
      {/* ========================================================= */}
      <section className="relative z-10 border-y border-[#D4AF37]/30 bg-[#060911]/95 backdrop-blur-lg py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num">
                1,000,000
              </div>
              <p className="text-xs text-[#D4AF37] mt-1 uppercase tracking-wider font-bold">
                Issued Ordinary Shares
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#FDE047] font-mono-num">
                LKR 125.00
              </div>
              <p className="text-xs text-[#D4AF37] mt-1 uppercase tracking-wider font-bold">
                Current Value Per Share
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num">
                LKR 125.0M
              </div>
              <p className="text-xs text-[#D4AF37] mt-1 uppercase tracking-wider font-bold">
                Indicative Enterprise Value
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#FDE047] font-mono-num">
                6 Sectors
              </div>
              <p className="text-xs text-[#D4AF37] mt-1 uppercase tracking-wider font-bold">
                Diversified Group Portfolio
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. ARCHITECTURAL SHOWCASE: NIA GROUP 6 CORE DIVISIONS     */}
      {/* (Modeled directly after the NIA Group Building Facade)     */}
      {/* ========================================================= */}
      <section id="divisions" className="relative z-10 py-16 sm:py-22 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FDE047] text-xs font-bold mb-3 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>Diversified Corporate Structure</span>
          </div>
          <h2
            className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase"
            style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
          >
            NIA Group of Company Pillars
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Every ordinary share represents ownership across NIA Group’s six core operational
            divisions headquartered in Battaramulla, Sri Lanka.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Architectural Building Card (5 Columns) */}
          <div className="lg:col-span-5 rounded-3xl overflow-hidden border-2 border-[#D4AF37]/45 bg-[#0B101E] shadow-2xl flex flex-col justify-between relative min-h-[460px]">
            <img
              src="/nia-building.jpg"
              alt="NIA Group of Company Headquarters Building"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/45 to-transparent" />

            <div className="relative z-10 p-6 flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-black/75 border border-[#D4AF37]/50 text-[#FDE047] text-[11px] font-bold tracking-wider uppercase backdrop-blur-md">
                Corporate Headquarters
              </span>
              <img
                src="/nia-logo.png"
                alt="NIA Group Seal"
                className="w-14 h-14 rounded-full border-2 border-[#D4AF37] bg-black shadow-lg"
              />
            </div>

            <div className="relative z-10 p-6 sm:p-7 space-y-2">
              <div className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#FDE047]">
                Nexus International Alliance
              </div>
              <h3
                className="text-2xl font-extrabold text-white uppercase"
                style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
              >
                Building A Better Tomorrow Together
              </h3>
              <p className="text-xs text-slate-200 flex items-center gap-1.5 pt-1">
                <MapPin className="w-4 h-4 text-[#FDE047] shrink-0" />
                <span>119 Battaramulla - Pannipitiya Rd, Battaramulla, Sri Lanka</span>
              </p>
            </div>
          </div>

          {/* Right 6-Division Architectural Grid matching Building Facade Panels (7 Columns) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {niaDivisions.map((div) => {
              const IconComponent = div.icon;
              return (
                <div
                  key={div.title}
                  className="p-5 rounded-2xl bg-[#0D1322] border-b-2 border border-[#D4AF37]/35 hover:border-[#FDE047] transition-all group flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37]/25 to-[#9A7B2C]/10 border border-[#D4AF37]/40 text-[#FDE047] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#D4AF37]/80">
                        NIA SECTOR
                      </span>
                    </div>
                    <h3
                      className="text-base font-extrabold text-[#FDE047] tracking-wider uppercase"
                      style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
                    >
                      {div.title}
                    </h3>
                    <div className="text-xs font-semibold text-white mt-0.5">{div.subtitle}</div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{div.desc}</p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-[#D4AF37]/20 flex items-center justify-between text-[11px] text-[#F3E5AB]">
                    <span>Active Equity Division</span>
                    <span className="text-[#FDE047] font-bold">● Verified</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. INTERACTIVE HOLDINGS SIMULATOR (GOLD & OBSIDIAN)       */}
      {/* ========================================================= */}
      <section id="simulator" className="relative z-10 py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FDE047] text-xs font-bold mb-3 uppercase tracking-wider">
            <PieChart className="w-3.5 h-3.5" />
            <span>Interactive Equity Calculator</span>
          </div>
          <h2
            className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
            style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
          >
            Estimate Your NIA Shareholding Value
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Slide or select a benchmark holding to calculate your proportional stake and indicative
            value in NIA Group of Company.
          </p>
        </div>

        <div className="max-w-3xl mx-auto p-6 sm:p-9 rounded-3xl bg-[#0D1322]/95 border-2 border-[#D4AF37]/40 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>Number of Ordinary Shares</span>
                  <span className="text-[#FDE047] font-mono-num text-sm font-extrabold">
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
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono-num">
                  <span>500 shares</span>
                  <span>50,000 shares</span>
                  <span>100,000 shares</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-2">
                  Quick Benchmark Holdings:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[5000, 12500, 25000].map((units) => (
                    <button
                      key={units}
                      type="button"
                      onClick={() => setSimulatedShares(units)}
                      className={`py-2 px-2 rounded-xl text-xs font-mono-num font-extrabold border transition-all cursor-pointer ${
                        simulatedShares === units
                          ? 'bg-gradient-to-r from-[#B8860B] to-[#D4AF37] border-[#FDE047] text-slate-950'
                          : 'bg-white/5 border-[#D4AF37]/25 text-[#F3E5AB] hover:bg-white/10'
                      }`}
                    >
                      {units.toLocaleString()} sh
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#080C16] border border-[#D4AF37]/25 text-xs text-slate-300 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Board-Approved Share Price:</span>
                  <span className="font-bold text-[#FDE047] font-mono-num">LKR 125.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Issued Capital:</span>
                  <span className="font-bold text-white font-mono-num">1,000,000 shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Share Class:</span>
                  <span className="font-bold text-[#F3E5AB]">Ordinary Voting</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 via-[#131B2E] to-[#080C16] border border-[#D4AF37]/50 text-center space-y-4">
              <div>
                <span className="text-xs font-extrabold text-[#FDE047] uppercase tracking-wider">
                  Indicative Holding Value
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono-num mt-1">
                  LKR {simulatedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#D4AF37]/25 text-left">
                <div className="p-2.5 rounded-xl bg-black/40 border border-[#D4AF37]/20">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Company Stake
                  </span>
                  <div className="text-lg font-extrabold text-[#FDE047] font-mono-num">
                    {simulatedOwnership}%
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-[#D4AF37]/20">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Voting Units
                  </span>
                  <div className="text-lg font-extrabold text-white font-mono-num">
                    {simulatedShares.toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:from-[#D4AF37] hover:to-[#F59E0B] text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Verify Your Official Register Record</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. CORE PORTAL CAPABILITIES (GOLD & OBSIDIAN CARDS)       */}
      {/* ========================================================= */}
      <section id="features" className="relative z-10 py-16 bg-[#060911]/80 border-t border-[#D4AF37]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2
              className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
            >
              Institutional Registry Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Designed for complete transparency, dual-control governance, and instant document
              verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#0D1322] border border-[#D4AF37]/30 hover:border-[#FDE047] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FDE047] flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Real-Time Holdings & Ledger</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Inspect your opening shares, newly allocated blocks, share transfers, and net
                cumulative equity position in real time.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-[#D4AF37]/30 hover:border-[#FDE047] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FDE047] flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Stepped Valuation Engine</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Track board-approved share price increments with resolution dates, valuation
                evidence attachments, and portfolio impact metrics.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-[#D4AF37]/30 hover:border-[#FDE047] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FDE047] flex items-center justify-center mb-5">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Certified PDF Statements</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Download official Share Holding Statements, Share Register Extracts, and Valuation
                Notices formatted on NIA Group letterhead.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-[#D4AF37]/30 hover:border-[#FDE047] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FDE047] flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Dual-Control Maker-Checker</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Share allocations, transfers, and valuation updates require Data Officer preparation
                followed by independent Approver sign-off.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-[#D4AF37]/30 hover:border-[#FDE047] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FDE047] flex items-center justify-center mb-5">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Investor Updates & AGMs</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Receive official company announcements, Annual General Meeting notices, and
                executive project updates across all six NIA sectors.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-[#D4AF37]/30 hover:border-[#FDE047] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FDE047] flex items-center justify-center mb-5">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Multi-Factor Security</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Protected by 2FA staff verification, HttpOnly session cookies, record-level
                document isolation, and immutable audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. TABBED WORKSPACE PREVIEW                               */}
      {/* ========================================================= */}
      <section id="modules" className="relative z-10 py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2
            className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
            style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
          >
            Role-Tailored Digital Workspaces
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Explore how the platform serves both NIA Group shareholders and corporate registry
            administrators.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="p-1.5 rounded-2xl bg-[#0D1322] border border-[#D4AF37]/35 inline-flex flex-wrap justify-center gap-1.5">
            {[
              { id: 'shareholder', label: 'Shareholder Portal' },
              { id: 'governance', label: 'Administration & Registry' },
              { id: 'documents', label: 'Document Vault' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-[#FDE047]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-[#0D1322]/95 border border-[#D4AF37]/35 shadow-2xl">
          {activeTab === 'shareholder' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold text-[#FDE047] uppercase tracking-wider">
                  Shareholder Overview
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Complete Clarity on Every Unit Held
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Shareholders access an intuitive dashboard displaying opening shares, recent
                  allocations, transfers, and net holding value calculated against the latest
                  board-approved valuation.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Instant breakdown of ownership percentage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Stepped valuation curve with historical milestones</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Mobile-responsive bottom navigation bar</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-[#080C16] border border-[#D4AF37]/30 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#D4AF37]/20">
                  <span className="font-bold text-[#F3E5AB]">Holding Summary</span>
                  <span className="text-[#FDE047] font-mono-num font-bold">SH-001</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Opening Shares:</span>
                  <span className="font-mono-num font-bold text-white">10,000</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Allocated Shares:</span>
                  <span className="font-mono-num font-bold text-emerald-400">+2,500</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-[#D4AF37]/20">
                  <span className="font-bold text-white">Current Holding:</span>
                  <span className="font-mono-num font-extrabold text-[#FDE047]">12,500</span>
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
                <span className="text-xs font-bold text-[#FDE047] uppercase tracking-wider">
                  Administrative Workspace
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Dual-Control Approvals & Ledger Integrity
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Registry officers manage shareholders, record share movements, and submit
                  valuation updates through a strict maker-checker approval queue.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Four-eyes approval queue (Pending, Approved, Rejected, History)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Role-based access controls (Admin, Data Officer, Approver)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Automatic shareholder notifications upon approval</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-[#080C16] border border-[#D4AF37]/30 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#D4AF37]/20">
                  <span className="font-bold text-[#F3E5AB]">Approval Queue</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#FDE047] text-[10px] font-bold">
                    Pending (3)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">TX-2026-0045</span>
                    <span className="text-[#FDE047]">Share Transfer</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Transfer 5,000 shares SH-002 → SH-003</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">VAL-2026-0012</span>
                    <span className="text-amber-300">Valuation Update</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Update value per share to LKR 125.00</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold text-[#FDE047] uppercase tracking-wider">
                  Certified PDF Output
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Official Verification At Your Fingertips
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Export professional PDF documentation on official NIA Group of Company letterhead
                  formatted to institutional legal and auditing standards.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Certified Share Statement with seal and issuance date</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Audited Share Register Extracts for compliance audits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDE047]" />
                    <span>Valuation Notices and AGM publications</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-[#080C16] border border-[#D4AF37]/30 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#D4AF37]/20">
                  <span className="font-bold text-[#F3E5AB]">Available Documents</span>
                  <span className="text-[#D4AF37]">Tamper-Proof</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#FDE047]" />
                    <span className="font-semibold text-slate-200">Share_Statement_SH001.pdf</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#FDE047]" />
                    <span className="font-semibold text-slate-200">Valuation_Notice_2026.pdf</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FREQUENTLY ASKED QUESTIONS                             */}
      {/* ========================================================= */}
      <section id="faq" className="relative z-10 py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FDE047] text-xs font-bold mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Shareholder Support</span>
          </div>
          <h2
            className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
            style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
          >
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-[#0D1322] border border-[#D4AF37]/30 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-[#F3E5AB] cursor-pointer hover:bg-white/5"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#FDE047] shrink-0 transition-transform ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-[#D4AF37]/15 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. HEADQUARTERS & CALL TO ACTION BANNER                   */}
      {/* ========================================================= */}
      <section id="contact" className="relative z-10 py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#12192B] via-[#0E1525] to-[#161F33] border-2 border-[#D4AF37]/50 p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          {/* Responsive Campus Backdrop in CTA Card */}
          <picture className="absolute inset-0 pointer-events-none overflow-hidden block">
            <source media="(min-width: 768px)" srcSet="/nia-campus-desktop.webp" />
            <img
              src="/nia-campus-mobile.webp"
              alt="NIA Corporate Campus"
              className="w-full h-full object-cover object-center opacity-25 select-none"
              loading="lazy"
            />
          </picture>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.2em] uppercase text-[#FDE047]">
                <span>Nexus International Alliance • E-STD 2022</span>
              </div>
              <h2
                className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
              >
                Building A Better Tomorrow Together
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-xl">
                Sign in to your NIA Group Shareholder account to view your verified equity balance,
                inspect recent share movements, and download certified holding statements.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateToAuth('signin')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:from-[#D4AF37] hover:to-[#F59E0B] text-slate-950 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToAuth('signin')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-black/50 hover:bg-black/70 border border-[#D4AF37]/40 text-[#F3E5AB] font-bold text-sm cursor-pointer"
                >
                  Activate Account Invite
                </button>
              </div>
            </div>

            {/* Official Contact Details from NIA Group Building Banner */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#080C16]/90 border border-[#D4AF37]/40 space-y-3.5 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-[#D4AF37]/25">
                <img
                  src="/nia-logo.png"
                  alt="NIA Group Crest"
                  className="w-11 h-11 rounded-full border border-[#D4AF37] bg-black"
                />
                <div>
                  <div className="font-extrabold text-[#FDE047] text-sm uppercase">
                    NIA Group of Company
                  </div>
                  <div className="text-[11px] text-slate-400">Corporate Registry & Head Office</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-200">
                <MapPin className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
                <span>119 Battaramulla - Pannipitiya Rd, Battaramulla, Sri Lanka</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-200">
                <Globe className="w-4 h-4 text-[#FDE047] shrink-0" />
                <span>www.niagc.com</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-200">
                <Mail className="w-4 h-4 text-[#FDE047] shrink-0" />
                <span>info@niagc.com / niagc.com@gmail.com</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-200">
                <Phone className="w-4 h-4 text-[#FDE047] shrink-0" />
                <span className="font-mono-num">0723343824 / 0753343824 / 0713343824</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. ENTERPRISE FOOTER                                     */}
      {/* ========================================================= */}
      <footer className="relative z-10 border-t border-[#D4AF37]/25 bg-[#050810] py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ApexBrandLogo size="sm" subtitle="GROUP OF COMPANY" lightText />
            <span className="text-[#D4AF37]/50">•</span>
            <span className="text-[#F3E5AB]">Nexus International Alliance (E-STD 2022)</span>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <div className="text-[#F3E5AB] font-semibold">
              119 Battaramulla - Pannipitiya Rd, Battaramulla, Sri Lanka
            </div>
            <div className="text-[11px] text-slate-500">
              Proposal Ref: ALG-SP-2026-16 • © {new Date().getFullYear()} NIA Group of Company. All
              rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

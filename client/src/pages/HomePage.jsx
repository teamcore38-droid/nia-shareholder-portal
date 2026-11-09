import React, { useState, useRef, useEffect } from 'react';
import ScrollImageSequenceCanvas from '../components/ScrollImageSequenceCanvas';
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

// Helper to compute smooth opacity and subtle translate transitions across scroll stages
const getStageStyle = (progress, enterStart, enterEnd, exitStart, exitEnd) => {
  let opacity = 0;
  let translateY = 24;

  if (progress <= enterStart) {
    opacity = 0;
    translateY = 24;
  } else if (progress < enterEnd) {
    const t = (progress - enterStart) / (enterEnd - enterStart);
    const ease = t * t * (3 - 2 * t);
    opacity = ease;
    translateY = (1 - ease) * 24;
  } else if (progress <= exitStart) {
    opacity = 1;
    translateY = 0;
  } else if (progress < exitEnd) {
    const t = (progress - exitStart) / (exitEnd - exitStart);
    const ease = t * t * (3 - 2 * t);
    opacity = 1 - ease;
    translateY = -ease * 24;
  } else {
    opacity = 0;
    translateY = -24;
  }

  return {
    opacity,
    transform: `translate3d(0, ${translateY.toFixed(1)}px, 0)`,
    pointerEvents: opacity > 0.2 ? 'auto' : 'none',
    visibility: opacity > 0.005 ? 'visible' : 'hidden',
    transition: 'opacity 0.15s ease-out, transform 0.15s ease-out'
  };
};

export default function HomePage({ onNavigateToAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active showcase tab: 'shareholder' | 'governance' | 'documents'
  const [activeTab, setActiveTab] = useState('shareholder');

  // FAQ open item
  const [openFaq, setOpenFaq] = useState(0);

  // Scroll-linked hero image sequence
  const heroTrackRef = useRef(null);
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);

  // Smooth stage transitions: appear and vanish as the 3D sequence scrolls
  const chapter1Style = getStageStyle(heroScrollProgress, -0.1, 0.0, 0.22, 0.32);
  const chapter2Style = getStageStyle(heroScrollProgress, 0.35, 0.44, 0.60, 0.68);
  const chapter3Style = getStageStyle(heroScrollProgress, 0.70, 0.78, 0.94, 1.00);

  useEffect(() => {
    const handleScroll = () => {
      const el = heroTrackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScrollable = el.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
      setHeroScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

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
      q: 'What is the 60 Digital Branch Locations – Islandwide Coverage initiative?',
      a: 'Following the closure of physical branch offices, Nexus International Alliance (NIA) is transitioning towards a fully digital branch operating system. Our planned network of 60 Digital Branch Locations covers all 25 administrative districts of Sri Lanka, major commercial areas, and five dedicated Digital Branch Locations in the capital city—operating through our official website, software systems, applications, and authorized digital communication channels.'
    },
    {
      q: 'Do the 60 Digital Branch Locations represent 60 new physical office buildings?',
      a: 'No. Please understand that these 60 locations are part of our planned digital branch network and do not represent 60 new physical office buildings. All official digital branch locations, operating details, department information, and service access instructions will be announced through our official company website once the development and verification process is completed.'
    },
    {
      q: 'Can I visit or send documents/parcels to previous physical branch addresses?',
      a: 'No. Please do not visit previous physical branch addresses for company services, and do not send documents or parcels to any previous branch address without management approval. Contact the relevant department through our authorized digital channels for official postal delivery instructions.'
    },
    {
      q: 'How do I log in to my NIA Group Shareholder or Staff account?',
      a: 'You can sign in using either your unique Shareholder ID or your registered email address alongside your secure password. If your email was newly enrolled by the registry, select "Activate Invite" to set your permanent credentials.'
    },
    {
      q: 'How are share valuations and registry records secured in the digital system?',
      a: 'Valuations and share movements are managed under a strict dual-control (Maker-Checker) protocol with 256-bit encryption, multi-factor staff verification, and an immutable ledger audit trail.'
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
    <div className="min-h-screen bg-[#080C16] text-white flex flex-col selection:bg-[#D4AF37] selection:text-slate-950 relative overflow-x-clip">

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
              onClick={() => scrollToSection('official-announcement')}
              className="text-[#FDE047] hover:text-amber-300 transition-colors cursor-pointer font-bold"
            >
              Official Announcement
            </button>
            <button
              onClick={() => scrollToSection('divisions')}
              className="hover:text-[#FDE047] transition-colors cursor-pointer"
            >
              Our Sectors
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
              Important Instructions
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
                onClick={() => scrollToSection('official-announcement')}
                className="text-left py-1 text-[#FDE047] font-bold hover:text-amber-300 transition-colors"
              >
                Official Announcement (60 Digital Branches)
              </button>
              <button
                onClick={() => scrollToSection('divisions')}
                className="text-left py-1 hover:text-[#FDE047] transition-colors"
              >
                6 Business Sectors
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
                Important Instructions & Disclaimers
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
      {/* 2. HERO SECTION (400vh SCROLL-LINKED SEQUENCE TRACK)       */}
      {/* ========================================================= */}
      <div ref={heroTrackRef} className="relative h-[400vh] w-full -mt-20">
        {/* Sticky Viewport Container directly below sticky header */}
        <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center">
          {/* Scroll-Linked Image Sequence Canvas (Behind the UI) */}
          <ScrollImageSequenceCanvas
            scrollProgress={heroScrollProgress}
            totalFrames={70}
          />

          {/* Ambient Gold Spotlight Glows (Preserved from existing) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] bg-gradient-to-br from-[#D4AF37]/20 via-[#F59E0B]/12 to-transparent rounded-full blur-3xl opacity-80 animate-pulse-subtle" />
            <div className="absolute top-24 right-10 w-[440px] h-[440px] bg-gradient-to-bl from-[#FDE047]/15 via-[#B8860B]/15 to-transparent rounded-full blur-3xl opacity-70" />
          </div>

          {/* ========================================================= */}
          {/* STAGE 1: OFFICIAL HERO SECTION (100% UNCHANGED CONTENT)   */}
          {/* ========================================================= */}
          <div
            className="absolute inset-0 flex flex-col justify-center"
            style={chapter1Style}
          >
            <div className="relative z-10 w-full pt-16 lg:pt-20 my-auto">
<section className="relative z-10 py-4 sm:py-6 lg:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                onClick={() => scrollToSection('official-announcement')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#080C16]/80 hover:bg-[#111827] border border-[#D4AF37]/50 text-[#F3E5AB] font-bold text-sm backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <Bell className="w-4 h-4 text-[#FDE047]" />
                <span>60 Digital Branches Notice</span>
              </button>
            </div>

            {/* Compact Sleek Trust Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 max-w-lg mx-auto lg:mx-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C16]/80 border border-[#D4AF37]/35 text-[#FDE047] text-xs font-semibold backdrop-blur-md shadow">
                <Globe className="w-3.5 h-3.5" />
                <span>60 Digital Locations</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C16]/80 border border-[#D4AF37]/35 text-[#D4AF37] text-xs font-semibold backdrop-blur-md shadow">
                <MapPin className="w-3.5 h-3.5" />
                <span>All 25 Districts</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C16]/80 border border-[#D4AF37]/35 text-amber-300 text-xs font-semibold backdrop-blur-md shadow">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Digital Operations</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C16]/80 border border-[#D4AF37]/35 text-emerald-400 text-xs font-semibold backdrop-blur-md shadow">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>One Connected Organization</span>
              </span>
            </div>
          </div>

          {/* Right Column: Official Digital Transformation & 60 Digital Branch Network Summary Card */}
          <div className="w-full lg:w-6/12 relative">
            <div className="relative mx-auto max-w-lg rounded-3xl bg-[#0B101E]/95 border-2 border-[#D4AF37]/50 p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              {/* Top Gold Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/25 text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src="/nia-logo.png"
                    alt="NIA Crest"
                    className="w-10 h-10 rounded-full border border-[#D4AF37] object-contain bg-black"
                  />
                  <div>
                    <div className="font-extrabold text-[#FDE047] tracking-wide uppercase">
                      Official Company Announcement
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Nexus International Alliance (NIA) • Management Team
                    </div>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FDE047] font-bold text-[11px] flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FDE047]" />
                  <span>Islandwide</span>
                </div>
              </div>

              {/* 4 Key Network Highlights */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#131B2E] border border-[#D4AF37]/30">
                  <span className="text-[10px] font-bold text-[#F3E5AB] uppercase tracking-wide">
                    Network
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-[#FDE047] font-mono-num mt-0.5">
                    60
                  </div>
                  <span className="text-[10px] text-[#D4AF37]">Digital Locations</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#131B2E] border border-[#D4AF37]/30">
                  <span className="text-[10px] font-bold text-[#F3E5AB] uppercase tracking-wide">
                    Coverage
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-0.5">
                    25
                  </div>
                  <span className="text-[10px] text-slate-300">SL Districts</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#131B2E] border border-[#D4AF37]/30">
                  <span className="text-[10px] font-bold text-[#F3E5AB] uppercase tracking-wide">
                    Capital City
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-0.5">
                    5
                  </div>
                  <span className="text-[10px] text-[#D4AF37]">Digital Branches</span>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 to-[#B8860B]/10 border border-[#FDE047]/50">
                  <span className="text-[10px] font-bold text-[#FDE047] uppercase tracking-wide">
                    Access
                  </span>
                  <div className="text-base sm:text-lg font-extrabold text-[#FDE047] mt-0.5">
                    100%
                  </div>
                  <span className="text-[10px] text-[#F3E5AB]">Digital System</span>
                </div>
              </div>

              {/* Official Transition & Clarification Summary */}
              <div className="mt-4 p-4 rounded-2xl bg-[#101726] border border-[#D4AF37]/30 space-y-2.5 text-xs">
                <div className="font-extrabold text-[#FDE047] uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#FDE047]" />
                  <span>60 Digital Branch Locations – Islandwide Coverage</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Following the closure of our physical branch offices, our company is transitioning
                  towards a fully digital branch operating system designed to provide services and
                  support across Sri Lanka.
                </p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-[#D4AF37]/40 text-[#F3E5AB] text-[11px] leading-relaxed">
                  <strong className="text-[#FDE047]">Important Clarification:</strong> These 60
                  locations are part of our planned digital branch network. They do not represent 60
                  new physical office buildings. Do not visit or send documents/parcels to previous
                  physical branch addresses without management approval.
                </div>
              </div>

              {/* Bottom Quick Row */}
              <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs text-slate-300">
                <span className="text-[11px] text-[#F3E5AB] font-semibold">
                  60 Digital Locations. 25 Districts. One Connected Organization.
                </span>
                <button
                  type="button"
                  onClick={() => scrollToSection('official-announcement')}
                  className="text-[#FDE047] hover:text-amber-200 font-extrabold flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                >
                  <span>Read Full Notice</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STAGE 2: NATIONWIDE DIGITAL NETWORK & GOVERNANCE PILLARS  */}
          {/* ========================================================= */}
          <div
            className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6 lg:px-8 pointer-events-none"
            style={chapter2Style}
          >
            <div className="relative z-10 w-full max-w-6xl mx-auto text-center pt-16 lg:pt-20 my-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#080C16]/85 border border-[#D4AF37]/50 backdrop-blur-md text-xs font-bold text-[#FDE047] shadow-lg mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#FDE047]" />
                <span className="tracking-wider uppercase">Nationwide Digital Network • 25 Districts</span>
              </div>

              {/* Cinematic Headline */}
              <h2
                className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
              >
                THE DIGITAL TRANSFORMATION OF <br />
                <span className="bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#F59E0B] bg-clip-text text-transparent">
                  SHAREHOLDER OPERATIONS
                </span>
              </h2>

              <p className="text-xs sm:text-sm lg:text-base text-slate-200 font-medium max-w-2xl mx-auto mt-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                Connecting 60 planned digital branch locations across all 25 administrative districts of Sri Lanka under our unified institutional governance network.
              </p>

              {/* 3 Luxury Frosted Glass Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 max-w-5xl mx-auto mt-6">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101E]/85 border border-[#D4AF37]/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-left hover:border-[#FDE047]/60 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37]/25 to-[#F59E0B]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#FDE047] mb-2.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-wider">Islandwide Access</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">60 Digital Locations</h3>
                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    Islandwide coverage across all 25 districts, with 5 specialized digital hubs in the capital city.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101E]/85 border border-[#D4AF37]/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-left hover:border-[#FDE047]/60 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37]/25 to-[#F59E0B]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#FDE047] mb-2.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-wider">Dual-Control Security</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">Maker-Checker Protocol</h3>
                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    Institutional security with 256-bit encryption, role-based governance, and immutable ledger audit logging.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101E]/85 border border-[#D4AF37]/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-left hover:border-[#FDE047]/60 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37]/25 to-[#F59E0B]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#FDE047] mb-2.5">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-wider">Real-Time Holdings</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">Verified Equity Ledger</h3>
                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    Instant digital certificate issuance, stepped share valuations, and transparent shareholder communication.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STAGE 3: 6 DIVERSIFIED SECTORS & GATEWAY ACCESS           */}
          {/* ========================================================= */}
          <div
            className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6 lg:px-8 pointer-events-none"
            style={chapter3Style}
          >
            <div className="relative z-10 w-full max-w-5xl mx-auto text-center pt-16 lg:pt-20 my-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#080C16]/85 border border-[#D4AF37]/50 backdrop-blur-md text-xs font-bold text-[#FDE047] shadow-lg mb-3">
                <Building2 className="w-3.5 h-3.5 text-[#FDE047]" />
                <span className="tracking-wider uppercase">Nexus International Alliance • 6 Diversified Sectors</span>
              </div>

              {/* Headline */}
              <h2
                className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
              >
                DRIVING INSTITUTIONAL GROWTH <br />
                <span className="bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#F59E0B] bg-clip-text text-transparent">
                  FOR ALL SHAREHOLDERS
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-xl mx-auto mt-2.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                Real Estate • Construction • Investment • Trading • Consultancy • Integrated Services
              </p>

              {/* 6 Sector Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto mt-5">
                {['REAL ESTATE', 'CONSTRUCTION', 'INVESTMENT', 'TRADING', 'CONSULTANCY', 'SERVICES'].map((sector) => (
                  <span
                    key={sector}
                    className="px-3 py-1 rounded-xl bg-[#0B101E]/80 border border-[#D4AF37]/40 text-[#F3E5AB] text-[11px] font-extrabold backdrop-blur-md shadow-md tracking-wider"
                  >
                    {sector}
                  </span>
                ))}
              </div>

              {/* Direct Action CTAs */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onNavigateToAuth('signin')}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:from-[#D4AF37] hover:to-[#F59E0B] text-slate-950 font-extrabold text-xs sm:text-sm shadow-[0_10px_30px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Enter Shareholder Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('official-announcement')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#080C16]/85 hover:bg-[#111827] border border-[#D4AF37]/50 text-[#F3E5AB] font-bold text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <Bell className="w-4 h-4 text-[#FDE047]" />
                  <span>60 Digital Branches Notice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ========================================================= */}
      {/* 3. INSTITUTIONAL METRICS STRIP (GOLD & OBSIDIAN)          */}
      {/* ========================================================= */}
      <section className="relative z-10 border-y border-[#D4AF37]/30 bg-[#060911]/95 backdrop-blur-lg py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#FDE047] font-mono-num">
                60
              </div>
              <p className="text-xs text-[#D4AF37] mt-1 uppercase tracking-wider font-bold">
                Digital Branch Locations
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num">
                25 Districts
              </div>
              <p className="text-xs text-[#D4AF37] mt-1 uppercase tracking-wider font-bold">
                Islandwide Sri Lanka Coverage
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#FDE047] font-mono-num">
                5 Capital Hubs
              </div>
              <p className="text-xs text-[#D4AF37] mt-1 uppercase tracking-wider font-bold">
                Dedicated Capital City Digital Branches
              </p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num">
                6 Sectors
              </div>
              <p className="text-xs text-[#D4AF37] mt-1 uppercase tracking-wider font-bold">
                One Connected Organization
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3B. OFFICIAL COMPANY ANNOUNCEMENT & DISCLAIMERS           */}
      {/* ========================================================= */}
      <section
        id="official-announcement"
        className="relative z-10 py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-3xl bg-gradient-to-b from-[#0D1322] via-[#0B101E] to-[#080C16] border-2 border-[#D4AF37]/55 p-6 sm:p-10 lg:p-12 shadow-[0_25px_70px_rgba(0,0,0,0.85)] space-y-8">
          {/* Announcement Header */}
          <div className="border-b border-[#D4AF37]/30 pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#FDE047] text-xs font-extrabold uppercase tracking-wider">
                <Bell className="w-3.5 h-3.5" />
                <span>Official Company Announcement</span>
              </div>
              <h2
                className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase"
                style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
              >
                60 Digital Branch Locations – Islandwide Coverage
              </h2>
              <p className="text-xs sm:text-sm text-[#F3E5AB] font-semibold">
                Issued by the Management Team • Nexus International Alliance (NIA)
              </p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-[#080C16] border border-[#D4AF37]/40 text-xs text-slate-200 shrink-0">
              <div className="font-extrabold text-[#FDE047] uppercase tracking-wider">
                60 Digital Locations. 25 Districts.
              </div>
              <div className="text-slate-300 mt-0.5">
                One Connected Organization • Moving Forward Across Sri Lanka
              </div>
            </div>
          </div>

          {/* Salutation & Intro */}
          <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <p className="font-bold text-[#FDE047] text-sm sm:text-base">
              Dear All Work-from-Home Employees &amp; Stakeholders,
            </p>
            <p>
              We are pleased to inform you about our company&apos;s upcoming digital transformation
              and expansion plan. Following the closure of our physical branch offices, our company
              is transitioning towards a <strong className="text-white">fully digital branch operating system</strong>,
              designed to provide services and support across Sri Lanka.
            </p>
          </div>

          {/* 2-Column Grid: Digital Branch Network + What Does This Mean */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#080C16]/90 border border-[#D4AF37]/35 space-y-4">
              <h3 className="text-base sm:text-lg font-extrabold text-[#FDE047] uppercase tracking-wide flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#FDE047]" />
                <span>Our New Digital Branch Network</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Our company is planning to establish a network of{' '}
                <strong className="text-white">60 Digital Branch Locations</strong> covering:
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
                  <span>All 25 administrative districts of Sri Lanka.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
                  <span>Major cities and important commercial areas throughout the country.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
                  <span>Five dedicated Digital Branch Locations in the capital city.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
                  <span>Islandwide digital access to company services and departmental support.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-[#080C16]/90 border border-[#D4AF37]/35 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-extrabold text-[#FDE047] uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#FDE047]" />
                  <span>What Does This Mean For Our Employees?</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Our Digital Branch Locations will operate through our official website, software
                  systems, applications, and authorized digital communication channels.
                </p>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Employees will be able to access their relevant departmental services and receive
                  company support digitally without needing to visit a physical branch.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-[#D4AF37]/45 space-y-1.5">
                <div className="text-xs font-extrabold text-[#FDE047] uppercase tracking-wider">
                  Important Clarification
                </div>
                <p className="text-xs text-[#F3E5AB] leading-relaxed">
                  Please understand that these 60 locations are part of our planned digital branch
                  network. <strong>They do not represent 60 new physical office buildings.</strong>{' '}
                  All official digital branch locations, operating details, department information,
                  and service access instructions will be announced through our official company
                  website once the development and verification process is completed.
                </p>
              </div>
            </div>
          </div>

          {/* Important Instructions (5 Mandatory Rules) */}
          <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-[#131B2E] via-[#0E1525] to-[#131B2E] border-2 border-[#D4AF37]/45 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-[#FDE047] uppercase tracking-wide">
                Important Instructions &amp; Disclaimers
              </h3>
              <span className="text-xs font-bold text-amber-300">
                Mandatory Compliance for All Employees &amp; Stakeholders
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs sm:text-sm">
              {[
                '1. Please do not visit previous physical branch addresses for company services.',
                '2. Do not send documents or parcels to any previous branch address without management approval.',
                '3. Contact the relevant department for authorized postal delivery instructions.',
                '4. Follow only official company announcements and verified communication channels.',
                '5. Continue your regular Work-from-Home responsibilities without interruption.'
              ].map((inst, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#080C16]/90 border border-[#D4AF37]/30 text-slate-100 font-medium leading-relaxed"
                >
                  {inst}
                </div>
              ))}
              <div className="p-3.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 text-[#FDE047] font-bold leading-relaxed flex items-center">
                We kindly request all employees to remain calm, confident, and cooperative during
                this transition.
              </div>
            </div>

            <div className="pt-3 border-t border-[#D4AF37]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
              <p>
                This is an important step towards building a modern, digitally connected
                organization with nationwide service coverage. Thank you for your understanding,
                dedication, and continued cooperation.
              </p>
              <div className="text-right shrink-0">
                <div className="font-extrabold text-[#FDE047] uppercase">Management Team</div>
                <div className="text-[#F3E5AB] font-semibold">
                  Nexus International Alliance (NIA)
                </div>
              </div>
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
            divisions connected through our islandwide digital branch operating system across all 25
            administrative districts of Sri Lanka.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Architectural Building Card (5 Columns) */}
          <div className="lg:col-span-5 rounded-3xl overflow-hidden border-2 border-[#D4AF37]/45 bg-[#0B101E] shadow-2xl flex flex-col justify-between relative min-h-[460px]">
            <img
              src="/nia-building.jpg"
              alt="NIA Group of Company Digital Network"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/45 to-transparent" />

            <div className="relative z-10 p-6 flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-black/75 border border-[#D4AF37]/50 text-[#FDE047] text-[11px] font-bold tracking-wider uppercase backdrop-blur-md">
                60 Digital Locations • 25 Districts
              </span>
              <img
                src="/nia-logo.png"
                alt="NIA Group Seal"
                className="w-14 h-14 rounded-full border-2 border-[#D4AF37] bg-black shadow-lg"
              />
            </div>

            <div className="relative z-10 p-6 sm:p-7 space-y-2">
              <div className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#FDE047]">
                Nexus International Alliance (NIA)
              </div>
              <h3
                className="text-2xl font-extrabold text-white uppercase"
                style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
              >
                Moving Forward – Building a Digital Future Across Sri Lanka
              </h3>
              <p className="text-xs text-slate-200 flex items-center gap-1.5 pt-1">
                <Globe className="w-4 h-4 text-[#FDE047] shrink-0" />
                <span>60 Digital Locations • 25 Districts • One Connected Organization</span>
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
      {/* 5. DIGITAL BRANCH NETWORK & WORK-FROM-HOME OPERATIONS     */}
      {/* ========================================================= */}
      <section id="simulator" className="relative z-10 py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FDE047] text-xs font-bold mb-3 uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" />
            <span>Islandwide Digital Transformation</span>
          </div>
          <h2
            className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
            style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
          >
            60 Digital Locations. 25 Districts. One Connected Organization.
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Our Digital Branch Locations operate through our official website, software systems,
            applications, and authorized digital communication channels.
          </p>
        </div>

        <div className="max-w-4xl mx-auto p-6 sm:p-9 rounded-3xl bg-[#0D1322]/95 border-2 border-[#D4AF37]/40 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 text-xs sm:text-sm text-slate-200">
              <div className="p-4 rounded-2xl bg-[#080C16] border border-[#D4AF37]/30 space-y-2">
                <div className="font-extrabold text-[#FDE047] uppercase tracking-wider">
                  Islandwide Service Coverage
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Covering all 25 administrative districts of Sri Lanka, major cities and commercial
                  areas throughout the country, plus five dedicated Digital Branch Locations in the
                  capital city.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#080C16] border border-[#D4AF37]/30 space-y-2">
                <div className="font-extrabold text-[#FDE047] uppercase tracking-wider">
                  Digital Departmental Access
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Work-from-Home employees and shareholders can access relevant departmental
                  services and receive company support digitally without needing to visit a physical
                  branch.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 via-[#131B2E] to-[#080C16] border border-[#D4AF37]/50 space-y-4">
              <div className="text-xs font-extrabold text-[#FDE047] uppercase tracking-wider">
                Official Verification &amp; Communication Policy
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                All official digital branch locations, operating details, department information,
                and service access instructions will be announced through our official company
                website once the development and verification process is completed.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#FDE047] hover:from-[#D4AF37] hover:to-[#F59E0B] text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Sign In to Official Digital Portal</span>
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
                  <span className="font-bold text-[#F3E5AB]">Shareholder Portal Access</span>
                  <span className="text-[#FDE047] font-bold">Verified Account</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Share Register Ledger:</span>
                  <span className="font-bold text-white">Opening, Allocations &amp; Transfers</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Valuation Tracking:</span>
                  <span className="font-bold text-emerald-400">Board-Approved Stepped History</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-[#D4AF37]/20">
                  <span className="font-bold text-white">Holding Statements:</span>
                  <span className="font-extrabold text-[#FDE047]">Dated PDF Snapshots</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Support Channel:</span>
                  <span className="font-extrabold text-white">100% Digital Branch System</span>
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
                  Dual-Control Approvals &amp; Ledger Integrity
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
                  <span className="font-bold text-[#F3E5AB]">Governance Controls</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#FDE047] text-[10px] font-bold">
                    Dual-Control Active
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">Share Register Movements</span>
                    <span className="text-[#FDE047]">Maker-Checker</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Independent approval required before ledger publication
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">Share Valuation Updates</span>
                    <span className="text-amber-300">Board Resolution</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dated effective valuation publishing with full audit log
                  </p>
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
                    <span>Valuation Notices and Official Company Announcements</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-[#080C16] border border-[#D4AF37]/30 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#D4AF37]/20">
                  <span className="font-bold text-[#F3E5AB]">Digital Document Vault</span>
                  <span className="text-[#D4AF37]">Record-Level Privacy</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#FDE047]" />
                    <span className="font-semibold text-slate-200">Dated Holding Statement (PDF)</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#FDE047]" />
                    <span className="font-semibold text-slate-200">Official Company Notices &amp; Reports</span>
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
      {/* 9. DIGITAL BRANCH NETWORK & CALL TO ACTION BANNER         */}
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
                <span>Nexus International Alliance (NIA) • Management Team</span>
              </div>
              <h2
                className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
              >
                Moving Forward – Building a Digital Future Across Sri Lanka
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-xl">
                60 Digital Locations. 25 Districts. One Connected Organization. Access departmental
                services, equity records, and company support digitally through our official portal.
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

            {/* Official Digital Transformation & Disclaimer Box */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#080C16]/90 border border-[#D4AF37]/40 space-y-3.5 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-[#D4AF37]/25">
                <img
                  src="/nia-logo.png"
                  alt="NIA Group Crest"
                  className="w-11 h-11 rounded-full border border-[#D4AF37] bg-black"
                />
                <div>
                  <div className="font-extrabold text-[#FDE047] text-sm uppercase">
                    Nexus International Alliance (NIA)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    60 Digital Branch Locations – Islandwide Coverage
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-200">
                <Globe className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
                <span>
                  All 25 Administrative Districts of Sri Lanka • 5 Capital City Digital Branches
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-amber-200">
                <ShieldCheck className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
                <span>
                  Please do not visit previous physical branch addresses or send documents/parcels
                  without management approval.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-slate-200">
                <Bell className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
                <span>
                  Contact the relevant department via authorized digital channels for postal
                  delivery instructions.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. ENTERPRISE FOOTER                                     */}
      {/* ========================================================= */}
      <footer className="relative z-10 border-t border-[#D4AF37]/25 bg-[#050810] py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <ApexBrandLogo size="sm" subtitle="GROUP OF COMPANY" lightText />
              <span className="text-[#D4AF37]/50">•</span>
              <span className="text-[#F3E5AB]">Nexus International Alliance (NIA)</span>
            </div>

            <div className="text-center sm:text-right space-y-1">
              <div className="text-[#FDE047] font-bold">
                60 Digital Locations. 25 Districts. One Connected Organization.
              </div>
              <div className="text-[11px] text-slate-400">
                Moving Forward – Building a Digital Future Across Sri Lanka • ©{' '}
                {new Date().getFullYear()} Nexus International Alliance (NIA).
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#D4AF37]/15 text-[11px] text-slate-400 text-center sm:text-left leading-relaxed">
            <strong className="text-[#F3E5AB]">Official Disclaimer:</strong> Following the closure
            of physical branch offices, Nexus International Alliance (NIA) is transitioning towards
            a fully digital branch operating system. The planned 60 Digital Branch Locations do not
            represent 60 new physical office buildings. Please do not visit or send documents or
            parcels to any previous physical branch address without management approval.
          </div>
        </div>
      </footer>
    </div>
  );
}

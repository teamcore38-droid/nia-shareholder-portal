import React from 'react';

export function ApexBrandLogo({
  size = 'md',
  subtitle = 'GROUP OF COMPANY',
  lightText = true,
  showAllianceTag = false
}) {
  const iconSizes = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-13 h-13',
    xl: 'w-16 h-16'
  };

  return (
    <div className="inline-flex items-center gap-3 select-none">
      {/* Official NIA Group Circular Gold Crest Emblem */}
      <div
        className={`${
          iconSizes[size] || iconSizes.md
        } shrink-0 relative rounded-full p-0.5 bg-gradient-to-tr from-[#9A7B2C] via-[#FDE047] to-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.35)] flex items-center justify-center overflow-hidden`}
      >
        <img
          src="/nia-logo.png"
          alt="NIA Group of Company - Nexus International Alliance"
          className="w-full h-full object-contain rounded-full bg-[#080B12]"
        />
      </div>

      <div className="leading-tight">
        {showAllianceTag && (
          <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#EAB308]/90 mb-0.5">
            Nexus International Alliance
          </div>
        )}
        <div
          className={`font-extrabold tracking-wider uppercase bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#F59E0B] bg-clip-text text-transparent drop-shadow-xs ${
            size === 'xl'
              ? 'text-2xl sm:text-3xl'
              : size === 'lg'
              ? 'text-xl sm:text-2xl'
              : 'text-base sm:text-lg'
          }`}
          style={{ fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif" }}
        >
          NIA
        </div>
        <div
          className={`text-[10px] sm:text-[11px] font-extrabold tracking-[0.14em] uppercase ${
            lightText ? 'text-[#F3E5AB]' : 'text-slate-700'
          }`}
        >
          {subtitle === 'Software Solutions' ? 'GROUP OF COMPANY' : subtitle}
        </div>
      </div>
    </div>
  );
}

export function SidebarWaveDecoration() {
  return (
    <div className="pointer-events-none select-none overflow-hidden h-28 w-full relative opacity-85">
      <svg
        viewBox="0 0 280 120"
        fill="none"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="niaGoldWave1" x1="0" y1="0" x2="280" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#9A7B2C" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="niaGoldWave2" x1="280" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#D4AF37" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Subtle Gold Skyline Silhouette Bars matching NIA Crest */}
        <g opacity="0.16" fill="#D4AF37">
          <rect x="28" y="58" width="12" height="62" />
          <rect x="44" y="42" width="14" height="78" />
          <rect x="62" y="26" width="18" height="94" />
          <rect x="84" y="48" width="14" height="72" />
          <rect x="102" y="36" width="16" height="84" />
          <rect x="122" y="54" width="12" height="66" />
        </g>
        <path
          d="M-20 85 C 50 25, 130 115, 210 55 C 250 25, 275 45, 300 30 L 300 120 L -20 120 Z"
          fill="url(#niaGoldWave1)"
          opacity="0.24"
        />
        <path
          d="M-20 85 C 50 25, 130 115, 210 55 C 250 25, 275 45, 300 30"
          stroke="url(#niaGoldWave1)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M-20 100 C 65 55, 140 20, 230 75 C 260 95, 280 80, 300 65"
          stroke="url(#niaGoldWave2)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          fill="none"
        />
        <path
          d="M-10 112 C 80 70, 160 40, 260 90"
          stroke="#FDE047"
          strokeOpacity="0.3"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default ApexBrandLogo;

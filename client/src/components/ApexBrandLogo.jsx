import React from 'react';

export function ApexBrandLogo({ size = 'md', subtitle = 'Software Solutions', lightText = true }) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  return (
    <div className="inline-flex items-center gap-3 select-none">
      {/* Geometric Cyan-to-Blue-to-Violet 'A' Ribbon Logo */}
      <div className={`${iconSizes[size] || iconSizes.md} shrink-0 relative flex items-center justify-center`}>
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="apexLeftLeg" x1="6" y1="42" x2="26" y2="6" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="55%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id="apexRightLeg" x1="22" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="apexCrossbar" x1="14" y1="30" x2="36" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          {/* Left Ribbon */}
          <path
            d="M24 5L7 41H16.5L28.5 14.5L24 5Z"
            fill="url(#apexLeftLeg)"
          />
          {/* Right Ribbon */}
          <path
            d="M24 5L19.5 14.5L31.5 41H41L24 5Z"
            fill="url(#apexRightLeg)"
          />
          {/* Dynamic Fold Crossbar */}
          <path
            d="M15.5 29.5L29.5 23.5L33.5 32H12L15.5 29.5Z"
            fill="url(#apexCrossbar)"
            opacity="0.95"
          />
        </svg>
      </div>

      <div className="leading-tight">
        <div
          className={`font-display font-extrabold tracking-wider uppercase ${
            size === 'lg' ? 'text-xl' : 'text-base'
          } ${lightText ? 'text-white' : 'text-slate-900'}`}
        >
          APEX
        </div>
        <div
          className={`text-[11px] font-medium tracking-wide ${
            lightText ? 'text-slate-300/90' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export function SidebarWaveDecoration() {
  return (
    <div className="pointer-events-none select-none overflow-hidden h-28 w-full relative opacity-80">
      <svg
        viewBox="0 0 280 120"
        fill="none"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0" y1="0" x2="280" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="280" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0D122B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M-20 85 C 50 25, 130 115, 210 55 C 250 25, 275 45, 300 30 L 300 120 L -20 120 Z"
          fill="url(#waveGrad1)"
          opacity="0.22"
        />
        <path
          d="M-20 85 C 50 25, 130 115, 210 55 C 250 25, 275 45, 300 30"
          stroke="url(#waveGrad1)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M-20 100 C 65 55, 140 20, 230 75 C 260 95, 280 80, 300 65"
          stroke="url(#waveGrad2)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          fill="none"
        />
        <path
          d="M-10 112 C 80 70, 160 40, 260 90"
          stroke="#60A5FA"
          strokeOpacity="0.3"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default ApexBrandLogo;

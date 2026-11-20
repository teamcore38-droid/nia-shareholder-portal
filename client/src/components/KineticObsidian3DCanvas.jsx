import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SLAB_COUNT = 9;
const ATLAS_COLS = 3;
const ATLAS_ROWS = 2;

// Assigns each of the 9 orbiting slabs one of the 6 bespoke NIA obsidian tile faces:
// 0: Official NIA Logo Crest, 1: Stepped Valuation Graph, 2: Sri Lanka 60-Branch Network,
// 3: Dual-Control Security Shield, 4: 6 Diversified Sectors Matrix, 5: Holdings Bar Graph & Seal
const SLAB_TILE_ASSIGNMENT = [0, 1, 2, 3, 4, 0, 1, 5, 2];

const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Generates an HDR-like procedural studio softbox environment map so metallic
 * 24k gold chamfers and etched obsidian graphics catch authentic champagne reflections.
 */
function createStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x04060c);

  const addPanel = (colorRGB, pos, rot, scale) => {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setRGB(colorRGB[0], colorRGB[1], colorRGB[2]),
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.scale.set(scale[0], scale[1], 1);
    envScene.add(mesh);
    return { geo, mat };
  };

  const disposables = [
    addPanel([8.5, 6.4, 2.9], [10, 1.5, 4.5], [0, -Math.PI * 0.42, 0], [5.5, 16]),
    addPanel([6.2, 4.3, 1.6], [7.5, -5.5, 6.5], [-0.4, -Math.PI * 0.3, 0], [7, 5]),
    addPanel([4.4, 3.2, 1.4], [0, 11, 2], [Math.PI / 2, 0, 0], [16, 7]),
    addPanel([5.8, 3.1, 0.75], [-6.5, 2.2, 5.5], [0.15, Math.PI * 0.34, 0], [8, 9]),
    addPanel([3.8, 2.2, 0.55], [0, -10, 3], [-Math.PI / 2, 0, 0], [14, 10]),
    addPanel([0.32, 0.52, 0.95], [-11, 0, -6], [0, Math.PI * 0.65, 0], [14, 16]),
    addPanel([4.8, 2.8, 0.8], [0, 0, -12], [0, 0, 0], [12, 12])
  ];

  const envRT = pmrem.fromScene(envScene, 0.035);
  disposables.forEach(({ geo, mat }) => {
    geo.dispose();
    mat.dispose();
  });
  pmrem.dispose();

  return envRT;
}

/**
 * Draws a single bespoke NIA obsidian-and-gold tile into the 3x2 texture atlas.
 * Uses a single packed ORM texture (G = roughness, B = metalness) to halve GPU memory.
 */
function drawAtlasTile(ctxs, tileIndex, tileW, tileH, niaLogoImg = null) {
  const { cCtx, ormCtx, eCtx } = ctxs;
  const col = tileIndex % ATLAS_COLS;
  const row = Math.floor(tileIndex / ATLAS_COLS);
  const ox = col * tileW;
  const oy = row * tileH;
  const s = tileW / 512; // Scale factor relative to 512x1024 design space

  const applyClip = (ctx) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, tileW, tileH);
    ctx.clip();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
  };

  [cCtx, ormCtx, eCtx].forEach(applyClip);

  const W = 512;
  const H = 1024;

  // 1. Satin dark obsidian anodized base
  const baseGrad = cCtx.createLinearGradient(0, 0, W, H);
  baseGrad.addColorStop(0, '#0e121b');
  baseGrad.addColorStop(0.5, '#07090f');
  baseGrad.addColorStop(1, '#0c1018');
  cCtx.fillStyle = baseGrad;
  cCtx.fillRect(0, 0, W, H);

  // Subtle brushed micro-grain
  cCtx.fillStyle = 'rgba(255, 255, 255, 0.013)';
  for (let y = 0; y < H; y += 4) {
    cCtx.fillRect(0, y, W, 1);
  }

  // Packed ORM base: R=255 (unused AO), G=126 (~0.49 satin roughness), B=86 (~0.34 anodized metalness)
  ormCtx.fillStyle = 'rgb(255, 126, 86)';
  ormCtx.fillRect(0, 0, W, H);

  // Emissive base: pure dark
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, W, H);

  // 2. Shared peripheral 45° golden circuit architecture (frames center motif cleanly)
  const circuitPaths = [
    [[26, 26], [W - 26, 26], [W - 26, H - 26], [26, H - 26], [26, 26]],
    // Top traces leading into center
    [[W * 0.5, 26], [W * 0.5, 125], [W * 0.34, 185], [W * 0.34, 240]],
    [[W * 0.5, 125], [W * 0.66, 185], [W * 0.66, 240]],
    [[108, 26], [108, 92], [172, 156], [230, 156]],
    [[W - 108, 26], [W - 108, 92], [W - 172, 156], [W - 230, 156]],
    [[26, 170], [96, 170], [142, 216], [142, 265]],
    [[W - 26, 170], [W - 96, 170], [W - 142, 216], [W - 142, 265]],
    // Bottom traces radiating out from center
    [[W * 0.5, 775], [W * 0.5, 865], [W * 0.36, 925], [W * 0.36, H - 26]],
    [[W * 0.5, 865], [W * 0.64, 925], [W * 0.64, H - 26]],
    [[26, 815], [116, 815], [176, 875], [176, H - 26]],
    [[W - 26, 815], [W - 116, 815], [W - 176, 875], [W - 176, H - 26]],
    // Subtle outer side rails
    [[26, 355], [64, 393], [64, 620], [26, 658]],
    [[W - 26, 355], [W - 64, 393], [W - 64, 620], [W - 26, 658]]
  ];

  const strokePaths = (ctx, style, lw) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pts of circuitPaths) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
  };

  strokePaths(cCtx, 'rgba(2, 3, 7, 0.9)', 4.5);
  strokePaths(cCtx, '#B58934', 1.75);
  // Metallic glossy gold on ORM (G=38 low roughness, B=242 high metalness)
  strokePaths(ormCtx, 'rgb(255, 38, 242)', 2.4);
  strokePaths(eCtx, '#4D360E', 1.4);

  // Helper to paint metallic gold vector lines simultaneously onto Color + ORM + Emissive
  const goldStroke = (drawFn, width = 2.5, color = '#E6BE5E', glow = '#9E6E1E') => {
    cCtx.strokeStyle = color;
    cCtx.lineWidth = width;
    cCtx.lineCap = 'round';
    cCtx.lineJoin = 'round';
    cCtx.beginPath();
    drawFn(cCtx);
    cCtx.stroke();

    ormCtx.strokeStyle = 'rgb(255, 34, 245)';
    ormCtx.lineWidth = width + 0.8;
    ormCtx.lineCap = 'round';
    ormCtx.lineJoin = 'round';
    ormCtx.beginPath();
    drawFn(ormCtx);
    ormCtx.stroke();

    if (glow) {
      eCtx.strokeStyle = glow;
      eCtx.lineWidth = width;
      eCtx.lineCap = 'round';
      eCtx.lineJoin = 'round';
      eCtx.beginPath();
      drawFn(eCtx);
      eCtx.stroke();
    }
  };

  const goldText = (text, x, y, font, color = '#F3D27A', glow = '#8A6017') => {
    cCtx.font = font;
    cCtx.textAlign = 'center';
    cCtx.textBaseline = 'middle';
    cCtx.fillStyle = color;
    cCtx.fillText(text, x, y);

    ormCtx.font = font;
    ormCtx.textAlign = 'center';
    ormCtx.textBaseline = 'middle';
    ormCtx.fillStyle = 'rgb(255, 42, 238)';
    ormCtx.fillText(text, x, y);

    if (glow) {
      eCtx.font = font;
      eCtx.textAlign = 'center';
      eCtx.textBaseline = 'middle';
      eCtx.fillStyle = glow;
      eCtx.fillText(text, x, y);
    }
  };

  // Subtle recessed central obsidian display stage inside each slab
  cCtx.fillStyle = 'rgba(4, 6, 11, 0.72)';
  cCtx.beginPath();
  cCtx.roundRect(78, 252, W - 156, 510, 22);
  cCtx.fill();
  goldStroke((ctx) => ctx.roundRect(78, 252, W - 156, 510, 22), 1.6, 'rgba(212, 175, 55, 0.55)', '#3C2A0B');

  // =========================================================================
  // BESPOKE MOTIF PER TILE (0..5)
  // =========================================================================

  if (tileIndex === 0) {
    // --- TILE 0: OFFICIAL NIA GROUP LOGO CREST ---
    const cx = W / 2;
    const cy = 468;
    const outerR = 132;

    // Warm golden ambient backlight halo behind crest
    const halo = cCtx.createRadialGradient(cx, cy, 35, cx, cy, 165);
    halo.addColorStop(0, 'rgba(232, 178, 66, 0.24)');
    halo.addColorStop(0.65, 'rgba(180, 125, 28, 0.08)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    cCtx.fillStyle = halo;
    cCtx.beginPath();
    cCtx.arc(cx, cy, 165, 0, Math.PI * 2);
    cCtx.fill();

    // Precision concentric gold bezel rings
    goldStroke((ctx) => ctx.arc(cx, cy, outerR + 14, 0, Math.PI * 2), 1.4, 'rgba(229, 190, 96, 0.55)', '#4F370E');
    goldStroke((ctx) => ctx.arc(cx, cy, outerR + 4, 0, Math.PI * 2), 3.0, '#F5D47A', '#B88224');

    // Architectural compass tick marks around outer ring
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const r1 = outerR + 18;
      const r2 = outerR + (a % 3 === 0 ? 29 : 23);
      goldStroke(
        (ctx) => {
          ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
          ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
        },
        a % 3 === 0 ? 2.2 : 1.1,
        '#D6A849',
        '#5E4212'
      );
    }

    if (niaLogoImg && niaLogoImg.complete && niaLogoImg.naturalWidth > 0) {
      // Clip & draw the real official NIA crest cleanly into the golden bezel
      cCtx.save();
      cCtx.beginPath();
      cCtx.arc(cx, cy, outerR, 0, Math.PI * 2);
      cCtx.clip();
      cCtx.fillStyle = '#05070C';
      cCtx.fillRect(cx - outerR, cy - outerR, outerR * 2, outerR * 2);
      cCtx.drawImage(niaLogoImg, cx - outerR, cy - outerR, outerR * 2, outerR * 2);
      cCtx.restore();

      // Give the crest ring realistic metallic gold sheen & subtle emissive aura
      ormCtx.save();
      ormCtx.beginPath();
      ormCtx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ormCtx.strokeStyle = 'rgb(255, 30, 248)';
      ormCtx.lineWidth = 18;
      ormCtx.stroke();
      ormCtx.restore();

      const eHalo = eCtx.createRadialGradient(cx, cy, outerR - 10, cx, cy, outerR + 24);
      eHalo.addColorStop(0, 'rgba(218, 162, 48, 0.45)');
      eHalo.addColorStop(0.5, 'rgba(180, 122, 24, 0.22)');
      eHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      eCtx.fillStyle = eHalo;
      eCtx.beginPath();
      eCtx.arc(cx, cy, outerR + 24, 0, Math.PI * 2);
      eCtx.fill();
    } else {
      // Crisp geometric skyline + NIA monogram fallback while PNG loads (~5ms)
      goldText('NIA', cx, cy - 8, '800 72px Georgia, serif', '#FDE047', '#C98E24');
      goldText('ALLIANCE', cx, cy + 44, '700 18px sans-serif', '#D4AF37', '#6E4C14');
    }

    goldText('NIA GROUP', cx, 662, '800 32px Georgia, serif', '#F8DF95', '#9A6C1D');
    goldText('NEXUS INTERNATIONAL ALLIANCE', cx, 698, '700 13px sans-serif', '#C99E46', '#52380F');
    goldText('EST. 2022  •  SRI LANKA', cx, 728, '600 12px monospace', '#9E7E3C', null);
  } else if (tileIndex === 1) {
    // --- TILE 1: STEPPED SHARE VALUATION GRAPH ---
    goldText('STEPPED VALUATION', W / 2, 294, '800 20px sans-serif', '#F5D57C', '#8F641B');
    goldText('BOARD-APPROVED EQUITY GROWTH', W / 2, 322, '600 12px monospace', '#B89242', null);

    const gx = 108;
    const gy = 365;
    const gw = W - 216;
    const gh = 265;

    // Subtle telemetry coordinate grid
    cCtx.strokeStyle = 'rgba(212, 175, 55, 0.14)';
    cCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = gy + (gh * i) / 4;
      cCtx.beginPath();
      cCtx.moveTo(gx, yy);
      cCtx.lineTo(gx + gw, yy);
      cCtx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const xx = gx + (gw * i) / 5;
      cCtx.beginPath();
      cCtx.moveTo(xx, gy);
      cCtx.lineTo(xx, gy + gh);
      cCtx.stroke();
    }

    // Background vertical volume bars
    const barHeights = [0.22, 0.34, 0.34, 0.52, 0.52, 0.72, 0.72, 0.92];
    const barW = gw / barHeights.length - 8;
    barHeights.forEach((hFrac, idx) => {
      const bx = gx + idx * (barW + 8) + 4;
      const bh = gh * hFrac * 0.52;
      const by = gy + gh - bh;
      const bg = cCtx.createLinearGradient(0, by, 0, gy + gh);
      bg.addColorStop(0, 'rgba(232, 188, 84, 0.42)');
      bg.addColorStop(1, 'rgba(212, 175, 55, 0.05)');
      cCtx.fillStyle = bg;
      cCtx.fillRect(bx, by, barW, bh);
    });

    // Stepped Valuation Trajectory Coordinates (NIA's signature stepped curve!)
    const steps = [
      [0.0, 0.84], [0.2, 0.84],
      [0.2, 0.66], [0.42, 0.66],
      [0.42, 0.46], [0.66, 0.46],
      [0.66, 0.27], [0.85, 0.27],
      [0.85, 0.10], [1.0, 0.10]
    ];

    // Warm golden gradient fill underneath stepped curve
    const areaGrad = cCtx.createLinearGradient(0, gy, 0, gy + gh);
    areaGrad.addColorStop(0, 'rgba(253, 224, 71, 0.34)');
    areaGrad.addColorStop(0.6, 'rgba(212, 175, 55, 0.12)');
    areaGrad.addColorStop(1, 'rgba(212, 175, 55, 0.0)');
    cCtx.fillStyle = areaGrad;
    cCtx.beginPath();
    cCtx.moveTo(gx, gy + gh);
    steps.forEach(([px, py]) => cCtx.lineTo(gx + px * gw, gy + py * gh));
    cCtx.lineTo(gx + gw, gy + gh);
    cCtx.closePath();
    cCtx.fill();

    // Glowing 24k metallic stepped curve line
    goldStroke(
      (ctx) => {
        steps.forEach(([px, py], i) => {
          const x = gx + px * gw;
          const y = gy + py * gh;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
      },
      4.0,
      '#FFE57F',
      '#E2A72C'
    );

    // Highlighted milestone nodes at each valuation step
    const milestones = [
      [0.2, 0.66], [0.42, 0.46], [0.66, 0.27], [0.85, 0.10], [1.0, 0.10]
    ];
    milestones.forEach(([px, py]) => {
      const mx = gx + px * gw;
      const my = gy + py * gh;
      cCtx.fillStyle = '#FFF3B0';
      cCtx.beginPath();
      cCtx.arc(mx, my, 5.5, 0, Math.PI * 2);
      cCtx.fill();

      eCtx.fillStyle = '#FFCE54';
      eCtx.beginPath();
      eCtx.arc(mx, my, 6.5, 0, Math.PI * 2);
      eCtx.fill();
    });

    // Bottom KPI metric strip inside slab
    goldStroke((ctx) => {
      ctx.moveTo(108, 668);
      ctx.lineTo(W - 108, 668);
    }, 1.2, 'rgba(212, 175, 55, 0.4)', null);
    goldText('+STEPPED EQUITY', W / 2, 700, '800 22px monospace', '#FDE047', '#A6751E');
    goldText('VERIFIED SHARE REGISTER LEDGER', W / 2, 732, '600 11px sans-serif', '#B89549', null);
  } else if (tileIndex === 2) {
    // --- TILE 2: SRI LANKA 60 DIGITAL BRANCH NETWORK CONSTELLATION ---
    goldText('60 DIGITAL BRANCHES', W / 2, 294, '800 20px sans-serif', '#F5D57C', '#8F641B');
    goldText('25 DISTRICTS  •  5 CAPITAL HUBS', W / 2, 322, '600 12px monospace', '#B89242', null);

    // Stylized geometric silhouette of Sri Lanka (centered at 256, 515)
    const islandPts = [
      [252, 355], [272, 362], [280, 386], [298, 418], [322, 460],
      [338, 510], [344, 555], [332, 600], [308, 636], [268, 656],
      [226, 650], [198, 622], [184, 578], [188, 526], [202, 476],
      [216, 430], [234, 388], [244, 364]
    ];

    // Translucent obsidian-gold island fill
    const mapGrad = cCtx.createLinearGradient(184, 355, 344, 656);
    mapGrad.addColorStop(0, 'rgba(212, 175, 55, 0.16)');
    mapGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.08)');
    mapGrad.addColorStop(1, 'rgba(180, 128, 30, 0.18)');
    cCtx.fillStyle = mapGrad;
    cCtx.beginPath();
    islandPts.forEach(([x, y], i) => (i === 0 ? cCtx.moveTo(x, y) : cCtx.lineTo(x, y)));
    cCtx.closePath();
    cCtx.fill();

    // Etched brushed-gold shoreline
    goldStroke(
      (ctx) => {
        islandPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
      },
      2.6,
      '#EBC668',
      '#9B6D1D'
    );

    // Key islandwide district hub nodes + Colombo 5-hub western cluster
    const colombo = [198, 552];
    const hubs = [
      [256, 376], [286, 434], [248, 466], [312, 492],
      [266, 528], [320, 560], [278, 594], [232, 628],
      [290, 626], [218, 496]
    ];

    // Golden fiber-optic arcs linking Colombo hub to every regional district
    hubs.forEach(([hx, hy]) => {
      const mx = (colombo[0] + hx) / 2 + (hy - colombo[1]) * 0.12;
      const my = (colombo[1] + hy) / 2 - 14;
      goldStroke(
        (ctx) => {
          ctx.moveTo(colombo[0], colombo[1]);
          ctx.quadraticCurveTo(mx, my, hx, hy);
        },
        1.3,
        'rgba(248, 212, 110, 0.72)',
        '#94681A'
      );

      cCtx.fillStyle = '#FFE484';
      cCtx.beginPath();
      cCtx.arc(hx, hy, 4.0, 0, Math.PI * 2);
      cCtx.fill();

      eCtx.fillStyle = '#F2B93B';
      eCtx.beginPath();
      eCtx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      eCtx.fill();
    });

    // Radiant 5-Capital-Hub Beacon on Colombo
    const cHalo = cCtx.createRadialGradient(colombo[0], colombo[1], 2, colombo[0], colombo[1], 36);
    cHalo.addColorStop(0, 'rgba(255, 240, 168, 0.95)');
    cHalo.addColorStop(0.4, 'rgba(235, 178, 54, 0.45)');
    cHalo.addColorStop(1, 'rgba(235, 178, 54, 0)');
    cCtx.fillStyle = cHalo;
    cCtx.beginPath();
    cCtx.arc(colombo[0], colombo[1], 36, 0, Math.PI * 2);
    cCtx.fill();

    eCtx.fillStyle = '#FFE074';
    eCtx.beginPath();
    eCtx.arc(colombo[0], colombo[1], 11, 0, Math.PI * 2);
    eCtx.fill();

    goldText('100% DIGITAL NETWORK', W / 2, 700, '800 18px monospace', '#FDE047', '#9A6C1D');
    goldText('ISLANDWIDE SRI LANKA COVERAGE', W / 2, 730, '600 11px sans-serif', '#B89549', null);
  } else if (tileIndex === 3) {
    // --- TILE 3: DUAL-CONTROL SECURITY SHIELD & AUDIT VAULT ---
    goldText('GOVERNANCE VAULT', W / 2, 294, '800 20px sans-serif', '#F5D57C', '#8F641B');
    goldText('MAKER-CHECKER PROTOCOL', W / 2, 322, '600 12px monospace', '#B89242', null);

    const cx = W / 2;
    const cy = 505;

    // Concentric cryptographic radar rings
    [138, 108].forEach((r, idx) => {
      goldStroke((ctx) => ctx.arc(cx, cy, r, 0, Math.PI * 2), idx === 0 ? 1.4 : 1.0, 'rgba(212, 175, 55, 0.42)', '#4A340E');
    });

    // Geometric Shield Polygon
    const shield = [
      [cx, cy - 92],
      [cx + 76, cy - 60],
      [cx + 68, cy + 18],
      [cx, cy + 94],
      [cx - 68, cy + 18],
      [cx - 76, cy - 60]
    ];
    const sGrad = cCtx.createLinearGradient(cx, cy - 92, cx, cy + 94);
    sGrad.addColorStop(0, 'rgba(245, 206, 105, 0.24)');
    sGrad.addColorStop(1, 'rgba(180, 128, 30, 0.06)');
    cCtx.fillStyle = sGrad;
    cCtx.beginPath();
    shield.forEach(([x, y], i) => (i === 0 ? cCtx.moveTo(x, y) : cCtx.lineTo(x, y)));
    cCtx.closePath();
    cCtx.fill();

    goldStroke(
      (ctx) => {
        shield.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
      },
      3.4,
      '#F8DC88',
      '#C48B22'
    );

    // Precision Verified Checkmark inside Shield
    goldStroke(
      (ctx) => {
        ctx.moveTo(cx - 28, cy + 2);
        ctx.lineTo(cx - 6, cy + 26);
        ctx.lineTo(cx + 36, cy - 24);
      },
      5.2,
      '#FFF0A6',
      '#E6AA30'
    );

    goldText('256-BIT ENCRYPTED', W / 2, 700, '800 18px monospace', '#FDE047', '#9A6C1D');
    goldText('IMMUTABLE AUDIT LEDGER', W / 2, 730, '600 11px sans-serif', '#B89549', null);
  } else if (tileIndex === 4) {
    // --- TILE 4: 6 DIVERSIFIED SECTORS HEXAGONAL PORTFOLIO ---
    goldText('6 CORE SECTORS', W / 2, 294, '800 20px sans-serif', '#F5D57C', '#8F641B');
    goldText('ONE CONNECTED ALLIANCE', W / 2, 322, '600 12px monospace', '#B89242', null);

    const cx = W / 2;
    const cy = 505;

    // 6-Segment Precision Gold Radial Donut Ring
    const sectors = ['REAL ESTATE', 'CONSTRUCTION', 'INVESTMENT', 'TRADING', 'CONSULTANCY', 'SERVICES'];
    const rOuter = 112;
    const rInner = 64;
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2 + 0.08;
      const a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2 - 0.08;

      cCtx.fillStyle = i % 2 === 0 ? 'rgba(232, 186, 78, 0.24)' : 'rgba(212, 175, 55, 0.12)';
      cCtx.beginPath();
      cCtx.arc(cx, cy, rOuter, a0, a1);
      cCtx.arc(cx, cy, rInner, a1, a0, true);
      cCtx.closePath();
      cCtx.fill();

      goldStroke(
        (ctx) => {
          ctx.arc(cx, cy, rOuter, a0, a1);
          ctx.arc(cx, cy, rInner, a1, a0, true);
          ctx.closePath();
        },
        2.4,
        '#F2CC6E',
        '#9E6E1E'
      );

      // Node dot on outer vertex
      const aMid = (a0 + a1) / 2;
      const nx = cx + Math.cos(aMid) * (rOuter + 24);
      const ny = cy + Math.sin(aMid) * (rOuter + 24);
      cCtx.fillStyle = '#FFE484';
      cCtx.beginPath();
      cCtx.arc(nx, ny, 4.5, 0, Math.PI * 2);
      cCtx.fill();
      eCtx.fillStyle = '#E8AE30';
      eCtx.beginPath();
      eCtx.arc(nx, ny, 5, 0, Math.PI * 2);
      eCtx.fill();
    }

    goldText('06', cx, cy - 6, '800 44px monospace', '#FFF0A8', '#C98E24');
    goldText('PILLARS', cx, cy + 28, '700 12px sans-serif', '#D4AF37', '#6E4C14');

    // Compact 2-line sector legend below ring
    goldText(sectors.slice(0, 3).join('  •  '), W / 2, 694, '700 10px sans-serif', '#E5C470', '#5E4212');
    goldText(sectors.slice(3, 6).join('  •  '), W / 2, 722, '700 10px sans-serif', '#E5C470', '#5E4212');
  } else {
    // --- TILE 5: REAL-TIME HOLDINGS & CERTIFIED PORTFOLIO BARS ---
    goldText('SHAREHOLDING LEDGER', W / 2, 294, '800 19px sans-serif', '#F5D57C', '#8F641B');
    goldText('REAL-TIME EQUITY ANALYTICS', W / 2, 322, '600 12px monospace', '#B89242', null);

    // Ascending architectural equity columns with luminous caps
    const gx = 112;
    const baseLine = 615;
    const bars = [
      { h: 86, hi: false },
      { h: 122, hi: false },
      { h: 156, hi: false },
      { h: 194, hi: true },
      { h: 238, hi: true }
    ];
    const bw = 44;
    const gap = 17;

    goldStroke((ctx) => {
      ctx.moveTo(gx - 8, baseLine);
      ctx.lineTo(W - gx + 8, baseLine);
    }, 1.8, 'rgba(212, 175, 55, 0.55)', '#5E4212');

    bars.forEach((bar, idx) => {
      const bx = gx + idx * (bw + gap);
      const by = baseLine - bar.h;
      const g = cCtx.createLinearGradient(0, by, 0, baseLine);
      g.addColorStop(0, bar.hi ? 'rgba(255, 228, 128, 0.85)' : 'rgba(218, 175, 62, 0.52)');
      g.addColorStop(1, 'rgba(160, 112, 24, 0.08)');
      cCtx.fillStyle = g;
      cCtx.fillRect(bx, by, bw, bar.h);

      goldStroke((ctx) => ctx.rect(bx, by, bw, bar.h), 1.8, bar.hi ? '#FFE88A' : '#CFA042', bar.hi ? '#B88224' : '#52380F');

      // Bright gold luminous top edge
      eCtx.fillStyle = bar.hi ? '#FFCF54' : '#8A5E18';
      eCtx.fillRect(bx, by, bw, 5);
    });

    // Smooth upward trend arc floating above bars
    goldStroke(
      (ctx) => {
        ctx.moveTo(gx + bw * 0.5, baseLine - 108);
        ctx.quadraticCurveTo(W * 0.5, baseLine - 188, gx + 4 * (bw + gap) + bw * 0.5, baseLine - 262);
      },
      3.0,
      '#FFF2B2',
      '#E2A72C'
    );

    goldText('CERTIFIED PDF VAULT', W / 2, 696, '800 18px monospace', '#FDE047', '#9A6C1D');
    goldText('INSTANT STATEMENTS & EXTRACTS', W / 2, 728, '600 11px sans-serif', '#B89549', null);
  }

  [cCtx, ormCtx, eCtx].forEach((ctx) => ctx.restore());
}

/**
 * Builds ONE single 3x2 PBR texture atlas containing all 6 bespoke NIA slab designs
 * (Color + Packed ORM [G=Roughness, B=Metalness] + Emissive) for minimal VRAM & 0 material switches.
 */
function createNIAObsidianAtlas(isMobile) {
  const tileW = isMobile ? 384 : 512;
  const tileH = isMobile ? 768 : 1024;
  const atlasW = tileW * ATLAS_COLS;
  const atlasH = tileH * ATLAS_ROWS;

  const colorCanvas = document.createElement('canvas');
  const ormCanvas = document.createElement('canvas');
  const emissiveCanvas = document.createElement('canvas');

  [colorCanvas, ormCanvas, emissiveCanvas].forEach((c) => {
    c.width = atlasW;
    c.height = atlasH;
  });

  const ctxs = {
    cCtx: colorCanvas.getContext('2d'),
    ormCtx: ormCanvas.getContext('2d'),
    eCtx: emissiveCanvas.getContext('2d')
  };

  for (let tileIdx = 0; tileIdx < 6; tileIdx++) {
    drawAtlasTile(ctxs, tileIdx, tileW, tileH, null);
  }

  const makeTex = (canvas, isColor = false) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = isMobile ? 2 : 4;
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  const map = makeTex(colorCanvas, true);
  const ormMap = makeTex(ormCanvas, false);
  const emissiveMap = makeTex(emissiveCanvas, true);

  return {
    map,
    ormMap,
    emissiveMap,
    stampNIALogo: (logoImg) => {
      drawAtlasTile(ctxs, 0, tileW, tileH, logoImg);
      map.needsUpdate = true;
      ormMap.needsUpdate = true;
      emissiveMap.needsUpdate = true;
    },
    dispose: () => {
      map.dispose();
      ormMap.dispose();
      emissiveMap.dispose();
    }
  };
}

function createRadialGlowTexture(stops) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRoundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/**
 * Clones the core plate geometry's UV buffer for a specific tile (0..5) in the 3x2 atlas.
 * Automatically un-mirrors the back face so logos and charts read cleanly from every 3D angle!
 */
function createTileCoreGeometry(baseCoreGeo, innerW, innerH, tileIndex) {
  const geo = baseCoreGeo.clone();
  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const uvAttr = geo.attributes.uv;

  const col = tileIndex % ATLAS_COLS;
  const row = Math.floor(tileIndex / ATLAS_COLS);
  const pad = 0.004; // Prevents mipmap seam bleed across adjacent atlas tiles

  for (let i = 0; i < posAttr.count; i++) {
    let localU = Math.max(0, Math.min(1, (posAttr.getX(i) + innerW / 2) / innerW));
    const localV = Math.max(0, Math.min(1, (posAttr.getY(i) + innerH / 2) / innerH));

    // Mirror back-facing UVs horizontally so back sides read forward when slabs spin 180°
    if (normAttr && normAttr.getZ(i) < -0.45) {
      localU = 1 - localU;
    }

    const paddedU = pad + localU * (1 - pad * 2);
    const paddedV = pad + localV * (1 - pad * 2);

    const u = (col + paddedU) / ATLAS_COLS;
    const v = ((ATLAS_ROWS - 1 - row) + paddedV) / ATLAS_ROWS;
    uvAttr.setXY(i, u, v);
  }
  uvAttr.needsUpdate = true;
  return geo;
}

/**
 * Computes exact sculptural poses for slab `i` across the 5 scroll formations.
 */
function evaluateSlabPose(index, progress, isMobile) {
  const frac = index / SLAB_COUNT;
  const angle = frac * Math.PI * 2;
  const centeredIdx = index - (SLAB_COUNT - 1) / 2;

  // --- Formation 0 (p = 0.00): Iconic Helical Kinetic Vortex Ring ---
  const f0Angle = angle - 0.18;
  const f0Rx = isMobile ? 2.05 : 2.52;
  const f0Ry = isMobile ? 1.48 : 1.56;
  const f0 = {
    x: Math.cos(f0Angle) * f0Rx,
    y: Math.sin(f0Angle) * f0Ry,
    z: Math.sin(f0Angle * 1.0 - 0.85) * 0.88 + (Math.cos(f0Angle) > 0 ? 0.32 : -0.22),
    rx: Math.sin(f0Angle) * 0.72 + 0.20,
    ry: -Math.cos(f0Angle) * 0.68 - 0.20,
    rz: f0Angle + Math.PI * 0.28,
    s: 0.95
  };

  // --- Formation 1 (p = 0.28): Kinetic Aperture Bloom (Pure 3D Motion Showcase 1) ---
  const f1Angle = angle + Math.PI * 0.56;
  const f1Rx = isMobile ? 2.38 : 3.02;
  const f1Ry = isMobile ? 1.78 : 2.04;
  const f1 = {
    x: Math.cos(f1Angle) * f1Rx,
    y: Math.sin(f1Angle) * f1Ry,
    z: Math.cos(f1Angle * 2.0) * 0.85 + 0.38,
    rx: Math.sin(f1Angle) * 0.52 - 0.14,
    ry: Math.cos(f1Angle) * 0.62 + 0.22,
    rz: f1Angle + Math.PI * 0.52,
    s: 1.0
  };

  // --- Formation 2 (p = 0.50): Sweeping Orbital Horizon Gallery (Stage 2 Backdrop) ---
  const arcAngle = centeredIdx * 0.24;
  const f2Radius = isMobile ? 4.4 : 5.4;
  const f2 = {
    x: Math.sin(arcAngle) * f2Radius,
    y: (isMobile ? -1.42 : -1.52) + Math.cos(arcAngle) * 0.45 - Math.abs(centeredIdx) * 0.08,
    z: -1.3 + (1 - Math.cos(arcAngle)) * 2.1,
    rx: -0.68 + Math.abs(centeredIdx) * 0.03,
    ry: -arcAngle * 0.82,
    rz: -arcAngle * 0.26,
    s: 0.96
  };

  // --- Formation 3 (p = 0.70): Ascending Kinetic Helical Crown (Pure 3D Motion Showcase 2) ---
  const f3Angle = angle + Math.PI * 1.18;
  const f3R = isMobile ? 2.15 : 2.68;
  const f3 = {
    x: Math.cos(f3Angle) * f3R,
    y: centeredIdx * (isMobile ? 0.24 : 0.28),
    z: Math.sin(f3Angle) * f3R * 0.75 + 0.32,
    rx: 0.18 + Math.sin(f3Angle) * 0.32,
    ry: -f3Angle + Math.PI * 0.5,
    rz: 0.25 + Math.cos(f3Angle) * 0.22,
    s: 1.04
  };

  // --- Formation 4 (p = 0.87): Wide Symmetric Radial Halo (Stage 3 Sectors Backdrop) ---
  const f4Angle = angle + Math.PI * 1.62;
  const f4Rx = isMobile ? 2.75 : 3.78;
  const f4Ry = isMobile ? 2.15 : 2.52;
  const f4 = {
    x: Math.cos(f4Angle) * f4Rx,
    y: Math.sin(f4Angle) * f4Ry,
    z: -0.95 + Math.sin(f4Angle * 3) * 0.42,
    rx: Math.sin(f4Angle) * 0.34,
    ry: -Math.cos(f4Angle) * 0.46,
    rz: f4Angle + Math.PI * 0.5,
    s: 0.93
  };

  const blendPose = (a, b, t) => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
    s: lerp(a.s, b.s, t)
  });

  if (progress <= 0.28) return blendPose(f0, f1, smoothstep(0.0, 0.28, progress));
  if (progress <= 0.50) return blendPose(f1, f2, smoothstep(0.28, 0.50, progress));
  if (progress <= 0.70) return blendPose(f2, f3, smoothstep(0.50, 0.70, progress));
  if (progress <= 0.87) return blendPose(f3, f4, smoothstep(0.70, 0.87, progress));

  const exitT = smoothstep(0.87, 1.0, progress);
  return {
    x: f4.x * (1 + exitT * 0.14),
    y: f4.y + exitT * 1.1,
    z: f4.z - exitT * 1.6,
    rx: f4.rx - exitT * 0.22,
    ry: f4.ry + exitT * 0.25,
    rz: f4.rz + exitT * 0.18,
    s: f4.s * (1 - exitT * 0.12)
  };
}

/**
 * Real-time Hardware-Accelerated 3D Kinetic Obsidian & 24k Gold Sculpture Canvas
 * featuring bespoke etched NIA Logo, Stepped Valuation Graph, 60-Branch Sri Lanka Network,
 * Dual-Control Security Shield, 6 Sectors Matrix, and Holdings Ledger on the moving 3D slabs.
 *
 * Performance Engineered:
 * - Single shared 3x2 PBR texture atlas (Color + packed ORM + Emissive) -> 0 shader/material switches
 * - Only 21 total draw calls across the entire 3D scene
 * - 0 React re-renders during scroll + IntersectionObserver GPU pause when below the hero
 */
export default function KineticObsidian3DCanvas({ progressRef }) {
  const containerRef = useRef(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setFallbackMode(true);
      return;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false
      });
    } catch {
      setFallbackMode(true);
      return;
    }

    renderer.setClearColor(0x060911, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.transform = 'translateZ(0)';
    container.appendChild(canvas);

    const initialMobile = window.innerWidth < 768;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060911, 0.046);

    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 60);
    camera.position.set(0, 0, 9.7);

    // 2. Studio HDRI Environment for metallic gold specular reflections
    const envRT = createStudioEnvironment(renderer);
    scene.environment = envRT.texture;

    // 3. Sculptural Lighting Rig
    scene.add(new THREE.AmbientLight(0x1b2438, 0.72));

    const coreLight = new THREE.PointLight(0xffb547, 18, 16, 1.5);
    coreLight.position.set(0, 0, -0.5);
    scene.add(coreLight);

    const keyLight = new THREE.DirectionalLight(0xfff1cc, 2.8);
    keyLight.position.set(7, 3.5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x5d84d6, 1.1);
    rimLight.position.set(-6, 5, -4);
    scene.add(rimLight);

    // 4. Shared Slab Frame & 6 UV-Mapped Atlas Core Geometries
    const outerW = 1.18;
    const outerH = 2.42;
    const goldShape = createRoundedRectShape(outerW, outerH, 0.12);
    const goldGeo = new THREE.ExtrudeGeometry(goldShape, {
      depth: 0.068,
      bevelEnabled: true,
      bevelThickness: 0.056,
      bevelSize: 0.056,
      bevelSegments: 4,
      curveSegments: 14
    });
    goldGeo.center();

    const innerW = 1.02;
    const innerH = 2.26;
    const coreShape = createRoundedRectShape(innerW, innerH, 0.075);
    const baseCoreGeo = new THREE.ExtrudeGeometry(coreShape, {
      depth: 0.184,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 10
    });
    baseCoreGeo.center();

    const tileCoreGeos = [];
    for (let t = 0; t < 6; t++) {
      tileCoreGeos.push(createTileCoreGeometry(baseCoreGeo, innerW, innerH, t));
    }
    baseCoreGeo.dispose();

    // 5. Single Packed PBR Atlas + Shared Materials (0 material switches across all 9 slabs)
    const niaAtlas = createNIAObsidianAtlas(initialMobile);

    let isDisposed = false;
    const logoImg = new Image();
    logoImg.decoding = 'async';
    logoImg.onload = () => {
      if (!isDisposed) {
        niaAtlas.stampNIALogo(logoImg);
      }
    };
    logoImg.src = '/nia-logo.png';

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xeec966),
      metalness: 0.96,
      roughness: 0.14,
      clearcoat: 0.45,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.95
    });

    // Packed ORM: roughnessMap reads Green channel, metalnessMap reads Blue channel
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      map: niaAtlas.map,
      roughnessMap: niaAtlas.ormMap,
      metalnessMap: niaAtlas.ormMap,
      emissive: new THREE.Color(0xe5aa38),
      emissiveMap: niaAtlas.emissiveMap,
      emissiveIntensity: 0.45,
      roughness: 1.0,
      metalness: 1.0,
      envMapIntensity: 1.2
    });

    // 6. Master Sculpture Group + 9 Individual Kinetic Monolith Slabs
    const sculptureGroup = new THREE.Group();
    scene.add(sculptureGroup);

    const slabs = [];
    for (let i = 0; i < SLAB_COUNT; i++) {
      const tileIdx = SLAB_TILE_ASSIGNMENT[i] ?? 0;
      const slabGroup = new THREE.Group();
      const goldFrame = new THREE.Mesh(goldGeo, goldMat);
      const obsidianCore = new THREE.Mesh(tileCoreGeos[tileIdx], obsidianMat);
      slabGroup.add(goldFrame);
      slabGroup.add(obsidianCore);
      sculptureGroup.add(slabGroup);
      slabs.push(slabGroup);
    }

    // 7. Delicate Precision Orbital Gold Halo Ring behind the Slabs (1 draw call)
    const orbitalRingGeo = new THREE.TorusGeometry(3.25, 0.011, 8, 96);
    const orbitalRingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xf2cf72),
      metalness: 0.95,
      roughness: 0.18,
      emissive: new THREE.Color(0xb88422),
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.28
    });
    const orbitalRing = new THREE.Mesh(orbitalRingGeo, orbitalRingMat);
    orbitalRing.position.set(0, 0, -1.65);
    sculptureGroup.add(orbitalRing);

    // 8. Warm Golden Volumetric Core Aura Sprite
    const coreGlowTex = createRadialGlowTexture([
      [0.0, 'rgba(255, 206, 112, 0.70)'],
      [0.28, 'rgba(218, 148, 42, 0.40)'],
      [0.58, 'rgba(130, 74, 14, 0.14)'],
      [1.0, 'rgba(6, 9, 17, 0.0)']
    ]);
    const coreGlowMat = new THREE.SpriteMaterial({
      map: coreGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreGlowSprite = new THREE.Sprite(coreGlowMat);
    coreGlowSprite.position.set(0, 0, -1.75);
    coreGlowSprite.scale.set(7.6, 5.8, 1);
    sculptureGroup.add(coreGlowSprite);

    // 9. Subtle Floating 24k Gold Micro-Dust Particles
    const particleCount = initialMobile ? 75 : 110;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 2.4 + Math.random() * 6.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;
      particlePositions[i * 3] = Math.cos(theta) * Math.cos(phi) * radius;
      particlePositions[i * 3 + 1] = Math.sin(phi) * radius * 0.72;
      particlePositions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * radius - 1.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const dustTex = createRadialGlowTexture([
      [0.0, 'rgba(255, 232, 160, 0.95)'],
      [0.35, 'rgba(212, 175, 55, 0.45)'],
      [1.0, 'rgba(212, 175, 55, 0.0)']
    ]);
    const dustMat = new THREE.PointsMaterial({
      map: dustTex,
      size: 0.09,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // 10. Responsive Viewport Resize & Aspect Framing
    let isMobile = initialMobile;
    let baseCameraZ = 9.7;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, window.innerWidth, 320);
      const height = Math.max(rect.height, window.innerHeight, 320);
      const aspect = width / height;

      isMobile = width < 768;
      const maxDpr = isMobile ? 1.5 : 2;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.setSize(width, height, false);

      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      if (aspect < 0.72) {
        baseCameraZ = 13.6;
      } else if (aspect < 1.0) {
        baseCameraZ = 11.8;
      } else if (aspect < 1.35) {
        baseCameraZ = 10.6;
      } else {
        baseCameraZ = 9.7;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // 11. Smooth Pointer Parallax (Desktop subtle tilt)
    const pointerTarget = { x: 0, y: 0 };
    const pointerCurrent = { x: 0, y: 0 };

    const handlePointerMove = (e) => {
      if (isMobile) return;
      pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 12. IntersectionObserver GPU Pause when scrolled past hero into lower page sections
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { rootMargin: '180px 0px' }
    );
    observer.observe(container);

    const handleContextLost = (e) => {
      e.preventDefault();
      setFallbackMode(true);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    // 13. Frame-Rate Independent 60/120fps Render Loop
    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let smoothProgress = progressRef?.current ?? 0;

    const animate = (now) => {
      rafId = requestAnimationFrame(animate);
      if (!isVisible || document.hidden) {
        lastTime = now;
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      const targetProgress = Math.max(0, Math.min(1, progressRef?.current ?? 0));
      const pDelta = targetProgress - smoothProgress;
      const dampSpeed = Math.abs(pDelta) > 0.04 ? 14.0 : 9.5;
      smoothProgress += pDelta * (1 - Math.exp(-dampSpeed * dt));

      const ptrFactor = 1 - Math.exp(-4.5 * dt);
      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * ptrFactor;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * ptrFactor;

      for (let i = 0; i < SLAB_COUNT; i++) {
        const pose = evaluateSlabPose(i, smoothProgress, isMobile);
        const slab = slabs[i];

        const phase = elapsed * 0.72 + i * 0.68;
        const floatY = Math.sin(phase) * 0.05;
        const floatRot = Math.cos(phase * 0.85) * 0.022;

        slab.position.set(pose.x, pose.y + floatY, pose.z);
        slab.rotation.set(pose.rx + floatRot, pose.ry, pose.rz);
        slab.scale.setScalar(pose.s);
      }

      const stage1RightOffset = isMobile ? 0 : (1 - smoothstep(0.0, 0.24, smoothProgress)) * 0.42;
      sculptureGroup.position.x = stage1RightOffset;
      sculptureGroup.rotation.y = pointerCurrent.x * 0.14 + Math.sin(elapsed * 0.35) * 0.04;
      sculptureGroup.rotation.x = pointerCurrent.y * 0.10 + Math.cos(elapsed * 0.28) * 0.028;

      // Keep the golden orbital halo gracefully inclined (never slicing vertically through headlines)
      orbitalRing.rotation.x = 1.18 + Math.sin(smoothProgress * Math.PI) * 0.22 + Math.sin(elapsed * 0.4) * 0.06;
      orbitalRing.rotation.y = Math.cos(smoothProgress * Math.PI) * 0.22;
      orbitalRing.rotation.z = elapsed * 0.14 + smoothProgress * 1.8;
      const ringScale = 0.90 + smoothstep(0.1, 0.3, smoothProgress) * 0.22;
      orbitalRing.scale.setScalar(ringScale);

      // Cinematic camera dolly across pure 3D motion interludes
      const zoomIn1 =
        smoothstep(0.08, 0.28, smoothProgress) * (1 - smoothstep(0.36, 0.52, smoothProgress));
      const zoomIn2 =
        smoothstep(0.58, 0.70, smoothProgress) * (1 - smoothstep(0.75, 0.88, smoothProgress));
      camera.position.z = baseCameraZ - zoomIn1 * 1.15 - zoomIn2 * 1.05;
      camera.position.x = pointerCurrent.x * 0.22;
      camera.position.y = -pointerCurrent.y * 0.16;
      camera.lookAt(stage1RightOffset * 0.35, 0, 0);

      // Core warm golden aura & etched motif emissive boost during motion
      const scrollVelocityBoost = Math.min(1, Math.abs(pDelta) * 18);
      const auraPulse = 1 + Math.sin(elapsed * 1.4) * 0.05 + scrollVelocityBoost * 0.16;
      coreGlowSprite.scale.set(7.8 * auraPulse, 6.0 * auraPulse, 1);
      coreLight.intensity = 17 + Math.sin(elapsed * 1.6) * 2.2 + scrollVelocityBoost * 7.5;
      obsidianMat.emissiveIntensity = 0.42 + scrollVelocityBoost * 0.38 + Math.sin(elapsed * 1.2) * 0.05;

      dustPoints.rotation.y = elapsed * 0.035 + smoothProgress * 1.1;
      dustPoints.rotation.x = smoothProgress * 0.35;

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('webglcontextlost', handleContextLost);

      goldGeo.dispose();
      tileCoreGeos.forEach((g) => g.dispose());
      orbitalRingGeo.dispose();
      orbitalRingMat.dispose();
      goldMat.dispose();
      obsidianMat.dispose();
      niaAtlas.dispose();
      coreGlowTex.dispose();
      coreGlowMat.dispose();
      dustGeo.dispose();
      dustTex.dispose();
      dustMat.dispose();
      envRT.dispose();
      renderer.dispose();

      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [progressRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        backgroundColor: '#060911'
      }}
    >
      {fallbackMode && (
        <img
          src="/kinetic-obsidian-fallback.jpg"
          alt="NIA Kinetic Obsidian and Gold 3D Sculpture"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-90 select-none"
        />
      )}

      {/* Subtle cinematic vignette for crisp UI typography contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 48%, rgba(6, 9, 17, 0.05) 0%, rgba(6, 9, 17, 0.40) 68%, rgba(6, 9, 17, 0.78) 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Top fade behind sticky navbar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '110px',
          background: 'linear-gradient(to bottom, rgba(6, 9, 17, 0.88), transparent)',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />

      {/* Bottom seamless obsidian blend into Metrics Strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '140px',
          background: 'linear-gradient(to top, #060911 8%, rgba(6, 9, 17, 0.55) 55%, transparent)',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />
    </div>
  );
}

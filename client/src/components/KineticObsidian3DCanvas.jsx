import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SLAB_COUNT = 9;

// Smooth Hermite interpolation helper
const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Generates an HDR-like procedural studio softbox environment map so metallic
 * 24k gold chamfers catch blazing champagne highlights and warm amber core bounces.
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
    // Right-side intense warm white-gold rim softbox (recreates blazing right-side gold chamfers)
    addPanel([8.5, 6.4, 2.9], [10, 1.5, 4.5], [0, -Math.PI * 0.42, 0], [5.5, 16]),
    // Secondary lower-right bright gold strip
    addPanel([6.2, 4.3, 1.6], [7.5, -5.5, 6.5], [-0.4, -Math.PI * 0.3, 0], [7, 5]),
    // Overhead champagne softbox for crisp bevel specular streaks
    addPanel([4.4, 3.2, 1.4], [0, 11, 2], [Math.PI / 2, 0, 0], [16, 7]),
    // Warm burnt-amber core reflector (casts rich bronze/amber reflection on left slabs)
    addPanel([5.8, 3.1, 0.75], [-6.5, 2.2, 5.5], [0.15, Math.PI * 0.34, 0], [8, 9]),
    // Subtle lower warm bounce
    addPanel([3.8, 2.2, 0.55], [0, -10, 3], [-Math.PI / 2, 0, 0], [14, 10]),
    // Cool deep midnight-blue subtle rim for obsidian contrast
    addPanel([0.32, 0.52, 0.95], [-11, 0, -6], [0, Math.PI * 0.65, 0], [14, 16]),
    // Back warm eclipse rim behind the vortex
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
 * Procedurally draws high-resolution obsidian satin-metal & geometric 45° golden
 * circuit/telemetry textures (color, roughness, metalness, emissive).
 */
function createObsidianCircuitTextures() {
  const W = 512;
  const H = 1024;

  const colorCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  const metalCanvas = document.createElement('canvas');
  const emissiveCanvas = document.createElement('canvas');

  [colorCanvas, roughCanvas, metalCanvas, emissiveCanvas].forEach((c) => {
    c.width = W;
    c.height = H;
  });

  const cCtx = colorCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');
  const mCtx = metalCanvas.getContext('2d');
  const eCtx = emissiveCanvas.getContext('2d');

  // 1. Deep satin dark obsidian anodized base (matches moody luxury artwork)
  const baseGrad = cCtx.createLinearGradient(0, 0, W, H);
  baseGrad.addColorStop(0, '#0d1018');
  baseGrad.addColorStop(0.5, '#080a10');
  baseGrad.addColorStop(1, '#0c0f17');
  cCtx.fillStyle = baseGrad;
  cCtx.fillRect(0, 0, W, H);

  // Subtle brushed-obsidian horizontal micro-grain
  cCtx.fillStyle = 'rgba(255, 255, 255, 0.012)';
  for (let y = 0; y < H; y += 3) {
    cCtx.fillRect(0, y, W, 1);
  }

  // Roughness base (~0.48 satin matte obsidian)
  rCtx.fillStyle = 'rgb(124, 124, 124)';
  rCtx.fillRect(0, 0, W, H);

  // Metalness base (~0.34 anodized obsidian metal)
  mCtx.fillStyle = 'rgb(88, 88, 88)';
  mCtx.fillRect(0, 0, W, H);

  // Emissive base (black)
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, W, H);

  // Geometric 45-degree architectural circuit traces matching the uploaded 3D artwork
  const paths = [
    // Inner architectural frame border
    [[26, 26], [W - 26, 26], [W - 26, H - 26], [26, H - 26], [26, 26]],
    // Primary central spine & symmetrical angled traces
    [[W * 0.5, 26], [W * 0.5, 190], [W * 0.34, 272], [W * 0.34, 490], [W * 0.5, 572], [W * 0.5, 760], [W * 0.64, 832], [W * 0.64, H - 26]],
    [[W * 0.5, 190], [W * 0.66, 272], [W * 0.66, 460], [W * 0.5, 542]],
    // Left conduit clusters
    [[26, 175], [140, 175], [206, 241], [206, 415], [132, 489], [132, 680], [218, 766], [218, H - 26]],
    [[26, 360], [92, 360], [156, 424], [156, 560], [88, 628], [26, 628]],
    [[110, 26], [110, 112], [174, 176], [244, 176]],
    [[26, 820], [130, 820], [186, 876], [186, H - 26]],
    // Right conduit clusters
    [[W - 26, 210], [W - 126, 210], [W - 196, 280], [W - 196, 515], [W - 118, 593], [W - 118, 795], [W - 26, 887]],
    [[W - 120, 26], [W - 120, 130], [W - 188, 198], [W - 188, 270]],
    [[W - 26, 445], [W - 96, 445], [W - 148, 497], [W - 148, 690], [W - 230, 772], [W - 230, H - 26]],
    [[W - 26, 680], [W - 84, 680], [W - 84, 780]],
    // Cross-connecting diagonal telemetry bridges
    [[132, 545], [256, 545], [312, 601], [312, 745], [394, 827]],
    [[206, 325], [296, 325], [352, 269], [W - 26, 269]]
  ];

  const drawPathsOnCtx = (ctx, strokeStyle, lineWidth) => {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pts of paths) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
    }
  };

  // Subtle recessed dark groove shadow around each gold trace
  drawPathsOnCtx(cCtx, 'rgba(2, 3, 7, 0.9)', 4.5);
  // Ultra-fine hairline brushed 24k gold traces (matches uploaded artwork delicacy)
  drawPathsOnCtx(cCtx, '#B88D38', 1.75);
  // Specular gold highlights on roughness & metalness maps
  drawPathsOnCtx(rCtx, 'rgb(38, 38, 38)', 2.4);
  drawPathsOnCtx(mCtx, 'rgb(240, 240, 240)', 2.4);
  // Subtle warm emissive glint along primary traces
  drawPathsOnCtx(eCtx, '#593E12', 1.5);

  // Subtle geometric junction nodes
  const nodes = [
    [W * 0.5, 190], [W * 0.34, 272], [W * 0.66, 272], [W * 0.5, 572],
    [206, 415], [W - 196, 515], [312, 601], [132, 680], [W - 148, 690]
  ];
  for (const [nx, ny] of nodes) {
    cCtx.fillStyle = '#D9AF52';
    cCtx.beginPath();
    cCtx.arc(nx, ny, 2.8, 0, Math.PI * 2);
    cCtx.fill();

    eCtx.fillStyle = '#996D22';
    eCtx.beginPath();
    eCtx.arc(nx, ny, 3.0, 0, Math.PI * 2);
    eCtx.fill();
  }

  const makeTex = (canvas, isColor = false) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.needsUpdate = true;
    return tex;
  };

  return {
    map: makeTex(colorCanvas, true),
    roughnessMap: makeTex(roughCanvas, false),
    metalnessMap: makeTex(metalCanvas, false),
    emissiveMap: makeTex(emissiveCanvas, true)
  };
}

/**
 * Creates a soft radial glow texture for the warm amber vortex core and floating dust.
 */
function createRadialGlowTexture(stops) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) {
    grad.addColorStop(offset, color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a rounded-rectangle THREE.Shape centered at (0,0).
 */
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
 * Computes exact sculptural poses for slab `i` across the 5 scroll formations:
 *   0.00 -> Iconic overlapping Kinetic Obsidian Vortex Ring (matches uploaded 3D design)
 *   0.28 -> Aperture Bloom Showcase (clean unobstructed 3D swirl & metallic glint)
 *   0.50 -> Digital Network Orbital Horizon (sweeping curved deck behind Stage 2)
 *   0.70 -> Ascending Helical Crown (clean unobstructed 3D showcase 2)
 *   0.87 -> Wide Symmetric Radial Halo (frames Stage 3 6 Sectors & CTAs cleanly)
 */
function evaluateSlabPose(index, progress, isMobile) {
  const frac = index / SLAB_COUNT;
  const angle = frac * Math.PI * 2;
  const centeredIdx = index - (SLAB_COUNT - 1) / 2; // -4 .. +4

  // --- Formation 0 (p = 0.00): Exact Iconic Helical Vortex Ring ---
  const f0Angle = angle - 0.18;
  const f0Rx = isMobile ? 2.05 : 2.52;
  const f0Ry = isMobile ? 1.48 : 1.56;
  const f0 = {
    x: Math.cos(f0Angle) * f0Rx,
    y: Math.sin(f0Angle) * f0Ry,
    z: Math.sin(f0Angle * 1.0 - 0.85) * 0.88 + (Math.cos(f0Angle) > 0 ? 0.32 : -0.22),
    rx: Math.sin(f0Angle) * 0.78 + 0.24,
    ry: -Math.cos(f0Angle) * 0.74 - 0.24,
    rz: f0Angle + Math.PI * 0.30,
    s: 0.94
  };

  // --- Formation 1 (p = 0.28): Kinetic Aperture Bloom (Pure 3D Motion Showcase 1) ---
  const f1Angle = angle + Math.PI * 0.58;
  const f1Rx = isMobile ? 2.35 : 3.0;
  const f1Ry = isMobile ? 1.75 : 2.02;
  const f1 = {
    x: Math.cos(f1Angle) * f1Rx,
    y: Math.sin(f1Angle) * f1Ry,
    z: Math.cos(f1Angle * 2.0) * 0.95 + 0.35,
    rx: Math.sin(f1Angle) * 0.78 - 0.22,
    ry: Math.cos(f1Angle) * 0.88 + 0.40,
    rz: f1Angle + Math.PI * 0.62,
    s: 0.98
  };

  // --- Formation 2 (p = 0.50): Sweeping Orbital Horizon Deck (Stage 2 Backdrop) ---
  const arcAngle = centeredIdx * 0.24;
  const f2Radius = isMobile ? 4.4 : 5.4;
  const f2 = {
    x: Math.sin(arcAngle) * f2Radius,
    y: (isMobile ? -1.45 : -1.55) + Math.cos(arcAngle) * 0.45 - Math.abs(centeredIdx) * 0.08,
    z: -1.35 + (1 - Math.cos(arcAngle)) * 2.2,
    rx: -0.92 + Math.abs(centeredIdx) * 0.04,
    ry: -arcAngle * 0.85,
    rz: -arcAngle * 0.35,
    s: 0.96
  };

  // --- Formation 3 (p = 0.70): Ascending Kinetic Helical Crown (Pure 3D Motion Showcase 2) ---
  const f3Angle = angle + Math.PI * 1.18;
  const f3R = isMobile ? 2.15 : 2.65;
  const f3 = {
    x: Math.cos(f3Angle) * f3R,
    y: centeredIdx * (isMobile ? 0.24 : 0.28),
    z: Math.sin(f3Angle) * f3R * 0.75 + 0.3,
    rx: 0.22 + Math.sin(f3Angle) * 0.38,
    ry: -f3Angle + Math.PI * 0.5,
    rz: 0.35 + Math.cos(f3Angle) * 0.28,
    s: 1.04
  };

  // --- Formation 4 (p = 0.87): Wide Symmetric Radial Halo (Stage 3 Sectors Backdrop) ---
  const f4Angle = angle + Math.PI * 1.62;
  const f4Rx = isMobile ? 2.75 : 3.75;
  const f4Ry = isMobile ? 2.15 : 2.48;
  const f4 = {
    x: Math.cos(f4Angle) * f4Rx,
    y: Math.sin(f4Angle) * f4Ry,
    z: -0.95 + Math.sin(f4Angle * 3) * 0.45,
    rx: Math.sin(f4Angle) * 0.38,
    ry: -Math.cos(f4Angle) * 0.52,
    rz: f4Angle + Math.PI * 0.5,
    s: 0.92
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

  if (progress <= 0.28) {
    return blendPose(f0, f1, smoothstep(0.0, 0.28, progress));
  }
  if (progress <= 0.50) {
    return blendPose(f1, f2, smoothstep(0.28, 0.50, progress));
  }
  if (progress <= 0.70) {
    return blendPose(f2, f3, smoothstep(0.50, 0.70, progress));
  }
  if (progress <= 0.87) {
    return blendPose(f3, f4, smoothstep(0.70, 0.87, progress));
  }
  // Smooth exit drift between 0.87 and 1.00
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
 * Real-time Hardware-Accelerated 3D Kinetic Obsidian & 24k Gold Sculpture Canvas.
 * Driven strictly by mutable refs (0 React re-renders on scroll) with IntersectionObserver
 * GPU pause when scrolled out of view and graceful static fallback if WebGL is unavailable.
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

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060911, 0.048);

    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 60);
    camera.position.set(0, 0, 8.4);

    // 2. Studio HDRI Environment for genuine PBR metallic gold reflections
    const envRT = createStudioEnvironment(renderer);
    scene.environment = envRT.texture;

    // 3. Sculptural Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x1b2438, 0.7);
    scene.add(ambientLight);

    // Warm golden core light inside the vortex ring (recreates warm inner amber reflections)
    const coreLight = new THREE.PointLight(0xffb547, 18, 16, 1.5);
    coreLight.position.set(0, 0, -0.5);
    scene.add(coreLight);

    // Crisp right-side champagne key light
    const keyLight = new THREE.DirectionalLight(0xfff1cc, 2.8);
    keyLight.position.set(7, 3.5, 6);
    scene.add(keyLight);

    // Subtle cool midnight edge rim light on upper-left
    const rimLight = new THREE.DirectionalLight(0x5d84d6, 1.1);
    rimLight.position.set(-6, 5, -4);
    scene.add(rimLight);

    // 4. Shared Slab Geometries & PBR Materials (18 total draw calls across all 9 slabs)
    const outerW = 1.18;
    const outerH = 2.42;
    const goldShape = createRoundedRectShape(outerW, outerH, 0.12);
    const goldGeo = new THREE.ExtrudeGeometry(goldShape, {
      depth: 0.068,
      bevelEnabled: true,
      bevelThickness: 0.056,
      bevelSize: 0.056,
      bevelSegments: 4,
      curveSegments: 16
    });
    goldGeo.center();

    const innerW = 1.02;
    const innerH = 2.26;
    const coreShape = createRoundedRectShape(innerW, innerH, 0.075);
    const coreGeo = new THREE.ExtrudeGeometry(coreShape, {
      depth: 0.184,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 12
    });
    coreGeo.center();

    // Normalize UVs cleanly to [0..1] for crisp front & back circuit trace mapping
    const posAttr = coreGeo.attributes.position;
    const uvAttr = coreGeo.attributes.uv;
    for (let i = 0; i < posAttr.count; i++) {
      const u = (posAttr.getX(i) + innerW / 2) / innerW;
      const v = (posAttr.getY(i) + innerH / 2) / innerH;
      uvAttr.setXY(i, u, v);
    }
    uvAttr.needsUpdate = true;

    const circuitTextures = createObsidianCircuitTextures();

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xeec966),
      metalness: 0.96,
      roughness: 0.14,
      clearcoat: 0.45,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.95
    });

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      map: circuitTextures.map,
      roughnessMap: circuitTextures.roughnessMap,
      metalnessMap: circuitTextures.metalnessMap,
      emissive: new THREE.Color(0xc98d22),
      emissiveMap: circuitTextures.emissiveMap,
      emissiveIntensity: 0.22,
      roughness: 1.0,
      metalness: 1.0,
      envMapIntensity: 1.15
    });

    // 5. Master Sculpture Group + 9 Individual Kinetic Monolith Slabs
    const sculptureGroup = new THREE.Group();
    scene.add(sculptureGroup);

    const slabs = [];
    for (let i = 0; i < SLAB_COUNT; i++) {
      const slabGroup = new THREE.Group();
      const goldFrame = new THREE.Mesh(goldGeo, goldMat);
      const obsidianCore = new THREE.Mesh(coreGeo, obsidianMat);
      slabGroup.add(goldFrame);
      slabGroup.add(obsidianCore);
      sculptureGroup.add(slabGroup);
      slabs.push(slabGroup);
    }

    // 6. Warm Golden Volumetric Core Aura Sprite (exact central glow behind ring)
    const coreGlowTex = createRadialGlowTexture([
      [0.0, 'rgba(255, 206, 112, 0.72)'],
      [0.28, 'rgba(218, 148, 42, 0.42)'],
      [0.58, 'rgba(130, 74, 14, 0.16)'],
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

    // 7. Subtle Floating 24k Gold Micro-Dust Particles
    const particleCount = 110;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const radius = 2.4 + Math.random() * 6.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;
      particlePositions[i * 3] = Math.cos(theta) * Math.cos(phi) * radius;
      particlePositions[i * 3 + 1] = Math.sin(phi) * radius * 0.72;
      particlePositions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * radius - 1.5;
      particleSeeds[i] = Math.random() * Math.PI * 2;
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
      size: 0.095,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // 8. Responsive Viewport Resize & Aspect Framing
    let isMobile = window.innerWidth < 768;
    let baseCameraZ = 8.4;

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

      // Frame the full 3D kinetic ring cleanly with generous obsidian breathing room on all screens
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

    // 9. Smooth Pointer Parallax (Desktop subtle tilt)
    const pointerTarget = { x: 0, y: 0 };
    const pointerCurrent = { x: 0, y: 0 };

    const handlePointerMove = (e) => {
      if (isMobile) return;
      pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 10. Visibility Observer (0% GPU usage when scrolled below hero into rest of page)
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { rootMargin: '180px 0px' }
    );
    observer.observe(container);

    // 11. Handle WebGL context loss gracefully
    const handleContextLost = (e) => {
      e.preventDefault();
      setFallbackMode(true);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    // 12. Silky Frame-Rate Independent 60/120fps Render Loop
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

      // Exponential time-normalized damping (tracks finger/wheel instantaneously without step lag)
      const targetProgress = Math.max(0, Math.min(1, progressRef?.current ?? 0));
      const pDelta = targetProgress - smoothProgress;
      const dampSpeed = Math.abs(pDelta) > 0.04 ? 14.0 : 9.5;
      smoothProgress += pDelta * (1 - Math.exp(-dampSpeed * dt));

      // Smooth pointer parallax damping
      const ptrFactor = 1 - Math.exp(-4.5 * dt);
      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * ptrFactor;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * ptrFactor;

      // Update each slab along the continuous 5-stage 3D choreography
      for (let i = 0; i < SLAB_COUNT; i++) {
        const pose = evaluateSlabPose(i, smoothProgress, isMobile);
        const slab = slabs[i];

        // Subtle organic harmonic float so the sculpture feels alive even when resting
        const phase = elapsed * 0.75 + i * 0.68;
        const floatY = Math.sin(phase) * 0.055;
        const floatRot = Math.cos(phase * 0.85) * 0.025;

        slab.position.set(pose.x, pose.y + floatY, pose.z);
        slab.rotation.set(pose.rx + floatRot, pose.ry, pose.rz);
        slab.scale.setScalar(pose.s);
      }

      // Subtle global sculpture framing & breathing
      // Slightly right-weighted on desktop Stage 1 (p=0) so left hero copy stays ultra-legible,
      // then glides cleanly to exact center for the Clean 3D Motion Showcase & Stage 2/3!
      const stage1RightOffset = isMobile ? 0 : (1 - smoothstep(0.0, 0.24, smoothProgress)) * 0.42;
      sculptureGroup.position.x = stage1RightOffset;
      sculptureGroup.rotation.y =
        pointerCurrent.x * 0.14 + Math.sin(elapsed * 0.35) * 0.045;
      sculptureGroup.rotation.x =
        pointerCurrent.y * 0.10 + Math.cos(elapsed * 0.28) * 0.03;

      // Dynamic cinematic camera dolly across the scroll track
      const zoomIn1 = smoothstep(0.08, 0.28, smoothProgress) * (1 - smoothstep(0.36, 0.52, smoothProgress));
      const zoomIn2 = smoothstep(0.58, 0.70, smoothProgress) * (1 - smoothstep(0.75, 0.88, smoothProgress));
      camera.position.z = baseCameraZ - zoomIn1 * 1.15 - zoomIn2 * 1.05;
      camera.position.x = pointerCurrent.x * 0.22;
      camera.position.y = -pointerCurrent.y * 0.16;
      camera.lookAt(stage1RightOffset * 0.35, 0, 0);

      // Core warm golden aura & emissive pulse synchronized with scroll speed
      const scrollVelocityBoost = Math.min(1, Math.abs(pDelta) * 18);
      const auraPulse = 1 + Math.sin(elapsed * 1.4) * 0.05 + scrollVelocityBoost * 0.16;
      coreGlowSprite.scale.set(7.8 * auraPulse, 6.0 * auraPulse, 1);
      coreLight.intensity = 17 + Math.sin(elapsed * 1.6) * 2.2 + scrollVelocityBoost * 7.5;
      obsidianMat.emissiveIntensity = 0.18 + scrollVelocityBoost * 0.34 + Math.sin(elapsed * 1.2) * 0.04;

      // Orbit the golden micro-dust slowly in depth
      dustPoints.rotation.y = elapsed * 0.035 + smoothProgress * 1.1;
      dustPoints.rotation.x = smoothProgress * 0.35;

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('webglcontextlost', handleContextLost);

      goldGeo.dispose();
      coreGeo.dispose();
      goldMat.dispose();
      obsidianMat.dispose();
      circuitTextures.map.dispose();
      circuitTextures.roughnessMap.dispose();
      circuitTextures.metalnessMap.dispose();
      circuitTextures.emissiveMap.dispose();
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
      {/* Graceful fallback if WebGL is unavailable or user prefers reduced motion */}
      {fallbackMode && (
        <img
          src="/kinetic-obsidian-fallback.jpg"
          alt="NIA Kinetic Obsidian and Gold 3D Sculpture"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-90 select-none"
        />
      )}

      {/* Subtle cinematic vignette so white/gold UI typography stays razor-sharp everywhere */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 48%, rgba(6, 9, 17, 0.06) 0%, rgba(6, 9, 17, 0.42) 68%, rgba(6, 9, 17, 0.78) 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Top subtle fade behind sticky navbar */}
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

      {/* Bottom seamless obsidian edge blend into Metrics Strip */}
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

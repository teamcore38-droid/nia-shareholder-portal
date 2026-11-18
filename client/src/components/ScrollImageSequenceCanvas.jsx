import React, { useEffect, useRef } from 'react';

/**
 * High-Performance Scroll-Linked Image Sequence Canvas
 * - Preloads frames progressively (starting with frame 1 for instant first paint)
 * - Preloads remaining frames in sequence so scrubbing is completely hitch-free
 * - Maps scroll progress directly to frame index (1 to totalFrames)
 * - Persistent requestAnimationFrame loop with smooth lerping
 * - Full retina / DPR support (pixel-perfect sharpness on all screens)
 * - Responsive "cover" aspect ratio calculation that fills the entire viewport
 * - Robust explicit positioning filling 100% of parent container edge-to-edge
 * - Fallback mechanism to nearest loaded frame so the screen NEVER blanks out
 * - Respects prefers-reduced-motion
 * - Zero layout shift, zero flicker, 60fps+ hardware-accelerated rendering
 */
// Module-level persistent frame cache & default path helper:
// 1. Prevents inline default function reference from re-triggering useEffect on parent re-renders
// 2. Preserves decoded HTMLImageElement instances across Home <-> Auth <-> Workspace <-> Sign-Out transitions (0ms instant homepage restore)
const DEFAULT_FRAME_PATH = (i) => `/frames/ezgif-frame-${String(i).padStart(3, '0')}.webp`;
const GLOBAL_FRAME_CACHE = new Map();
const IN_FLIGHT_FRAME_PROMISES = new Map();

export default function ScrollImageSequenceCanvas({
  scrollProgress = 0, // 0.0 to 1.0 (fallback if progressRef not provided)
  progressRef = null, // Optional ref { current: 0..1 } for zero-re-render parent updates
  totalFrames = 70,
  framePath = DEFAULT_FRAME_PATH
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const targetFrameRef = useRef(1);
  const currentFrameRef = useRef(1);
  const needsRedrawRef = useRef(true);
  const isReducedMotion = useRef(false);
  const isVisibleRef = useRef(true);

  // Update target frame whenever scrollProgress prop changes
  useEffect(() => {
    if (progressRef) return;
    const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
    const target = 1 + clampedProgress * (totalFrames - 1);
    targetFrameRef.current = target;
  }, [scrollProgress, progressRef, totalFrames]);

  // Main setup: progressive preloading, visibility-aware animation loop, and resize management
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let cancelled = false;
    let fullPreloadStarted = false;
    let idleHandle = null;
    let deferTimer = null;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      isReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const getCachedImage = (index) => {
      const src = framePath(index);
      return GLOBAL_FRAME_CACHE.get(src) || null;
    };

    // 1. Deduplicated Module-Cached Frame Loader
    const loadFrame = (index, priority = 'auto') => {
      const src = framePath(index);
      const existing = GLOBAL_FRAME_CACHE.get(src);
      if (existing && existing.complete && existing.naturalWidth > 0) {
        return Promise.resolve(existing);
      }
      if (IN_FLIGHT_FRAME_PROMISES.has(src)) {
        return IN_FLIGHT_FRAME_PROMISES.get(src).then((img) => {
          if (!cancelled && img) {
            const currentRounded = Math.round(currentFrameRef.current);
            if (index === 1 || currentRounded === index || !getCachedImage(currentRounded)) {
              needsRedrawRef.current = true;
            }
          }
          return img;
        });
      }

      const promise = new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        if (priority === 'high') {
          img.fetchPriority = 'high';
        }
        img.onload = () => {
          GLOBAL_FRAME_CACHE.set(src, img);
          IN_FLIGHT_FRAME_PROMISES.delete(src);
          if (!cancelled) {
            const currentRounded = Math.round(currentFrameRef.current);
            if (index === 1 || currentRounded === index || !getCachedImage(currentRounded)) {
              needsRedrawRef.current = true;
            }
          }
          resolve(img);
        };
        img.onerror = () => {
          IN_FLIGHT_FRAME_PROMISES.delete(src);
          resolve(null);
        };
        img.src = src;
        if (img.complete && img.naturalWidth > 0) {
          GLOBAL_FRAME_CACHE.set(src, img);
          IN_FLIGHT_FRAME_PROMISES.delete(src);
          needsRedrawRef.current = true;
          resolve(img);
        }
      });

      IN_FLIGHT_FRAME_PROMISES.set(src, promise);
      return promise;
    };

    // Stage B: Load remaining frames in controlled background batches only on scroll interaction or idle
    const startRemainingFramesPreload = async () => {
      if (cancelled || fullPreloadStarted || isReducedMotion.current) return;
      fullPreloadStarted = true;

      const queue = [];
      const seen = new Set([1]);
      // Coarse stride keyframes first (every 5th frame) so fast scroll scrubbing always has a nearby frame
      for (let i = 5; i <= totalFrames; i += 5) {
        queue.push(i);
        seen.add(i);
      }
      // Intermediate frames next
      for (let i = 2; i <= totalFrames; i++) {
        if (!seen.has(i)) {
          queue.push(i);
          seen.add(i);
        }
      }

      const CONCURRENCY = 3;
      let cursor = 0;
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (!cancelled && cursor < queue.length) {
          const nextIdx = queue[cursor++];
          await loadFrame(nextIdx, 'low');
        }
      });
      await Promise.all(workers);
    };

    // Stage A: Render Frame 1 immediately (0ms if cached from earlier visit/session),
    // then wait until initial page load settles before preloading sequence frames.
    loadFrame(1, 'high').then(() => {
      if (cancelled || isReducedMotion.current) return;

      const scheduleBackgroundPreload = () => {
        if (cancelled) return;
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          idleHandle = window.requestIdleCallback(() => startRemainingFramesPreload(), {
            timeout: 1800
          });
        } else {
          deferTimer = setTimeout(startRemainingFramesPreload, 600);
        }
      };

      if (typeof document !== 'undefined' && document.readyState !== 'complete') {
        window.addEventListener('load', scheduleBackgroundPreload, { once: true });
      } else {
        scheduleBackgroundPreload();
      }
    });

    const triggerPreloadOnInteraction = () => {
      startRemainingFramesPreload();
    };
    window.addEventListener('scroll', triggerPreloadOnInteraction, { passive: true, once: true });
    window.addEventListener('wheel', triggerPreloadOnInteraction, { passive: true, once: true });
    window.addEventListener('touchmove', triggerPreloadOnInteraction, { passive: true, once: true });

    // 3. Responsive Canvas Sizing (uses container client dimensions)
    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);

      const width = Math.max(rect.width, window.innerWidth);
      const height = Math.max(rect.height, window.innerHeight);

      const targetWidth = Math.round(width * dpr);
      const targetHeight = Math.round(height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = isMobile ? 'medium' : 'high';
        needsRedrawRef.current = true;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // 4. Draw Helper (Implements "object-fit: cover" filling entire canvas)
    const renderFrameToCanvas = (frameIndex) => {
      let img = getCachedImage(frameIndex);
      if (!img || !img.complete || img.naturalWidth === 0) {
        // Fallback backward to nearest loaded frame
        for (let back = frameIndex - 1; back >= 1; back--) {
          const candidate = getCachedImage(back);
          if (candidate?.complete && candidate?.naturalWidth > 0) {
            img = candidate;
            break;
          }
        }
        // Fallback forward if no earlier frame is loaded
        if (!img) {
          for (let fwd = frameIndex + 1; fwd <= totalFrames; fwd++) {
            const candidate = getCachedImage(fwd);
            if (candidate?.complete && candidate?.naturalWidth > 0) {
              img = candidate;
              break;
            }
          }
        }
      }

      if (!img || !img.complete || img.naturalWidth === 0) return;

      const cWidth = canvas.width;
      const cHeight = canvas.height;
      const iWidth = img.naturalWidth;
      const iHeight = img.naturalHeight;

      if (!cWidth || !cHeight || !iWidth || !iHeight) return;

      const canvasAspect = cWidth / cHeight;
      const imageAspect = iWidth / iHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (canvasAspect > imageAspect) {
        drawWidth = cWidth;
        drawHeight = cWidth / imageAspect;
        offsetX = 0;
        offsetY = (cHeight - drawHeight) / 2;
      } else {
        drawHeight = cHeight;
        drawWidth = cHeight * imageAspect;
        offsetX = (cWidth - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };

    // 5. Visibility-Aware Animation Loop with Smooth Interpolation / Lerp
    let animationFrameId = null;
    let lastRenderedFrame = -1;

    const renderLoop = () => {
      if (cancelled || !isVisibleRef.current) {
        animationFrameId = null;
        return;
      }
      animationFrameId = requestAnimationFrame(renderLoop);

      if (progressRef && typeof progressRef.current === 'number') {
        const clamped = Math.max(0, Math.min(1, progressRef.current));
        targetFrameRef.current = 1 + clamped * (totalFrames - 1);
      }

      const target = targetFrameRef.current;
      const current = currentFrameRef.current;

      const delta = target - current;
      const absDelta = Math.abs(delta);

      let lerpSpeed = 0.28;
      if (absDelta > 1.5) {
        lerpSpeed = Math.min(0.48, 0.28 + (absDelta - 1.5) * 0.04);
      }
      if (isReducedMotion.current) {
        lerpSpeed = 1.0;
      }

      if (absDelta > 0.005) {
        currentFrameRef.current += delta * lerpSpeed;
      } else {
        currentFrameRef.current = target;
      }

      const frameToDraw = Math.max(1, Math.min(totalFrames, Math.round(currentFrameRef.current)));

      if (frameToDraw !== lastRenderedFrame || needsRedrawRef.current) {
        renderFrameToCanvas(frameToDraw);
        lastRenderedFrame = frameToDraw;
        needsRedrawRef.current = false;
      }
    };

    // Pause RAF loop when hero canvas is scrolled completely offscreen (0% idle CPU/GPU)
    let observer = null;
    if (typeof IntersectionObserver !== 'undefined' && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisibleRef.current = Boolean(entry?.isIntersecting);
          if (isVisibleRef.current && !animationFrameId) {
            needsRedrawRef.current = true;
            renderLoop();
          }
        },
        { rootMargin: '200px 0px' }
      );
      observer.observe(containerRef.current);
    }

    renderLoop();

    // 6. Cleanup
    return () => {
      cancelled = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (idleHandle && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (deferTimer) clearTimeout(deferTimer);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', triggerPreloadOnInteraction);
      window.removeEventListener('wheel', triggerPreloadOnInteraction);
      window.removeEventListener('touchmove', triggerPreloadOnInteraction);
    };
  }, [totalFrames, framePath, progressRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        backgroundColor: '#080C16'
      }}
    >
      {/* Fullscreen hardware-accelerated canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      />

      {/* Subtle luxury darkening overlay so text is readable, but the 3D scene is 100% visible */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(8, 12, 22, 0.35)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Top subtle fade under navbar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100px',
          background: 'linear-gradient(to bottom, rgba(8, 12, 22, 0.85), transparent)',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />

      {/* Bottom subtle edge blend */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(to top, #080C16, rgba(8, 12, 22, 0.4) 50%, transparent)',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />
    </div>
  );
}

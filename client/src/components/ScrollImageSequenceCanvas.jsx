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
export default function ScrollImageSequenceCanvas({
  scrollProgress = 0, // 0.0 to 1.0 (fallback if progressRef not provided)
  progressRef = null, // Optional ref { current: 0..1 } for zero-re-render parent updates
  totalFrames = 70,
  framePath = (i) => `/frames/ezgif-frame-${String(i).padStart(3, '0')}.webp`
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imagesCache = useRef([]);
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

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      isReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // 1. Progressive Batched Image Preloading (prevents network saturation & main-thread decode jank)
    const loadFrame = (index, priority = 'auto') =>
      new Promise((resolve) => {
        if (cancelled || imagesCache.current[index]) {
          resolve();
          return;
        }
        const img = new Image();
        img.decoding = 'async';
        if (priority === 'high') {
          img.fetchPriority = 'high';
        }
        img.onload = () => {
          if (!cancelled) {
            imagesCache.current[index] = img;
            const currentRounded = Math.round(currentFrameRef.current);
            if (index === 1 || currentRounded === index || !imagesCache.current[currentRounded]) {
              needsRedrawRef.current = true;
            }
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = framePath(index);
        if (img.complete && img.naturalWidth > 0) {
          imagesCache.current[index] = img;
          needsRedrawRef.current = true;
          resolve();
        }
      });

    // Prioritize Frame 1 immediately, then stride keyframes (every 5th frame), then remaining frames in small batches
    const preloadSequence = async () => {
      await loadFrame(1, 'high');
      if (cancelled) return;

      const queue = [];
      const seen = new Set([1]);
      for (let i = 5; i <= totalFrames; i += 5) {
        queue.push(i);
        seen.add(i);
      }
      for (let i = 2; i <= totalFrames; i++) {
        if (!seen.has(i)) {
          queue.push(i);
          seen.add(i);
        }
      }

      const CONCURRENCY = 5;
      let cursor = 0;
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (!cancelled && cursor < queue.length) {
          const nextIdx = queue[cursor++];
          await loadFrame(nextIdx);
        }
      });
      await Promise.all(workers);
    };

    preloadSequence();

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
      let img = imagesCache.current[frameIndex];
      if (!img || !img.complete || img.naturalWidth === 0) {
        // Fallback backward to nearest loaded frame
        for (let back = frameIndex - 1; back >= 1; back--) {
          if (imagesCache.current[back]?.complete && imagesCache.current[back]?.naturalWidth > 0) {
            img = imagesCache.current[back];
            break;
          }
        }
        // Fallback forward if no earlier frame is loaded
        if (!img) {
          for (let fwd = frameIndex + 1; fwd <= totalFrames; fwd++) {
            if (imagesCache.current[fwd]?.complete && imagesCache.current[fwd]?.naturalWidth > 0) {
              img = imagesCache.current[fwd];
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
      if (observer) observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
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

import React, { useEffect, useRef } from 'react';

/**
 * High-Performance Scroll-Linked Image Sequence Canvas
 * - Preloads frames progressively (starting with frame 1)
 * - Map scroll progress directly to frame index (1 to totalFrames)
 * - Persistent requestAnimationFrame loop with smooth lerping
 * - Full retina / DPR support
 * - Aspect ratio preserved with responsive "cover" scaling
 * - Respects prefers-reduced-motion
 * - Zero flicker, jumps, or layout shifts
 */
export default function ScrollImageSequenceCanvas({
  scrollProgress = 0, // 0.0 to 1.0
  totalFrames = 70,
  framePath = (i) => `/frames/ezgif-frame-${String(i).padStart(3, '0')}.webp`,
  className = 'w-full h-full'
}) {
  const canvasRef = useRef(null);
  const imagesCache = useRef([]);
  const targetFrameRef = useRef(1);
  const currentFrameRef = useRef(1);
  const needsRedrawRef = useRef(true);
  const isReducedMotion = useRef(false);

  // Update target frame whenever scroll progress changes
  useEffect(() => {
    const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
    const target = 1 + clampedProgress * (totalFrames - 1);
    targetFrameRef.current = target;
  }, [scrollProgress, totalFrames]);

  // Main setup: preloading, animation loop, and resize management
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      isReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // 1. Progressive Image Preloading
    // Frame 1 is prioritized for instant initial render
    const frame1 = new Image();
    frame1.src = framePath(1);
    frame1.onload = () => {
      imagesCache.current[1] = frame1;
      needsRedrawRef.current = true;
    };

    // Load remaining frames in sequence without blocking the main thread
    let idlePreloadId;
    const preloadRest = () => {
      for (let i = 2; i <= totalFrames; i++) {
        const img = new Image();
        img.src = framePath(i);
        img.onload = () => {
          imagesCache.current[i] = img;
          const currentRounded = Math.round(currentFrameRef.current);
          if (currentRounded === i) {
            needsRedrawRef.current = true;
          }
        };
      }
    };

    if ('requestIdleCallback' in window) {
      idlePreloadId = window.requestIdleCallback(preloadRest, { timeout: 1500 });
    } else {
      setTimeout(preloadRest, 50);
    }

    // 2. Responsive Canvas Sizing (with Retina DPR support)
    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const targetWidth = Math.round(rect.width * dpr);
      const targetHeight = Math.round(rect.height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        needsRedrawRef.current = true;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // 3. Draw Helper (Implements "object-fit: cover" without aspect distortion)
    const renderFrameToCanvas = (frameIndex) => {
      // Find requested frame or fallback to nearest loaded frame
      let img = imagesCache.current[frameIndex];
      if (!img || !img.complete || img.naturalWidth === 0) {
        // Fallback search backwards
        for (let back = frameIndex - 1; back >= 1; back--) {
          if (imagesCache.current[back]?.complete && imagesCache.current[back]?.naturalWidth > 0) {
            img = imagesCache.current[back];
            break;
          }
        }
        // Fallback search forwards if not found
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

      // Aspect ratio comparison for cover
      const canvasAspect = cWidth / cHeight;
      const imageAspect = iWidth / iHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (canvasAspect > imageAspect) {
        // Canvas is wider than image
        drawWidth = cWidth;
        drawHeight = cWidth / imageAspect;
        offsetX = 0;
        offsetY = (cHeight - drawHeight) / 2;
      } else {
        // Canvas is taller than image
        drawHeight = cHeight;
        drawWidth = cHeight * imageAspect;
        offsetX = (cWidth - drawWidth) / 2;
        offsetY = 0;
      }

      // Clear with background color and draw image
      ctx.fillStyle = '#080C16';
      ctx.fillRect(0, 0, cWidth, cHeight);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };

    // 4. Persistent Animation Loop with Smooth Interpolation / Lerp
    let animationFrameId;
    let lastRenderedFrame = -1;

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);

      const target = targetFrameRef.current;
      const current = currentFrameRef.current;

      // Smooth easing toward target frame (or instant if reduced motion requested)
      const lerpSpeed = isReducedMotion.current ? 1.0 : 0.14;
      const delta = target - current;

      if (Math.abs(delta) > 0.005) {
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

    renderLoop();

    // 5. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (idlePreloadId && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idlePreloadId);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [totalFrames, framePath]);

  return (
    <div className={`relative overflow-hidden bg-[#080C16] ${className}`}>
      {/* Hardware-accelerated canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block object-cover select-none"
        style={{ willChange: 'transform' }}
      />

      {/* Seamless luxury vignette & gradient edge blending (zero visible borders) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080C16]/85 via-transparent to-[#080C16] pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080C16]/75 via-transparent to-[#080C16]/75 pointer-events-none z-10" />
    </div>
  );
}

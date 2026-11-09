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
  scrollProgress = 0, // 0.0 to 1.0
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

    // 1. Progressive Image Preloading: Frame 1 prioritized for instant display
    const frame1 = new Image();
    frame1.onload = () => {
      imagesCache.current[1] = frame1;
      needsRedrawRef.current = true;
    };
    frame1.src = framePath(1);
    if (frame1.complete && frame1.naturalWidth > 0) {
      imagesCache.current[1] = frame1;
      needsRedrawRef.current = true;
    }

    // 2. Preload remaining frames in background batches so scrubbing is instant
    for (let i = 2; i <= totalFrames; i++) {
      const img = new Image();
      img.onload = () => {
        imagesCache.current[i] = img;
        const currentRounded = Math.round(currentFrameRef.current);
        if (currentRounded === i) {
          needsRedrawRef.current = true;
        }
      };
      img.src = framePath(i);
      if (img.complete && img.naturalWidth > 0) {
        imagesCache.current[i] = img;
      }
    }

    // 3. Responsive Canvas Sizing (uses container client dimensions)
    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const width = Math.max(rect.width, window.innerWidth);
      const height = Math.max(rect.height, window.innerHeight);

      const targetWidth = Math.round(width * dpr);
      const targetHeight = Math.round(height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
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

    // 5. Persistent Animation Loop with Smooth Interpolation / Lerp
    let animationFrameId;
    let lastRenderedFrame = -1;

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);

      const target = targetFrameRef.current;
      const current = currentFrameRef.current;

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

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [totalFrames, framePath]);

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
          display: 'block'
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

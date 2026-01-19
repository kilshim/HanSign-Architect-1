import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Point, Stroke, DrawingOptions } from '../types';
import { getDistance, getVelocity, lerp, getMidPoint } from '../utils/geometry';

interface SignaturePadProps {
  options: DrawingOptions;
  onInteractStart?: () => void;
  onInteractEnd?: () => void;
  width?: number;
  height?: number;
}

export interface SignaturePadHandle {
  clear: () => void;
  replay: () => void;
  download: (format: 'png' | 'svg') => void;
  isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(({ options, onInteractStart, onInteractEnd, width, height }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State to store the history of strokes for replay/svg generation
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const lastVelocity = useRef<number>(0);
  const lastWidth = useRef<number>(options.maxWidth);

  // Initialize Canvas with DPI scaling
  const initCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Normalize coordinate system to use css pixels
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    // Set style width/height
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  };

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, []);

  // Re-draw when strokes change (e.g. after clear) or window resize
  useEffect(() => {
    if (strokes.length === 0 && currentStroke.length === 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
         ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      }
    }
  }, [strokes, currentStroke]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    clear: () => {
      setStrokes([]);
      setCurrentStroke([]);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      }
    },
    isEmpty: () => strokes.length === 0 && currentStroke.length === 0,
    replay: () => {
        animateDrawing(strokes);
    },
    download: (format) => {
        if (format === 'png') {
            const canvas = canvasRef.current;
            if (canvas) {
                const link = document.createElement('a');
                link.download = 'signature.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        } else if (format === 'svg') {
            const svgContent = generateSVG(strokes, canvasRef.current?.width || 800, canvasRef.current?.height || 400);
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'signature.svg';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }
    }
  }));

  // --- Drawing Logic ---

  const getPoint = (e: React.PointerEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: Date.now() };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure,
      time: Date.now(),
      pointerType: e.pointerType
    };
  };

  
  // Advanced Drawing with Variable Width Interpolation
  // Hybrid Logic: Use Velocity for Touch/Mouse, Use Pressure for Pen
  const drawCurve = (ctx: CanvasRenderingContext2D, points: Point[]) => {
      if (points.length < 3) return;
      
      const p1 = points[points.length - 3];
      const p2 = points[points.length - 2];
      const p3 = points[points.length - 1];

      const mid1 = getMidPoint(p1, p2);
      const mid2 = getMidPoint(p2, p3);
      
      let targetWidth = options.maxWidth;
      let alpha = 1.0;

      // TOOL SPECIFIC LOGIC
      if (options.tool === 'pencil') {
          // Pencil: Thinner, slight transparency, consistent width
          targetWidth = Math.max(0.5, options.maxWidth * 0.4); 
          alpha = 0.7;
          
          // Add slight jitter for pencil texture effect if we wanted, 
          // but for smooth signatures, simple transparency is better.
      } else if (options.tool === 'calligraphy') {
          // Calligraphy: Extreme dynamics
          const dist = getDistance(p1, p2);
          const velocity = dist / (p2.time - p1.time + 1);
          
          if (p2.pointerType === 'pen') {
              const pressure = p2.pressure || 0.5;
              // High contrast based on pressure
              targetWidth = options.minWidth + (options.maxWidth * 1.5 - options.minWidth) * Math.pow(pressure, 2);
          } else {
              // High contrast based on velocity
              const maxSpeed = 3.5;
              const normalizedSpeed = Math.min(velocity, maxSpeed) / maxSpeed;
              // Fast = very thin, Slow = very thick
              targetWidth = options.maxWidth * 1.5 - (normalizedSpeed * (options.maxWidth * 1.5 - options.minWidth * 0.5));
          }
      } else {
          // Standard Pen
          if (p2.pointerType === 'pen') {
              const pressure = p2.pressure || 0.5;
              targetWidth = options.minWidth + (options.maxWidth - options.minWidth) * pressure;
              targetWidth = targetWidth * 1.1; 
          } else {
              const dist = getDistance(p1, p2);
              const velocity = dist / (p2.time - p1.time + 1); 
              const maxSpeed = 2.5; 
              const normalizedSpeed = Math.min(velocity, maxSpeed) / maxSpeed;
              targetWidth = options.maxWidth - (normalizedSpeed * (options.maxWidth - options.minWidth));
          }
      }
      
      // Smoothing the width transition
      // Pencil needs less smoothing to feel responsive/scratchy, others need more
      const smoothingFactor = options.tool === 'pencil' ? 0.2 : 0.6;
      const width = (lastWidth.current * smoothingFactor) + (targetWidth * (1 - smoothingFactor)); 
      lastWidth.current = width;

      ctx.beginPath();
      ctx.lineWidth = width;
      
      // Handle Color & Opacity
      if (options.tool === 'pencil') {
          // Parse hex to rgba for transparency
          const r = parseInt(options.color.slice(1, 3), 16);
          const g = parseInt(options.color.slice(3, 5), 16);
          const b = parseInt(options.color.slice(5, 7), 16);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
          ctx.strokeStyle = options.color;
      }

      ctx.moveTo(mid1.x, mid1.y);
      ctx.quadraticCurveTo(p2.x, p2.y, mid2.x, mid2.y);
      ctx.stroke();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDrawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    
    const point = getPoint(e);
    lastPoint.current = point;
    setCurrentStroke([point]);
    onInteractStart?.();

    // Reset physics
    lastVelocity.current = 0;
    
    // Initial width guess
    if (options.tool === 'pencil') {
        lastWidth.current = options.maxWidth * 0.5;
    } else if (e.pointerType === 'pen') {
        lastWidth.current = options.minWidth + (options.maxWidth - options.minWidth) * (e.pressure || 0.5);
    } else {
        lastWidth.current = (options.minWidth + options.maxWidth) / 2;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    
    // Prevent default touch actions (scrolling) if strictly inside the canvas
    e.preventDefault(); 
    
    const point = getPoint(e);
    
    // Streamline / Stabilizer logic
    // Pencil has less streamline for raw feeling
    const effectiveStreamline = options.tool === 'pencil' ? options.streamline * 0.5 : options.streamline;

    if (lastPoint.current && effectiveStreamline > 0) {
        point.x = lerp(lastPoint.current.x, point.x, 1 - effectiveStreamline);
        point.y = lerp(lastPoint.current.y, point.y, 1 - effectiveStreamline);
    }

    setCurrentStroke(prev => {
        const newStroke = [...prev, point];
        
        // Render immediately
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
             drawCurve(ctx, newStroke);
        }
        return newStroke;
    });

    lastPoint.current = point;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    setStrokes(prev => [...prev, currentStroke]);
    setCurrentStroke([]);
    lastPoint.current = null;
    onInteractEnd?.();
  };

  // --- Animation Logic ---

  const animateDrawing = (allStrokes: Stroke[]) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      // Clear
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      
      let strokeIdx = 0;
      let pointIdx = 0;
      
      const drawNext = () => {
          if (strokeIdx >= allStrokes.length) return;
          
          const stroke = allStrokes[strokeIdx];
          
          if (pointIdx < stroke.length - 1) {
              const subStroke = stroke.slice(0, pointIdx + 3);
              // Reuse the main draw logic which handles pen vs touch correctly
              // providing the stored pointerType is preserved in stroke data
              drawCurve(ctx, subStroke);
              
              pointIdx++;
              requestAnimationFrame(drawNext);
          } else {
              strokeIdx++;
              pointIdx = 0;
              requestAnimationFrame(drawNext);
          }
      };
      
      drawNext();
  };

  // --- SVG Generator ---
  const generateSVG = (strokes: Stroke[], width: number, height: number): string => {
      const dpr = window.devicePixelRatio || 1;
      const w = width / dpr;
      const h = height / dpr;

      let paths = '';
      
      strokes.forEach(stroke => {
          if (stroke.length < 2) return;
          
          // Generate SVG Path
          let d = `M ${stroke[0].x.toFixed(2)} ${stroke[0].y.toFixed(2)}`;
          
          for (let i = 1; i < stroke.length - 1; i++) {
              const p1 = stroke[i];
              // Simple line-to for SVG export for broad compatibility
              d += ` L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
          }
          d += ` L ${stroke[stroke.length-1].x.toFixed(2)} ${stroke[stroke.length-1].y.toFixed(2)}`;

          // For SVG export, we average the stroke width or use max width
          // since SVG 'stroke-width' is constant per path element usually.
          // To do variable width SVG is very complex (requires filling shapes).
          // We stick to a simple clean stroke for export.
          
          let strokeOpacity = 1;
          let strokeWidth = options.maxWidth;
          
          if (options.tool === 'pencil') {
              strokeOpacity = 0.7;
              strokeWidth = options.maxWidth * 0.5;
          }

          paths += `<path d="${d}" stroke="${options.color}" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${paths}
      </svg>`;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair touch-none select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="block w-full h-full touch-none"
        style={{ touchAction: 'none' }} 
      />
    </div>
  );
});

export default SignaturePad;
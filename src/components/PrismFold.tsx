import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * PrismFold v2 — Majestic Origami Folds
 * Perfectly mimics the reference: thick parallel 3D ribbons,
 * sharp V-crease valleys, sweeping smooth peaks, and correct horizontal gradient.
 */

export type PrismScheme = 'neon' | 'cyber' | 'aurora' | 'sunset';

interface PrismFoldProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: PrismScheme;
}

const PALS = {
  neon: {
    bg: '#04000A',
    fill: '#080112',
    gradStart: '#00F0FF', // Cyan
    gradMid: '#7000FF',   // Deep Purple
    gradEnd: '#FF007F',   // Magenta/Pink
  },
  cyber: {
    bg: '#000810',
    fill: '#010A15',
    gradStart: '#00FF9D', 
    gradMid: '#0055FF',   
    gradEnd: '#D000FF',   
  },
  aurora: {
    bg: '#010A05',
    fill: '#02150D',
    gradStart: '#B7FF00', 
    gradMid: '#00FF88',   
    gradEnd: '#0088FF',   
  },
  sunset: {
    bg: '#0A0300',
    fill: '#150502',
    gradStart: '#FFD700', 
    gradMid: '#FF5500',   
    gradEnd: '#7000FF',   
  }
};

const TAU = Math.PI * 2;

export const PrismFold: React.FC<PrismFoldProps> = ({
  width = 3840, 
  height = 2160, 
  totalFrames = 240, 
  speed = 1, 
  scheme = 'neon'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = PALS[scheme];
  
  const u = (frame / totalFrames) * speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear & Background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    
    // 2. Rotate canvas for diagonal fins
    const angleDeg = -35;
    const angleRad = angleDeg * (Math.PI / 180);
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angleRad);

    // 3. Screen-locked Horizontal Gradient
    // We counteract the rotation so the gradient always flows Left -> Right on the screen
    const w = width * 0.65;
    const gx = Math.cos(-angleRad) * w;
    const gy = Math.sin(-angleRad) * w;
    const grad = ctx.createLinearGradient(-gx, -gy, gx, gy);
    grad.addColorStop(0, pal.gradStart);
    grad.addColorStop(0.5, pal.gradMid);
    grad.addColorStop(1, pal.gradEnd);

    // 4. Grid Config
    const bounds = 3800;
    const stepX = 12; // High resolution for smooth curves
    const stepY = 32; // Spacing between ribbons

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 5. Draw back to front (Painter's Algorithm)
    for (let y = -bounds; y <= bounds; y += stepY) {
      ctx.beginPath();
      
      let first = true;
      for (let x = -bounds; x <= bounds; x += stepX) {
        
        const t = u * TAU;
        
        // --- 3D ORIGAMI FOLD MATH ---
        // Sharp valleys & smooth peaks using absolute sine
        let z = Math.abs(Math.sin(x * 0.0007 - y * 0.0008 + t)) * 700;
        z += Math.abs(Math.sin(x * 0.0011 + y * 0.0006 - t * 0.8)) * 450;
        
        // Majestic sweeping curve
        z -= Math.cos(x * 0.0005 + y * 0.0009 + t * 0.5) * 600;

        // Project Z into Y (Isometric-style height)
        const screenY = y - z;

        if (first) {
          ctx.moveTo(x, screenY);
          first = false;
        } else {
          ctx.lineTo(x, screenY);
        }
      }

      // Mask geometry below the line
      ctx.lineTo(bounds, bounds * 2);
      ctx.lineTo(-bounds, bounds * 2);
      ctx.closePath();

      // Ambient Occlusion Shadow (Makes it look like true 3D overlapping fins)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetY = 15;

      ctx.fillStyle = pal.fill;
      ctx.fill();

      // Reset shadow so the glowing edge stays crisp
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Draw thick glowing edge
      ctx.lineWidth = 18; // Very thick ribbons
      ctx.strokeStyle = grad;
      ctx.stroke();
    }

    ctx.restore();

  }, [frame, width, height, u, pal]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: pal.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

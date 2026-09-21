import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type PastelScheme = 'peach' | 'lavender' | 'mint' | 'sky' | 'rose';

interface PastelDriftProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: PastelScheme;
}

const PI2 = Math.PI * 2;
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const schemes: Record<PastelScheme, { bg: [string, string]; blobs: string[] }> = {
  peach: { bg: ['#FFE8D6', '#FFD6E0'], blobs: ['#FFB88C', '#FF9EBB', '#FFD93D', '#FF8C69'] },
  lavender: { bg: ['#E6E0FF', '#D6ECFF'], blobs: ['#B79CFF', '#9CD6FF', '#FF9ED6', '#8C9EFF'] },
  mint: { bg: ['#D6F5E3', '#E0F5FF'], blobs: ['#8CE8B0', '#8CD6E8', '#E8E88C', '#8CE8D0'] },
  sky: { bg: ['#D6ECFF', '#E6E0FF'], blobs: ['#8CC6FF', '#8CE8FF', '#B88CFF', '#8CFFD6'] },
  rose: { bg: ['#FFD6E0', '#FFE8D6'], blobs: ['#FF9EBB', '#FFB88C', '#D69EFF', '#FF8CA0'] },
};

const PastelDrift: React.FC<PastelDriftProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'peach',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const sc = schemes[scheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = width * 0.5;
    const cy = height * 0.5;

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, sc.bg[0]);
    bgGrad.addColorStop(1, sc.bg[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const NUM_BLOBS = 5;
    for (let i = 0; i < NUM_BLOBS; i++) {
      const h1 = hash(i * 3.7);
      const h2 = hash(i * 9.1 + 50);
      const sp = h1 > 0.5 ? 1 : 2;
      const ph = h2 * PI2;
      const orX = width * (0.22 + h1 * 0.12);
      const orY = height * (0.2 + h2 * 0.12);

      const bx = cx + Math.cos(t * sp + ph) * orX;
      const by = cy + Math.sin(t * sp + ph) * orY;
      const br = Math.min(width, height) * (0.32 + h1 * 0.14 + Math.sin(t * 1 + ph) * 0.05);

      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, sc.blobs[i % sc.blobs.length]);
      g.addColorStop(0.55, sc.blobs[i % sc.blobs.length] + 'CC');
      g.addColorStop(1, sc.blobs[i % sc.blobs.length] + '00');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }

    const sheen = 0.5 + 0.5 * Math.sin(t * 2);
    const sg = ctx.createLinearGradient(0, height, width, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, `rgba(255,255,255,${(0.08 + sheen * 0.08).toFixed(3)})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, width, height);

  }, [frame, width, height, totalFrames, speed, t, sc]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: sc.bg[0] }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { PastelDrift };
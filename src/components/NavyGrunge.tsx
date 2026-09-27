import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type GrungeScheme = 'navy' | 'charcoal' | 'wine' | 'forest' | 'espresso';

interface NavyGrungeProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: GrungeScheme;
}

const SCHEMES: Record<GrungeScheme, { sh: [number, number, number]; hi: [number, number, number]; bg: string }> = {
  navy:     { sh: [6, 10, 24], hi: [36, 56, 102], bg: '#0a1020' },
  charcoal: { sh: [8, 8, 10], hi: [74, 74, 80], bg: '#101012' },
  wine:     { sh: [22, 8, 12], hi: [102, 36, 48], bg: '#1c0a0e' },
  forest:   { sh: [6, 18, 12], hi: [34, 84, 56], bg: '#0a140e' },
  espresso: { sh: [18, 12, 8], hi: [96, 64, 40], bg: '#16100a' },
};

const PI2 = Math.PI * 2;

function hash(n: number) {
  let s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

function noise2d(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + iy * 157);
  const b = hash(ix + 1 + iy * 157);
  const c = hash(ix + (iy + 1) * 157);
  const d = hash(ix + 1 + (iy + 1) * 157);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, oct: number) {
  let v = 0;
  let amp = 0.5;
  let shift = 100;
  for (let i = 0; i < oct; i++) {
    v += amp * noise2d(x, y);
    x = x * 2 + shift;
    y = y * 2 + shift;
    amp *= 0.5;
  }
  return v;
}

const NavyGrunge: React.FC<NavyGrungeProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'navy',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const s = SCHEMES[scheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const S = 0.25;
    const iw = Math.floor(width * S);
    const ih = Math.floor(height * S);
    const imgData = ctx.createImageData(iw, ih);
    const data = imgData.data;

    const tc1 = Math.cos(t * 1) * 0.6;
    const tc2 = Math.sin(t * 1) * 0.6;
    const breathe = 0.5 + 0.5 * Math.sin(t * 1);

    for (let py = 0; py < ih; py++) {
      for (let px = 0; px < iw; px++) {
        const nx = px / iw;
        const ny = py / ih;

        const clouds = fbm(nx * 4 + tc1, ny * 4 + tc2, 5);
        const blotch = fbm(nx * 9 + tc2 * 0.7 + 30, ny * 9 + tc1 * 0.7, 4);
        const fine = noise2d(nx * 40 + tc1 * 2, ny * 40 + tc2 * 2);

        let v = clouds * 0.55 + blotch * 0.35 + fine * 0.1;
        v *= 0.92 + breathe * 0.08;

        const r = s.sh[0] + v * (s.hi[0] - s.sh[0]);
        const g = s.sh[1] + v * (s.hi[1] - s.sh[1]);
        const b = s.sh[2] + v * (s.hi[2] - s.sh[2]);
        const grain = (hash(px * 0.7 + py * 311.3) - 0.5) * 9;

        const idx = (py * iw + px) * 4;
        data[idx] = Math.max(0, Math.min(255, r + grain));
        data[idx + 1] = Math.max(0, Math.min(255, g + grain));
        data[idx + 2] = Math.max(0, Math.min(255, b + grain));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(canvas, 0, 0, iw, ih, 0, 0, width, height);

    ctx.save();
    const vg = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.25, width * 0.5, height * 0.5, height * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(2,4,12,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, s]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: s.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { NavyGrunge };
export type { GrungeScheme };

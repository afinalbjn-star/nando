import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface DiscoPixelProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const BASE: [number, number, number][] = [
  [26, 8, 70], [42, 10, 110], [58, 12, 140], [20, 20, 120],
  [120, 16, 150], [160, 30, 170], [90, 20, 160], [12, 12, 30],
  [200, 60, 120], [60, 20, 180], [30, 10, 90], [140, 40, 180],
];

const SPARKS = [
  { fx: 0.3, fy: 0.18, ph: 0 },
  { fx: 0.55, fy: 0.28, ph: 2.1 },
  { fx: 0.2, fy: 0.66, ph: 4.2 },
  { fx: 0.72, fy: 0.55, ph: 1.2 },
  { fx: 0.45, fy: 0.8, ph: 3.3 },
];

const COLS = 48;
const ROWS = 27;

const DiscoPixel: React.FC<DiscoPixelProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050208';
    ctx.fillRect(0, 0, width, height);

    const cw = width / COLS;
    const ch = height / ROWS;
    const gap = Math.max(2, cw * 0.06);
    const iw = cw - gap;
    const ih = ch - gap;

    const orbX = (0.5 + 0.3 * Math.cos(t * 1)) * width;
    const orbY = (0.3 + 0.2 * Math.sin(t * 1)) * height;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const h = hash(col * 31 + row * 57);
        const base = BASE[Math.floor(h * BASE.length) % BASE.length];

        const wave = Math.sin(col * 0.45 + t * 2) * Math.sin(row * 0.5 - t * 1);
        const twinkle = Math.sin(t * 3 + h * PI2 * 6) * 0.5 + 0.5;

        const x = (col + 0.5) * cw;
        const y = (row + 0.5) * ch;
        const dxo = x - orbX;
        const dyo = y - orbY;
        const warm = Math.exp(-(dxo * dxo + dyo * dyo) / (width * width * 0.03));

        let spark = 0;
        let ray = 0;
        for (let s = 0; s < SPARKS.length; s++) {
          const sp = SPARKS[s];
          const sx = sp.fx * width;
          const sy = sp.fy * height;
          const dx = x - sx;
          const dy = y - sy;
          const d2 = dx * dx + dy * dy;
          const pulse = 0.5 + 0.5 * Math.sin(t * 2 + sp.ph);
          spark += Math.exp(-d2 / (width * width * 0.0012)) * pulse;
          const cross = Math.exp(-Math.abs(dx) / (width * 0.02)) * Math.exp(-Math.abs(dy) / (height * 0.12))
            + Math.exp(-Math.abs(dy) / (height * 0.02)) * Math.exp(-Math.abs(dx) / (width * 0.12));
          ray += cross * pulse * Math.exp(-d2 / (width * width * 0.02));
        }

        const washBL = Math.exp(-((x - width * 0.12) ** 2 + (y - height * 0.92) ** 2) / (width * width * 0.02));
        const washCyan = Math.exp(-((x - width * 0.95) ** 2 + (y - height * 0.97) ** 2) / (width * width * 0.008));

        const bright = clamp(0.55 + wave * 0.3 + twinkle * 0.25, 0, 1.4);

        let r = base[0] * bright;
        let g = base[1] * bright;
        let b = base[2] * bright;

        r += warm * 200;
        g += warm * 110;
        b += warm * 20;

        const sBoost = clamp(spark * 1.2 + ray * 0.8, 0, 1);
        r += sBoost * (255 - r);
        g += sBoost * (255 - g);
        b += sBoost * (255 - b);

        r += washBL * 120; g += washBL * 60; b += washBL * 90;
        r += washCyan * 20; g += washCyan * 150; b += washCyan * 200;

        ctx.fillStyle = `rgb(${Math.floor(clamp(r, 0, 255))},${Math.floor(clamp(g, 0, 255))},${Math.floor(clamp(b, 0, 255))})`;
        ctx.fillRect(col * cw + gap / 2, row * ch + gap / 2, iw, ih);
      }
    }
  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#050208' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { DiscoPixel };
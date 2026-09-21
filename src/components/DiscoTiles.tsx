import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type TilesScheme = 'ocean' | 'crimson' | 'emerald' | 'sunset';

interface DiscoTilesProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: TilesScheme;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

interface SchemeDef {
  bg: string;
  base: [number, number, number][];
  orb: [number, number, number];
  wash1: [number, number, number];
  wash2: [number, number, number];
}

const schemes: Record<TilesScheme, SchemeDef> = {
  ocean: {
    bg: '#020810',
    base: [[8, 30, 70], [10, 50, 110], [12, 70, 140], [10, 40, 120], [30, 90, 150], [8, 20, 50], [60, 120, 170], [20, 60, 130], [40, 100, 160], [12, 26, 60], [90, 140, 190], [24, 80, 150]],
    orb: [200, 160, 60],
    wash1: [120, 180, 255],
    wash2: [20, 200, 220],
  },
  crimson: {
    bg: '#100204',
    base: [[70, 8, 16], [110, 12, 24], [140, 20, 30], [120, 16, 60], [150, 30, 40], [50, 8, 20], [170, 50, 60], [130, 24, 40], [160, 40, 50], [60, 10, 26], [190, 80, 70], [150, 30, 60]],
    orb: [255, 200, 120],
    wash1: [255, 120, 100],
    wash2: [255, 180, 60],
  },
  emerald: {
    bg: '#021008',
    base: [[8, 60, 36], [12, 100, 60], [16, 130, 80], [20, 110, 100], [30, 140, 70], [8, 44, 30], [50, 160, 90], [24, 120, 70], [40, 150, 90], [10, 52, 40], [70, 180, 110], [30, 130, 80]],
    orb: [220, 220, 100],
    wash1: [140, 255, 180],
    wash2: [60, 220, 180],
  },
  sunset: {
    bg: '#100602',
    base: [[80, 30, 8], [130, 50, 12], [160, 70, 16], [140, 60, 60], [170, 80, 30], [56, 20, 8], [180, 100, 40], [150, 66, 24], [170, 90, 40], [60, 24, 10], [190, 120, 60], [160, 76, 40]],
    orb: [120, 200, 255],
    wash1: [255, 200, 120],
    wash2: [255, 120, 200],
  },
};

const SPARKS = [
  { fx: 0.3, fy: 0.18, ph: 0 },
  { fx: 0.55, fy: 0.28, ph: 2.1 },
  { fx: 0.2, fy: 0.66, ph: 4.2 },
  { fx: 0.72, fy: 0.55, ph: 1.2 },
  { fx: 0.45, fy: 0.8, ph: 3.3 },
];

const COLS = 48;
const ROWS = 27;

const DiscoTiles: React.FC<DiscoTilesProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'ocean',
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

    ctx.fillStyle = sc.bg;
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
        const base = sc.base[Math.floor(h * sc.base.length) % sc.base.length];

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

        r += warm * sc.orb[0];
        g += warm * sc.orb[1];
        b += warm * sc.orb[2];

        const sBoost = clamp(spark * 1.2 + ray * 0.8, 0, 1);
        r += sBoost * (255 - r);
        g += sBoost * (255 - g);
        b += sBoost * (255 - b);

        r += washBL * sc.wash1[0] * 0.5; g += washBL * sc.wash1[1] * 0.5; b += washBL * sc.wash1[2] * 0.5;
        r += washCyan * sc.wash2[0] * 0.6; g += washCyan * sc.wash2[1] * 0.6; b += washCyan * sc.wash2[2] * 0.6;

        ctx.fillStyle = `rgb(${Math.floor(clamp(r, 0, 255))},${Math.floor(clamp(g, 0, 255))},${Math.floor(clamp(b, 0, 255))})`;
        ctx.fillRect(col * cw + gap / 2, row * ch + gap / 2, iw, ih);
      }
    }
  }, [frame, width, height, totalFrames, speed, t, sc]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: sc.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { DiscoTiles };
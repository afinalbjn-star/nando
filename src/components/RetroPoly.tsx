import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type PolyScheme = 'sunset' | 'candy' | 'wave' | 'pop' | 'mint' | 'dusk';

interface RetroPolyProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: PolyScheme;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const schemes: Record<PolyScheme, string[]> = {
  sunset: ['#FF5A5F', '#FF9F1C', '#FFD23F', '#06D6A0', '#118AB2', '#EF476F', '#F78C6B', '#073B4C'],
  candy: ['#FF2E93', '#00E5FF', '#FFE135', '#7C4DFF', '#00E676', '#FF6D00', '#304FFE', '#FF80AB'],
  wave: ['#00838F', '#00ACC1', '#FF6F00', '#FFC400', '#6A1B9A', '#AB47BC', '#004D40', '#FF3D00'],
  pop: ['#D62828', '#F77F00', '#FCBF49', '#3A86FF', '#8338EC', '#FF006E', '#06D6A0', '#FFBE0B'],
  mint: ['#80ED99', '#FF9F1C', '#FFCF56', '#4ECDC4', '#FF6B6B', '#A8E6CF', '#FFD3B6', '#FFAAA5'],
  dusk: ['#2B2D42', '#8D99AE', '#EF233C', '#F4A259', '#5E60CE', '#64DFDF', '#FF595E', '#1982C4'],
};

const COLS = 12;
const ROWS = 8;

const RetroPoly: React.FC<RetroPolyProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'sunset',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const palette = schemes[scheme].map(hexRgb);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = width / COLS;
    const ch = height / ROWS;
    const amp = Math.min(cw, ch) * 0.28;

    const px: number[][] = [];
    const py: number[][] = [];
    for (let j = 0; j <= ROWS + 2; j++) {
      px[j] = [];
      py[j] = [];
      for (let i = 0; i <= COLS + 2; i++) {
        const jx = (hash(i * 17 + j * 91) - 0.5) * cw * 0.7;
        const jy = (hash(i * 43 + j * 57 + 500) - 0.5) * ch * 0.7;
        const bx = (i - 1) * cw + jx;
        const by = (j - 1) * ch + jy;

        const dirX = hash(i * 31 + j * 77 + 100) > 0.5 ? 1 : -1;
        const dirY = hash(i * 13 + j * 37 + 200) > 0.5 ? 1 : -1;
        const spX = hash(i * 7 + j * 11 + 300) > 0.5 ? 1 : 2;
        const spY = hash(i * 5 + j * 19 + 400) > 0.5 ? 2 : 1;
        const phX = hash(i * 3 + j * 23 + 500) * PI2;
        const phY = hash(i * 29 + j * 41 + 600) * PI2;

        px[j][i] = bx + dirX * amp * Math.sin(t * spX + phX);
        py[j][i] = by + dirY * amp * Math.sin(t * spY + phY);
      }
    }

    const drawTri = (
      ax: number, ay: number, bx: number, by: number,
      cx: number, cy: number, seed: number,
    ) => {
      const col = palette[Math.floor(hash(seed) * palette.length) % palette.length];
      const pulse = 0.88 + 0.12 * Math.sin(t * 2 + hash(seed + 999) * PI2);
      const r = Math.floor(clamp(col[0] * pulse, 0, 255));
      const g = Math.floor(clamp(col[1] * pulse, 0, 255));
      const b = Math.floor(clamp(col[2] * pulse, 0, 255));
      const fill = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    let seed = 0;
    for (let j = 0; j < ROWS + 2; j++) {
      for (let i = 0; i < COLS + 2; i++) {
        const x00 = px[j][i]; const y00 = py[j][i];
        const x10 = px[j][i + 1]; const y10 = py[j][i + 1];
        const x01 = px[j + 1][i]; const y01 = py[j + 1][i];
        const x11 = px[j + 1][i + 1]; const y11 = py[j + 1][i + 1];
        drawTri(x00, y00, x10, y10, x11, y11, seed++);
        drawTri(x00, y00, x11, y11, x01, y01, seed++);
      }
    }
  }, [frame, width, height, totalFrames, speed, t, palette]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#111' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { RetroPoly };
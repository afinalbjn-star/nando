import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type ChromeScheme = 'chrome' | 'gold' | 'rose' | 'ocean' | 'emerald';

interface LiquidChromeProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: ChromeScheme;
}

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
  let a = 0.5;
  let shift = 100;
  for (let i = 0; i < oct; i++) {
    v += a * noise2d(x, y);
    x = x * 2 + shift;
    y = y * 2 + shift;
    a *= 0.5;
  }
  return v;
}

function domainWarp(x: number, y: number, t: number) {
  const qx = fbm(x + 0.0, y + 0.0, 4);
  const qy = fbm(x + 5.2, y + 1.3, 4);
  const rx = fbm(x + 4.0 * qx + 1.7 + t * 0.3, y + 4.0 * qy + 9.2 + t * 0.2, 4);
  const ry = fbm(x + 4.0 * qx + 8.3 + t * 0.2, y + 4.0 * qy + 2.8 + t * 0.15, 4);
  return fbm(x + 4.0 * rx, y + 4.0 * ry, 5);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const SCHEMES: Record<ChromeScheme, { rMul: number; gMul: number; bMul: number; glowR: number; glowG: number; glowB: number; bg: string }> = {
  chrome:  { rMul: 1.0, gMul: 1.02, bMul: 1.08, glowR: 200, glowG: 210, glowB: 230, bg: '#1a1a1a' },
  gold:    { rMul: 1.15, gMul: 0.95, bMul: 0.7, glowR: 255, glowG: 200, glowB: 100, bg: '#1a1408' },
  rose:    { rMul: 1.12, gMul: 0.88, bMul: 0.95, glowR: 255, glowG: 150, glowB: 180, bg: '#1a0e14' },
  ocean:   { rMul: 0.85, gMul: 0.98, bMul: 1.15, glowR: 120, glowG: 180, glowB: 255, bg: '#0e141a' },
  emerald: { rMul: 0.88, gMul: 1.1, bMul: 0.95, glowR: 100, glowG: 220, glowB: 160, bg: '#0e1a12' },
};

const LiquidChrome: React.FC<LiquidChromeProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'chrome',
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

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const tc1 = Math.cos(t);
    const tc2 = Math.sin(t);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const nx = px / width * 5;
        const ny = py / height * 5;

        const warp1 = domainWarp(nx, ny, tc1);
        const warp2 = domainWarp(nx + 50, ny + 50, tc2);
        const val = domainWarp(nx + warp1 * 2.5, ny + warp2 * 2.5, tc1 * 0.4);

        const fold1 = Math.sin(val * 8 + warp1 * 4);
        const fold2 = Math.sin(val * 12 + warp2 * 3);
        const fold3 = Math.cos(val * 6 + warp1 * 2 + warp2 * 2);

        const combined = (fold1 + fold2 + fold3) / 3;

        const chrome = combined * 0.5 + 0.5;

        const sharp1 = smoothstep(0.3, 0.7, chrome);
        const sharp2 = Math.pow(chrome, 0.8);
        const sharp3 = Math.pow(Math.abs(Math.sin(chrome * Math.PI * 3)), 0.3);

        const edge = Math.abs(Math.sin(val * 15));
        const edgeHL = Math.pow(edge, 6) * 0.4;

        const base = sharp1 * 0.4 + sharp2 * 0.35 + sharp3 * 0.25;
        const final = base + edgeHL;

        const v = Math.min(1, Math.max(0, final));
        const gray = Math.floor(v * 255);

        const idx = (py * width + px) * 4;
        data[idx] = Math.min(255, gray * s.rMul);
        data[idx + 1] = Math.min(255, gray * s.gMul);
        data[idx + 2] = Math.min(255, gray * s.bMul);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.5);
    glow.addColorStop(0, 'rgba(' + s.glowR + ',' + s.glowG + ',' + s.glowB + ',' + (0.03 + pulse * 0.02).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

  }, [frame, width, height, totalFrames, speed, t, s]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: s.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { LiquidChrome };
export type { ChromeScheme };

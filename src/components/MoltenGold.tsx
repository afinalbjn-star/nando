import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type MoltenScheme = 'gold' | 'silver' | 'copper' | 'ocean' | 'crimson';

interface MoltenGoldProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: MoltenScheme;
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

interface ColorStop { pos: number; r: number; g: number; b: number; }

const PALETTES: Record<MoltenScheme, { stops: ColorStop[]; bg: string; glowR: number; glowG: number; glowB: number }> = {
  gold: {
    stops: [
      { pos: 0.85, r: 255, g: 220, b: 60 },
      { pos: 0.6, r: 220, g: 160, b: 30 },
      { pos: 0.35, r: 160, g: 90, b: 15 },
      { pos: 0.1, r: 50, g: 20, b: 5 },
    ],
    bg: '#1a0a00', glowR: 255, glowG: 200, glowB: 50,
  },
  silver: {
    stops: [
      { pos: 0.85, r: 240, g: 245, b: 255 },
      { pos: 0.6, r: 180, g: 190, b: 210 },
      { pos: 0.35, r: 100, g: 110, b: 130 },
      { pos: 0.1, r: 25, g: 30, b: 45 },
    ],
    bg: '#0a0c14', glowR: 180, glowG: 200, glowB: 255,
  },
  copper: {
    stops: [
      { pos: 0.85, r: 255, g: 140, b: 80 },
      { pos: 0.6, r: 200, g: 90, b: 50 },
      { pos: 0.35, r: 140, g: 50, b: 30 },
      { pos: 0.1, r: 45, g: 15, b: 10 },
    ],
    bg: '#140804', glowR: 255, glowG: 130, glowB: 70,
  },
  ocean: {
    stops: [
      { pos: 0.85, r: 50, g: 220, b: 255 },
      { pos: 0.6, r: 30, g: 150, b: 200 },
      { pos: 0.35, r: 15, g: 80, b: 130 },
      { pos: 0.1, r: 5, g: 20, b: 40 },
    ],
    bg: '#020a10', glowR: 40, glowG: 180, glowB: 255,
  },
  crimson: {
    stops: [
      { pos: 0.85, r: 255, g: 50, b: 100 },
      { pos: 0.6, r: 200, g: 30, b: 70 },
      { pos: 0.35, r: 130, g: 15, b: 40 },
      { pos: 0.1, r: 40, g: 5, b: 15 },
    ],
    bg: '#100206', glowR: 255, glowG: 40, glowB: 90,
  },
};

function samplePalette(stops: ColorStop[], val: number) {
  const s = Math.max(0, Math.min(1, val));
  for (let i = 0; i < stops.length - 1; i++) {
    if (s >= stops[i + 1].pos) {
      const t = (s - stops[i + 1].pos) / (stops[i].pos - stops[i + 1].pos);
      return {
        r: stops[i + 1].r + (stops[i].r - stops[i + 1].r) * t,
        g: stops[i + 1].g + (stops[i].g - stops[i + 1].g) * t,
        b: stops[i + 1].b + (stops[i].b - stops[i + 1].b) * t,
      };
    }
  }
  return { r: stops[stops.length - 1].r, g: stops[stops.length - 1].g, b: stops[stops.length - 1].b };
}

const MoltenGold: React.FC<MoltenGoldProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'gold',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const pal = PALETTES[scheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const timeCircle = Math.cos(t);
    const timeCircle2 = Math.sin(t);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const nx = px / width * 6;
        const ny = py / height * 6;

        const warp1 = domainWarp(nx, ny, timeCircle);
        const warp2 = domainWarp(nx + 100, ny + 100, timeCircle2);
        const val = domainWarp(nx + warp1 * 2, ny + warp2 * 2, timeCircle * 0.5);

        const edge = Math.abs(Math.sin(val * 12));
        const sharp = Math.pow(edge, 0.4);

        const c = samplePalette(pal.stops, sharp);
        const idx = (py * width + px) * 4;
        data[idx] = Math.min(255, c.r);
        data[idx + 1] = Math.min(255, c.g);
        data[idx + 2] = Math.min(255, c.b);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.5);
    glow.addColorStop(0, 'rgba(' + pal.glowR + ',' + pal.glowG + ',' + pal.glowB + ',' + (0.06 + pulse * 0.04).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

  }, [frame, width, height, totalFrames, speed, t, pal]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: pal.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { MoltenGold };
export type { MoltenScheme };

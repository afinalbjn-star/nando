import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type LiquidScheme = 'silver' | 'copper' | 'ocean' | 'rose';

interface LiquidMetalProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: LiquidScheme;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function noise2d(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = noise2d(ix, iy);
  const n10 = noise2d(ix + 1, iy);
  const n01 = noise2d(ix, iy + 1);
  const n11 = noise2d(ix + 1, iy + 1);
  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

function fbm(x: number, y: number, octaves: number): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

interface Ramp { bg: string; s: number[]; m: number[]; h: number[]; w: number[]; }

const schemes: Record<LiquidScheme, Ramp> = {
  silver: { bg: '#0a0a0c', s: [26, 28, 34], m: [150, 155, 170], h: [235, 240, 250], w: [255, 255, 255] },
  copper: { bg: '#0d0503', s: [46, 18, 8], m: [200, 100, 50], h: [255, 180, 120], w: [255, 240, 225] },
  ocean:  { bg: '#020a0d', s: [8, 30, 44], m: [30, 130, 180], h: [120, 220, 255], w: [235, 250, 255] },
  rose:   { bg: '#0d0406', s: [52, 22, 30], m: [210, 110, 130], h: [255, 190, 205], w: [255, 242, 245] },
};

const LW = 512;
const LH = 288;
const COS_R = 0.9063;
const SIN_R = 0.4226;

const LiquidMetal: React.FC<LiquidMetalProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'silver',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const sc = schemes[scheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!bufRef.current) {
      bufRef.current = document.createElement('canvas');
      bufRef.current.width = LW;
      bufRef.current.height = LH;
    }
    const buf = bufRef.current;
    const bctx = buf.getContext('2d');
    if (!bctx) return;

    const ct1 = Math.cos(t * 1);
    const st1 = Math.sin(t * 1);
    const ct2 = Math.cos(t * 2);
    const st2 = Math.sin(t * 2);

    const imgData = bctx.createImageData(LW, LH);
    const data = imgData.data;

    for (let py = 0; py < LH; py++) {
      for (let px = 0; px < LW; px++) {
        const nx = (px / LW) * 2.2;
        const ny = (py / LH) * 2.2;

        const rx = nx * COS_R - ny * SIN_R;
        const ry = nx * SIN_R + ny * COS_R;
        const u = rx * 1.1;
        const v = ry * 1.8;

        const warpX = fbm(u + 0.9 * ct1, v + 0.9 * st1, 3);
        const warpY = fbm(u + 5.2 + 0.9 * ct1, v + 1.3 + 0.9 * st1, 3);

        const f1 = fbm(u + warpX * 1.2 + 0.45 * ct2, v + warpY * 1.2 + 0.45 * st2, 3);
        const ridge = 1 - Math.abs(f1 * 2 - 1);
        const fold = Math.pow(ridge, 2);
        const hotLine = Math.pow(ridge, 8);

        const f2 = fbm(u * 0.5 + warpY * 1.0 + 0.3 * ct1, v * 0.5 + warpX * 1.0 + 0.3 * st1, 3);
        const flowBand = Math.sin(u * 1.2 + warpX * 3 + ct1 * 2.2) * 0.5 + 0.5;

        const base = clamp(f2 * 0.65 + fold * 0.25 + flowBand * 0.1, 0, 1);

        const e = 0.04;
        const gx1 = fbm(u + e + warpX * 2 + 0.45 * ct2, v + warpY * 2 + 0.45 * st2, 3);
        const gx0 = fbm(u - e + warpX * 2 + 0.45 * ct2, v + warpY * 2 + 0.45 * st2, 3);
        const gy1 = fbm(u + warpX * 2 + 0.45 * ct2, v + e + warpY * 2 + 0.45 * st2, 3);
        const gy0 = fbm(u + warpX * 2 + 0.45 * ct2, v - e + warpY * 2 + 0.45 * st2, 3);
        const slope = clamp((gx1 - gx0) * 14 + (gy1 - gy0) * 10 + 0.5, 0, 1);
        const spec = Math.pow(slope, 3);

        const bright = clamp(base * 0.55 + spec * 0.35 + hotLine * 0.5, 0, 1);
        const curved = bright * bright * (3 - 2 * bright);

        let r: number; let g: number; let b: number;
        if (curved < 0.35) {
          const k = curved / 0.35;
          r = sc.s[0] + (sc.m[0] - sc.s[0]) * k;
          g = sc.s[1] + (sc.m[1] - sc.s[1]) * k;
          b = sc.s[2] + (sc.m[2] - sc.s[2]) * k;
        } else if (curved < 0.7) {
          const k = (curved - 0.35) / 0.35;
          r = sc.m[0] + (sc.h[0] - sc.m[0]) * k;
          g = sc.m[1] + (sc.h[1] - sc.m[1]) * k;
          b = sc.m[2] + (sc.h[2] - sc.m[2]) * k;
        } else {
          const k = (curved - 0.7) / 0.3;
          r = sc.h[0] + (sc.w[0] - sc.h[0]) * k;
          g = sc.h[1] + (sc.w[1] - sc.h[1]) * k;
          b = sc.h[2] + (sc.w[2] - sc.h[2]) * k;
        }

        const idx = (py * LW + px) * 4;
        data[idx] = Math.floor(clamp(r, 0, 255));
        data[idx + 1] = Math.floor(clamp(g, 0, 255));
        data[idx + 2] = Math.floor(clamp(b, 0, 255));
        data[idx + 3] = 255;
      }
    }

    bctx.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, 0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-0.44);
    for (let i = 0; i < 2; i++) {
      const off = Math.cos(t * 1 + i * 2.1) * height * 0.22 + (i - 0.5) * height * 0.35;
      const bandGrad = ctx.createLinearGradient(0, off - 90, 0, off + 90);
      bandGrad.addColorStop(0, 'rgba(255,255,255,0)');
      bandGrad.addColorStop(0.5, `rgba(255,255,255,${(0.03 + 0.02 * Math.sin(t * 2 + i * 1.7)).toFixed(3)})`);
      bandGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bandGrad;
      ctx.fillRect(-width, off - 90, width * 2, 180);
    }
    ctx.restore();

    const sheen = 0.5 + 0.5 * Math.sin(t * 2);
    const sg = ctx.createLinearGradient(0, height, width, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, `rgba(255,255,255,${(0.03 + sheen * 0.04).toFixed(3)})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, width, height);

  }, [frame, width, height, totalFrames, speed, t, sc]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: sc.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { LiquidMetal };
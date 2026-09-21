import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type FanScheme = 'crimson' | 'ocean' | 'emerald' | 'amber';

interface FanBladesProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: FanScheme;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function sstep(e0: number, e1: number, x: number): number {
  const k = clamp((x - e0) / (e1 - e0), 0, 1);
  return k * k * (3 - 2 * k);
}

interface SchemeDef {
  bg: [number, number, number];
  blade: [number, number, number];
  core: [number, number, number];
  tip: [number, number, number];
  mid: [number, number, number];
  wash: [number, number, number];
}

const schemes: Record<FanScheme, SchemeDef> = {
  crimson: {
    bg: [10, 1, 3],
    blade: [140, 20, 40], core: [255, 80, 110],
    tip: [255, 180, 120], mid: [180, 40, 60],
    wash: [255, 100, 120],
  },
  ocean: {
    bg: [1, 3, 10],
    blade: [20, 80, 160], core: [80, 180, 255],
    tip: [150, 230, 255], mid: [40, 120, 200],
    wash: [70, 120, 255],
  },
  emerald: {
    bg: [1, 8, 5],
    blade: [20, 130, 80], core: [90, 255, 170],
    tip: [200, 255, 180], mid: [40, 180, 120],
    wash: [70, 255, 170],
  },
  amber: {
    bg: [10, 5, 1],
    blade: [150, 80, 10], core: [255, 170, 60],
    tip: [255, 240, 180], mid: [200, 120, 40],
    wash: [255, 180, 80],
  },
};

const LW = 640;
const LH = 360;
const BLADES = 24;
const SPREAD = 1.75;

const FanBlades: React.FC<FanBladesProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'ocean',
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

    const imgData = bctx.createImageData(LW, LH);
    const data = imgData.data;
    const ox = LW * 0.52;
    const oy = LH * 1.12;
    const pitch = (SPREAD * 2) / BLADES;
    const rMax = LH * 1.05;

    for (let py = 0; py < LH; py++) {
      for (let px = 0; px < LW; px++) {
        const dx = px - ox;
        const dy = py - oy;
        const r = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        const raw = ang + Math.PI / 2;
        const d = Math.atan2(Math.sin(raw), Math.cos(raw));

        let R = sc.bg[0]; let G = sc.bg[1]; let B = sc.bg[2];

        if (Math.abs(d) < SPREAD + pitch) {
          const bend = 0.22 * Math.sin(t * 1 + r * 0.004)
            + 0.06 * Math.sin(t * 2 + r * 0.009);
          const ph = (d + bend) / pitch;
          const i = Math.floor(ph);
          const u = ph - i;

          const edgeRaw = sstep(0, 0.22, u) * sstep(1, 0.78, u);
          const edge = Math.pow(edgeRaw, 1.5);
          const core = Math.exp(-((u - 0.45) * (u - 0.45)) / 0.008);
          const rN = clamp(r / rMax, 0, 1);
          const tip = sstep(0.35, 0.9, rN);
          const baseD = sstep(0, 0.35, rN);
          const shimmer = 0.75 + 0.25 * Math.sin(t * 2 + i * 0.7);
          const mid = Math.exp(-((rN - 0.55) * (rN - 0.55)) / 0.06);

          const blade = edge * baseD;
          R += blade * (sc.blade[0] * 0.55 + sc.blade[0] * 0.45 * shimmer);
          G += blade * (sc.blade[1] * 0.55 + sc.blade[1] * 0.45 * shimmer);
          B += blade * (sc.blade[2] * 0.55 + sc.blade[2] * 0.45 * shimmer);

          R += core * baseD * sc.core[0] * 0.7;
          G += core * baseD * sc.core[1] * 0.7;
          B += core * baseD * sc.core[2] * 0.7;

          R += tip * edge * sc.tip[0];
          G += tip * edge * sc.tip[1];
          B += tip * edge * sc.tip[2];

          R += mid * edge * sc.mid[0] * 0.5;
          G += mid * edge * sc.mid[1] * 0.5;
          B += mid * edge * sc.mid[2] * 0.5;
        }

        const idx = (py * LW + px) * 4;
        data[idx] = Math.floor(clamp(R, 0, 255));
        data[idx + 1] = Math.floor(clamp(G, 0, 255));
        data[idx + 2] = Math.floor(clamp(B, 0, 255));
        data[idx + 3] = 255;
      }
    }

    bctx.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, 0, 0, width, height);

    const topWash = ctx.createLinearGradient(0, 0, 0, height * 0.35);
    topWash.addColorStop(0, `rgba(${sc.wash[0]},${sc.wash[1]},${sc.wash[2]},0.04)`);
    topWash.addColorStop(1, `rgba(${sc.wash[0]},${sc.wash[1]},${sc.wash[2]},0)`);
    ctx.fillStyle = topWash;
    ctx.fillRect(0, 0, width, height * 0.35);
  }, [frame, width, height, totalFrames, speed, t, sc]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#000' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { FanBlades };
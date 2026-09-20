import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type LensScheme = 'emerald' | 'violet' | 'solar' | 'rose';

interface ConcentricLensProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: LensScheme;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

interface SchemeColors {
  bg: string; bgR: number; bgG: number; bgB: number;
  ringR: number; ringG: number; ringB: number;
  ringHiR: number; ringHiG: number; ringHiB: number;
  flareR: number; flareG: number; flareB: number;
  innerR: number; innerG: number; innerB: number;
  sparkR: number; sparkG: number; sparkB: number;
}

const schemes: Record<LensScheme, SchemeColors> = {
  emerald: {
    bg: '#001008', bgR: 0, bgG: 16, bgB: 8,
    ringR: 20, ringG: 160, ringB: 100,
    ringHiR: 120, ringHiG: 255, ringHiB: 200,
    flareR: 20, flareG: 140, flareB: 80,
    innerR: 80, innerG: 220, innerB: 160,
    sparkR: 100, sparkG: 240, sparkB: 180,
  },
  violet: {
    bg: '#0a0018', bgR: 10, bgG: 0, bgB: 24,
    ringR: 130, ringG: 40, ringB: 180,
    ringHiR: 200, ringHiG: 150, ringHiB: 255,
    flareR: 100, flareG: 40, flareB: 160,
    innerR: 160, innerG: 100, innerB: 240,
    sparkR: 180, sparkG: 130, sparkB: 255,
  },
  solar: {
    bg: '#100800', bgR: 16, bgG: 8, bgB: 0,
    ringR: 200, ringG: 140, ringB: 30,
    ringHiR: 255, ringHiG: 220, ringHiB: 100,
    flareR: 200, flareG: 120, flareB: 20,
    innerR: 240, innerG: 200, innerB: 80,
    sparkR: 255, sparkG: 230, sparkB: 120,
  },
  rose: {
    bg: '#100008', bgR: 16, bgG: 0, bgB: 8,
    ringR: 180, ringG: 40, ringB: 80,
    ringHiR: 255, ringHiG: 140, ringHiB: 180,
    flareR: 160, flareG: 40, flareB: 80,
    innerR: 220, innerG: 100, innerB: 160,
    sparkR: 255, sparkG: 130, sparkB: 170,
  },
};

const ConcentricLens: React.FC<ConcentricLensProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'emerald',
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
    const maxR = Math.sqrt(cx * cx + cy * cy);

    ctx.fillStyle = sc.bg;
    ctx.fillRect(0, 0, width, height);

    const breathe = Math.sin(t * 2) * 0.06;
    const breathe2 = Math.sin(t * 3) * 0.04;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    bgGrad.addColorStop(0, `rgba(${sc.bgR + (Math.sin(t * 2) * 15 | 0)},${sc.bgG + (Math.sin(t * 2) * 20 | 0)},${sc.bgB + 40},1)`);
    bgGrad.addColorStop(0.4, `rgba(${sc.bgR},${Math.floor(sc.bgG * 1.5)},${sc.bgB * 2},1)`);
    bgGrad.addColorStop(0.8, `rgba(${Math.floor(sc.bgR * 0.5)},${Math.floor(sc.bgG * 0.5)},${Math.floor(sc.bgB * 0.8)},1)`);
    bgGrad.addColorStop(1, sc.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const NUM_RINGS = 80;
    for (let i = 0; i < NUM_RINGS; i++) {
      const frac = (i + 1) / (NUM_RINGS + 1);
      const r = frac * maxR * (1.1 + breathe);
      const h1 = hash(i * 1.7);
      const h2 = hash(i * 3.1);
      const h3 = hash(i * 5.3);
      const speeds = [1, 2, 3, 4];
      const rotSpeed = speeds[Math.floor(h2 * speeds.length)];
      const rotAngle = t * rotSpeed + h3 * PI2;
      const brightMod = 0.5 + 0.5 * Math.cos(rotAngle);
      const centerBright = Math.exp(-frac * frac * 1.5);
      const thickness = 2 + h1 * 4 + centerBright * 3 + Math.sin(t * 2 + i * 0.5) * 1.5;
      const ringBright = clamp((0.35 + brightMod * 0.65) * (0.3 + centerBright * 0.7), 0, 1);
      if (ringBright < 0.05) continue;
      const rVal = clamp(ringBright * sc.ringR + centerBright * 40, 0, 255) | 0;
      const gVal = clamp(ringBright * sc.ringG + centerBright * 80, 0, 255) | 0;
      const bVal = clamp(ringBright * sc.ringB + centerBright * 55, 0, 255) | 0;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI2);
      ctx.strokeStyle = `rgba(${rVal},${gVal},${bVal},${clamp(ringBright * 0.9, 0, 0.9).toFixed(2)})`;
      ctx.lineWidth = thickness; ctx.stroke();
      if (ringBright > 0.4) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI2);
        ctx.strokeStyle = `rgba(${sc.ringHiR},${sc.ringHiG},${sc.ringHiB},${((ringBright - 0.4) * 0.5).toFixed(2)})`;
        ctx.lineWidth = thickness * 0.3; ctx.stroke();
      }
    }

    const THIN_RINGS = 120;
    for (let i = 0; i < THIN_RINGS; i++) {
      const frac = (i + 1) / (THIN_RINGS + 1);
      const r = frac * maxR * (1.15 + breathe2);
      const h1 = hash(i * 2.3 + 500);
      const sparkle = Math.sin(t * 6 + h1 * PI2 * 10) * 0.5 + 0.5;
      const sparkleBr = sparkle * sparkle;
      const fade = Math.exp(-frac * frac * 1.2);
      const br = sparkleBr * fade * 0.7;
      if (br < 0.08) continue;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI2);
      ctx.strokeStyle = `rgba(${sc.sparkR},${sc.sparkG},${sc.sparkB},${(br * 0.6).toFixed(2)})`;
      ctx.lineWidth = 0.8; ctx.stroke();
    }

    const flarePulse = 0.5 + 0.5 * Math.sin(t * 2);
    const flareH = 30 + flarePulse * 40;
    const hGrad = ctx.createLinearGradient(0, cy - flareH, width, cy + flareH);
    hGrad.addColorStop(0, `rgba(${sc.flareR},${sc.flareG},${sc.flareB},0)`);
    hGrad.addColorStop(0.3, `rgba(${sc.flareR},${sc.flareG},${sc.flareB},${(0.2 + flarePulse * 0.2).toFixed(2)})`);
    hGrad.addColorStop(0.5, `rgba(${Math.min(255, sc.flareR + 70)},${Math.min(255, sc.flareG + 80)},${Math.min(255, sc.flareB + 75)},${(0.4 + flarePulse * 0.3).toFixed(2)})`);
    hGrad.addColorStop(0.7, `rgba(${sc.flareR},${sc.flareG},${sc.flareB},${(0.2 + flarePulse * 0.2).toFixed(2)})`);
    hGrad.addColorStop(1, `rgba(${sc.flareR},${sc.flareG},${sc.flareB},0)`);
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, cy - flareH, width, flareH * 2);

    const flareW = 0.3 + flarePulse * 0.15;
    const flareGrad = ctx.createLinearGradient(cx - maxR * 0.9, 0, cx + maxR * 0.9, 0);
    flareGrad.addColorStop(0, `rgba(${sc.flareR},${sc.flareG},${sc.flareB},0)`);
    flareGrad.addColorStop(0.5 - flareW * 0.5, `rgba(${sc.flareR},${Math.min(255, sc.flareG + 40)},${Math.min(255, sc.flareB + 40)},${(0.1 + flarePulse * 0.15).toFixed(2)})`);
    flareGrad.addColorStop(0.5, `rgba(${Math.min(255, sc.flareR + 90)},${Math.min(255, sc.flareG + 100)},${Math.min(255, sc.flareB + 75)},${(0.2 + flarePulse * 0.25).toFixed(2)})`);
    flareGrad.addColorStop(0.5 + flareW * 0.5, `rgba(${sc.flareR},${Math.min(255, sc.flareG + 40)},${Math.min(255, sc.flareB + 40)},${(0.1 + flarePulse * 0.15).toFixed(2)})`);
    flareGrad.addColorStop(1, `rgba(${sc.flareR},${sc.flareG},${sc.flareB},0)`);
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, cy - 60, width, 120);

    const innerPulse = 0.18 + breathe * 0.5;
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * innerPulse);
    innerGrad.addColorStop(0, 'rgba(255,255,255,1)');
    innerGrad.addColorStop(0.15, `rgba(${Math.min(255, sc.innerR + 50)},${Math.min(255, sc.innerG + 50)},${Math.min(255, sc.innerB + 50)},0.9)`);
    innerGrad.addColorStop(0.35, `rgba(${sc.innerR},${sc.innerG},${sc.innerB},0.6)`);
    innerGrad.addColorStop(0.6, `rgba(${Math.floor(sc.innerR * 0.4)},${Math.floor(sc.innerG * 0.4)},${Math.floor(sc.innerB * 0.4)},0.25)`);
    innerGrad.addColorStop(1, `rgba(${Math.floor(sc.innerR * 0.1)},${Math.floor(sc.innerG * 0.1)},${Math.floor(sc.innerB * 0.1)},0)`);
    ctx.fillStyle = innerGrad;
    ctx.beginPath(); ctx.arc(cx, cy, maxR * innerPulse, 0, PI2); ctx.fill();

    const outerGrad = ctx.createRadialGradient(cx, cy, maxR * 0.75, cx, cy, maxR * 1.1);
    outerGrad.addColorStop(0, 'rgba(0,5,15,0)');
    outerGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = outerGrad;
    ctx.fillRect(0, 0, width, height);

  }, [frame, width, height, totalFrames, speed, t, sc]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: sc.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { ConcentricLens };
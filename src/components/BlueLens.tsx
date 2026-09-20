import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface BlueLensProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const BlueLens: React.FC<BlueLensProps> = ({
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

    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    ctx.fillStyle = '#000812';
    ctx.fillRect(0, 0, width, height);

    const breathe = Math.sin(t * 2) * 0.06;
    const breathe2 = Math.sin(t * 3) * 0.04;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    bgGrad.addColorStop(0, `rgba(${10 + (Math.sin(t * 2) * 15 | 0)},${40 + (Math.sin(t * 2) * 20 | 0)},80,1)`);
    bgGrad.addColorStop(0.4, 'rgba(5,20,50,1)');
    bgGrad.addColorStop(0.8, 'rgba(2,8,20,1)');
    bgGrad.addColorStop(1, 'rgba(0,3,10,1)');
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

      const distNorm = frac;
      const centerBright = Math.exp(-distNorm * distNorm * 1.5);

      const thickness = 2 + h1 * 4 + centerBright * 3 + Math.sin(t * 2 + i * 0.5) * 1.5;

      const ringBright = clamp((0.35 + brightMod * 0.65) * (0.3 + centerBright * 0.7), 0, 1);

      if (ringBright < 0.05) continue;

      const rVal = clamp(ringBright * 30 + centerBright * 40, 0, 80) | 0;
      const gVal = clamp(ringBright * 120 + centerBright * 80, 0, 200) | 0;
      const bVal = clamp(ringBright * 200 + centerBright * 55, 0, 255) | 0;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, PI2);
      ctx.strokeStyle = `rgba(${rVal},${gVal},${bVal},${clamp(ringBright * 0.9, 0, 0.9).toFixed(2)})`;
      ctx.lineWidth = thickness;
      ctx.stroke();

      if (ringBright > 0.4) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, PI2);
        ctx.strokeStyle = `rgba(150,210,255,${((ringBright - 0.4) * 0.5).toFixed(2)})`;
        ctx.lineWidth = thickness * 0.3;
        ctx.stroke();
      }
    }

    const THIN_RINGS = 120;
    for (let i = 0; i < THIN_RINGS; i++) {
      const frac = (i + 1) / (THIN_RINGS + 1);
      const r = frac * maxR * (1.15 + breathe2);

      const h1 = hash(i * 2.3 + 500);
      const sparkle = Math.sin(t * 6 + h1 * PI2 * 10) * 0.5 + 0.5;
      const sparkleBr = sparkle * sparkle;

      const distNorm = frac;
      const fade = Math.exp(-distNorm * distNorm * 1.2);
      const br = sparkleBr * fade * 0.7;

      if (br < 0.08) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, PI2);
      ctx.strokeStyle = `rgba(120,190,255,${(br * 0.6).toFixed(2)})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    const flarePulse = 0.5 + 0.5 * Math.sin(t * 2);
    const flareH = 30 + flarePulse * 40;
    const hGrad = ctx.createLinearGradient(0, cy - flareH, width, cy + flareH);
    hGrad.addColorStop(0, 'rgba(0,30,80,0)');
    hGrad.addColorStop(0.3, `rgba(30,100,180,${(0.2 + flarePulse * 0.2).toFixed(2)})`);
    hGrad.addColorStop(0.5, `rgba(100,180,255,${(0.4 + flarePulse * 0.3).toFixed(2)})`);
    hGrad.addColorStop(0.7, `rgba(30,100,180,${(0.2 + flarePulse * 0.2).toFixed(2)})`);
    hGrad.addColorStop(1, 'rgba(0,30,80,0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, cy - flareH, width, flareH * 2);

    const flareW = 0.3 + flarePulse * 0.15;
    const flareGrad = ctx.createLinearGradient(cx - maxR * 0.9, 0, cx + maxR * 0.9, 0);
    flareGrad.addColorStop(0, 'rgba(20,80,160,0)');
    flareGrad.addColorStop(0.5 - flareW * 0.5, `rgba(40,120,200,${(0.1 + flarePulse * 0.15).toFixed(2)})`);
    flareGrad.addColorStop(0.5, `rgba(120,200,255,${(0.2 + flarePulse * 0.25).toFixed(2)})`);
    flareGrad.addColorStop(0.5 + flareW * 0.5, `rgba(40,120,200,${(0.1 + flarePulse * 0.15).toFixed(2)})`);
    flareGrad.addColorStop(1, 'rgba(20,80,160,0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, cy - 60, width, 120);

    const innerPulse = 0.18 + breathe * 0.5;
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * innerPulse);
    innerGrad.addColorStop(0, 'rgba(255,255,255,1)');
    innerGrad.addColorStop(0.15, 'rgba(200,230,255,0.9)');
    innerGrad.addColorStop(0.35, 'rgba(100,180,240,0.6)');
    innerGrad.addColorStop(0.6, 'rgba(40,120,200,0.25)');
    innerGrad.addColorStop(1, 'rgba(10,40,100,0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * innerPulse, 0, PI2);
    ctx.fill();

    const outerGrad = ctx.createRadialGradient(cx, cy, maxR * 0.75, cx, cy, maxR * 1.1);
    outerGrad.addColorStop(0, 'rgba(0,5,15,0)');
    outerGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = outerGrad;
    ctx.fillRect(0, 0, width, height);

  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#000812' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { BlueLens };

import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface CubeFieldProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const COLS = 30;
const ROWS = 18;

const CubeField: React.FC<CubeFieldProps> = ({
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

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#FFF5F8');
    bg.addColorStop(0.5, '#FFE8F0');
    bg.addColorStop(1, '#F5D8E4');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const tw = (width * 3.4) / ((COLS + ROWS) / 2);
    const th = tw * 0.5;
    const bodyBase = tw * 0.55;
    const amp = tw * 0.5;
    const cx = width * 0.42;
    const gridH = ((COLS + ROWS) / 2) * th;
    const oy = (height - gridH) / 2 + gridH * 0.12;

    const hueDrift = Math.sin(t * 1) * 8;

    for (let s = 0; s < COLS + ROWS - 1; s++) {
      for (let i = 0; i < COLS; i++) {
        const j = s - i;
        if (j < 0 || j >= ROWS) continue;

        const x = cx + (i - j) * tw * 0.5;
        const yBase = oy + (i + j) * th * 0.5;

        const r1 = hash(i * 51 + j * 77 + 11);
        const s1 = r1 > 0.5 ? 1 : 2;
        const p1 = hash(i * 13 + j * 29 + 33) * PI2;
        const r2 = hash(i * 71 + j * 43 + 55);
        const wave = Math.sin(i * 0.35 + t * 2) * 0.4
          + Math.sin(t * s1 + p1) * (0.5 + r2 * 0.5);
        const hgt = bodyBase + wave * amp * 0.5 + amp * 0.85;

        const h = hash(i * 31 + j * 57);
        const patch = Math.sin(i * 0.5 + j * 0.9) * 0.5 + Math.cos(j * 0.6 - i * 0.3) * 0.5;
        const hue = (((i / COLS) * 1.1 + (j / ROWS) * 0.55 + h * 0.1 + patch * 0.08) * 360 + hueDrift + 360) % 360;

        const yt = yBase - hgt;
        const Nx = x; const Ny = yt - th / 2;
        const Ex = x + tw / 2; const Ey = yt;
        const Sx = x; const Sy = yt + th / 2;
        const Wx = x - tw / 2; const Wy = yt;
        const Dz = hgt;

        ctx.beginPath();
        ctx.moveTo(Wx, Wy); ctx.lineTo(Sx, Sy);
        ctx.lineTo(Sx, Sy + Dz); ctx.lineTo(Wx, Wy + Dz);
        ctx.closePath();
        ctx.fillStyle = `hsl(${hue.toFixed(1)},85%,42%)`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(Ex, Ey); ctx.lineTo(Sx, Sy);
        ctx.lineTo(Sx, Sy + Dz); ctx.lineTo(Ex, Ey + Dz);
        ctx.closePath();
        ctx.fillStyle = `hsl(${hue.toFixed(1)},80%,55%)`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(Nx, Ny); ctx.lineTo(Ex, Ey);
        ctx.lineTo(Sx, Sy); ctx.lineTo(Wx, Wy);
        ctx.closePath();
        const topGrad = ctx.createLinearGradient(Nx, Ny, Sx, Sy);
        topGrad.addColorStop(0, `hsl(${hue.toFixed(1)},95%,74%)`);
        topGrad.addColorStop(1, `hsl(${hue.toFixed(1)},90%,62%)`);
        ctx.fillStyle = topGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(Nx, Ny); ctx.lineTo(Ex, Ey);
        ctx.lineTo(Sx, Sy); ctx.lineTo(Wx, Wy);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = Math.max(1, tw * 0.012);
        ctx.stroke();
      }
    }
  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#FFE8F0' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { CubeField };
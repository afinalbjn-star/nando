import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface GlassBlocksProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;

function hash2(i: number, j: number) {
  let s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothstep(e0: number, e1: number, x: number) {
  const tt = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return tt * tt * (3 - 2 * tt);
}

const GlassBlocks: React.FC<GlassBlocksProps> = ({
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

    const S = 0.25;
    const iw = Math.floor(width * S);
    const ih = Math.floor(height * S);
    const imgData = ctx.createImageData(iw, ih);
    const data = imgData.data;

    const COLS = 24;
    const ROWS = Math.max(10, Math.round((COLS * ih) / iw));

    for (let py = 0; py < ih; py++) {
      for (let px = 0; px < iw; px++) {
        const gx = px / iw;
        const gy = py / ih;
        const ci = Math.min(COLS - 1, Math.floor(gx * COLS));
        const cj = Math.min(ROWS - 1, Math.floor(gy * ROWS));
        const u = gx * COLS - ci;
        const v = gy * ROWS - cj;

        const tone = hash2(ci, cj);
        const dir = tone > 0.5 ? 1 : -1;

        const colWave = 0.07 * Math.sin(t * 1 + gy * 8 + ci * 0.45);
        const tu = u + colWave + 0.06 * Math.sin(v * 11 + t * 2 + tone * 6);
        const tv = v + 0.06 * Math.cos(u * 11 - t * 2 + tone * 6);

        const m1 = Math.sin(tu * 7 + 2 * Math.sin(tv * 6 + t * 1 + tone * 5));
        const m2 = Math.sin(tv * 8 + 2 * Math.cos(tu * 5 - t * 1 + dir * 2));
        const marble = m1 * m2;

        let bright = 0.5 + 0.5 * marble;
        bright = Math.pow(bright, 0.7);
        bright *= 0.65 + tone * 0.7;

        const dx = tu - 0.5;
        const dy = (tv - 0.5) * 0.75;
        const r2 = dx * dx + dy * dy;
        bright += Math.exp(-r2 * 12) * 0.35;

        const streak = 0.8 + 0.2 * Math.sin(gx * 46 + t * 1 + Math.sin(gy * 6 + t * 1) * 3);
        bright *= streak;

        const edge = Math.min(Math.min(u, 1 - u), Math.min(v, 1 - v));
        const grout = smoothstep(0.0, 0.025, edge);
        const rim = smoothstep(0.025, 0.05, edge) * (1 - smoothstep(0.05, 0.12, edge));
        bright = bright * (0.05 + 0.95 * grout) + rim * 0.75;

        const vv = Math.max(0, Math.min(1, bright));
        const g = Math.floor(Math.pow(vv, 0.8) * 255);
        const idx = (py * iw + px) * 4;
        data[idx] = g;
        data[idx + 1] = g;
        data[idx + 2] = g;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(canvas, 0, 0, iw, ih, 0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.5);
    glow.addColorStop(0, 'rgba(220,225,235,' + (0.03 + pulse * 0.02).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#0a0a0a' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { GlassBlocks };

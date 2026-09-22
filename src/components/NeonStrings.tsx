import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type StringScheme = 'original' | 'crimson' | 'ocean' | 'emerald' | 'sunset';

interface NeonStringsProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: StringScheme;
}

const PI2 = Math.PI * 2;

const SCHEMES: Record<StringScheme, { hueStart: number; hueRange: number; bg: string; bandR: number; bandG: number; bandB: number; warmR: number; warmG: number; warmB: number }> = {
  original: { hueStart: 225, hueRange: 105, bg: '#020208', bandR: 180, bandG: 60, bandB: 255, warmR: 255, warmG: 170, warmB: 80 },
  crimson:  { hueStart: 340, hueRange: 50,  bg: '#0a0204', bandR: 255, bandG: 40, bandB: 60, warmR: 255, warmG: 120, warmB: 40 },
  ocean:    { hueStart: 180, hueRange: 60,  bg: '#02060a', bandR: 40, bandG: 160, bandB: 255, warmR: 80, warmG: 220, warmB: 255 },
  emerald:  { hueStart: 130, hueRange: 50,  bg: '#020a06', bandR: 40, bandG: 220, bandB: 120, warmR: 120, warmG: 255, warmB: 180 },
  sunset:   { hueStart: 15, hueRange: 55,   bg: '#0a0402', bandR: 255, bandG: 100, bandB: 40, warmR: 255, warmG: 200, warmB: 60 },
};

const LINES = 90;
const SEGS = 48;

const NeonStrings: React.FC<NeonStringsProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'original',
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

    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, width, height);

    const waveY = height * (0.42 + 0.05 * Math.sin(t * 1));
    const bandH = height * 0.16;

    const SPREAD = 1.3;
    const MARGIN = width * (SPREAD - 1) / 2;
    for (let li = 0; li < LINES; li++) {
      const fx = li / (LINES - 1);
      const xBase = fx * width * SPREAD - MARGIN;
      const hue = s.hueStart + fx * s.hueRange;

      const buildPath = () => {
        ctx.beginPath();
        for (let ss = 0; ss <= SEGS; ss++) {
          const y = (ss / SEGS) * height;
          const env = Math.exp(-((y - waveY) * (y - waveY)) / (2 * bandH * bandH));
          const sway = Math.sin(t * 2 + y * 0.008 + li * 0.22) * width * 0.012 * (0.3 + env * 2.2)
            + Math.sin(t * 1 + li * 0.5) * width * 0.002;
          const x = xBase + sway;
          if (ss === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      };

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, `hsl(${hue.toFixed(1)},90%,38%)`);
      grad.addColorStop(0.42, `hsl(${((hue + 40) % 360).toFixed(1)},95%,55%)`);
      grad.addColorStop(0.62, `hsl(${((hue + 70) % 360).toFixed(1)},95%,50%)`);
      grad.addColorStop(1, `hsl(${(hue % 360).toFixed(1)},90%,30%)`);

      buildPath();
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = Math.max(3, width * 0.004);
      ctx.stroke();

      buildPath();
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = Math.max(1.2, width * 0.0012);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);

    const band = ctx.createLinearGradient(0, waveY - bandH * 2, 0, waveY + bandH * 2);
    band.addColorStop(0, `rgba(${s.bandR},${s.bandG},${s.bandB},0)`);
    band.addColorStop(0.5, `rgba(${s.bandR},${s.bandG},${s.bandB},${(0.16 + pulse * 0.1).toFixed(3)})`);
    band.addColorStop(1, `rgba(${s.bandR},${s.bandG},${s.bandB},0)`);
    ctx.fillStyle = band;
    ctx.fillRect(0, waveY - bandH * 2, width, bandH * 4);

    const warmX = width * (0.68 + 0.08 * Math.sin(t * 1 + 2));
    const warm = ctx.createRadialGradient(warmX, waveY, 0, warmX, waveY, width * 0.22);
    warm.addColorStop(0, `rgba(${s.warmR},${s.warmG},${s.warmB},${(0.14 + pulse * 0.08).toFixed(3)})`);
    warm.addColorStop(1, `rgba(${s.warmR},${s.warmG},${s.warmB},0)`);
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, s]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: s.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { NeonStrings };
export type { StringScheme };

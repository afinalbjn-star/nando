import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type FinScheme = 'mono' | 'ember' | 'ocean' | 'violet' | 'emerald';

interface WaveFinsProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: FinScheme;
}

const SCHEMES: Record<FinScheme, { bg: [number, number, number]; dark: [number, number, number]; light: [number, number, number]; divBg: string }> = {
  mono:    { bg: [11, 11, 13], dark: [12, 12, 14], light: [240, 240, 242], divBg: '#0b0b0d' },
  ember:   { bg: [20, 10, 6], dark: [40, 16, 6], light: [255, 196, 120], divBg: '#140a06' },
  ocean:   { bg: [6, 18, 26], dark: [8, 40, 70], light: [170, 230, 255], divBg: '#06121a' },
  violet:  { bg: [16, 10, 26], dark: [40, 20, 80], light: [220, 190, 255], divBg: '#100a1a' },
  emerald: { bg: [6, 20, 16], dark: [10, 60, 44], light: [180, 255, 215], divBg: '#061410' },
};

const PI2 = Math.PI * 2;

function smoothstep(e0: number, e1: number, x: number) {
  const tt = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return tt * tt * (3 - 2 * tt);
}

const WaveFins: React.FC<WaveFinsProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'mono',
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

    ctx.fillStyle = 'rgb(' + s.bg[0] + ',' + s.bg[1] + ',' + s.bg[2] + ')';
    ctx.fillRect(0, 0, width, height);

    const unit = width / 1920;
    const cell = 46 * unit;
    const cols = Math.ceil(width / cell) + 2;
    const rows = Math.ceil(height / cell) + 2;

    const srcX = width * 0.30;
    const srcY = height * 0.55;

    for (let j = -1; j < rows; j++) {
      for (let i = -1; i < cols; i++) {
        const x = i * cell;
        const y = j * cell;
        const cxp = x + cell / 2;
        const cyp = y + cell / 2;

        const dx = cxp - srcX;
        const dy = cyp - srcY;
        const r = Math.sqrt(dx * dx + dy * dy) / (width * 0.5);
        const ang = Math.atan2(dy, dx);

        const ph = r * 9 - t * 2 + 1.4 * Math.sin(2 * ang + t * 1) + 0.5 * Math.sin(cxp * 0.006 + t * 1);
        let w = 0.5 + 0.5 * Math.sin(ph);
        w = smoothstep(0.25, 0.75, w);

        const scl = (0.62 + 0.38 * w) * (cell / 2) * 0.92;
        const rot = 0.5 * Math.sin(ph * 0.5 + 1.2);
        const baseA = -Math.PI / 4 + rot;

        const fr = Math.floor(s.dark[0] + (s.light[0] - s.dark[0]) * w);
        const fg2 = Math.floor(s.dark[1] + (s.light[1] - s.dark[1]) * w);
        const fb = Math.floor(s.dark[2] + (s.light[2] - s.dark[2]) * w);
        ctx.fillStyle = 'rgb(' + fr + ',' + fg2 + ',' + fb + ')';
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = baseA + (k * PI2) / 3;
          const px = cxp + Math.cos(a) * scl;
          const py = cyp + Math.sin(a) * scl;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.save();
    const vg = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.3, width * 0.5, height * 0.5, height * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, s]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: s.divBg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { WaveFins };
export type { FinScheme };

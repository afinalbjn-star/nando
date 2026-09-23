import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type CubeScheme = 'pastel' | 'sunset' | 'ocean' | 'candy' | 'forest';

interface PastelCubesProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: CubeScheme;
}

const PI2 = Math.PI * 2;

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

const SCHEMES: Record<CubeScheme, { stops: [number, number, number]; sat: number }> = {
  pastel: { stops: [340, 285, 168], sat: 58 },
  sunset: { stops: [32, 340, 272], sat: 62 },
  ocean:  { stops: [172, 212, 258], sat: 58 },
  candy:  { stops: [318, 288, 186], sat: 64 },
  forest: { stops: [92, 168, 212], sat: 55 },
};

function diagHue(stops: [number, number, number], d: number) {
  if (d < 0.5) {
    return lerp(stops[0], stops[1], d / 0.5);
  }
  return lerp(stops[1], stops[2], (d - 0.5) / 0.5);
}

const PastelCubes: React.FC<PastelCubesProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'pastel',
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

    ctx.fillStyle = '#c9a6e8';
    ctx.fillRect(0, 0, width, height);

    const unit = width / 1920;
    const a = 52 * unit;
    const hw = a * 0.866;
    const hh = a * 0.5;
    const dx = hw * 2;
    const dy = hh + a;

    const cols = Math.ceil(width / dx) + 3;
    const rows = Math.ceil(height / dy) + 3;

    for (let j = -1; j < rows; j++) {
      for (let i = -1; i < cols; i++) {
        const x = i * dx + (j % 2 === 0 ? 0 : hw) - hw;
        const y = j * dy - a;

        const ndx = (x - width * 0.5) / (width * 0.5);
        const ndy = (y - height * 0.5) / (height * 0.5);
        const dist = Math.sqrt(ndx * ndx + ndy * ndy) / Math.SQRT2;
        const ph = t * 1 - dist * 2.4;
        const springW = (Math.sin(ph) + 0.35 * Math.sin(2 * ph + 0.9) + 0.12 * Math.sin(3 * ph + 2.1)) / 1.47;
        const pop = Math.max(0.6, 1 + 0.16 * springW);
        const lift = Math.max(0, springW) * a * 0.35;
        const breathe = pop;
        const wave = 0.92 + 0.08 * Math.sin(t * 2 + x * 0.0035 + y * 0.002);

        const d = Math.max(0, Math.min(1, (x / width) * 0.55 + (1 - y / height) * 0.45));
        const hue = diagHue(s.stops, d);
        const sat = s.sat;
        const baseL = 72 * wave;

        const cxp = x;
        const cyp = y + hh * 0.5 - lift;
        const P = (px: number, py: number): [number, number] => [
          cxp + (px - cxp) * breathe,
          cyp + (py - cyp) * breathe,
        ];

        const topL = Math.min(90, baseL + 10);
        ctx.fillStyle = 'hsl(' + hue.toFixed(1) + ',' + sat + '%,' + topL.toFixed(1) + '%)';
        ctx.beginPath();
        let p = P(x, y - hh); ctx.moveTo(p[0], p[1]);
        p = P(x + hw, y); ctx.lineTo(p[0], p[1]);
        p = P(x, y + hh); ctx.lineTo(p[0], p[1]);
        p = P(x - hw, y); ctx.lineTo(p[0], p[1]);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'hsl(' + hue.toFixed(1) + ',' + sat + '%,' + baseL.toFixed(1) + '%)';
        ctx.beginPath();
        p = P(x - hw, y); ctx.moveTo(p[0], p[1]);
        p = P(x, y + hh); ctx.lineTo(p[0], p[1]);
        p = P(x, y + hh + a); ctx.lineTo(p[0], p[1]);
        p = P(x - hw, y + a); ctx.lineTo(p[0], p[1]);
        ctx.closePath();
        ctx.fill();

        const rightL = Math.max(30, baseL - 13);
        ctx.fillStyle = 'hsl(' + hue.toFixed(1) + ',' + sat + '%,' + rightL.toFixed(1) + '%)';
        ctx.beginPath();
        p = P(x + hw, y); ctx.moveTo(p[0], p[1]);
        p = P(x, y + hh); ctx.lineTo(p[0], p[1]);
        p = P(x, y + hh + a); ctx.lineTo(p[0], p[1]);
        p = P(x + hw, y + a); ctx.lineTo(p[0], p[1]);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 1);
    const sheen = ctx.createLinearGradient(0, 0, width, height);
    sheen.addColorStop(0, 'rgba(255,255,255,' + (0.05 + pulse * 0.02).toFixed(3) + ')');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(255,255,255,' + (0.05 + pulse * 0.02).toFixed(3) + ')');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, s]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#c9a6e8' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { PastelCubes };
export type { CubeScheme };

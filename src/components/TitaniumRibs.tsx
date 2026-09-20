import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface TitaniumRibsProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const TitaniumRibs: React.FC<TitaniumRibsProps> = ({
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

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const NUM_RIBS = 500;

    for (let i = 0; i < NUM_RIBS; i++) {
      const frac = i / (NUM_RIBS - 1);
      const nx = frac * 2 - 1;
      const x = frac * width;

      const h1 = hash(i * 1.7);
      const h2 = hash(i * 3.1);
      const h3 = hash(i * 5.3);

      const waveY = Math.sin(nx * 1.5 + t * 2) * 0.22
                  + Math.cos(nx * 2.8 + t * 3) * 0.1
                  + Math.sin(nx * 0.6 + t * 2) * 0.15;

      const diag = nx * 0.5 + waveY;

      const band1 = Math.exp(-diag * diag * 1.5);
      const band2 = Math.exp(-((diag - 0.45) * (diag - 0.45)) * 2.5) * 0.55;
      const band3 = Math.exp(-((diag + 0.4) * (diag + 0.4)) * 2.5) * 0.45;
      const band = clamp(band1 + band2 + band3, 0, 1);

      if (band < 0.05) continue;

      const ribH = height * clamp(band * 2.2, 0.12, 1.0) * (0.35 + h1 * 0.65);
      const centerY = height * (0.5 + waveY * 0.3 + (h3 - 0.5) * 0.03);
      const ribTop = centerY - ribH * 0.5;
      const ribBot = centerY + ribH * 0.5;

      const ribW = width / NUM_RIBS * (0.5 + h2 * 0.4);

      const gradient = ctx.createLinearGradient(x, ribTop, x, ribBot);
      const val = clamp(band * 255 * (0.5 + h2 * 0.5), 0, 255) | 0;
      const dim = clamp(band * 40, 0, 40) | 0;
      gradient.addColorStop(0, `rgb(${dim},${dim},${dim})`);
      gradient.addColorStop(0.15, `rgb(${val},${val},${val + 1})`);
      gradient.addColorStop(0.5, `rgb(${val},${val},${val + 1})`);
      gradient.addColorStop(0.85, `rgb(${val},${val},${val + 1})`);
      gradient.addColorStop(1, `rgb(${dim},${dim},${dim})`);

      ctx.fillStyle = gradient;
      const xWobble = Math.sin(centerY * 0.004 + t * 2 + nx * 2) * 2 * band;
      ctx.fillRect(x + xWobble - ribW * 0.5, ribTop, ribW, ribH);
    }
  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#000' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { TitaniumRibs };

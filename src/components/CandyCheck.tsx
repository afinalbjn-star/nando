import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type CheckScheme = 'candy' | 'ocean' | 'grape' | 'tangerine' | 'mint';

interface CandyCheckProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: CheckScheme;
}

interface CheckPal { deep0: [number, number, number]; deep1: [number, number, number]; pale0: [number, number, number]; pale1: [number, number, number]; bg: string; }

const SCHEMES: Record<CheckScheme, CheckPal> = {
  candy:     { deep0: [218, 4, 92], deep1: [255, 44, 147], pale0: [243, 192, 218], pale1: [255, 247, 250], bg: '#c80a55' },
  ocean:     { deep0: [8, 70, 170], deep1: [30, 150, 255], pale0: [190, 220, 245], pale1: [240, 250, 255], bg: '#0a3a78' },
  grape:     { deep0: [90, 20, 150], deep1: [165, 70, 235], pale0: [215, 190, 240], pale1: [248, 242, 255], bg: '#4a1480' },
  tangerine: { deep0: [200, 60, 10], deep1: [255, 140, 40], pale0: [245, 210, 175], pale1: [255, 245, 230], bg: '#b83c0a' },
  mint:      { deep0: [10, 130, 100], deep1: [60, 220, 175], pale0: [195, 235, 220], pale1: [242, 255, 248], bg: '#0a6e5a' },
};

const PI2 = Math.PI * 2;

function hash2i(i: number, j: number) {
  let s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothstep(e0: number, e1: number, x: number) {
  const tt = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return tt * tt * (3 - 2 * tt);
}

const CandyCheck: React.FC<CandyCheckProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'candy',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const p = SCHEMES[scheme];

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

    const N = 7;

    for (let py = 0; py < ih; py++) {
      for (let px = 0; px < iw; px++) {
        const nx = px / iw;
        const ny = py / ih;

        const wx = nx + 0.05 * Math.sin(ny * 8 + t * 2) + 0.022 * Math.sin(ny * 15 - t * 1);
        const wy = ny + 0.05 * Math.cos(nx * 8 - t * 2) + 0.022 * Math.cos(nx * 14 + t * 1);

        const ci = Math.floor(wx * N);
        const cj = Math.floor(wy * N);
        const u = wx * N - ci;
        const v = wy * N - cj;
        const parity = ((ci + cj) % 2 + 2) % 2;

        const puffRaw = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
        const puff = Math.pow(Math.max(0, puffRaw), 0.6);
        const edge = Math.min(Math.min(u, 1 - u), Math.min(v, 1 - v));
        const seam = 1 - smoothstep(0.0, 0.07, edge);

        let r: number; let g: number; let b: number;
        if (parity === 0) {
          r = p.deep0[0] + (p.deep1[0] - p.deep0[0]) * puff;
          g = p.deep0[1] + (p.deep1[1] - p.deep0[1]) * puff;
          b = p.deep0[2] + (p.deep1[2] - p.deep0[2]) * puff;
        } else {
          r = p.pale0[0] + (p.pale1[0] - p.pale0[0]) * puff;
          g = p.pale0[1] + (p.pale1[1] - p.pale0[1]) * puff;
          b = p.pale0[2] + (p.pale1[2] - p.pale0[2]) * puff;
        }
        const shade = 0.62 + 0.38 * puff;
        r *= shade;
        g *= shade;
        b *= shade;
        r += seam * 45;
        g += seam * 40;
        b += seam * 45;

        const spec = Math.pow(Math.max(0, Math.sin((nx + ny) * 12 + t * 2 + puff * 3)), 16);
        r += spec * 70;
        g += spec * 65;
        b += spec * 65;

        const idx = (py * iw + px) * 4;
        data[idx] = Math.min(255, r);
        data[idx + 1] = Math.min(255, g);
        data[idx + 2] = Math.min(255, b);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(canvas, 0, 0, iw, ih, 0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let gi = 0; gi < 12; gi++) {
      const gx = hash2i(gi, 11) * width;
      const gy = hash2i(gi, 77) * height;
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + gi * 2.7);
      const a = 0.15 + tw * 0.6;
      const L = (10 + hash2i(gi, 33) * 22) * (width / 1920);
      ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
      ctx.lineWidth = Math.max(1, 1.6 * (width / 1920));
      ctx.beginPath();
      ctx.moveTo(gx - L, gy);
      ctx.lineTo(gx + L, gy);
      ctx.moveTo(gx, gy - L);
      ctx.lineTo(gx, gy + L);
      ctx.stroke();
      const dot = ctx.createRadialGradient(gx, gy, 0, gx, gy, L * 0.5);
      dot.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(2) + ')');
      dot.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = dot;
      ctx.fillRect(gx - L * 0.5, gy - L * 0.5, L, L);
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.45);
    glow.addColorStop(0, 'rgba(255,180,210,' + (0.05 + pulse * 0.03).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255,180,210,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, p]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: p.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { CandyCheck };
export type { CheckScheme };

import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type PlateScheme = 'white' | 'warm' | 'cool' | 'rose' | 'sage';

interface PolyPlatesProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: PlateScheme;
}

const SCHEMES: Record<PlateScheme, { tr: number; tg: number; tb: number; bg: string }> = {
  white: { tr: 1.0, tg: 1.0, tb: 1.02, bg: '#8f8f93' },
  warm:  { tr: 1.06, tg: 0.97, tb: 0.86, bg: '#93887c' },
  cool:  { tr: 0.88, tg: 0.95, tb: 1.06, bg: '#7e8894' },
  rose:  { tr: 1.06, tg: 0.92, tb: 0.95, bg: '#93848a' },
  sage:  { tr: 0.92, tg: 1.02, tb: 0.94, bg: '#848b82' },
};

const PI2 = Math.PI * 2;

function hash2(i: number, j: number) {
  let s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

type Pt = [number, number];

function clipBisector(poly: Pt[], s: Pt, q: Pt): Pt[] {
  const out: Pt[] = [];
  const nx = q[0] - s[0];
  const ny = q[1] - s[1];
  const c = (q[0] * q[0] + q[1] * q[1] - s[0] * s[0] - s[1] * s[1]) / 2;
  const inside = (p: Pt) => p[0] * nx + p[1] * ny <= c;
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) {
        const dx = cur[0] - prev[0];
        const dy = cur[1] - prev[1];
        const denom = dx * nx + dy * ny;
        if (Math.abs(denom) > 1e-9) {
          const k = (c - prev[0] * nx - prev[1] * ny) / denom;
          out.push([prev[0] + dx * k, prev[1] + dy * k]);
        }
      }
      out.push(cur);
    } else if (prevIn) {
      const dx = cur[0] - prev[0];
      const dy = cur[1] - prev[1];
      const denom = dx * nx + dy * ny;
      if (Math.abs(denom) > 1e-9) {
        const k = (c - prev[0] * nx - prev[1] * ny) / denom;
        out.push([prev[0] + dx * k, prev[1] + dy * k]);
      }
    }
  }
  return out;
}

function tracePoly(ctx: CanvasRenderingContext2D, poly: Pt[]) {
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    if (i === 0) ctx.moveTo(poly[i][0], poly[i][1]);
    else ctx.lineTo(poly[i][0], poly[i][1]);
  }
  ctx.closePath();
}

const PolyPlates: React.FC<PolyPlatesProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'white',
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

    const unit = width / 1920;
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, width, height);

    const GX = 6;
    const GY = 5;
    const seeds: Pt[] = [];
    for (let j = -1; j <= GY; j++) {
      for (let i = -1; i <= GX; i++) {
        const jx = (hash2(i, j) - 0.5) * 0.7;
        const jy = (hash2(i + 50, j + 90) - 0.5) * 0.7;
        seeds.push([
          ((i + 0.5 + jx) / GX) * width,
          ((j + 0.5 + jy) / GY) * height,
        ]);
      }
    }

    const orbit = t * 2 + 0.8;
    const lx = Math.cos(orbit);
    const ly = Math.sin(orbit);

    const m = Math.max(width, height) * 0.2;
    interface Cell { poly: Pt[]; h: number; }
    const cells: Cell[] = [];
    for (let si = 0; si < seeds.length; si++) {
      let poly: Pt[] = [[-m, -m], [width + m, -m], [width + m, height + m], [-m, height + m]];
      for (let sj = 0; sj < seeds.length; sj++) {
        if (sj === si) continue;
        poly = clipBisector(poly, seeds[si], seeds[sj]);
        if (poly.length === 0) break;
      }
      if (poly.length < 3) continue;
      const base = hash2(si, 7);
      const ndx = (seeds[si][0] - width * 0.5) / (width * 0.5);
      const ndy = (seeds[si][1] - height * 0.5) / (height * 0.5);
      const dist = Math.sqrt(ndx * ndx + ndy * ndy) / Math.SQRT2;
      const h = Math.max(0.05, 0.5 + 0.28 * base + 0.38 * Math.sin(t * 2 - dist * 3.0));
      cells.push({ poly, h });
    }
    cells.sort((a, b) => a.h - b.h);

    for (const cell of cells) {
      const L = Math.floor(168 + cell.h * 62);
      const top = Math.min(248, L + 14);
      const bot = Math.max(120, L - 10);

      ctx.save();
      ctx.shadowColor = 'rgba(20,22,28,0.4)';
      ctx.shadowBlur = (10 + cell.h * 30) * unit;
      ctx.shadowOffsetX = -lx * 30 * unit * cell.h;
      ctx.shadowOffsetY = -ly * 30 * unit * cell.h;
      tracePoly(ctx, cell.poly);
      const fg = ctx.createLinearGradient(
        width * 0.5 - lx * width * 0.45, height * 0.5 - ly * height * 0.45,
        width * 0.5 + lx * width * 0.45, height * 0.5 + ly * height * 0.45,
      );
      const tR = Math.min(255, Math.floor(top * s.tr));
      const tG = Math.min(255, Math.floor(top * s.tg));
      const tB = Math.min(255, Math.floor(Math.min(255, top + 4) * s.tb));
      const bR = Math.min(255, Math.floor(bot * s.tr));
      const bG = Math.min(255, Math.floor(bot * s.tg));
      const bB = Math.min(255, Math.floor(Math.min(255, bot + 6) * s.tb));
      fg.addColorStop(0, 'rgb(' + tR + ',' + tG + ',' + tB + ')');
      fg.addColorStop(1, 'rgb(' + bR + ',' + bG + ',' + bB + ')');
      ctx.fillStyle = fg;
      ctx.fill();
      ctx.restore();

      tracePoly(ctx, cell.poly);
      ctx.strokeStyle = 'rgba(40,42,48,0.85)';
      ctx.lineWidth = Math.max(1, 2.2 * unit);
      ctx.stroke();

      tracePoly(ctx, cell.poly);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(0.5, 1 * unit);
      ctx.stroke();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sheen = ctx.createLinearGradient(
      width * 0.5 - lx * width * 0.6, height * 0.5 - ly * height * 0.6,
      width * 0.5 + lx * width * 0.1, height * 0.5 + ly * height * 0.1,
    );
    sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    const vg = ctx.createRadialGradient(width * 0.5, height * 0.45, height * 0.3, width * 0.5, height * 0.5, height * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(90,90,100,0.15)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, s]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: s.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { PolyPlates };
export type { PlateScheme };

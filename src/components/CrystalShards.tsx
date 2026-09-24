import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type ShardScheme = 'silver' | 'gold' | 'ice' | 'rose' | 'emerald';

interface CrystalShardsProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: ShardScheme;
}

const SCHEMES: Record<ShardScheme, { tr: number; tg: number; tb: number; bg: string }> = {
  silver:  { tr: 1.0, tg: 1.0, tb: 1.02, bg: '#101014' },
  gold:    { tr: 1.08, tg: 0.95, tb: 0.78, bg: '#141008' },
  ice:     { tr: 0.85, tg: 0.94, tb: 1.08, bg: '#0a1016' },
  rose:    { tr: 1.08, tg: 0.9, tb: 0.94, bg: '#140a10' },
  emerald: { tr: 0.88, tg: 1.04, tb: 0.92, bg: '#081410' },
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

const CrystalShards: React.FC<CrystalShardsProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'silver',
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

    const orbit = t * 2 + 0.6;
    const lx = Math.cos(orbit);
    const ly = Math.sin(orbit);

    const GX = 4;
    const GY = 3;
    const seeds: Pt[] = [];
    for (let j = -1; j <= GY; j++) {
      for (let i = -1; i <= GX; i++) {
        const jx = (hash2(i, j) - 0.5) * 0.85;
        const jy = (hash2(i + 50, j + 90) - 0.5) * 0.85;
        seeds.push([
          ((i + 0.5 + jx) / GX) * width,
          ((j + 0.5 + jy) / GY) * height,
        ]);
      }
    }

    const m = Math.max(width, height) * 0.25;
    interface Cell { poly: Pt[]; tiltX: number; tiltY: number; seed: number; }
    const cells: Cell[] = [];
    for (let si = 0; si < seeds.length; si++) {
      let poly: Pt[] = [[-m, -m], [width + m, -m], [width + m, height + m], [-m, height + m]];
      for (let sj = 0; sj < seeds.length; sj++) {
        if (sj === si) continue;
        poly = clipBisector(poly, seeds[si], seeds[sj]);
        if (poly.length === 0) break;
      }
      if (poly.length < 3) continue;
      cells.push({
        poly,
        tiltX: hash2(si, 21) * 2 - 1,
        tiltY: hash2(si, 33) * 2 - 1,
        seed: si,
      });
    }

    for (const cell of cells) {
      const facing = Math.max(0, Math.min(1, 0.5 + 0.5 * (cell.tiltX * lx + cell.tiltY * ly)));
      const shimmer = 0.5 + 0.5 * Math.sin(t * 2 + cell.seed * 1.7);

      let cx = 0;
      let cy = 0;
      for (const v of cell.poly) { cx += v[0]; cy += v[1]; }
      cx /= cell.poly.length;
      cy /= cell.poly.length;

      for (let e = 0; e < cell.poly.length; e++) {
        const v0 = cell.poly[e];
        const v1 = cell.poly[(e + 1) % cell.poly.length];
        const mx = (v0[0] + v1[0]) / 2 - cx;
        const my = (v0[1] + v1[1]) / 2 - cy;
        const ml = Math.sqrt(mx * mx + my * my) || 1;
        const orient = 0.5 + 0.5 * ((mx / ml) * lx + (my / ml) * ly);
        const triSeed = hash2(cell.seed, e * 3 + 1);
        const tb = Math.pow(facing * (0.45 + 0.55 * orient), 1.4) * (0.6 + 0.65 * triSeed);
        const L = Math.floor(10 + Math.min(1, tb) * 232 + shimmer * 10);
        const cc = Math.max(6, Math.min(248, L));
        const fR = Math.min(255, Math.floor(cc * s.tr));
        const fG = Math.min(255, Math.floor(cc * s.tg));
        const fB = Math.min(255, Math.floor(Math.min(255, cc + 5) * s.tb));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(v0[0], v0[1]);
        ctx.lineTo(v1[0], v1[1]);
        ctx.closePath();
        ctx.fillStyle = 'rgb(' + fR + ',' + fG + ',' + fB + ')';
        ctx.fill();
      }

      ctx.save();
      tracePoly(ctx, cell.poly);
      ctx.clip();
      ctx.translate(2.2 * unit, 0);
      tracePoly(ctx, cell.poly);
      ctx.strokeStyle = 'rgba(90,140,255,' + (0.10 + facing * 0.22).toFixed(2) + ')';
      ctx.lineWidth = Math.max(1, 2.4 * unit);
      ctx.stroke();
      ctx.translate(-4.4 * unit, 0);
      tracePoly(ctx, cell.poly);
      ctx.strokeStyle = 'rgba(255,160,80,' + (0.08 + facing * 0.18).toFixed(2) + ')';
      ctx.lineWidth = Math.max(1, 2.4 * unit);
      ctx.stroke();
      ctx.restore();

      tracePoly(ctx, cell.poly);
      ctx.strokeStyle = 'rgba(8,10,14,0.9)';
      ctx.lineWidth = Math.max(1, 2.6 * unit);
      ctx.stroke();

      tracePoly(ctx, cell.poly);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.15 + facing * 0.5).toFixed(2) + ')';
      ctx.lineWidth = Math.max(0.6, 1.2 * unit);
      ctx.stroke();
    }

    ctx.save();
    const vg = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.3, width * 0.5, height * 0.5, height * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.22)');
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

export { CrystalShards };
export type { ShardScheme };

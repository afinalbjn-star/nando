import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type HexScheme = 'blue' | 'teal' | 'violet' | 'amber' | 'rose';

interface HexSphereProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: HexScheme;
}

const SCHEMES: Record<HexScheme, { gr: number; gg: number; gb: number; disc0: string; disc1: string; bg: string; tr: number; tg: number; tb: number }> = {
  blue:   { gr: 70, gg: 170, gb: 255, disc0: '#5a6274', disc1: '#3c4250', bg: '#e6e6ea', tr: 245, tg: 247, tb: 252 },
  teal:   { gr: 40, gg: 220, gb: 200, disc0: '#54686a', disc1: '#37474a', bg: '#e2e8e6', tr: 45, tg: 212, tb: 191 },
  violet: { gr: 150, gg: 100, gb: 255, disc0: '#5e5878', disc1: '#403a54', bg: '#e6e4ea', tr: 139, tg: 92, tb: 246 },
  amber:  { gr: 255, gg: 175, gb: 80, disc0: '#6e6252', disc1: '#4c4438', bg: '#eae6e0', tr: 245, tg: 158, tb: 11 },
  rose:   { gr: 255, gg: 95, gb: 150, disc0: '#6e5660', disc1: '#4c3942', bg: '#eae4e7', tr: 244, tg: 63, tb: 94 },
};

const PI2 = Math.PI * 2;

function hash2(i: number, j: number) {
  let s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function squashedHex(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  rx: number, ry: number, k: number,
) {
  const rl = Math.sqrt(rx * rx + ry * ry) || 1;
  const nx = rx / rl, ny = ry / rl;
  const tx = -ny, ty = nx;
  ctx.beginPath();
  for (let vi = 0; vi < 6; vi++) {
    const a = (Math.PI / 3) * vi + Math.PI / 6;
    const vx = r * Math.cos(a);
    const vy = r * Math.sin(a);
    const vr = vx * nx + vy * ny;
    const vt = vx * tx + vy * ty;
    const px = x + nx * vr * k + tx * vt;
    const py = y + ny * vr * k + ty * vt;
    if (vi === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

const HexSphere: React.FC<HexSphereProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'blue',
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

    const bg = ctx.createLinearGradient(0, 0, width, 0);
    bg.addColorStop(0, '#dcdbe0');
    bg.addColorStop(0.45, '#eeeeF1'.toLowerCase());
    bg.addColorStop(1, '#d5d4d9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.98;
    const cy = height * 0.52;
    const R = height * 1.05;

    ctx.save();
    const disc = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.1, cx, cy, R);
    disc.addColorStop(0, s.disc0);
    disc.addColorStop(0.7, s.disc1);
    disc.addColorStop(1, 'rgba(60,66,80,0)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, PI2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, PI2);
    ctx.clip();
    for (let g = 0; g < 40; g++) {
      const ga = hash2(g, 7) * PI2;
      const gr = (0.2 + hash2(g, 13) * 0.75) * R;
      const gx = cx + Math.cos(ga) * gr;
      const gy = cy + Math.sin(ga) * gr;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + hash2(g, 29) * PI2);
      const rad = R * (0.02 + hash2(g, 41) * 0.035);
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      gg.addColorStop(0, 'rgba(' + s.gr + ',' + s.gg + ',' + s.gb + ',' + (0.25 + pulse * 0.35).toFixed(3) + ')');
      gg.addColorStop(1, 'rgba(' + s.gr + ',' + s.gg + ',' + s.gb + ',0)');
      ctx.fillStyle = gg;
      ctx.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
    }
    ctx.restore();

    const rot = t;
    const pitch = R * 0.128;
    const tileR = pitch * 0.485;

    const LX = -0.45, LY = 0.85, LZ = 0.4;
    const llen = Math.sqrt(LX * LX + LY * LY + LZ * LZ);

    interface Tile { x: number; y: number; z: number; size: number; shade: number; rx: number; ry: number; k: number; }
    const tiles: Tile[] = [];
    const ROWS = 26;
    for (let j = 0; j < ROWS; j++) {
      const phi = (0.07 + (0.86 * j) / (ROWS - 1)) * Math.PI;
      const ringR = Math.sin(phi);
      if (ringR < 0.1) continue;
      const n = Math.max(8, Math.round((PI2 * R * ringR) / pitch));
      const stagger = (j % 2) * (Math.PI / n);
      for (let i = 0; i < n; i++) {
        const th = (((i / n) * PI2 + stagger + rot) % PI2 + PI2) % PI2;
        const sx = Math.sin(phi) * Math.sin(th);
        const sy = Math.cos(phi);
        const sz = Math.sin(phi) * Math.cos(th);
        if (sz < -0.05) continue;
        const dot = (sx * LX + sy * LY + sz * LZ) / llen;
        const shade = Math.max(0.15, Math.min(1, 0.38 + dot * 0.72));
        const zn = (sz + 1) / 2;
        const x = cx + sx * R;
        const y = cy - sy * R;
        if (x < -tileR * 2 || x > width + tileR * 2 || y < -tileR * 2 || y > height + tileR * 2) continue;
        tiles.push({
          x, y, z: sz,
          size: tileR * (0.55 + 0.45 * zn),
          shade: shade * (0.55 + 0.45 * zn),
          rx: x - cx, ry: y - cy,
          k: Math.max(0.22, Math.min(1, sz * 1.15)),
        });
      }
    }
    tiles.sort((a, b) => a.z - b.z);

    for (const tl of tiles) {
      const ex = tl.size * 0.12;
      const ey = tl.size * 0.16;
      const side = Math.floor(120 + tl.shade * 70);
      const sR = Math.floor(side * 0.35 + s.tr * 0.45);
      const sG = Math.floor(side * 0.35 + s.tg * 0.45);
      const sB = Math.floor(Math.min(255, side + 10) * 0.35 + s.tb * 0.45);
      squashedHex(ctx, tl.x + ex, tl.y + ey, tl.size, tl.rx, tl.ry, tl.k);
      ctx.fillStyle = 'rgb(' + sR + ',' + sG + ',' + sB + ')';
      ctx.fill();
      squashedHex(ctx, tl.x + ex, tl.y + ey, tl.size, tl.rx, tl.ry, tl.k);
      ctx.strokeStyle = 'rgba(10,14,22,0.35)';
      ctx.lineWidth = Math.max(0.6, tl.size * 0.018);
      ctx.stroke();

      const blend = scheme === 'blue' ? 0.12 : 0.8;
      const top = Math.floor(215 + tl.shade * 40);
      const bot = Math.floor(175 + tl.shade * 55);
      const tR = Math.floor(top * (1 - blend) + s.tr * blend);
      const tG = Math.floor(top * (1 - blend) + s.tg * blend);
      const tB = Math.floor(Math.min(255, top + 5) * (1 - blend) + s.tb * blend);
      const bR = Math.floor(bot * (1 - blend) + s.tr * blend * 0.9);
      const bG = Math.floor(bot * (1 - blend) + s.tg * blend * 0.9);
      const bB = Math.floor(Math.min(255, bot + 9) * (1 - blend) + s.tb * blend * 0.9);
      const fg = ctx.createLinearGradient(tl.x - tl.size * 0.7, tl.y - tl.size * 0.8, tl.x + tl.size * 0.7, tl.y + tl.size * 0.8);
      fg.addColorStop(0, 'rgb(' + Math.min(255, tR + 12) + ',' + Math.min(255, tG + 12) + ',' + Math.min(255, tB + 12) + ')');
      fg.addColorStop(0.45, 'rgb(' + tR + ',' + tG + ',' + tB + ')');
      fg.addColorStop(1, 'rgb(' + Math.floor(bR * 0.82) + ',' + Math.floor(bG * 0.82) + ',' + Math.floor(bB * 0.85) + ')');

      ctx.save();
      ctx.shadowColor = 'rgba(15,20,30,0.5)';
      ctx.shadowBlur = tl.size * 0.45;
      ctx.shadowOffsetX = tl.size * 0.06;
      ctx.shadowOffsetY = tl.size * 0.16;
      squashedHex(ctx, tl.x, tl.y, tl.size * 0.92, tl.rx, tl.ry, tl.k);
      ctx.fillStyle = fg;
      ctx.fill();
      ctx.restore();

      squashedHex(ctx, tl.x, tl.y, tl.size * 0.92, tl.rx, tl.ry, tl.k);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + tl.shade * 0.35).toFixed(2) + ')';
      ctx.lineWidth = Math.max(0.6, tl.size * 0.022);
      ctx.stroke();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sp = ctx.createRadialGradient(
        tl.x - tl.size * 0.28, tl.y - tl.size * 0.32, 0,
        tl.x - tl.size * 0.28, tl.y - tl.size * 0.32, tl.size * 0.55,
      );
      sp.addColorStop(0, 'rgba(255,255,255,' + (0.10 + tl.shade * 0.12).toFixed(2) + ')');
      sp.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sp;
      squashedHex(ctx, tl.x, tl.y, tl.size * 0.92, tl.rx, tl.ry, tl.k);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    const vg = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.3, width * 0.5, height * 0.5, height * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(120,120,135,0.16)');
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

export { HexSphere };
export type { HexScheme };

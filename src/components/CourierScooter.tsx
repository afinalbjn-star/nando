import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useCurrentFrame, delayRender, continueRender } from 'remotion';
import { loadKurirArt, type KurirArt } from './kurirArt';

interface CourierScooterProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  grain?: boolean;
}

const PI2 = Math.PI * 2;

const C_WHITE = '#FFFFFF';
const C_CLOUD = '#E4EDF9';
const C_SKY_1 = '#FBFDFF';
const C_SKY_2 = '#F2F7FC';
const C_SKY_3 = '#E6EEF8';
const C_SKY_4 = '#D3E0F0';
const C_ROAD_1 = '#8AA0BE';
const C_ROAD_2 = '#7B90AF';
const C_ROAD_3 = '#6A7F9F';
const C_FAR_1 = '#D6E2F1';
const C_FAR_2 = '#C4D3E7';
const C_FAR_3 = '#B4C7E0';
const C_MID_1 = '#A8BFD8';
const C_MID_2 = '#93AECD';
const C_BUSH = '#A9C0D6';
const C_POLE = '#93A9C2';
const C_TIRE = '#1B2C46';
const C_RIM = '#C8D6E5';
const C_HUB = '#2F6FA8';
const C_SMOKE = '143,163,188';

const rgba = (c: string, a: number) => `rgba(${c},${a.toFixed(3)})`;

const W = 1920;
const H = 1080;

const PATTERN_W = 4800;
const SCROLL_CYCLES = 3;
const DASH_W = 200;
const CLOUDS = 5;
const PUFFS = 7;
const LEAVES = 12;

const HORIZON = 0.6;
const ROAD_TOP = 0.66;
const CONTACT = 0.925;

const ART_S = 1.42;
const ART_ORIGIN_X = 0.545 * W;
const WHEEL_REV = 17;

const WHEELS = [
  { x: 487, y: 616, tire: 90, rim: 44 },
  { x: 858, y: 617, tire: 84, rim: 42 },
];

const EXHAUST = { x: 958, y: 634 };

type SegKind = 'far' | 'mid' | 'bush' | 'lamp';
type Seg = { x: number; w: number; h: number; kind: SegKind; tone: number };

function hash1(i: number, s: number) {
  const v = Math.sin(i * 78.233 + s * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1)));
  return t * t * (3 - 2 * t);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function makeGrainTile(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const v = 124 + (s - Math.floor(s)) * 32;
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

const CourierScooter: React.FC<CourierScooterProps> = ({
  width = 1920,
  height = 1080,
  totalFrames = 300,
  speed = 1,
  grain = true,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [art, setArt] = useState<KurirArt | null>(null);
  const [handle] = useState(() => delayRender('Load kurir.svg'));
  const loop = ((frame % totalFrames) + totalFrames) % totalFrames;
  const u = (loop / totalFrames) * speed;
  const osc = (k: number, phase = 0) => Math.sin(PI2 * (k * u + phase));

  const grainTile = useMemo(() => (grain ? makeGrainTile(160) : null), [grain]);

  useEffect(() => {
    let alive = true;
    loadKurirArt()
      .then((a) => {
        if (alive) setArt(a);
        continueRender(handle);
      })
      .catch(() => {
        continueRender(handle);
      });
    return () => {
      alive = false;
    };
  }, [handle]);

  const segs = useMemo(() => {
    const out: Seg[] = [];
    let x = 0;
    let i = 0;
    while (x < PATTERN_W) {
      const far = hash1(i, 3) < 0.6;
      const roll = hash1(i, 7);
      const kind: SegKind = far ? 'far' : roll < 0.66 ? 'mid' : roll < 0.85 ? 'bush' : 'lamp';
      const w =
        kind === 'far'
          ? 230 + hash1(i, 13) * 300
          : kind === 'mid'
            ? 250 + hash1(i, 17) * 330
            : kind === 'bush'
              ? 170 + hash1(i, 19) * 150
              : 120;
      const h =
        kind === 'far'
          ? 140 + hash1(i, 23) * 230
          : kind === 'mid'
            ? 210 + hash1(i, 29) * 270
            : kind === 'bush'
              ? 80 + hash1(i, 31) * 56
              : 340 + hash1(i, 37) * 60;
      if (x + w > PATTERN_W) break;
      out.push({ x, w, h, kind, tone: hash1(i, 41) });
      x += w;
      i++;
    }
    return out;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !art) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const unit = width / W;
    ctx.setTransform(unit, 0, 0, unit, 0, 0);

    const hz = HORIZON * H;
    const rt = ROAD_TOP * H;
    const ct = CONTACT * H;
    const scroll = ((u * SCROLL_CYCLES) % 1) * PATTERN_W;
    const wrapX = (x: number) => {
      const m = x % PATTERN_W;
      return m < 0 ? m + PATTERN_W : m;
    };

    const bob = 3.2 * osc(2) + 1.5 * osc(4, 0.3);
    const env = smoothstep(0, 0.06, u) * (1 - smoothstep(0.94, 1, u));

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C_SKY_1);
    bg.addColorStop(0.38, C_SKY_2);
    bg.addColorStop(0.6, C_SKY_3);
    bg.addColorStop(1, C_SKY_4);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const halo = ctx.createRadialGradient(W * 0.46, hz * 0.86, 0, W * 0.46, hz * 0.86, W * 0.5);
    halo.addColorStop(0, 'rgba(255,255,255,0.72)');
    halo.addColorStop(0.6, 'rgba(255,255,255,0.2)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    for (let i = 0; i < CLOUDS; i++) {
      const bx = wrapX(hash1(i, 3) * PATTERN_W - scroll);
      const by = H * (0.06 + hash1(i, 5) * 0.16);
      const s = 0.7 + hash1(i, 7) * 0.6;
      for (let k = -1; k <= 1; k++) {
        const x = bx + k * PATTERN_W;
        if (x < -280 || x > W + 280) continue;
        ctx.save();
        ctx.translate(x, by);
        ctx.scale(s, s);
        ctx.fillStyle = C_CLOUD;
        ctx.beginPath();
        ctx.arc(-46, 8, 32, 0, PI2);
        ctx.arc(0, -10, 42, 0, PI2);
        ctx.arc(50, 4, 34, 0, PI2);
        ctx.arc(6, 18, 36, 0, PI2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(-16, -2, 27, 0, PI2);
        ctx.arc(26, 6, 23, 0, PI2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    const drawSeg = (seg: Seg, x: number) => {
      const base = hz;
      if (seg.kind === 'far' || seg.kind === 'mid') {
        const h = seg.h;
        const w = seg.w;
        const y = base - h;
        const g = ctx.createLinearGradient(0, y, 0, base);
        if (seg.kind === 'far') {
          g.addColorStop(0, C_FAR_1);
          g.addColorStop(1, C_FAR_2);
        } else {
          g.addColorStop(0, C_MID_1);
          g.addColorStop(1, C_MID_2);
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 10);
        ctx.fill();
        ctx.fillStyle = seg.kind === 'far' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        roundRect(ctx, x + w * 0.12, y + h * 0.07, w * 0.34, h * 0.09, 5);
        ctx.fill();
        ctx.fillStyle = seg.kind === 'far' ? 'rgba(255,255,255,0.6)' : 'rgba(122,158,196,0.5)';
        const cols = Math.max(2, Math.round(seg.w / 80));
        const rows = Math.max(2, Math.round(seg.h / 94));
        const pad = 24;
        const cw = (w - pad * 2) / cols;
        const ch = (h - pad * 1.5) / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (hash1(r * 31 + c, seg.tone * 97) < 0.22) continue;
            ctx.fillRect(x + pad + c * cw, y + pad * 0.7 + r * ch, cw * 0.5, ch * 0.44);
          }
        }
      } else if (seg.kind === 'bush') {
        const w = seg.w;
        const h = seg.h;
        ctx.fillStyle = C_BUSH;
        for (let b = 0; b < 3; b++) {
          const r = h * (0.5 + hash1(b, seg.tone * 13) * 0.35);
          ctx.beginPath();
          ctx.arc(x + w * (0.22 + b * 0.28), base - r * 0.7, r, 0, PI2);
          ctx.fill();
        }
        ctx.fillStyle = C_MID_2;
        ctx.beginPath();
        roundRect(ctx, x + w * 0.08, base - h * 0.3, w * 0.84, h * 0.32, h * 0.16);
        ctx.fill();
      } else {
        const w = seg.w;
        const poleH = seg.h;
        ctx.strokeStyle = C_POLE;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.62, base);
        ctx.lineTo(x + w * 0.62, base - poleH);
        ctx.quadraticCurveTo(x + w * 0.62, base - poleH - 15, x + w * 0.34, base - poleH - 15);
        ctx.stroke();
        ctx.fillStyle = C_WHITE;
        ctx.beginPath();
        ctx.ellipse(x + w * 0.24, base - poleH - 12, 15, 9, 0, 0, PI2);
        ctx.fill();
      }
    };

    ctx.save();
    for (const seg of segs) {
      const bx = wrapX(seg.x - scroll);
      for (let k = -1; k <= 1; k++) {
        const x = bx + k * PATTERN_W;
        if (x + seg.w < -40 || x > W + 40) continue;
        drawSeg(seg, x);
      }
    }
    ctx.restore();

    ctx.save();
    const haze = ctx.createLinearGradient(0, hz - 200, 0, hz + 30);
    haze.addColorStop(0, 'rgba(238,245,252,0)');
    haze.addColorStop(0.7, 'rgba(233,242,251,0.5)');
    haze.addColorStop(1, 'rgba(226,237,249,0.8)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, hz - 200, W, 230);
    ctx.restore();

    const far = ctx.createLinearGradient(0, hz - 24, 0, rt + 8);
    far.addColorStop(0, 'rgba(216,229,244,0.72)');
    far.addColorStop(0.45, 'rgba(198,214,234,0.9)');
    far.addColorStop(1, 'rgba(180,199,224,1)');
    ctx.fillStyle = far;
    ctx.fillRect(0, hz - 24, W, rt - hz + 32);

    const road = ctx.createLinearGradient(0, rt, 0, H);
    road.addColorStop(0, C_ROAD_1);
    road.addColorStop(0.35, C_ROAD_2);
    road.addColorStop(1, C_ROAD_3);
    ctx.fillStyle = road;
    ctx.fillRect(0, rt, W, H - rt);

    const dashScroll = scroll % DASH_W;
    const dashRow = (y: number, len: number, hgt: number, color: string) => {
      ctx.fillStyle = color;
      for (let x = -DASH_W * 2; x < W + DASH_W * 2; x += DASH_W) {
        const dx = (((x - dashScroll) % (DASH_W * 2)) + DASH_W * 2) % (DASH_W * 2) - DASH_W;
        ctx.beginPath();
        roundRect(ctx, dx, y, len, hgt, hgt / 2);
        ctx.fill();
      }
    };
    ctx.save();
    dashRow(0.755 * H, 96, 8, 'rgba(255,255,255,0.72)');
    dashRow(0.955 * H, 158, 13, 'rgba(255,255,255,0.9)');
    ctx.restore();

    const edge = ctx.createLinearGradient(0, rt - 5, 0, rt + 12);
    edge.addColorStop(0, 'rgba(255,255,255,0.62)');
    edge.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, rt - 5, W, 17);

    ctx.save();
    ctx.strokeStyle = C_WHITE;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const yy = H * (0.36 + i * 0.048);
      const len = 74 + i * 38;
      const xx = W * 0.02 + ((u * 2 + i * 0.17) % 1) * W * 0.18;
      ctx.lineWidth = 2.8 - i * 0.3;
      ctx.globalAlpha = (0.42 - i * 0.065) * env;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + len, yy);
      ctx.stroke();
    }
    ctx.restore();

    const artCx = (art.bbox.x0 + art.bbox.x1) / 2;
    const artBottom = art.bbox.y1;
    const toScreenX = (x: number) => ART_ORIGIN_X + (x - artCx) * ART_S;
    const toScreenY = (y: number) => ct - (artBottom - y) * ART_S;
    const joltX = 3.4 * osc(3) + 1.5 * osc(7, 0.3);
    const joltY = bob + 2.4 * osc(5, 0.15);
    const lean = 0.007 * osc(1, 0.15);

    ctx.save();
    ctx.globalAlpha = 0.15 * env;
    ctx.fillStyle = C_WHITE;
    ctx.beginPath();
    ctx.ellipse(ART_ORIGIN_X + 20 + joltX, ct + 10, ART_S * 288, ART_S * 24, 0, 0, PI2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(ART_ORIGIN_X - artCx * ART_S + joltX, ct - artBottom * ART_S + joltY);
    ctx.scale(ART_S, ART_S);
    ctx.translate(artCx, artBottom);
    ctx.rotate(lean);
    ctx.translate(-artCx, -artBottom);
    for (const p of art.paths) {
      ctx.fillStyle = p.fill;
      ctx.fill(p.path);
    }

    for (const wh of WHEELS) {
      ctx.save();
      ctx.translate(wh.x, wh.y);
      ctx.rotate(PI2 * WHEEL_REV * u);
      ctx.strokeStyle = 'rgba(226,238,250,0.13)';
      ctx.lineWidth = wh.tire * 0.11;
      ctx.beginPath();
      ctx.arc(0, 0, wh.tire * 0.88, -0.55, 0.85);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(8,18,32,0.4)';
      ctx.lineWidth = wh.tire * 0.08;
      ctx.beginPath();
      ctx.arc(0, 0, wh.tire * 0.88, Math.PI - 0.35, Math.PI + 0.7);
      ctx.stroke();
      ctx.fillStyle = C_RIM;
      for (let sIdx = 0; sIdx < 5; sIdx++) {
        ctx.save();
        ctx.rotate((sIdx / 5) * PI2);
        ctx.beginPath();
        roundRect(ctx, -wh.rim * 0.13, -wh.rim * 0.9, wh.rim * 0.26, wh.rim * 0.66, wh.rim * 0.13);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      ctx.fillStyle = C_HUB;
      ctx.beginPath();
      ctx.arc(wh.x, wh.y, wh.rim * 0.24, 0, PI2);
      ctx.fill();
    }
    ctx.restore();

    const exhX = toScreenX(EXHAUST.x);
    const exhY = toScreenY(EXHAUST.y);
    ctx.save();
    for (let i = 0; i < PUFFS; i++) {
      const life = (u * 3 + i / PUFFS) % 1;
      const drift = life * 190;
      const px = exhX + drift;
      const py = exhY - drift * 0.34 + 9 * osc(1, i * 0.7);
      const r = 12 + life * 46;
      const a = Math.sin(Math.PI * Math.min(1, life * 1.1)) * 0.62 * env;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, rgba('255,255,255', a * 0.95));
      g.addColorStop(0.5, rgba(C_SMOKE, a * 0.72));
      g.addColorStop(1, rgba(C_SMOKE, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, PI2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for (let i = 0; i < LEAVES; i++) {
      const life = (u * 2 + hash1(i, 3)) % 1;
      const lx = W * 0.05 + ((hash1(i, 5) + u * 0.35) % 1) * W;
      const ly = H * 0.16 + life * H * 0.46 + 12 * osc(1, i * 0.3);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(PI2 * (2 * u + i * 0.4));
      ctx.globalAlpha = Math.sin(Math.PI * life) * 0.45 * env;
      ctx.fillStyle = i % 3 === 0 ? '#F0A24A' : i % 3 === 1 ? '#F2C14E' : '#A9C6EC';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 7, 0, 0, PI2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    if (grainTile) {
      const pat = ctx.createPattern(grainTile, 'repeat');
      if (pat) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.04;
        const go = Math.round(u * 160) % 160;
        ctx.translate(-go, -((go * 61) % 160));
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, width + 160, height + 160);
        ctx.restore();
      }
    }
  }, [frame, width, height, totalFrames, speed, u, art, segs, grainTile, grain]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: C_SKY_2 }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { CourierScooter };

import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

interface DigitalStageProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  grain?: boolean;
  aberration?: boolean;
}

const PI2 = Math.PI * 2;

const BEATS = 24;
const DROP_U = 0.5;
const STROBE = 24;

const C_CYAN = '120, 232, 255';
const C_MAGENTA = '255, 70, 172';
const C_VIOLET = '150, 110, 255';
const C_AMBER = '255, 198, 120';
const C_WHITE = '236, 248, 255';

const WALL_COLS = 28;
const WALL_ROWS = 10;
const BARS = 57;
const SPARKS = 96;
const MOTES = 110;
const BEAMS = 6;
const LASERS = 15;
const FLOOR_LINES = 26;
const RINGS = 6;
const WALL_LEVELS = 16;

function hash1(i: number, s: number) {
  const v = Math.sin(i * 91.3458 + s * 47.1137) * 47453.5453;
  return v - Math.floor(v);
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1)));
  return t * t * (3 - 2 * t);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
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
      const v = 100 + (s - Math.floor(s)) * 52;
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

const DigitalStage: React.FC<DigitalStageProps> = ({
  width = 1920,
  height = 1080,
  totalFrames = 300,
  speed = 1,
  grain = true,
  aberration = true,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loop = ((frame % totalFrames) + totalFrames) % totalFrames;
  const u = (loop / totalFrames) * speed;
  const osc = (k: number, phase = 0) => Math.sin(PI2 * (k * u + phase));

  const grainTile = useMemo(() => (grain ? makeGrainTile(160) : null), [grain]);

  const wallColors = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < WALL_LEVELS; i++) {
      const f = i / (WALL_LEVELS - 1);
      const r = Math.round(16 + f * 108);
      const g = Math.round(20 + f * 74);
      const b = Math.round(74 + f * 178);
      out.push(`rgba(${r},${g},${b},1)`);
    }
    return out;
  }, []);

  const crowd = useMemo(() => {
    const rows = [
      { count: 17, y: 0.885, r: 0.0195, tone: 'rgba(9,13,26,0.94)', bob: 0.0035, ph: 0.0, arms: 5, seed: 3 },
      { count: 14, y: 0.928, r: 0.0255, tone: 'rgba(4,6,15,0.97)', bob: 0.0055, ph: 0.41, arms: 4, seed: 17 },
      { count: 11, y: 0.982, r: 0.0325, tone: 'rgba(0,0,3,1)', bob: 0.0075, ph: 0.77, arms: 3, seed: 29 },
    ];
    type Head = { x: number; y: number; r: number; ph: number };
    const layers: { tone: string; bob: number; ph: number; heads: Head[]; phones: Head[] }[] = [];
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const heads: Head[] = [];
      const phones: Head[] = [];
      const stride = Math.max(2, Math.floor(row.count / row.arms));
      for (let i = 0; i < row.count; i++) {
        const lane = (i + 0.5) / row.count + (hash1(ri, row.seed) - 0.5) * 0.05;
        const r = row.r * (0.86 + hash1(i, row.seed) * 0.3);
        const ph = hash1(i, row.seed + 5);
        heads.push({ x: lane, y: row.y + (hash1(i, row.seed + 9) - 0.5) * 0.012, r, ph });
        if (i % stride === 1) {
          phones.push({ x: lane, y: row.y - row.r * 3.6, r: 1.5 * hash1(i, row.seed + 13) + 1.1, ph });
        }
      }
      layers.push({ tone: row.tone, bob: row.bob, ph: row.ph, heads, phones });
    }
    return layers;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const unit = width / 1920;
    const cx = width * 0.5;
    const trussY = height * 0.112;
    const wallTop = height * 0.145;
    const wallBot = height * 0.6;
    const horizon = height * 0.652;
    const boothBase = height * 0.8;
    const wallX = width * 0.075;
    const wallW = width * 0.85;
    const wallH = wallBot - wallTop;

    const env = smoothstep(0, 0.1, u) * (1 - smoothstep(0.9, 1, u));
    const drop =
      smoothstep(DROP_U - 0.1, DROP_U, u) * (1 - smoothstep(DROP_U + 0.1, DROP_U + 0.28, u));
    const energy = 0.46 + 0.54 * env;
    const bp = (u * BEATS + 0.5) % 1;
    const bar = Math.floor(u * BEATS + 0.5);
    const kick = Math.exp(-bp * bp * 15);
    const snare = bar % 4 === 1 || bar % 4 === 3 ? Math.exp(-bp * bp * 26) : 0;
    const hit = Math.min(1, kick * 0.85 + snare * 0.55);
    const strobeOn = drop > 0.5 && Math.floor(u * STROBE) % 2 === 0 ? 1 : 0;

    const shakeX = 5 * unit * drop * osc(9);
    const shakeY = 3.4 * unit * drop * osc(11);

    const bg = ctx.createRadialGradient(cx, height * 0.42, 0, cx, height * 0.5, height * 1.15);
    bg.addColorStop(0, '#241a52');
    bg.addColorStop(0.36, '#120f34');
    bg.addColorStop(0.68, '#08081c');
    bg.addColorStop(1, '#03030c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    const wallGlow = ctx.createRadialGradient(cx, wallTop + wallH * 0.5, 0, cx, wallTop + wallH * 0.5, width * 0.62);
    wallGlow.addColorStop(0, `rgba(96,72,220,${(0.3 * energy).toFixed(3)})`);
    wallGlow.addColorStop(0.45, `rgba(60,60,190,${(0.14 * energy).toFixed(3)})`);
    wallGlow.addColorStop(1, 'rgba(40,40,140,0)');
    ctx.fillStyle = wallGlow;
    ctx.fillRect(-40, -40, width + 80, height + 80);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cellW = wallW / WALL_COLS;
    const cellH = wallH / WALL_ROWS;
    const gap = Math.max(1, 1.8 * unit);
    for (let r = 0; r < WALL_ROWS; r++) {
      for (let c = 0; c < WALL_COLS; c++) {
        const qx = ((c + 0.5) / WALL_COLS) * 2 - 1;
        const qy = (r + 0.5) / WALL_ROWS;
        const d = Math.sqrt(qx * qx * 0.85 + qy * qy * 0.7);
        const v =
          0.3 * (0.5 + 0.5 * osc(2, -d * 0.85)) +
          0.45 * (0.5 + 0.5 * osc(3, d * 0.55 - qx * 0.25)) +
          0.25 * (0.5 + 0.5 * osc(5, qx * 0.4 + qy * 0.6));
        const lv = Math.min(WALL_LEVELS - 1, Math.floor(v * WALL_LEVELS * energy));
        ctx.globalAlpha = 0.04 + 0.34 * Math.pow(lv / (WALL_LEVELS - 1), 1.7);
        ctx.fillStyle = wallColors[lv];
        ctx.fillRect(wallX + c * cellW + gap, wallTop + r * cellH + gap, cellW - gap * 2, cellH - gap * 2);
      }
    }
    ctx.globalAlpha = 1;

    const scanY = wallTop + ((u + 0.18) % 1) * wallH;
    const scan = ctx.createLinearGradient(0, scanY - 70 * unit, 0, scanY + 70 * unit);
    scan.addColorStop(0, 'rgba(180,220,255,0)');
    scan.addColorStop(0.5, `rgba(200,235,255,${(0.1 * energy).toFixed(3)})`);
    scan.addColorStop(1, 'rgba(180,220,255,0)');
    ctx.fillStyle = scan;
    ctx.fillRect(wallX, scanY - 70 * unit, wallW, 140 * unit);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(150,190,255,${(0.2 * energy).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 2.4 * unit);
    ctx.beginPath();
    roundRect(ctx, wallX, wallTop, wallW, wallH, 10 * unit);
    ctx.stroke();
    ctx.strokeStyle = `rgba(90,120,255,${(0.12 * energy).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 8 * unit);
    ctx.stroke();
    ctx.restore();

    const wallVig = ctx.createRadialGradient(
      cx,
      wallTop + wallH * 0.52,
      wallH * 0.16,
      cx,
      wallTop + wallH * 0.52,
      wallW * 0.62
    );
    wallVig.addColorStop(0, 'rgba(0,0,0,0)');
    wallVig.addColorStop(0.62, 'rgba(4,3,14,0.28)');
    wallVig.addColorStop(1, 'rgba(3,2,10,0.62)');
    ctx.fillStyle = wallVig;
    ctx.fillRect(wallX - 20 * unit, wallTop - 20 * unit, wallW + 40 * unit, wallH + 40 * unit);

    const baseGlow = ctx.createLinearGradient(0, wallBot - height * 0.06, 0, wallBot + height * 0.02);
    baseGlow.addColorStop(0, `rgba(${C_CYAN},0)`);
    baseGlow.addColorStop(0.75, `rgba(${C_CYAN},${(0.12 * energy).toFixed(3)})`);
    baseGlow.addColorStop(1, `rgba(${C_VIOLET},${(0.05 * energy).toFixed(3)})`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = baseGlow;
    ctx.fillRect(wallX, wallBot - height * 0.06, wallW, height * 0.08);
    ctx.restore();

    const barGrad = ctx.createLinearGradient(0, wallBot - height * 0.34, 0, wallBot);
    barGrad.addColorStop(0, `rgba(255,228,248,${(0.8 * energy).toFixed(3)})`);
    barGrad.addColorStop(0.3, `rgba(${C_MAGENTA},${(0.8 * energy).toFixed(3)})`);
    barGrad.addColorStop(0.68, `rgba(${C_VIOLET},${(0.66 * energy).toFixed(3)})`);
    barGrad.addColorStop(1, `rgba(${C_CYAN},${(0.5 * energy).toFixed(3)})`);

    const barW = (wallW * 0.98) / BARS;
    const barBase = wallBot;
    const bars = new Path2D();
    const barGlow = new Path2D();
    const caps = new Path2D();
    const barHs: number[] = [];
    for (let i = 0; i < BARS; i++) {
      const q = (i / (BARS - 1)) * 2 - 1;
      const s =
        (0.52 * osc(2, q * 0.35) +
          0.3 * osc(3, q * 0.62 + 0.2) +
          0.2 * osc(5, q * 1.1 + 0.5) +
          0.14 * osc(8, q * 1.7)) /
        1.16;
      let h = Math.pow(Math.max(0, (s + 1) / 2), 1.45);
      h *= (0.55 + 0.45 * env) * (1 + drop * 0.5 + hit * 0.2);
      h *= 1 - Math.abs(q) * 0.34;
      const bh = Math.max(2 * unit, h * height * 0.3);
      barHs.push(bh);
      const x = wallX + wallW * 0.01 + i * barW;
      bars.rect(x + gap, barBase - bh, barW - gap * 2, bh);
      barGlow.rect(x - barW * 0.35, barBase - bh * 1.02, barW * 1.7, bh * 1.04);
      caps.rect(x + gap, barBase - bh, barW - gap * 2, Math.max(1.5, 2.6 * unit));
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${C_VIOLET},${(0.13 * energy).toFixed(3)})`;
    ctx.fill(barGlow);
    ctx.fillStyle = barGrad;
    ctx.fill(bars);
    ctx.fillStyle = `rgba(${C_WHITE},${(0.8 * energy).toFixed(3)})`;
    ctx.fill(caps);

    for (let i = 0; i < BARS; i++) {
      const x = wallX + wallW * 0.01 + i * barW;
      const rh = barHs[i] * 0.5;
      ctx.fillStyle = `rgba(${C_CYAN},${(0.1 * energy).toFixed(3)})`;
      ctx.fillRect(x + gap, barBase, barW - gap * 2, rh);
    }
    const fade = ctx.createLinearGradient(0, barBase, 0, barBase + height * 0.16);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, barBase, width, height * 0.16);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lampY = trussY + height * 0.034;
    for (let i = 0; i < BEAMS; i++) {
      const fx = cx + (i - (BEAMS - 1) / 2) * width * 0.148;
      const spread = 0.34 * osc(1, i * 0.19) * (1 - 0.72 * drop) + (i - (BEAMS - 1) / 2) * 0.035;
      const len = height * (1.02 + 0.06 * hit);
      const ex = fx + Math.sin(spread) * len;
      const ey = lampY + Math.cos(spread) * len;
      const col = i % 3 === 0 ? C_CYAN : i % 3 === 1 ? C_MAGENTA : C_VIOLET;
      const a = (0.13 + 0.2 * energy + 0.2 * drop) * (0.62 + 0.38 * hit);
      for (let pass = 0; pass < 2; pass++) {
        const hw = (pass === 0 ? width * 0.1 : width * 0.026) * (1 + drop * 0.4);
        const g = ctx.createLinearGradient(fx, lampY, ex, ey);
        g.addColorStop(0, `rgba(${col},${(a * (pass === 0 ? 0.14 : 0.5)).toFixed(3)})`);
        g.addColorStop(0.06, `rgba(${C_WHITE},${(a * (pass === 0 ? 0.12 : 0.5)).toFixed(3)})`);
        g.addColorStop(0.24, `rgba(${col},${(a * (pass === 0 ? 0.2 : 0.8)).toFixed(3)})`);
        g.addColorStop(0.72, `rgba(${col},${(a * (pass === 0 ? 0.1 : 0.34)).toFixed(3)})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(fx - hw * 0.1, lampY);
        ctx.lineTo(ex - hw, ey);
        ctx.lineTo(ex + hw, ey);
        ctx.lineTo(fx + hw * 0.1, lampY);
        ctx.closePath();
        ctx.fill();
      }
      const lr = (13 + 7 * hit) * unit * (1 + drop * 0.5);
      const lg = ctx.createRadialGradient(fx, lampY, 0, fx, lampY, lr);
      lg.addColorStop(0, `rgba(255,255,255,${(0.6 * energy + 0.2 * drop).toFixed(3)})`);
      lg.addColorStop(0.3, `rgba(${col},${(0.42 * energy).toFixed(3)})`);
      lg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = lg;
      ctx.fillRect(fx - lr, lampY - lr, lr * 2, lr * 2);
    }

    const laserA = drop;
    if (laserA > 0.01) {
      const sweep = 0.42 * osc(1, 0.1);
      for (let i = 0; i < LASERS; i++) {
        const f = (i / (LASERS - 1)) * 2 - 1;
        const a = f * 0.62 + sweep;
        const len = height * 1.15;
        const ex = cx + Math.sin(a) * len;
        const ey = trussY + Math.cos(a) * len;
        const col = i % 3 === 0 ? C_MAGENTA : i % 3 === 1 ? C_CYAN : C_VIOLET;
        const alpha = laserA * (0.2 + 0.3 * (1 - Math.abs(f) * 0.55)) * (0.55 + 0.45 * hit);
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = `rgba(${col},${(alpha * (pass === 0 ? 0.18 : 0.8)).toFixed(3)})`;
          ctx.lineWidth = pass === 0 ? 9 * unit : Math.max(1, 2 * unit);
          ctx.beginPath();
          ctx.moveTo(cx, trussY);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let f = 0; f < 3; f++) {
      const fy = horizon * (0.55 + f * 0.19) + 26 * unit * osc(1, f * 0.4);
      const fh = height * (0.1 + f * 0.04);
      const g = ctx.createLinearGradient(0, fy - fh, 0, fy + fh);
      const col = f === 0 ? C_VIOLET : f === 1 ? C_CYAN : C_MAGENTA;
      g.addColorStop(0, `rgba(${col},0)`);
      g.addColorStop(0.5, `rgba(${col},${(0.055 * energy * (1 + drop)).toFixed(3)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, fy - fh, width, fh * 2);
    }
    ctx.restore();

    const floor = ctx.createLinearGradient(0, horizon - height * 0.022, 0, height);
    floor.addColorStop(0, 'rgba(10,9,30,0)');
    floor.addColorStop(0.05, `rgba(16,14,44,${(0.55 * energy).toFixed(3)})`);
    floor.addColorStop(0.35, 'rgba(9,8,26,0.85)');
    floor.addColorStop(1, 'rgba(3,3,10,0.97)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon - height * 0.022, width, height - horizon + height * 0.022);

    const pool = ctx.createRadialGradient(cx, horizon + height * 0.05, 0, cx, horizon + height * 0.05, width * 0.52);
    pool.addColorStop(0, `rgba(${C_VIOLET},${(0.15 * energy).toFixed(3)})`);
    pool.addColorStop(0.5, `rgba(${C_MAGENTA},${(0.055 * energy).toFixed(3)})`);
    pool.addColorStop(1, 'rgba(80,60,220,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = pool;
    ctx.fillRect(0, horizon, width, height - horizon);
    ctx.restore();

    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < FLOOR_LINES; i++) {
      const z = (i + u) % 1;
      const y = horizon + (height - horizon) * (z * z);
      if (y > height + 4) continue;
      const a = 0.02 + 0.13 * z * z * energy + drop * 0.03 * z;
      const g = ctx.createLinearGradient(0, y, width, y);
      g.addColorStop(0, 'rgba(150,190,255,0)');
      g.addColorStop(0.22, `rgba(150,190,255,${(a * 0.55).toFixed(4)})`);
      g.addColorStop(0.5, `rgba(170,205,255,${a.toFixed(4)})`);
      g.addColorStop(0.78, `rgba(150,190,255,${(a * 0.55).toFixed(4)})`);
      g.addColorStop(1, 'rgba(150,190,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(0.6, (0.8 + z * z * 2.6) * unit);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let j = -10; j <= 10; j++) {
      if (j === 0) continue;
      const spread = 1 + Math.abs(j) * 0.14;
      const xb = cx + j * width * 0.135 * spread;
      const xt = cx + (xb - cx) * 0.05;
      ctx.strokeStyle = `rgba(140,180,255,${(0.028 + 0.038 * energy).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.6, 1.1 * unit);
      ctx.beginPath();
      ctx.moveTo(xt, horizon);
      ctx.lineTo(xb, height);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const z = (i / 5 + u) % 1;
      const y = horizon + (height - horizon) * (z * z);
      const rx = width * (0.16 + 0.34 * z);
      const ry = rx * 0.2;
      const col = i % 2 === 0 ? C_CYAN : C_MAGENTA;
      const a = (0.05 + 0.14 * z) * energy * (0.6 + 0.4 * hit);
      const g = ctx.createRadialGradient(cx, y, 0, cx, y, rx);
      g.addColorStop(0, `rgba(${col},${a.toFixed(3)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.save();
      ctx.translate(cx, y);
      ctx.scale(1, ry / rx);
      ctx.translate(-cx, -y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, y, rx, 0, PI2);
      ctx.fill();
      ctx.restore();
    }
    if (drop > 0.02) {
      for (let i = 0; i < RINGS; i++) {
        const r = (i / RINGS + u * RINGS) % 1;
        const rx = width * (0.06 + r * 0.62);
        const ry = rx * 0.22;
        ctx.strokeStyle = `rgba(${C_CYAN},${(drop * (1 - r) * 0.26).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, (3 - r * 2.2) * unit);
        ctx.beginPath();
        ctx.ellipse(cx, horizon + height * 0.02, rx, ry, 0, 0, PI2);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (drop > 0.01) {
      const flareY = horizon + height * 0.12;
      const core = ctx.createRadialGradient(cx, flareY, 0, cx, flareY, width * 0.46);
      core.addColorStop(0, `rgba(255,240,255,${(0.16 * drop).toFixed(3)})`);
      core.addColorStop(0.38, `rgba(${C_MAGENTA},${(0.09 * drop).toFixed(3)})`);
      core.addColorStop(1, 'rgba(110,70,240,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, width, height);

      const flare = 0.09 * drop + 0.13 * drop * strobeOn;
      ctx.save();
      ctx.translate(cx, flareY);
      ctx.scale(1, 0.055);
      const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.5);
      streak.addColorStop(0, `rgba(${C_WHITE},${flare.toFixed(3)})`);
      streak.addColorStop(0.35, `rgba(${C_CYAN},${(flare * 0.5).toFixed(3)})`);
      streak.addColorStop(0.7, `rgba(${C_MAGENTA},${(flare * 0.18).toFixed(3)})`);
      streak.addColorStop(1, 'rgba(120,80,255,0)');
      ctx.fillStyle = streak;
      ctx.beginPath();
      ctx.arc(0, 0, width * 0.5, 0, PI2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    const boothW = width * 0.27;
    const boothH = height * 0.155;
    const boothX = cx - boothW / 2;
    const boothY = boothBase - boothH;

    ctx.save();
    ctx.fillStyle = 'rgba(4,4,12,0.97)';
    ctx.beginPath();
    roundRect(ctx, boothX, boothY, boothW, boothH, 8 * unit);
    ctx.fill();
    const rim = ctx.createLinearGradient(0, boothY, 0, boothY + boothH * 0.5);
    rim.addColorStop(0, `rgba(${C_CYAN},${(0.75 * energy).toFixed(3)})`);
    rim.addColorStop(1, `rgba(${C_MAGENTA},${(0.1 * energy).toFixed(3)})`);
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1, 3 * unit);
    ctx.stroke();
    ctx.restore();

    const panelW = boothW * 0.62;
    const panelH = boothH * 0.46;
    const panelX = cx - panelW / 2;
    const panelY = boothY + boothH * 0.16;
    ctx.save();
    ctx.fillStyle = 'rgba(6,10,26,0.95)';
    ctx.beginPath();
    roundRect(ctx, panelX, panelY, panelW, panelH, 4 * unit);
    ctx.fill();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const wave = ctx.createLinearGradient(0, panelY, 0, panelY + panelH);
    wave.addColorStop(0, `rgba(${C_CYAN},${(0.85 * energy).toFixed(3)})`);
    wave.addColorStop(0.5, `rgba(${C_MAGENTA},${(0.8 * energy).toFixed(3)})`);
    wave.addColorStop(1, `rgba(${C_VIOLET},${(0.7 * energy).toFixed(3)})`);
    ctx.fillStyle = wave;
    const steps = 46;
    for (let i = 0; i < steps; i++) {
      const f = i / steps;
      const v =
        0.55 * Math.sin(PI2 * (3 * u - f * 1.4)) + 0.3 * Math.sin(PI2 * (5 * u + f * 2.1)) +
        0.18 * Math.sin(PI2 * (2 * u - f * 0.7));
      const bh = panelH * 0.42 * (0.35 + 0.65 * Math.abs(v)) * (0.6 + 0.4 * energy);
      const x = panelX + f * panelW;
      ctx.fillRect(x, panelY + panelH * 0.5 - bh, panelW / steps - 1.4 * unit, bh * 2);
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let d = 0; d < 2; d++) {
      const dx = cx + (d === 0 ? -1 : 1) * boothW * 0.33;
      const dy = boothY + boothH * 0.74;
      const r = boothH * 0.19 * (1 + 0.06 * hit);
      const col = d === 0 ? C_CYAN : C_MAGENTA;
      ctx.strokeStyle = `rgba(${col},${(0.5 * energy).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, 2.2 * unit);
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, PI2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${C_WHITE},${(0.3 * energy).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.8, 1.2 * unit);
      ctx.beginPath();
      ctx.arc(dx, dy, r * 0.62, PI2 * (2 * u + d * 0.3), PI2 * (2 * u + d * 0.3) + 1.5);
      ctx.stroke();
      const lr = r * 0.14;
      const la = PI2 * (2 * u + d * 0.3) + 1.1;
      ctx.fillStyle = `rgba(${C_WHITE},${(0.85 * energy).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(dx + Math.cos(la) * r * 0.62, dy + Math.sin(la) * r * 0.62, Math.max(1, lr), 0, PI2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.97)';
    const figX = cx;
    const figBase = boothY + boothH * 0.06;
    const headR = height * 0.026;
    const headY = figBase - height * 0.105 - 6 * unit * hit;
    ctx.beginPath();
    ctx.arc(figX, headY, headR, 0, PI2);
    ctx.moveTo(figX - headR * 2.6, figBase);
    ctx.quadraticCurveTo(figX - headR * 2.2, headY + headR * 1.1, figX, headY + headR * 0.9);
    ctx.quadraticCurveTo(figX + headR * 2.2, headY + headR * 1.1, figX + headR * 2.6, figBase);
    ctx.closePath();
    ctx.fill();
    const armA = -1.05 + 0.7 * osc(1, 0.05) + drop * 0.85;
    const shX = figX + headR * 1.5;
    const shY = figBase - headR * 1.2;
    const elbowX = shX + Math.cos(armA) * headR * 1.6;
    const elbowY = shY + Math.sin(armA) * headR * 1.6;
    const handX = elbowX + Math.cos(armA * 0.4) * headR * 1.5;
    const handY = elbowY + Math.sin(armA * 0.4) * headR * 1.5;
    ctx.lineCap = 'round';
    ctx.lineWidth = headR * 0.5;
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.quadraticCurveTo(elbowX + headR * 0.35, elbowY - headR * 0.55, handX, handY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(handX, handY, headR * 0.3, 0, PI2);
    ctx.fill();
    ctx.lineWidth = headR * 0.44;
    ctx.beginPath();
    ctx.moveTo(figX - headR * 1.5, shY);
    ctx.quadraticCurveTo(figX - headR * 2.6, shY - headR * 0.4, figX - headR * 2.3, shY - headR * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(figX - headR * 2.3, shY - headR * 1.6, headR * 0.27, 0, PI2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rimL = ctx.createLinearGradient(figX - headR * 2, headY - headR, figX + headR * 2, headY + headR);
    rimL.addColorStop(0, `rgba(${C_MAGENTA},${(0.55 * energy).toFixed(3)})`);
    rimL.addColorStop(1, `rgba(${C_CYAN},${(0.55 * energy).toFixed(3)})`);
    ctx.strokeStyle = rimL;
    ctx.lineWidth = Math.max(1, 2 * unit);
    ctx.beginPath();
    ctx.arc(figX, headY, headR, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    const stripA = 0.35 + 0.5 * hit + drop * 0.3;
    const strip = ctx.createLinearGradient(boothX, 0, boothX + boothW, 0);
    strip.addColorStop(0, `rgba(${C_MAGENTA},${(stripA * 0.8).toFixed(3)})`);
    strip.addColorStop(0.5, `rgba(${C_WHITE},${stripA.toFixed(3)})`);
    strip.addColorStop(1, `rgba(${C_CYAN},${(stripA * 0.8).toFixed(3)})`);
    ctx.fillStyle = strip;
    ctx.fillRect(boothX + boothW * 0.04, boothBase - 5 * unit, boothW * 0.92, Math.max(2, 5 * unit));
    ctx.restore();

    const speakerW = width * 0.108;
    const speakerH = height * 0.215;
    for (let s = 0; s < 2; s++) {
      const sx = s === 0 ? cx - width * 0.29 - speakerW : cx + width * 0.29;
      const sy = boothBase - speakerH + height * 0.012;
      const col = s === 0 ? C_MAGENTA : C_CYAN;
      ctx.save();
      ctx.fillStyle = 'rgba(3,3,9,0.98)';
      ctx.beginPath();
      roundRect(ctx, sx, sy, speakerW, speakerH, 6 * unit);
      ctx.fill();
      ctx.strokeStyle = `rgba(${col},${(0.3 * energy).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, 2 * unit);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      for (let w = 0; w < 2; w++) {
        const wy = sy + speakerH * (0.3 + w * 0.36);
        const wr = speakerW * (0.3 - w * 0.07) * (1 + 0.05 * hit + drop * 0.06);
        const g = ctx.createRadialGradient(sx + speakerW / 2, wy, 0, sx + speakerW / 2, wy, wr);
        g.addColorStop(0, `rgba(${col},${(0.1 * energy).toFixed(3)})`);
        g.addColorStop(0.72, `rgba(${col},${(0.22 * energy).toFixed(3)})`);
        g.addColorStop(0.86, `rgba(${C_WHITE},${(0.3 * energy).toFixed(3)})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx + speakerW / 2, wy, wr, 0, PI2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${C_WHITE},${(0.18 * energy * (0.5 + 0.5 * hit)).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.8, 1.4 * unit);
        ctx.beginPath();
        ctx.arc(sx + speakerW / 2, wy, wr * 0.55, 0, PI2);
        ctx.stroke();
      }
      const tg = ctx.createRadialGradient(sx + speakerW / 2, sy + speakerH * 0.12, 0, sx + speakerW / 2, sy + speakerH * 0.12, speakerW * 0.16);
      tg.addColorStop(0, `rgba(${C_WHITE},${(0.55 * energy).toFixed(3)})`);
      tg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(sx + speakerW / 2, sy + speakerH * 0.12, speakerW * 0.16, 0, PI2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < MOTES; i++) {
      const lane = hash1(i, 71);
      const yy = hash1(i, 83) * height;
      const sp = 1 + Math.floor(hash1(i, 97) * 3);
      const xx = width * ((((u * sp + lane) % 1) + 1) % 1);
      const tw = 0.25 + 0.75 * (0.5 + 0.5 * osc(2, i * 0.13));
      ctx.fillStyle = `rgba(${i % 4 === 0 ? C_CYAN : C_WHITE},${(tw * 0.16 * energy).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(xx, yy + 14 * unit * osc(1, i * 0.31), (0.6 + hash1(i, 101) * 1.5) * unit, 0, PI2);
      ctx.fill();
    }
    if (drop > 0.02) {
      for (let i = 0; i < SPARKS; i++) {
        const life = (u * 2 + hash1(i, 131)) % 1;
        const x0 = hash1(i, 137) * width;
        const sp = 0.4 + hash1(i, 139) * 0.9;
        const y = height * 0.12 + life * height * 0.86 * sp;
        const x = x0 + 40 * unit * osc(1, i * 0.21) + (x0 - cx) * life * 0.18;
        const a = drop * Math.sin(Math.PI * life) * 0.5;
        const col = i % 3 === 0 ? C_CYAN : i % 3 === 1 ? C_MAGENTA : C_AMBER;
        ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(PI2 * (2 * u + i * 0.37));
        ctx.fillRect(-2.4 * unit, -0.9 * unit, 4.8 * unit, 1.8 * unit);
        ctx.restore();
      }
    }
    ctx.restore();

    for (let li = 0; li < crowd.length; li++) {
      const layer = crowd[li];
      const dy =
        layer.bob * height * (0.55 + 0.45 * hit) * osc(1, layer.ph) +
        layer.bob * height * 0.6 * osc(2, layer.ph * 1.7);
      const path = new Path2D();
      for (let i = 0; i < layer.heads.length; i++) {
        const h = layer.heads[i];
        const x = h.x * width;
        const y = h.y * height + dy;
        const r = h.r * height;
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, PI2);
        path.moveTo(x - r * 1.9, height + r);
        path.quadraticCurveTo(x - r * 1.7, y + r * 0.9, x, y + r * 0.85);
        path.quadraticCurveTo(x + r * 1.7, y + r * 0.9, x + r * 1.9, height + r);
        path.closePath();
      }
      ctx.fillStyle = layer.tone;
      ctx.fill(path);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let li = 0; li < crowd.length; li++) {
      const layer = crowd[li];
      const dy = layer.bob * height * (0.55 + 0.45 * hit) * osc(1, layer.ph);
      for (let i = 0; i < layer.phones.length; i++) {
        const ph = layer.phones[i];
        const x = ph.x * width;
        const y = ph.y * height + dy;
        const tw = 0.5 + 0.5 * osc(1, ph.ph * 1.3);
        if (tw < 0.35) continue;
        const r = ph.r * unit * 9 * (0.6 + tw * 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${(0.5 * tw * energy).toFixed(3)})`);
        g.addColorStop(0.3, `rgba(${C_CYAN},${(0.22 * tw * energy).toFixed(3)})`);
        g.addColorStop(1, `rgba(${C_CYAN},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bar2 = ctx.createLinearGradient(0, trussY - 4 * unit, 0, trussY + height * 0.16);
    bar2.addColorStop(0, 'rgba(20,20,40,0)');
    bar2.addColorStop(0.06, `rgba(${C_CYAN},${(0.22 * energy).toFixed(3)})`);
    bar2.addColorStop(0.5, `rgba(${C_VIOLET},${(0.09 * energy).toFixed(3)})`);
    bar2.addColorStop(1, 'rgba(60,40,160,0)');
    ctx.fillStyle = bar2;
    ctx.fillRect(width * 0.06, trussY - 4 * unit, width * 0.88, height * 0.16);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(5,6,16,0.99)';
    for (let i = 0; i < BEAMS; i++) {
      const fx = cx + (i - (BEAMS - 1) / 2) * width * 0.148;
      const fw = width * 0.028;
      const fh = height * 0.036;
      ctx.beginPath();
      ctx.moveTo(fx - fw * 0.5, trussY - height * 0.004);
      ctx.lineTo(fx + fw * 0.5, trussY - height * 0.004);
      ctx.lineTo(fx + fw * 0.34, trussY + fh);
      ctx.lineTo(fx - fw * 0.34, trussY + fh);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(6,7,18,0.98)';
    ctx.lineWidth = Math.max(2, height * 0.014);
    ctx.beginPath();
    ctx.moveTo(width * 0.06, trussY);
    ctx.lineTo(width * 0.94, trussY);
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${C_CYAN},${(0.18 * energy).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 1.4 * unit);
    ctx.beginPath();
    ctx.moveTo(width * 0.06, trussY - height * 0.007);
    ctx.lineTo(width * 0.94, trussY - height * 0.007);
    ctx.moveTo(width * 0.06, trussY + height * 0.007);
    ctx.lineTo(width * 0.94, trussY + height * 0.007);
    ctx.stroke();
    ctx.restore();

    const flashA = drop * (0.035 + 0.1 * strobeOn);
    if (flashA > 0.002) {
      ctx.fillStyle = `rgba(240,248,255,${flashA.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();

    if (aberration) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const o = 6 * unit;
      const warm = ctx.createRadialGradient(cx + o, height * 0.5, height * 0.3, cx + o, height * 0.5, height * 0.95);
      warm.addColorStop(0, 'rgba(255,70,140,0)');
      warm.addColorStop(1, 'rgba(255,70,140,0.05)');
      const cool = ctx.createRadialGradient(cx - o, height * 0.5, height * 0.3, cx - o, height * 0.5, height * 0.95);
      cool.addColorStop(0, 'rgba(70,140,255,0)');
      cool.addColorStop(1, 'rgba(70,140,255,0.06)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = cool;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    const vg = ctx.createRadialGradient(cx, height * 0.46, height * 0.28, cx, height * 0.5, height * 0.98);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.7, 'rgba(2,2,8,0.22)');
    vg.addColorStop(1, 'rgba(1,1,5,0.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);

    if (grainTile) {
      const pat = ctx.createPattern(grainTile, 'repeat');
      if (pat) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.055;
        const go = Math.round(u * 160) % 160;
        ctx.translate(-go, -((go * 61) % 160));
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, width + 160, height + 160);
        ctx.restore();
      }
    }
  }, [frame, width, height, totalFrames, speed, u, crowd, grainTile, grain, aberration, wallColors]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#03030c' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { DigitalStage };

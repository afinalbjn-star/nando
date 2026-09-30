import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { AMERICA_PTS, AMERICA_LAND } from './landData';
import { splitAntimeridian, pointInRings, type LonLat } from './geo';

interface AmericaSignalProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  grain?: boolean;
  aberration?: boolean;
}

const PI2 = Math.PI * 2;

const VIEW = { lon0: -178, lon1: -26, lonCenter: -100, lat0: -42, lat1: 68 };
const PEAK_U = 0.6;

const HUBS: LonLat[] = [
  [-122.4, 37.8],
  [-74.0, 40.7],
  [-79.4, 43.7],
  [-99.1, 19.4],
  [-74.1, 4.7],
  [-77.0, -12.0],
  [-46.6, -23.5],
  [-58.4, -34.6],
];

const ROUTES: [number, number][] = [
  [0, 1], [0, 3], [1, 2], [1, 4], [1, 6], [3, 4],
  [4, 5], [4, 6], [5, 6], [6, 7], [3, 6], [0, 6],
];

const TAIL_SEGS = 26;
const TAIL_LEN = 0.3;
const TAIL_SIGMA = 0.055;
const PULSES = 2;
const TAIL_LEVELS = 6;

function hash2(i: number, j: number) {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const d = edge1 - edge0;
  if (d === 0) return x < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - edge0) / d));
  return t * t * (3 - 2 * t);
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
      const v = 106 + (s - Math.floor(s)) * 44;
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

const AmericaSignal: React.FC<AmericaSignalProps> = ({
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
  const t = (loop / totalFrames) * PI2 * speed;
  const u = t / PI2;

  const model = useMemo(() => {
    const rings = splitAntimeridian(AMERICA_LAND);
    const land: LonLat[] = [];
    const ocean: LonLat[] = [];
    for (const p of AMERICA_PTS) {
      if (pointInRings(p, rings)) land.push(p);
      else ocean.push(p);
    }
    return { rings, land, ocean };
  }, []);

  const grainTile = useMemo(() => (grain ? makeGrainTile(160) : null), [grain]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const unit = width / 1920;
    const lonSpan = VIEW.lon1 - VIEW.lon0;
    const latSpan = VIEW.lat1 - VIEW.lat0;
    const scale = (height * 0.965) / latSpan;
    const mapW = lonSpan * scale;
    const mapH = latSpan * scale;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const zoom = 1 + 0.028 * Math.sin(t);
    const driftX = Math.sin(t) * 7 * unit;
    const driftY = Math.cos(t) * 5 * unit;
    const X = (lon: number) => cx + (lon - VIEW.lonCenter) * scale * zoom + driftX;
    const Y = (lat: number) => cy - (lat - (VIEW.lat0 + VIEW.lat1) / 2) * scale * zoom + driftY;

    const peak = Math.exp(-((u - PEAK_U) * (u - PEAK_U)) / (2 * 0.05 * 0.05));
    const px = X(-98);
    const py = Y(38);

    const bg = ctx.createRadialGradient(px, height * 0.4, 0, width * 0.5, height * 0.5, height * 1.05);
    bg.addColorStop(0, '#15477f');
    bg.addColorStop(0.42, '#0b2a55');
    bg.addColorStop(0.78, '#061a34');
    bg.addColorStop(1, '#030c1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const horizon = ctx.createLinearGradient(0, height * 0.58, 0, height);
    horizon.addColorStop(0, 'rgba(30,110,200,0)');
    horizon.addColorStop(1, 'rgba(40,130,225,0.20)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, width, height);

    const limb = ctx.createRadialGradient(cx, cy, mapH * 0.12, cx, cy, mapH * 0.78);
    limb.addColorStop(0, 'rgba(60,140,240,0.20)');
    limb.addColorStop(0.55, 'rgba(45,110,210,0.09)');
    limb.addColorStop(1, 'rgba(30,80,180,0)');
    ctx.fillStyle = limb;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = Math.max(0.5, 0.8 * unit);
    for (let lon = Math.ceil(VIEW.lon0 / 10) * 10; lon <= VIEW.lon1; lon += 10) {
      const gx = X(lon);
      if (gx < 0 || gx > width) continue;
      const major = lon % 30 === 0;
      ctx.strokeStyle = major ? 'rgba(130,195,255,0.075)' : 'rgba(110,175,245,0.038)';
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let lat = Math.ceil(VIEW.lat0 / 10) * 10; lat <= VIEW.lat1; lat += 10) {
      const gy = Y(lat);
      if (gy < 0 || gy > height) continue;
      const major = lat === 0;
      ctx.strokeStyle = major ? 'rgba(150,210,255,0.10)' : 'rgba(110,175,245,0.038)';
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    const tick = 9 * unit;
    for (let lon = Math.ceil(VIEW.lon0 / 10) * 10; lon <= VIEW.lon1; lon += 10) {
      const gx = X(lon);
      if (gx < 0 || gx > width) continue;
      const major = lon % 30 === 0;
      const len = major ? tick * 1.5 : tick;
      ctx.strokeStyle = major ? 'rgba(150,210,255,0.20)' : 'rgba(120,185,250,0.10)';
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, len);
      ctx.moveTo(gx, height);
      ctx.lineTo(gx, height - len);
      ctx.stroke();
    }
    for (let lat = Math.ceil(VIEW.lat0 / 10) * 10; lat <= VIEW.lat1; lat += 10) {
      const gy = Y(lat);
      if (gy < 0 || gy > height) continue;
      const major = lat % 30 === 0;
      const len = major ? tick * 1.5 : tick;
      ctx.strokeStyle = major ? 'rgba(150,210,255,0.20)' : 'rgba(120,185,250,0.10)';
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(len, gy);
      ctx.moveTo(width, gy);
      ctx.lineTo(width - len, gy);
      ctx.stroke();
    }
    ctx.restore();

    const traceRings = (rings: LonLat[][]) => {
      ctx.beginPath();
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          const x = X(ring[i][0]);
          const y = Y(ring[i][1]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
    };

    ctx.save();
    ctx.shadowColor = 'rgba(80,175,255,0.6)';
    ctx.shadowBlur = 30 * unit;
    traceRings(model.rings);
    ctx.fillStyle = 'rgba(4,17,38,0.93)';
    ctx.fill();
    ctx.restore();

    traceRings(model.rings);
    ctx.strokeStyle = 'rgba(105,190,255,0.40)';
    ctx.lineWidth = Math.max(1, 4.2 * unit);
    ctx.stroke();

    traceRings(model.rings);
    ctx.strokeStyle = 'rgba(198,238,255,0.94)';
    ctx.lineWidth = Math.max(0.8, 1.5 * unit);
    ctx.stroke();

    const dotPath = (pts: LonLat[], radius: (i: number) => number) => {
      const p = new Path2D();
      for (let i = 0; i < pts.length; i++) {
        const r = radius(i);
        if (r < 0.2) continue;
        const x = X(pts[i][0]);
        const y = Y(pts[i][1]);
        p.moveTo(x + r, y);
        p.arc(x, y, r, 0, PI2);
      }
      return p;
    };

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(60,130,215,0.22)';
    ctx.fill(dotPath(model.ocean, () => 0.5 * unit));
    ctx.fillStyle = 'rgba(120,180,250,0.30)';
    ctx.fill(dotPath(model.ocean, (i) => (0.32 + hash2(i, 5) * 0.34) * unit));
    for (let b = 0; b < 3; b++) {
      const lo = 0.78 + b * 0.4;
      const hi = lo + 0.4;
      ctx.fillStyle = `rgba(228,246,255,${(0.40 + b * 0.16).toFixed(3)})`;
      ctx.fill(
        dotPath(model.land, (i) => {
          const s = 0.62 + hash2(i, 11) * 0.86;
          return s >= lo && s < hi ? s * unit : 0;
        })
      );
    }
    ctx.restore();

    const hubXY = HUBS.map((h) => ({ x: X(h[0]), y: Y(h[1]) }));

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < hubXY.length; i++) {
      const H = hubXY[i];
      const rr = (16 + 5 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7))) * unit * (1 + peak * 0.5);
      const g = ctx.createRadialGradient(H.x, H.y, 0, H.x, H.y, rr);
      g.addColorStop(0, `rgba(190,235,255,${(0.42 + peak * 0.4).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(110,190,255,${(0.18 + peak * 0.22).toFixed(3)})`);
      g.addColorStop(1, 'rgba(80,160,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(H.x - rr, H.y - rr, rr * 2, rr * 2);
    }
    ctx.restore();

    const pulseU = (ri: number, pk: number) => (((u + ri * 0.0866 + pk / PULSES) % 1) + 1) % 1;
    const routeEnv = (ri: number) =>
      smoothstep(0, 0.09 + ri * 0.004, u) * (1 - smoothstep(0.87, 1, u));

    const quad = (
      A: { x: number; y: number },
      Q: { x: number; y: number },
      B: { x: number; y: number },
      uu: number
    ) => {
      const a = (1 - uu) * (1 - uu);
      const b = 2 * (1 - uu) * uu;
      const c = uu * uu;
      return { x: a * A.x + b * Q.x + c * B.x, y: a * A.y + b * Q.y + c * B.y };
    };

    const corridors = new Path2D();
    const bases = new Path2D();
    const tails: Path2D[] = [];

    for (let ri = 0; ri < ROUTES.length; ri++) {
      const A = hubXY[ROUTES[ri][0]];
      const B = hubXY[ROUTES[ri][1]];
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const lift = len * 0.16;
      const Q = { x: mx - (dy / len) * lift, y: my + (dx / len) * lift };
      const env = routeEnv(ri);
      const widthBoost = 1 + peak * 0.85;
      const alphaBoost = 1 + peak * 1.25;

      for (let pk = 0; pk < PULSES; pk++) {
        const head = pulseU(ri, pk);
        const amt = env * alphaBoost;

        for (let sgi = 0; sgi < TAIL_SEGS; sgi++) {
          const f0 = head - (TAIL_LEN * (sgi + 1)) / TAIL_SEGS;
          const f1 = head - (TAIL_LEN * sgi) / TAIL_SEGS;
          if (f1 < 0) break;
          const mid = (f0 + f1) / 2;
          const d = head - mid;
          const glow = Math.exp(-(d * d) / (2 * TAIL_SIGMA * TAIL_SIGMA));
          if (glow < 0.05) continue;
          const lv = Math.min(TAIL_LEVELS - 1, Math.floor(glow * TAIL_LEVELS));
          let p = tails[lv];
          if (!p) {
            p = new Path2D();
            tails[lv] = p;
          }
          const u0 = Math.max(0, f0);
          const u1 = Math.max(0, f1);
          const p0 = quad(A, Q, B, u0);
          const p1 = quad(A, Q, B, u1);
          p.moveTo(p0.x, p0.y);
          p.lineTo(p1.x, p1.y);
        }

        const hx = quad(A, Q, B, head);
        const hr = (5.5 + peak * 3.5) * unit;
        const hg = ctx.createRadialGradient(hx.x, hx.y, 0, hx.x, hx.y, hr);
        hg.addColorStop(0, `rgba(255,255,255,${Math.min(1, 0.85 * amt).toFixed(3)})`);
        hg.addColorStop(0.35, `rgba(170,225,255,${(0.5 * amt).toFixed(3)})`);
        hg.addColorStop(1, 'rgba(140,200,255,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(hx.x - hr, hx.y - hr, hr * 2, hr * 2);

        if (head > 0.93) {
          const a2 = (head - 0.93) / 0.07;
          const br = a2 * 46 * unit * (1 + peak * 0.6);
          ctx.strokeStyle = `rgba(170,225,255,${((1 - a2) * 0.45 * amt).toFixed(3)})`;
          ctx.lineWidth = Math.max(1, 2.2 * unit);
          ctx.beginPath();
          ctx.arc(A.x, A.y, Math.max(1, br), 0, PI2);
          ctx.stroke();
        }

        if (env < 0.02) continue;
        const uEnd = Math.min(1, head + 0.012);
        if (uEnd < 0.012) continue;
        const a0 = quad(A, Q, B, 0);
        const a1 = quad(A, Q, B, uEnd);
        corridors.moveTo(a0.x, a0.y);
        corridors.lineTo(a1.x, a1.y);
        bases.moveTo(a0.x, a0.y);
        bases.lineTo(a1.x, a1.y);
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(70,150,255,0.10)';
    ctx.lineWidth = Math.max(1, 9 * unit);
    ctx.stroke(corridors);
    ctx.strokeStyle = `rgba(120,190,255,${(0.42 * (1 + peak * 0.6)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 2.4 * unit * (1 + peak * 0.85));
    ctx.stroke(bases);
    for (let lv = 0; lv < TAIL_LEVELS; lv++) {
      const p = tails[lv];
      if (!p) continue;
      const f = (lv + 0.5) / TAIL_LEVELS;
      const hue = lv % 2 === 0 ? '130,220,255' : '180,160,255';
      ctx.strokeStyle = `rgba(${hue},${(0.08 + f * 0.82).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, (0.9 + f * 4.4) * unit * (1 + peak * 0.5) * (1 + peak * 0.4));
      ctx.stroke(p);
    }
    ctx.restore();

    if (u > 0.55 && u < 0.8) {
      const w = (u - 0.55) / 0.25;
      const rr = w * mapW * 0.95;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(180,230,255,${((1 - w) * 0.22).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, 3 * unit * (1 - w * 0.6));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * 0.92, 0, 0, PI2);
      ctx.stroke();
      ctx.restore();
    }

    for (let hi = 0; hi < hubXY.length; hi++) {
      const H = hubXY[hi];
      for (let rk = 0; rk < 2; rk++) {
        const uu = (((u + hi * 0.31 + rk * 0.5) % 1) + 1) % 1;
        const rr = uu * (70 + peak * 40) * unit;
        ctx.strokeStyle = `rgba(130,215,255,${((1 - uu) * 0.5).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, 1.6 * unit);
        ctx.beginPath();
        ctx.arc(H.x, H.y, Math.max(1, rr), 0, PI2);
        ctx.stroke();
      }
      const hr = 9 * unit * (1 + peak * 0.6);
      const hg2 = ctx.createRadialGradient(H.x, H.y, 0, H.x, H.y, hr);
      hg2.addColorStop(0, 'rgba(255,255,255,1)');
      hg2.addColorStop(0.3, 'rgba(150,215,255,0.8)');
      hg2.addColorStop(1, 'rgba(150,215,255,0)');
      ctx.fillStyle = hg2;
      ctx.fillRect(H.x - hr, H.y - hr, hr * 2, hr * 2);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let pi = 0; pi < 150; pi++) {
      const lane = hash2(pi, 3);
      const yy = hash2(pi, 17) * height;
      const speedMul = 0.5 + hash2(pi, 29) * 1.5;
      const xx = width * ((((u * speedMul + lane) % 1) + 1) % 1);
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 3 + pi * 2.1));
      ctx.fillStyle = `rgba(120,200,255,${(tw * 0.32).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(xx, yy, (0.7 + hash2(pi, 41) * 1.3) * unit, 0, PI2);
      ctx.fill();
    }
    const sweepX = width * (0.5 + 0.44 * Math.sin(t));
    const band = ctx.createLinearGradient(sweepX - width * 0.18, 0, sweepX + width * 0.18, 0);
    band.addColorStop(0, 'rgba(150,220,255,0)');
    band.addColorStop(0.5, 'rgba(150,220,255,0.09)');
    band.addColorStop(1, 'rgba(150,220,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    if (aberration) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const o = 5 * unit;
      const r0 = height * 0.34;
      const r1 = height * 0.92;
      const warm = ctx.createRadialGradient(cx + o, cy, r0, cx + o, cy, r1);
      warm.addColorStop(0, 'rgba(255,80,80,0)');
      warm.addColorStop(1, 'rgba(255,70,70,0.045)');
      const cool = ctx.createRadialGradient(cx - o, cy, r0, cx - o, cy, r1);
      cool.addColorStop(0, 'rgba(80,130,255,0)');
      cool.addColorStop(1, 'rgba(70,120,255,0.055)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = cool;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    const vg = ctx.createRadialGradient(cx, cy, height * 0.32, cx, cy, height * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,4,12,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);

    if (grainTile) {
      const pat = ctx.createPattern(grainTile, 'repeat');
      if (pat) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.05;
        const go = Math.round(u * 160) % 160;
        ctx.translate(-go, -((go * 61) % 160));
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, width + 160, height + 160);
        ctx.restore();
      }
    }
  }, [frame, width, height, totalFrames, speed, t, u, model, grainTile, grain, aberration]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#030c1a' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { AmericaSignal };

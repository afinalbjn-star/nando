import React from 'react';
import { useCurrentFrame } from 'remotion';

export type BigDataHudScheme = 'cyan' | 'violet' | 'emerald';

interface BigDataHudProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: BigDataHudScheme;
}

interface Pal {
  bgInner: string;
  bgMid: string;
  bgOuter: string;
  grid: string;
  gridMajor: string;
  ring: string;
  glow: string;
  glow2: string;
  spark: string;
  ink: string;
  num: string;
  panel: string;
}

/* Deep navy ground, saturated blue grid, cyan elements, white type. The
   reference is blue-dominant everywhere except the tick marks themselves. */
const PALETTES: Record<BigDataHudScheme, Pal> = {
  cyan: {
    bgInner: '#04173a', bgMid: '#020d24', bgOuter: '#00040c',
    grid: '#0e3278', gridMajor: '#17499e', ring: '#1b4f9c',
    glow: '#3ee0f0', glow2: '#2f7fe0', spark: '#9df1ff',
    ink: '#eafaff', num: '#7fd8e8', panel: '#0a2a5e',
  },
  violet: {
    bgInner: '#1b0f4a', bgMid: '#0e0730', bgOuter: '#03020c',
    grid: '#2c1a6e', gridMajor: '#3f2596', ring: '#4b2c9e',
    glow: '#c4a2ff', glow2: '#7c4de0', spark: '#ece2ff',
    ink: '#f3eeff', num: '#bda6f5', panel: '#241159',
  },
  emerald: {
    bgInner: '#03342f', bgMid: '#011c1a', bgOuter: '#000807',
    grid: '#0a4a45', gridMajor: '#116c63', ring: '#178a7c',
    glow: '#3ce8d4', glow2: '#1f9e9a', spark: '#c2fff5',
    ink: '#e4fff9', num: '#84e8db', panel: '#07403c',
  },
};

const FONT = 'Inter, "Segoe UI", Helvetica, Arial, sans-serif';

const VB_W = 1600;
const VB_H = 900;
const CX = 800;
const CY = 442;

const R_OUTER = 372;
const R_HOLE = 104;
const R_GAUGE = 136;
const GRID_MINOR = 32;
const GRID_MAJOR = 160;

// Deterministic noise: a seeded LCG evaluated once at module load, so every
// frame and every render sees an identical layout. Never Math.random().
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const hash = (i: number) => ((i * 2654435761) >>> 0) % 1000;

type Tone = 0 | 1 | 2;

interface Ring {
  r: number;
  n: number;
  inLen: number;
  outLen: number;
  w: number;
  op: number;
  rot: number;
  duty: number;
  major: number;
  tone: Tone;
}

// Four full-circle hairline combs.
const RINGS: Ring[] = [
  { r: 146, n: 60, inLen: 4, outLen: 12, w: 0.8, op: 0.5, rot: 2, duty: 1, major: 5, tone: 0 },
  { r: 182, n: 96, inLen: 3, outLen: 16, w: 0.8, op: 0.44, rot: -1, duty: 0.88, major: 8, tone: 0 },
  { r: 236, n: 132, inLen: 3, outLen: 14, w: 0.7, op: 0.34, rot: 3, duty: 0.76, major: 11, tone: 1 },
  { r: 292, n: 168, inLen: 3, outLen: 18, w: 0.7, op: 0.3, rot: -3, duty: 0.62, major: 12, tone: 0 },
  { r: 326, n: 150, inLen: 2, outLen: 12, w: 0.6, op: 0.24, rot: 1, duty: 0.58, major: 15, tone: 1 },
];

interface Sector {
  r: number;
  a0: number;
  span: number;
  n: number;
  inLen: number;
  outLen: number;
  w: number;
  op: number;
  rot: number;
  tone: Tone;
}

// Comb sectors on arcs: a cluster upper left, another lower right. This is the
// gauge-sector texture the reference is built from.
const SECTORS: Sector[] = [
  { r: 164, a0: 0.615, span: 0.17, n: 24, inLen: 5, outLen: 13, w: 0.9, op: 0.7, rot: -2, tone: 0 },
  { r: 198, a0: 0.79, span: 0.14, n: 20, inLen: 4, outLen: 15, w: 0.8, op: 0.6, rot: 1, tone: 0 },
  { r: 226, a0: 0.545, span: 0.15, n: 22, inLen: 4, outLen: 12, w: 0.8, op: 0.55, rot: 3, tone: 0 },
  { r: 264, a0: 0.845, span: 0.12, n: 17, inLen: 5, outLen: 17, w: 0.9, op: 0.62, rot: -1, tone: 0 },
  { r: 300, a0: 0.6, span: 0.1, n: 14, inLen: 4, outLen: 14, w: 0.8, op: 0.48, rot: 2, tone: 1 },
  { r: 212, a0: 0.16, span: 0.13, n: 19, inLen: 4, outLen: 14, w: 0.8, op: 0.55, rot: 1, tone: 0 },
  { r: 280, a0: 0.235, span: 0.1, n: 14, inLen: 5, outLen: 16, w: 0.9, op: 0.5, rot: -2, tone: 0 },
  { r: 178, a0: 0.7, span: 0.12, n: 17, inLen: 4, outLen: 12, w: 0.8, op: 0.6, rot: -1, tone: 0 },
  { r: 252, a0: 0.655, span: 0.13, n: 18, inLen: 4, outLen: 13, w: 0.8, op: 0.52, rot: 2, tone: 0 },
  { r: 314, a0: 0.185, span: 0.08, n: 12, inLen: 5, outLen: 15, w: 0.9, op: 0.46, rot: 1, tone: 1 },
];

interface Bracket {
  r: number;
  span: number;
  off: number;
  w: number;
  op: number;
  rot: number;
  tone: Tone;
}

const BRACKETS: Bracket[] = [
  { r: 186, span: 0.15, off: 0.03, w: 4.4, op: 0.88, rot: 1, tone: 0 },
  { r: 220, span: 0.13, off: 0.5, w: 5, op: 0.86, rot: -2, tone: 0 },
  { r: 220, span: 0.1, off: 0.71, w: 5, op: 0.8, rot: -2, tone: 0 },
  { r: 308, span: 0.07, off: 0.29, w: 3.2, op: 0.6, rot: 3, tone: 0 },
  { r: 146, span: 0.14, off: 0.61, w: 3.4, op: 0.7, rot: -1, tone: 0 },
  { r: 254, span: 0.1, off: 0.15, w: 3, op: 0.5, rot: 2, tone: 1 },
  { r: 336, span: 0.05, off: 0.47, w: 2.8, op: 0.42, rot: 1, tone: 1 },
];

// Dotted rings: the concentric dot bands that give the reference its density.
const DOT_RINGS = [
  { r: 194, n: 46, size: 2.1, op: 0.72, rot: 1 },
  { r: 256, n: 68, size: 1.9, op: 0.58, rot: -2 },
  { r: 284, n: 76, size: 1.6, op: 0.42, rot: 2 },
  { r: 320, n: 92, size: 1.7, op: 0.46, rot: 3 },
];

const SQUARES = (() => {
  const r = lcg(60613);
  const out: { a: number; rad: number; size: number; sw: number; op: number; spin: number; ph: number }[] = [];
  for (let i = 0; i < 30; i++) {
    out.push({
      a: r() * Math.PI * 2,
      rad: 150 + r() * 186,
      size: 8 + r() * 12,
      sw: 0.9 + r() * 1,
      op: 0.4 + r() * 0.45,
      spin: (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3)),
      ph: r(),
    });
  }
  return out;
})();

const TABS = (() => {
  const r = lcg(481516);
  const out: { a: number; rad: number; w: number; h: number; op: number; spin: number; ph: number }[] = [];
  for (let i = 0; i < 28; i++) {
    out.push({
      a: r() * Math.PI * 2,
      rad: 172 + r() * 178,
      w: 5 + r() * 11,
      h: 2.4 + r() * 2.6,
      op: 0.4 + r() * 0.42,
      spin: (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3)),
      ph: r(),
    });
  }
  return out;
})();

// Dark blue translucent cards with a cyan edge, as in the reference.
const PANELS = [
  { a: 0.63, rad: 0.8, w: 56, h: 27, rot: -1 },
  { a: 0.52, rad: 0.63, w: 44, h: 21, rot: 1 },
  { a: 0.3, rad: 0.88, w: 64, h: 29, rot: -1 },
  { a: 0.2, rad: 0.71, w: 40, h: 19, rot: 1 },
  { a: 0.88, rad: 0.69, w: 48, h: 23, rot: 1 },
  { a: 0.42, rad: 0.92, w: 36, h: 17, rot: -1 },
];

// Dashed radial rays reaching past the dial, the sunburst in the reference.
const RAYS = (() => {
  const r = lcg(31415);
  const out: { a: number; r0: number; r1: number; w: number; op: number; dash: number; spin: number }[] = [];
  for (let i = 0; i < 34; i++) {
    out.push({
      a: (i / 34) * Math.PI * 2 + r() * 0.12,
      r0: 158 + r() * 26,
      r1: 330 + r() * 108,
      w: 0.8 + r() * 0.7,
      op: 0.1 + r() * 0.26,
      dash: r() < 0.55 ? 0 : 2 + Math.floor(r() * 7),
      spin: (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3)),
    });
  }
  return out;
})();

const BOKEH = (() => {
  const r = lcg(20240517);
  const out: { a: number; rad: number; size: number; op: number; spin: number; tw: number }[] = [];
  for (let i = 0; i < 58; i++) {
    const spread = [0.86, 1.02, 1.18, 1.34][i % 4];
    out.push({
      a: r() * Math.PI * 2,
      rad: R_OUTER * spread * (0.9 + 0.2 * r()),
      size: 1.4 + r() * 5,
      op: 0.1 + r() * 0.3,
      spin: (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3)),
      tw: r(),
    });
  }
  return out;
})();

const HALO = (() => {
  const r = lcg(112358);
  const out: { a: number; rad: number; size: number; op: number; ph: number }[] = [];
  for (let i = 0; i < 34; i++) {
    out.push({
      a: (i / 34) * Math.PI * 2 + r() * 0.1,
      rad: R_OUTER * (0.9 + 0.16 * r()),
      size: 4 + r() * 7,
      op: 0.2 + r() * 0.45,
      ph: r(),
    });
  }
  return out;
})();

// Numbers cluster in the upper left inside the dial, like the reference.
const NUMBERS = [
  { a: 0.6, rad: 0.52, base: 35, dec: 0, size: 10, spin: 1, ph: 0.0 },
  { a: 0.645, rad: 0.44, base: 84.47, dec: 2, size: 9, spin: -1, ph: 0.16 },
  { a: 0.685, rad: 0.55, base: 47, dec: 0, size: 9, spin: 1, ph: 0.32 },
  { a: 0.72, rad: 0.42, base: 6, dec: 0, size: 10, spin: -1, ph: 0.48 },
  { a: 0.565, rad: 0.68, base: 15, dec: 0, size: 9, spin: 1, ph: 0.64 },
  { a: 0.655, rad: 0.63, base: 4, dec: 0, size: 9, spin: -1, ph: 0.8 },
  { a: 0.7, rad: 0.7, base: 23, dec: 0, size: 9, spin: 1, ph: 0.06 },
  { a: 0.53, rad: 0.47, base: 53.12, dec: 2, size: 9, spin: -1, ph: 0.24 },
  { a: 0.745, rad: 0.58, base: 94.26, dec: 2, size: 9, spin: 1, ph: 0.12 },
  { a: 0.62, rad: 0.74, base: 12, dec: 0, size: 9, spin: -1, ph: 0.44 },
];

const BigDataHud: React.FC<BigDataHudProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];
  const TAU = Math.PI * 2;

  const osc = (k: number, phase = 0) => Math.sin(Math.PI * 2 * (k * u * speed + phase));
  const cyc = (k: number, phase = 0) => 0.5 + 0.5 * osc(k, phase);

  // Every spin multiplier is a whole number, so each ring returns exactly to its
  // starting angle at the loop point.
  const at = (a: number, rad: number, spin = 0) => {
    const t = a + TAU * u * speed * spin;
    return [CX + Math.cos(t) * rad, CY + Math.sin(t) * rad] as const;
  };

  const tone = (t: Tone) => (t === 0 ? p.glow : t === 1 ? p.glow2 : p.spark);

  const minor: number[] = [];
  for (let i = -26; i <= 26; i++) minor.push(i * GRID_MINOR);
  const major: number[] = [];
  for (let i = -11; i <= 11; i++) major.push(i * GRID_MAJOR);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="bd-bg" cx="0.5" cy="0.49" r="0.72">
          <stop offset="0" stopColor={p.bgInner} />
          <stop offset="0.4" stopColor={p.bgMid} />
          <stop offset="1" stopColor={p.bgOuter} />
        </radialGradient>
        <radialGradient id="bd-vig" cx="0.5" cy="0.49" r="0.64">
          <stop offset="0.34" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.84" />
        </radialGradient>
        <radialGradient id="bd-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.34" />
          <stop offset="0.45" stopColor={p.glow} stopOpacity="0.1" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        {/* Blue atmospheric ring halo behind the dial. */}
        <radialGradient id="bd-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.5" stopColor={p.glow2} stopOpacity="0" />
          <stop offset="0.78" stopColor={p.glow2} stopOpacity="0.2" />
          <stop offset="0.92" stopColor={p.glow} stopOpacity="0.12" />
          <stop offset="1" stopColor={p.glow2} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bd-hole" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor={p.bgOuter} stopOpacity="0.95" />
          <stop offset="0.9" stopColor={p.bgOuter} stopOpacity="0.68" />
          <stop offset="1" stopColor={p.bgOuter} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bd-gridfade" cx="0.5" cy="0.49" r="0.62">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <mask id="bd-gridmask">
          <rect width={VB_W} height={VB_H} fill="url(#bd-gridfade)" />
        </mask>

        {/* Reserved for the elements that genuinely glow in the reference. */}
        <filter id="bd-bloom" x="-32%" y="-32%" width="164%" height="164%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="wide" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="tight" />
          <feMerge>
            <feMergeNode in="wide" />
            <feMergeNode in="tight" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bd-bokeh" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.6" />
        </filter>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#bd-bg)" />

      {/* Saturated blue graph-paper grid, the whole frame. */}
      <g mask="url(#bd-gridmask)">
        <g stroke={p.grid} strokeWidth={0.9} opacity={0.6}>
          {minor.map((o, i) => (
            <g key={i}>
              <line x1={o} y1={-400} x2={o} y2={1300} />
              <line x1={-400} y1={o} x2={2000} y2={o} />
            </g>
          ))}
        </g>
        <g stroke={p.gridMajor} strokeWidth={1.3} opacity={0.62}>
          {major.map((o, i) => (
            <g key={i}>
              <line x1={o} y1={-400} x2={o} y2={1300} />
              <line x1={-400} y1={o} x2={2000} y2={o} />
            </g>
          ))}
        </g>
      </g>

      <g transform={`translate(${CX} ${CY}) scale(1.1) translate(${-CX} ${-CY})`}>
        <circle cx={CX} cy={CY} r={352} fill="url(#bd-halo)" />

        <g fill="none" stroke={p.ring} strokeWidth={0.9} opacity={0.5}>
          {[100, 122, 148, 176, 208, 242, 278, 316, 356, 398, 442, 486].map((r, i) => (
            <circle
              key={r} cx={CX} cy={CY} r={r}
              strokeDasharray={i % 3 === 0 ? '2 12' : undefined}
              opacity={0.58 - i * 0.033}
            />
          ))}
        </g>

        <g filter="url(#bd-bokeh)">
          {BOKEH.map((b, i) => {
            const [x, y] = at(b.a, b.rad * (1 + 0.02 * osc(1, b.tw)), b.spin);
            return (
              <circle
                key={i} cx={x} cy={y} r={b.size}
                fill={i % 3 === 0 ? p.glow2 : p.glow}
                opacity={b.op * (0.5 + 0.5 * cyc(1, b.tw))}
              />
            );
          })}
        </g>

        <circle cx={CX} cy={CY} r={162} fill="url(#bd-core)" opacity={0.55 + 0.45 * cyc(1, 0.2)} />

        {/* Dashed rays reaching past the dial. */}
        <g transform={`rotate(${(-360 * u * speed).toFixed(2)} ${CX} ${CY})`}>
          {RAYS.map((ry, i) => {
            const a = ry.a + TAU * u * speed * ry.spin;
            const [x1, y1] = [CX + Math.cos(a) * ry.r0, CY + Math.sin(a) * ry.r0];
            const [x2, y2] = [CX + Math.cos(a) * ry.r1, CY + Math.sin(a) * ry.r1];
            return (
              <line
                key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={i % 4 === 0 ? p.glow : p.glow2}
                strokeWidth={ry.w} strokeLinecap="round"
                strokeDasharray={ry.dash === 0 ? undefined : `${ry.dash} ${ry.dash * 2.2}`}
                opacity={ry.op * (0.6 + 0.4 * cyc(1, i / 34))}
              />
            );
          })}
        </g>

        {/* Crisp hairline full-circle combs. */}
        {RINGS.map((ring, ri) => (
          <g key={ring.r} transform={`rotate(${(ring.rot * 360 * u * speed).toFixed(2)} ${CX} ${CY})`}>
            {Array.from({ length: ring.n }).map((_, i) => {
              if (hash(i * 31 + ri * 7) >= ring.duty * 1000) return null;
              const a = (i / ring.n) * TAU;
              const majorTick = i % ring.major === 0;
              const r1 = ring.r - ring.inLen - (majorTick ? 5 : 0);
              const r2 = ring.r + ring.outLen * (majorTick ? 1.4 : 1);
              const [x1, y1] = at(a, r1);
              const [x2, y2] = at(a, r2);
              return (
                <line
                  key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={tone(ring.tone)}
                  strokeWidth={majorTick ? ring.w * 1.5 : ring.w}
                  strokeLinecap="round"
                  opacity={ring.op * (majorTick ? 1 : 0.7)}
                />
              );
            })}
          </g>
        ))}

        {/* Comb sectors on arcs. */}
        {SECTORS.map((s, si) => (
          <g key={s.r} transform={`rotate(${(s.rot * 360 * u * speed).toFixed(2)} ${CX} ${CY})`}>
            {Array.from({ length: s.n }).map((_, i) => {
              const a = (s.a0 + (i / s.n) * s.span) * TAU;
              const majorTick = i % 5 === 0;
              const r1 = s.r - s.inLen - (majorTick ? 5 : 0);
              const r2 = s.r + s.outLen * (majorTick ? 1.45 : 1);
              const [x1, y1] = at(a, r1);
              const [x2, y2] = at(a, r2);
              return (
                <line
                  key={`${si}-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={tone(s.tone)}
                  strokeWidth={majorTick ? s.w * 1.6 : s.w}
                  strokeLinecap="round"
                  opacity={s.op * (majorTick ? 1 : 0.72)}
                />
              );
            })}
          </g>
        ))}

        {/* Dotted rings. */}
        {DOT_RINGS.map((dr, di) => (
          <g key={dr.r} transform={`rotate(${(dr.rot * 360 * u * speed).toFixed(2)} ${CX} ${CY})`}>
            {Array.from({ length: dr.n }).map((_, i) => {
              const a = (i / dr.n) * TAU;
              const [x, y] = at(a, dr.r);
              return (
                <circle
                  key={i} cx={x} cy={y} r={dr.size * (0.75 + 0.5 * hash(i * 13 + di * 5) / 1000)}
                  fill={i % 4 === 0 ? p.spark : p.glow}
                  opacity={dr.op * (0.5 + 0.5 * cyc(1, i / dr.n))}
                />
              );
            })}
          </g>
        ))}

        {/* Dark blue cards with a cyan edge. */}
        {PANELS.map((pn, i) => {
          const a = pn.a + TAU * u * speed * pn.rot;
          const x = CX + Math.cos(a) * R_OUTER * pn.rad;
          const y = CY + Math.sin(a) * R_OUTER * pn.rad;
          const deg = (a * 180) / Math.PI;
          return (
            <g key={i} transform={`rotate(${deg.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}>
              <rect
                x={x - pn.w / 2} y={y - pn.h / 2} width={pn.w} height={pn.h}
                rx={3} fill={p.panel} fillOpacity={0.62}
                stroke={p.glow} strokeWidth={1} strokeOpacity={0.75}
              />
              <rect
                x={x - pn.w / 2 + 5} y={y - 2.5} width={pn.w - 16} height={1.6}
                fill={p.glow} opacity={0.6}
              />
              <rect
                x={x - pn.w / 2 + 5} y={y + 2.5} width={(pn.w - 16) * 0.6} height={1.6}
                fill={p.glow} opacity={0.35}
              />
            </g>
          );
        })}

        {/* Outlined squares and filled tabs. */}
        {SQUARES.map((s, i) => {
          const [x, y] = at(s.a, s.rad, s.spin);
          const sc = 1 + 0.07 * osc(1, s.ph);
          return (
            <rect
              key={`sq${i}`}
              x={x - (s.size * sc) / 2} y={y - (s.size * sc) / 2}
              width={s.size * sc} height={s.size * sc}
              fill="none" stroke={i % 4 === 0 ? p.spark : p.glow}
              strokeWidth={s.sw}
              opacity={s.op * (0.55 + 0.45 * cyc(1, s.ph))}
              transform={`rotate(${((s.a * 180) / Math.PI).toFixed(2)} ${x} ${y})`}
            />
          );
        })}
        {TABS.map((t, i) => {
          const [x, y] = at(t.a, t.rad, t.spin);
          return (
            <rect
              key={`tb${i}`} x={x - t.w / 2} y={y - t.h / 2} width={t.w} height={t.h}
              rx={1} fill={i % 3 === 0 ? p.spark : p.glow}
              opacity={t.op * (0.5 + 0.5 * cyc(1, t.ph))}
              transform={`rotate(${((t.a * 180) / Math.PI).toFixed(2)} ${x} ${y})`}
            />
          );
        })}

        {/* Only these glow: thick arcs, outer halo dots, gauge. */}
        <g filter="url(#bd-bloom)">
          {BRACKETS.map((b, i) => {
            const C = TAU * b.r;
            return (
              <g key={i} transform={`rotate(${(b.rot * 360 * u * speed).toFixed(2)} ${CX} ${CY})`}>
                <circle
                  cx={CX} cy={CY} r={b.r} fill="none"
                  stroke={tone(b.tone)} strokeWidth={b.w}
                  strokeLinecap="round" opacity={b.op}
                  strokeDasharray={`${b.span * C} ${C}`}
                  strokeDashoffset={-b.off * C}
                />
              </g>
            );
          })}

          {HALO.map((h, i) => {
            const [x, y] = at(h.a, h.rad);
            return (
              <circle
                key={`h${i}`} cx={x} cy={y}
                r={h.size * (0.8 + 0.4 * cyc(1, h.ph))}
                fill={i % 3 === 0 ? p.spark : p.glow}
                opacity={h.op * (0.5 + 0.5 * cyc(1, h.ph))}
              />
            );
          })}

          <g transform={`rotate(${(-90 + 4 * osc(1, 0.3)).toFixed(2)} ${CX} ${CY})`}>
            {Array.from({ length: 22 }).map((_, i) => {
              const a = (-154 + (i / 21) * 128) * (Math.PI / 180);
              const majorTick = i % 6 === 0;
              const [x1, y1] = at(a, R_GAUGE - (majorTick ? 12 : 6));
              const [x2, y2] = at(a, R_GAUGE + 3);
              return (
                <line
                  key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={majorTick ? p.spark : p.glow} strokeWidth={majorTick ? 2.2 : 1.3}
                  strokeLinecap="round" opacity={majorTick ? 0.9 : 0.6}
                />
              );
            })}
          </g>
        </g>

        <circle cx={CX} cy={CY} r={R_HOLE} fill="url(#bd-hole)" />

        {NUMBERS.map((n, i) => {
          const [x, y] = at(n.a, R_OUTER * n.rad, n.spin);
          const raw = n.base + 2.4 * osc(1, n.ph) + 0.8 * osc(2, n.ph * 1.7);
          const text = n.dec > 0 ? raw.toFixed(n.dec) : `${Math.round(raw)}`;
          return (
            <text
              key={i} x={x} y={y} textAnchor="middle" fontFamily={FONT}
              fontSize={n.size} fontWeight={600} letterSpacing={0.4}
              fill={p.num} opacity={0.34 + 0.24 * cyc(1, n.ph)}
            >
              {text}
            </text>
          );
        })}
      </g>

      {/* Flat, crisp white type: no glow, like the reference. */}
      <g transform={`translate(${CX} ${CY}) scale(0.92 1) translate(${-CX} ${-CY})`}>
        <text
          x={CX} y={CY + 16}
          textAnchor="middle" fontFamily={FONT} fontSize={46} fontWeight={600}
          letterSpacing={4} fill={p.ink}
        >
          BIG DATA
        </text>
      </g>

      <rect width={VB_W} height={VB_H} fill="url(#bd-vig)" />
    </svg>
  );
};

export { BigDataHud };
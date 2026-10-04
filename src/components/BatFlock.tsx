import React from 'react';
import { useCurrentFrame } from 'remotion';

export type BatFlockScheme = 'classic' | 'moon' | 'blood';

interface BatFlockProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: BatFlockScheme;
}

interface Pal {
  hot: string;
  mid: string;
  deep: string;
  edge: string;
  bat: string;
}

const PALETTES: Record<BatFlockScheme, Pal> = {
  classic: { hot: '#ffa32b', mid: '#f4830c', deep: '#d06000', edge: '#b84f00', bat: '#050202' },
  moon: { hot: '#2b3c66', mid: '#141d35', deep: '#06080f', edge: '#02030a', bat: '#e9f1ff' },
  blood: { hot: '#8e1122', mid: '#5c0714', deep: '#200409', edge: '#3a0208', bat: '#140204' },
};

const VB_W = 1600;
const VB_H = 900;
const FLOCK = 120;
const NEAR_CUT = 0.9;

// Deterministic noise: a seeded LCG evaluated once at module load, so every
// frame and every render sees an identical layout. Never Math.random().
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/* One scalloped wing in local space: the shoulder sits at (2.5, 1.5). The wing
   rises to a broad rounded leading edge and a deep membrane near the body, then
   returns on three concave scallops. The outer tip stays a curve, not a straight
   segment, or the silhouette reads as a gull rather than a bat. */
const WING =
  'M 2.5,-2 C 11,-8.5 24,-12 38,-11 C 43,-10.6 46.5,-9.2 48.5,-6.5 ' +
  'C 43,-2 40,1 35.5,3.2 C 32,0.6 28.5,3.2 24.5,6.2 ' +
  'C 21,4 17,6.4 13,9.2 C 10,7 6,6 2.5,4.6 Z';

const BODY = 'M 0,-12.6 L -3.6,-13 L -2.4,-8.6 L -3.1,3.4 L 0,9.8 L 3.1,3.4 L 2.4,-8.6 L 3.6,-13 Z';

interface Bat {
  x: number;
  y: number;
  s: number;
  rot: number;
  flapK: number;
  phase: number;
  blur: number;
  depth: number;
  dx: number;
  dy: number;
}

// A tight elliptical swarm left of centre, with a few outliers drifting wide,
// matching the reference where the densest cluster sits mid-left.
const BATS = (() => {
  const r = lcg(10231);
  const out: Bat[] = [];
  const flapPool = [0, 0, 0, 3, 4, 5];
  for (let i = 0; i < FLOCK; i++) {
    const t = r() * Math.PI * 2;
    // Most bats crowd the core; the rest are strays out toward the edges.
    const clustered = r() < 0.68;
    const rad = clustered ? Math.pow(r(), 0.42) * 0.7 : 0.52 + r() * 0.62;
    const depth = Math.pow(r(), 0.9);
    out.push({
      x: 700 + Math.cos(t) * rad * 760,
      y: 424 + Math.sin(t) * rad * 336,
      // Most bats stay small; only the closest few read as foreground.
      s: 0.09 + Math.pow(depth, 1.9) * 1.4,
      rot: (r() - 0.5) * 34,
      flapK: flapPool[Math.floor(r() * flapPool.length)],
      phase: r(),
      blur: depth > 0.52 ? ((depth - 0.52) / 0.48) * (0.45 + r() * 0.5) : r() * 0.12,
      depth,
      dx: (r() - 0.5) * 54,
      dy: (r() - 0.5) * 38,
    });
  }
  // Far bats first so the near ones overlap them.
  return out.sort((a, b) => a.depth - b.depth);
})();

const BatFlock: React.FC<BatFlockProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'classic',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];

  const osc = (k: number, phase = 0) => Math.sin(Math.PI * 2 * (k * u * speed + phase));

  const breathe = 1 + 0.03 * osc(1, 0.3);

  const renderBat = (b: Bat, i: number) => {
    // flapK is always a whole number of cycles, so every bat returns to exactly
    // the pose it started the loop in.
    const flap = Math.sin(Math.PI * 2 * (b.flapK * u * speed + b.phase));
    const amp = 40 * (0.7 + 0.3 * b.depth);
    const angle = flap * amp;
    const spread = b.blur * 7;
    const x = (b.x + osc(1, b.phase) * b.dx).toFixed(2);
    const y = (b.y + osc(1, b.phase + 0.4) * b.dy).toFixed(2);
    // Only the nearest few get a wing smear. Triggering it on most of the flock
    // turns every bat into a tan double image instead of motion blur.
    const copies = b.blur > 0.45 ? [-1, 1] : [0];

    return (
      <g
        key={i}
        transform={`translate(${x} ${y}) rotate(${b.rot.toFixed(2)}) scale(${b.s.toFixed(3)})`}
        fill={p.bat}
      >
        {copies.map((c) => {
          const a = (angle + c * spread).toFixed(2);
          const op = c === 0 ? 0.94 : 0.16;
          return (
            <g key={c}>
              <g transform={`rotate(${-a} -2.5 1.5) scale(-1 1)`}>
                <path d={WING} opacity={op} />
              </g>
              <g transform={`rotate(${a} 2.5 1.5)`}>
                <path d={WING} opacity={op} />
              </g>
            </g>
          );
        })}
        <path d={BODY} />
      </g>
    );
  };

  const far = BATS.filter((b) => b.depth <= NEAR_CUT);
  const near = BATS.filter((b) => b.depth > NEAR_CUT);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="bf-bg" cx="0.42" cy="0.44" r="0.78">
          <stop offset="0" stopColor={p.hot} />
          <stop offset="0.46" stopColor={p.mid} />
          <stop offset="1" stopColor={p.deep} />
        </radialGradient>
        <radialGradient id="bf-vig" cx="0.46" cy="0.46" r="0.72">
          <stop offset="0.4" stopColor={p.edge} stopOpacity="0" />
          <stop offset="1" stopColor={p.edge} stopOpacity="0.62" />
        </radialGradient>
        {/* Defocus for the foreground bats, matching the shallow depth of field
            in the reference. Applied to the whole near group in one pass. */}
        <filter id="bf-near" x="-12%" y="-12%" width="124%" height="124%">
          <feGaussianBlur stdDeviation={1.8} />
        </filter>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#bf-bg)" />

      <g transform={`translate(${VB_W / 2} ${VB_H / 2}) scale(${breathe.toFixed(4)}) translate(${-VB_W / 2} ${-VB_H / 2})`}>
        {far.map(renderBat)}
        <g filter="url(#bf-near)">{near.map(renderBat)}</g>
      </g>

      <rect width={VB_W} height={VB_H} fill="url(#bf-vig)" />
    </svg>
  );
};

export { BatFlock };
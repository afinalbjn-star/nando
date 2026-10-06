import React from 'react';
import { useCurrentFrame } from 'remotion';

export type PointWaveScheme = 'cyan' | 'magenta' | 'mint';

interface PointWaveProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: PointWaveScheme;
}

interface Pal {
  ramp: string[];
  glow: string;
}

const PALETTES: Record<PointWaveScheme, Pal> = {
  cyan: {
    ramp: ['#a8f6ff', '#3ce0f5', '#22a8f0', '#3b52e8', '#8b3ae0', '#d02ad0'],
    glow: '#5fe8ff',
  },
  magenta: {
    ramp: ['#ffd0f2', '#ff7ad0', '#e03ad8', '#a02ae8', '#5a3ae0', '#2a6ef0'],
    glow: '#ff7ae0',
  },
  mint: {
    ramp: ['#d6fff4', '#5cf0d0', '#28d8c0', '#1fa8c8', '#2a78e8', '#6a3ae0'],
    glow: '#5cf0dc',
  },
};

const VB_W = 1600;
const VB_H = 900;
const CX = 800;
const CY = 452;

const NU = 204;
const NV = 64;
const DEPTH = 1500;
const TAU = Math.PI * 2;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/* The spine curls rather than simply sweeping. A straight S bend gives a long
   thin band; a spine that laps the centre while the ribbon stays broad is what
   makes the surface overlap itself and read as the compact folded mass in the
   reference. */
const spine = (s: number) => {
  const a = s * TAU * 1.28 - 0.5;
  const R = 68 + s * 336;
  return [Math.cos(a) * R * 1.24, Math.sin(a) * R * 0.8] as const;
};

/* A long ribbon wrapped around a curling spine and warped by three travelling
   waves. Travelling waves, not a static ripple, are what produce the folds the
   reference shows: the dot rows compress on the crests and spread in the troughs,
   which is the whole illusion. */
const surface = (s: number, v: number, ph: number, amp: number) => {
  const [sx, sy] = spine(s);

  // Spine tangent by finite difference, then the in-plane perpendicular.
  const h = 0.004;
  const [ax, ay] = spine(Math.max(0, s - h));
  const [bx, by] = spine(Math.min(1, s + h));
  const tx = bx - ax;
  const ty = by - ay;
  const m = Math.hypot(tx, ty) || 1;
  const px = -ty / m;
  const py = tx / m;

  const halfW = 158 * (0.34 + 0.66 * Math.sin(Math.PI * s));
  const tw = Math.sin(s * Math.PI * 1.2 + 0.5) * 1.2;
  const ct = Math.cos(tw);
  const st = Math.sin(tw);

  const off = v * halfW;
  const wave =
    (Math.sin(v * 2.6 + s * 7.0 + ph) * 46 +
      Math.sin(v * 4.7 - s * 4.2 + ph * 1.3) * 23 +
      Math.cos(v * 1.5 + s * 2.4) * 54) *
    amp;

  return [
    sx + px * off * ct,
    sy + py * off * ct,
    st * off + wave,
  ] as const;
};

const PointWave: React.FC<PointWaveProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];

  /* Wrap the phase into [0,1) so every sine below is bit identical at u = 1 and
     u = 0. sin(2*pi + x) differs from sin(x) in the last bits, which is enough
     to move an antialiased dot by a rounding step and leave a seam. */
  const w = u - Math.floor(u);
  const ph = TAU * w * speed;
  const amp = 1 + 0.14 * Math.sin(TAU * w * speed);
  const sway = 3.4 * Math.sin(TAU * w * speed + 0.4);

  const dots: React.ReactNode[] = [];

  for (let i = 0; i < NU; i++) {
    const s = i / (NU - 1);
    for (let j = 0; j < NV; j++) {
      const v = (j / (NV - 1)) * 2 - 1;
      const [X, Y, Z] = surface(s, v, ph, amp);

      // Single perspective divide. Z runs roughly +/-150, so this is a 10%
      // size swing across the depth of the sheet: a real depth cue.
      const k = DEPTH / (DEPTH + Z);
      const px = CX + X * k;
      const py = CY + Y * k;

      if (px < -40 || px > VB_W + 40 || py < -40 || py > VB_H + 40) continue;

      // Colour runs cyan at the top of the frame to magenta at the bottom.
      const mix = clamp01(py / VB_H);
      const idx = Math.min(p.ramp.length - 1, Math.floor(mix * p.ramp.length));

      // Light rides the dominant wave, so the bright bands follow the folds.
      const lit = 0.5 + 0.5 * Math.sin(v * 2.6 + s * 7.0 + ph);
      const op = (0.24 + 0.76 * lit * lit) * clamp01(0.35 + k - 0.35);
      const r = (1.5 + 2.5 * lit) * (0.55 + 0.45 * k);

      dots.push(
        <circle
          key={`${i}-${j}`}
          cx={px.toFixed(2)}
          cy={py.toFixed(2)}
          r={r.toFixed(2)}
          fill={p.ramp[idx]}
          opacity={op.toFixed(3)}
        />,
      );
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <rect width={VB_W} height={VB_H} fill="#000000" />
      <g transform={`rotate(${sway.toFixed(3)} ${CX} ${CY})`}>{dots}</g>
    </svg>
  );
};

export { PointWave };
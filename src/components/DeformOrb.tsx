import React from 'react';
import { useCurrentFrame } from 'remotion';
import { lerpColor } from '../utils/colors';

export type DeformOrbScheme = 'cyan' | 'violet' | 'ember';

interface DeformOrbProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: DeformOrbScheme;
}

interface Pal {
  ramp: string[];
  glow: string;
}

const PALETTES: Record<DeformOrbScheme, Pal> = {
  cyan: {
    ramp: ['#a8f6ff', '#3ce0f5', '#22a8f0', '#3b52e8', '#8b3ae0', '#d02ad0'],
    glow: '#5fe8ff',
  },
  violet: {
    ramp: ['#f0e6ff', '#c4a3ff', '#8b5cf6', '#6d28d9', '#7c3aed', '#d946ef'],
    glow: '#c4b5fd',
  },
  ember: {
    ramp: ['#ffe8d6', '#ffb380', '#ff8c42', '#e85d04', '#c9184a', '#7b2cbf'],
    glow: '#ffb380',
  },
};

const VB_W = 1600;
const VB_H = 900;
const CX = 800;
const CY = 450;

const NU = 200;
const NV = 200;
const DEPTH = 2200;
const TAU = Math.PI * 2;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Deform radius as a function of angle and time, producing the organic bulges
// seen in the reference. Integer-cycle periodic so the loop closes exactly.
const deform = (a: number, u: number, seed: number): number => {
  const base = 260;
  const w1 = Math.sin(a * 3.0 + u * TAU * 1.0 + seed) * 65;
  const w2 = Math.sin(a * 5.0 - u * TAU * 2.0 + seed * 1.3) * 40;
  const w3 = Math.cos(a * 7.0 + u * TAU * 3.0 + seed * 0.7) * 28;
  const w4 = Math.sin(a * 11.0 - u * TAU * 4.0 + seed * 2.1) * 14;
  return base + w1 + w2 + w3 + w4;
};

// Depth displacement so the surface folds in and out of the screen.
const depthZ = (a: number, v: number, u: number, seed: number): number => {
  const z1 = Math.sin(a * 4.0 + v * 6.0 + u * TAU * 1.5 + seed) * 80;
  const z2 = Math.cos(a * 6.0 - v * 4.0 + u * TAU * 2.5 + seed * 1.7) * 55;
  return z1 + z2;
};

const DeformOrb: React.FC<DeformOrbProps> = ({
  width = 1920, height = 1080, totalFrames = 240, speed = 1, scheme = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];

  // Wrap phase into [0,1) so u=1 and u=0 are bit-identical (seamless loop).
  const w = u - Math.floor(u);
  const ph = TAU * w * speed;

  const dots: React.ReactNode[] = [];

  for (let i = 0; i < NU; i++) {
    const a = (i / NU) * TAU;
    for (let j = 0; j < NV; j++) {
      const v = (j / (NV - 1)) * 2 - 1;
      const seed = i * 0.017 + j * 0.031;

      const r = deform(a, w, seed);
      const z = depthZ(a, v, w, seed);

      const X = Math.cos(a) * r;
      const Y = Math.sin(a) * r * 0.92;
      const Z = z * v * 0.5;

      const k = DEPTH / (DEPTH + Z + 200);
      const px = CX + X * k;
      const py = CY + Y * k;

      if (px < -60 || px > VB_W + 60 || py < -60 || py > VB_H + 60) continue;

      // Smooth gradient: interpolate between palette stops instead of banding.
      const mix = clamp01(py / VB_H);
      const segCount = p.ramp.length - 1;
      const pos = mix * segCount;
      const seg = Math.floor(pos);
      const t = pos - seg;
      const c1 = p.ramp[Math.min(seg, segCount)];
      const c2 = p.ramp[Math.min(seg + 1, segCount)];
      const color = lerpColor(c1, c2, t);

      // Light rides the folds so bright bands follow the deformation.
      const lit = 0.5 + 0.5 * Math.sin(a * 4.0 + v * 6.0 + ph);
      const op = (0.3 + 0.7 * lit * lit) * clamp01(0.4 + k - 0.4);
      const rad = (0.8 + 1.8 * lit) * (0.55 + 0.45 * k);

      dots.push(
        <circle
          key={`${i}-${j}`}
          cx={px.toFixed(2)}
          cy={py.toFixed(2)}
          r={rad.toFixed(2)}
          fill={color}
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
      {dots}
    </svg>
  );
};

export { DeformOrb };
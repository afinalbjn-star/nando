import React from 'react';
import { useCurrentFrame } from 'remotion';

export type NeonSpiralScheme = 'hot' | 'cool' | 'acid';

interface NeonSpiralProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: NeonSpiralScheme;
}

const VB_W = 1600;
const VB_H = 900;
const CX = 800;
const CY = 452;

const R_MASS = 366;
const RINGS = 340;

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/* Each ramp runs left to right the way the reference distributes hue: hot pink
   top left, crimson through the middle, gold and olive toward the bottom and
   the upper right. */
const NEON: Record<NeonSpiralScheme, string[]> = {
  hot: ['#ff0080', '#e6006e', '#ff1b47', '#d6003f', '#ff4d00', '#ff7a00', '#ffae00', '#ffd700', '#c2a300'],
  cool: ['#00e0ff', '#00a8ff', '#2f6bff', '#7b4dff', '#b84dff', '#ff3ea5', '#00ffc2', '#00e0b0', '#4d8cff'],
  acid: ['#00ff88', '#00e05a', '#9ee800', '#ccff00', '#ffd000', '#ff7a00', '#ff3d5a', '#00c8ff', '#e8ff4d'],
};

const BG: Record<NeonSpiralScheme, { inner: string; mid: string; outer: string }> = {
  hot: { inner: '#1a0713', mid: '#0c030a', outer: '#020105' },
  cool: { inner: '#04101f', mid: '#020813', outer: '#010207' },
  acid: { inner: '#12180a', mid: '#080c04', outer: '#020302' },
};

const colorFor = (scheme: NeonSpiralScheme, nx: number, ny: number, j: number) => {
  const a = NEON[scheme];
  let base: number;
  if (ny < -0.08 && nx < 0.12) base = 0;
  else if (ny < -0.08) base = 8;
  else if (ny > 0.22) base = nx < 0 ? 6 : 5;
  else base = nx < 0 ? 2 : 3;
  return a[(base + j + a.length) % a.length];
};

// Differential rotation: inner loops turn one way, outer loops the other, so the
// mass reads as a slow spiral. Every value is a whole number of cycles.
const SPIN_BANDS = [-1, -1, 0, 0, 1, 1];

interface Loop {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  spin: number;
  w: number;
  op: number;
  ph: number;
  hero: boolean;
  color: string;
}

const LOOPS_BY_SCHEME = new Map<string, Loop[]>();

const loopsFor = (scheme: NeonSpiralScheme) => {
  let cached = LOOPS_BY_SCHEME.get(scheme);
  if (cached) return cached;
  const r = lcg(31415);
  const out: Loop[] = [];
  for (let i = 0; i < RINGS; i++) {
    // Denser toward the middle, with a few loops reaching well past the mass.
    const rad = Math.pow(r(), 0.58) * R_MASS;
    const th = r() * Math.PI * 2;
    const cx = CX + Math.cos(th) * rad;
    const cy = CY + Math.sin(th) * rad * 0.94;
    const long = r() < 0.46;
    const rx = long ? 88 + r() * 196 : 32 + r() * 98;
    const ry = long ? rx * (0.11 + r() * 0.28) : 20 + r() * 92;
    const band = Math.min(SPIN_BANDS.length - 1, Math.floor((rad / R_MASS) * SPIN_BANDS.length));
    out.push({
      cx,
      cy,
      rx,
      ry,
      rot: r() * 180,
      spin: SPIN_BANDS[band],
      w: 1 + r() * 3.2,
      op: 0.2 + r() * 0.62,
      ph: r(),
      hero: r() < 0.08,
      color: colorFor(
        scheme,
        (cx - CX) / R_MASS,
        (cy - CY) / (R_MASS * 0.94),
        Math.floor(r() * 3) - 1,
      ),
    });
  }
  LOOPS_BY_SCHEME.set(scheme, out);
  return out;
};

const NeonSpiral: React.FC<NeonSpiralProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'hot',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const bg = BG[scheme];
  const loops = loopsFor(scheme);

  const osc = (k: number, phase = 0) => Math.sin(Math.PI * 2 * (k * u * speed + phase));
  const cyc = (k: number, phase = 0) => 0.5 + 0.5 * osc(k, phase);

  const spin = (360 * u * speed).toFixed(2);
  const breathe = 1 + 0.018 * osc(1, 0.35);
  const corePulse = 0.5 + 0.5 * cyc(1, 0.15);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="ns-bg" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0" stopColor={bg.inner} />
          <stop offset="0.5" stopColor={bg.mid} />
          <stop offset="1" stopColor={bg.outer} />
        </radialGradient>
        {/* Warm bleed behind the tangle, standing in for a blurred bloom. */}
        <radialGradient id="ns-bleed" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={NEON[scheme][2]} stopOpacity="0.16" />
          <stop offset="0.45" stopColor={NEON[scheme][4]} stopOpacity="0.07" />
          <stop offset="1" stopColor={NEON[scheme][4]} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ns-vig" cx="0.5" cy="0.5" r="0.66">
          <stop offset="0.42" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.85" />
        </radialGradient>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#ns-bg)" />
      <ellipse cx={CX} cy={CY} rx={R_MASS * 1.5} ry={R_MASS * 1.28} fill="url(#ns-bleed)" />

      <g transform={`rotate(${spin} ${CX} ${CY})`}>
        <g transform={`translate(${CX} ${CY}) scale(${breathe.toFixed(4)}) translate(${-CX} ${-CY})`}>
          {/* Two passes fake the neon bloom far more cheaply than filtering
              300 stroked ellipses: a wide faint pass, then the crisp core. */}
          {loops.map((l, i) => {
            const deg = l.rot + 360 * l.spin * u * speed;
            const op = l.op * (0.72 + 0.28 * cyc(1, l.ph));
            return (
              <g key={i} transform={`rotate(${deg.toFixed(2)} ${l.cx.toFixed(2)} ${l.cy.toFixed(2)})`}>
                <ellipse
                  cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry}
                  fill="none" stroke={l.color}
                  strokeWidth={(l.w * (l.hero ? 5.4 : 4.4)).toFixed(2)}
                  opacity={(op * (l.hero ? 0.2 : 0.13)).toFixed(3)}
                />
                <ellipse
                  cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry}
                  fill="none" stroke={l.color}
                  strokeWidth={(l.w * (l.hero ? 1.7 : 1)).toFixed(2)}
                  opacity={op.toFixed(3)}
                />
              </g>
            );
          })}
        </g>
      </g>

      {/* The small hollow at the heart of the tangle. */}
      <ellipse
        cx={CX + 4} cy={CY + 46} rx={21} ry={18}
        fill={bg.outer} opacity={0.55}
      />
      <ellipse
        cx={CX + 4} cy={CY + 46} rx={21} ry={18}
        fill="none" stroke={NEON[scheme][7]} strokeWidth={1}
        opacity={0.14 + 0.12 * corePulse}
      />

      <circle
        cx={CX} cy={CY} r={R_MASS * 1.12}
        fill="none" stroke={NEON[scheme][1]} strokeWidth={1.2}
        opacity={0.16 + 0.12 * cyc(2, 0.5)}
      />

      <rect width={VB_W} height={VB_H} fill="url(#ns-vig)" />
    </svg>
  );
};

export { NeonSpiral };
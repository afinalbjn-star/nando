import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

/**
 * Floating Bokeh Dust Particles + Ribbon Glow.
 *
 * Stock loop: 3840x2160, 60 fps, alpha channel (transparent background).
 * Every animated value is a periodic function of u = frame / totalFrames with an
 * INTEGER number of cycles, so frame `totalFrames` renders pixel-identical to
 * frame 0. The Composition is registered with durationInFrames = totalFrames + 1
 * so that extra frame acts as the loop-point hold.
 */

const VB_W = 1600;
const VB_H = 900;
const TAU = Math.PI * 2;
/** Horizontal overscan so ribbons never expose bare edge at the pan extremes. */
const OVER = 340;
const SPAN = VB_W + OVER * 2;

export type BokehRibbonScheme = 'gold' | 'cyan' | 'magenta' | 'emerald';

interface Palette {
  bokeh: string[];
  ribbonCore: string;
  ribbonMid: string;
  ribbonSoft: string;
  sparkle: string;
}

const PALETTES: Record<BokehRibbonScheme, Palette> = {
  gold: {
    bokeh: ['#fff3d0', '#ffd98a', '#ffb347', '#ff8c1a', '#ffe9b8'],
    ribbonCore: '#fff6dd',
    ribbonMid: '#ffc861',
    ribbonSoft: '#ff8f2a',
    sparkle: '#fffaf0',
  },
  cyan: {
    bokeh: ['#e6fbff', '#a8f0ff', '#5fd8f5', '#22b8e6', '#c9f6ff'],
    ribbonCore: '#f0feff',
    ribbonMid: '#7fe6ff',
    ribbonSoft: '#1aa8e0',
    sparkle: '#f2ffff',
  },
  magenta: {
    bokeh: ['#ffe9f7', '#ffb3e6', '#ff7ad1', '#f040b0', '#ffd4f2'],
    ribbonCore: '#fff0fb',
    ribbonMid: '#ff8ad9',
    ribbonSoft: '#e02fa8',
    sparkle: '#fff5fd',
  },
  emerald: {
    bokeh: ['#e6fff2', '#a8f5d0', '#5fe3b0', '#1fc890', '#c8ffe8'],
    ribbonCore: '#effff9',
    ribbonMid: '#6cf0c4',
    ribbonSoft: '#10c088',
    sparkle: '#f0fff9',
  },
};

/** Deterministic pseudo-randomness. Never Math.random(): the loop must repeat. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Smoothstep-shaped cycle: near zero for most of the cycle, fast spike. */
function twinkle(u: number, k: number, phase: number): number {
  const raw = 0.5 + 0.5 * Math.sin(TAU * (k * u + phase));
  const shaped = raw * raw * (3 - 2 * raw);
  // Brightness floor so a particle never fully vanishes (reads as noise).
  return 0.32 + 0.68 * shaped;
}

// ---------------------------------------------------------------------------
// Static tables, built once at module load so per-frame work is just arithmetic.
// ---------------------------------------------------------------------------

interface Bokeh {
  x: number;
  y: number;
  r: number;
  layer: 0 | 1 | 2;
  grad: number;
  alpha: number;
  ax: number;
  ay: number;
  kx: number;
  ky: number;
  phx: number;
  phy: number;
  twK: number;
  twPh: number;
  rim: number;
}

const BOKEH_COUNT = 150;
const bokehTable: Bokeh[] = [];
for (let i = 0; i < BOKEH_COUNT; i++) {
  const depth = hash(i * 3.1);
  const layer: 0 | 1 | 2 = depth < 0.36 ? 0 : depth < 0.74 ? 1 : 2;
  const r =
    layer === 0
      ? 7 + hash(i * 5.7) * 17
      : layer === 1
        ? 16 + hash(i * 5.7) * 30
        : 34 + hash(i * 5.7) * 56;
  bokehTable.push({
    x: hash(i * 2.3),
    y: hash(i * 4.9),
    r,
    layer,
    grad: Math.floor(hash(i * 7.3) * 5) % 5,
    alpha:
      layer === 0
        ? 0.14 + hash(i * 8.1) * 0.16
        : layer === 1
          ? 0.26 + hash(i * 8.1) * 0.22
          : 0.4 + hash(i * 8.1) * 0.26,
    ax: 26 + hash(i * 9.7) * 74,
    ay: 18 + hash(i * 11.3) * 56,
    kx: 1 + Math.floor(hash(i * 13.1) * 2),
    ky: 1 + Math.floor(hash(i * 17.9) * 2),
    phx: hash(i * 19.7),
    phy: hash(i * 23.3),
    twK: 1 + Math.floor(hash(i * 29.1) * 3),
    twPh: hash(i * 31.7),
    rim: 0.72 + hash(i * 37.3) * 0.18,
  });
}

interface Dust {
  x: number;
  y: number;
  r: number;
  grad: number;
  alpha: number;
  ax: number;
  ay: number;
  kx: number;
  ky: number;
  phx: number;
  phy: number;
  twK: number;
  twPh: number;
}

const DUST_COUNT = 110;
const dustTable: Dust[] = [];
for (let i = 0; i < DUST_COUNT; i++) {
  dustTable.push({
    x: hash(i * 6.1 + 41),
    y: hash(i * 6.7 + 17),
    r: 1.4 + hash(i * 7.9 + 3) * 3.4,
    grad: Math.floor(hash(i * 8.3 + 61) * 5) % 5,
    alpha: 0.45 + hash(i * 9.1 + 29) * 0.5,
    ax: 40 + hash(i * 10.3 + 7) * 96,
    ay: 30 + hash(i * 11.9 + 13) * 82,
    kx: 1 + Math.floor(hash(i * 12.7 + 3) * 3),
    ky: 1 + Math.floor(hash(i * 13.9 + 5) * 3),
    phx: hash(i * 14.3 + 23),
    phy: hash(i * 15.1 + 37),
    twK: 1 + Math.floor(hash(i * 16.7 + 11) * 4),
    twPh: hash(i * 17.9 + 19),
  });
}

interface Sparkle {
  x: number;
  y: number;
  grad: number;
  k: number;
  ph: number;
  size: number;
  base: number;
}

const SPARKLE_COUNT = 14;
const sparkleTable: Sparkle[] = [];
for (let i = 0; i < SPARKLE_COUNT; i++) {
  sparkleTable.push({
    x: hash(i * 21.3 + 71),
    y: hash(i * 22.7 + 83),
    grad: Math.floor(hash(i * 23.9 + 97) * 5) % 5,
    k: 1 + Math.floor(hash(i * 24.7 + 101) * 3),
    ph: hash(i * 25.3 + 103),
    size: 13 + hash(i * 26.1 + 107) * 26,
    base: 0.3 + hash(i * 27.7 + 109) * 0.32,
  });
}

interface Ribbon {
  baseY: number;
  amp1: number;
  k1: number;
  ph1: number;
  amp2: number;
  k2: number;
  ph2: number;
  width: number;
  opacity: number;
  headPhase: number;
}

const RIBBONS: Ribbon[] = [
  {
    baseY: VB_H * 0.3,
    amp1: 96,
    k1: 1,
    ph1: 0,
    amp2: 34,
    k2: 2,
    ph2: 0.25,
    width: 15,
    opacity: 0.92,
    headPhase: 0,
  },
  {
    baseY: VB_H * 0.52,
    amp1: 124,
    k1: 1,
    ph1: 0.38,
    amp2: 42,
    k2: 2,
    ph2: 0.62,
    width: 22,
    opacity: 0.8,
    headPhase: 0.42,
  },
  {
    baseY: VB_H * 0.73,
    amp1: 86,
    k1: 1,
    ph1: 0.71,
    amp2: 28,
    k2: 3,
    ph2: 0.14,
    width: 11,
    opacity: 0.7,
    headPhase: 0.78,
  },
];

/** Ribbon centreline. Periodic in u only because k1 and k2 are integers. */
function ribbonY(r: Ribbon, x: number, u: number): number {
  const nx = (x + OVER) / SPAN;
  return (
    r.baseY +
    r.amp1 * Math.sin(TAU * nx + TAU * (r.k1 * u + r.ph1)) +
    r.amp2 * Math.sin(TAU * nx * 2 + TAU * (r.k2 * u + r.ph2))
  );
}

const SAMPLES = 54;

function ribbonPath(r: Ribbon, u: number): string {
  let d = '';
  for (let i = 0; i <= SAMPLES; i++) {
    const x = -OVER + (i / SAMPLES) * SPAN;
    const y = ribbonY(r, x, u);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trim();
}

/** 4-point diffraction star: four thin triangles plus a soft core. */
function starSpikes(cx: number, cy: number, spike: number, halfW: number): string {
  let d = '';
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const tipX = cx + dx * spike;
    const tipY = cy + dy * spike;
    const px = -dy * halfW;
    const py = dx * halfW;
    d += `M${cx.toFixed(2)} ${cy.toFixed(2)} L${(tipX + px).toFixed(2)} ${(
      tipY + py
    ).toFixed(2)} L${(tipX - px).toFixed(2)} ${(tipY - py).toFixed(2)} Z `;
  }
  return d.trim();
}

interface BokehRibbonProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  scheme?: BokehRibbonScheme;
}

const BokehRibbon: React.FC<BokehRibbonProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 600,
  scheme = 'gold',
}) => {
  const frame = useCurrentFrame();
  // Wrap u so the last frame cannot drift from the first in the low bits.
  const u = frame / totalFrames;
  const w = u - Math.floor(u);
  const pal = PALETTES[scheme];

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ display: 'block' }}
      >
        <defs>
          {pal.bokeh.map((c, i) => (
            <radialGradient key={`bg${i}`} id={`br-bokeh-${scheme}-${i}`}>
              {/* Real out-of-focus highlights have a defined rim, not a flat disc. */}
              <stop offset="0%" stopColor={c} stopOpacity={0.62} />
              <stop offset="64%" stopColor={c} stopOpacity={0.94} />
              <stop offset="94%" stopColor={c} stopOpacity={0.3} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </radialGradient>
          ))}
          <radialGradient id={`br-spark-${scheme}`}>
            <stop offset="0%" stopColor={pal.sparkle} stopOpacity={1} />
            <stop offset="42%" stopColor={pal.ribbonCore} stopOpacity={0.6} />
            <stop offset="100%" stopColor={pal.ribbonCore} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`br-head-${scheme}`}>
            <stop offset="0%" stopColor={pal.sparkle} stopOpacity={1} />
            <stop offset="34%" stopColor={pal.ribbonCore} stopOpacity={0.72} />
            <stop offset="100%" stopColor={pal.ribbonMid} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`br-ribbon-${scheme}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={pal.ribbonSoft} stopOpacity={0} />
            <stop offset="22%" stopColor={pal.ribbonMid} stopOpacity={0.85} />
            <stop offset="50%" stopColor={pal.ribbonCore} stopOpacity={1} />
            <stop offset="78%" stopColor={pal.ribbonMid} stopOpacity={0.85} />
            <stop offset="100%" stopColor={pal.ribbonSoft} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Ribbons: layered strokes fake a soft glow without an expensive filter. */}
        <g style={{ mixBlendMode: 'plus-lighter' }}>
          {RIBBONS.map((r, i) => {
            const d = ribbonPath(r, w);
            return (
              <g key={`ribbon-${i}`} opacity={r.opacity}>
                <path
                  d={d}
                  fill="none"
                  stroke={pal.ribbonSoft}
                  strokeWidth={r.width * 5.2}
                  strokeOpacity={0.1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill="none"
                  stroke={pal.ribbonMid}
                  strokeWidth={r.width * 2.4}
                  strokeOpacity={0.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill="none"
                  stroke={`url(#br-ribbon-${scheme})`}
                  strokeWidth={r.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </g>

        {/* Light pulse travelling each ribbon: exactly one cycle per loop. */}
        <g style={{ mixBlendMode: 'plus-lighter' }}>
          {RIBBONS.map((r, i) => {
            const s = (w + r.headPhase) % 1;
            const hx = -OVER + s * SPAN;
            const hy = ribbonY(r, hx, w);
            const rad = r.width * 3.4;
            return (
              <circle
                key={`head-${i}`}
                cx={hx}
                cy={hy}
                r={rad}
                fill={`url(#br-head-${scheme})`}
              />
            );
          })}
        </g>

        {/* Bokeh discs, far to near. */}
        <g style={{ mixBlendMode: 'plus-lighter' }}>
          {[0, 1, 2].map((layer) =>
            bokehTable
              .filter((b) => b.layer === layer)
              .map((b, idx) => {
                const x =
                  -OVER +
                  (b.x * SPAN + b.ax * Math.sin(TAU * (b.kx * w + b.phx))) +
                  OVER;
                const y = b.y * VB_H + b.ay * Math.sin(TAU * (b.ky * w + b.phy));
                const tw = twinkle(w, b.twK, b.twPh);
                return (
                  <circle
                    key={`bokeh-${layer}-${idx}`}
                    cx={x.toFixed(2)}
                    cy={y.toFixed(2)}
                    r={(b.r * (0.86 + 0.14 * tw)).toFixed(2)}
                    fill={`url(#br-bokeh-${scheme}-${b.grad})`}
                    opacity={(b.alpha * tw * b.rim).toFixed(3)}
                  />
                );
              })
          )}
        </g>

        {/* Fine dust, the sparkle that reads as "4K detail". */}
        <g style={{ mixBlendMode: 'plus-lighter' }}>
          {dustTable.map((d, i) => {
            const x = -OVER + d.x * SPAN + d.ax * Math.sin(TAU * (d.kx * w + d.phx));
            const y = d.y * VB_H + d.ay * Math.sin(TAU * (d.ky * w + d.phy));
            const tw = twinkle(w, d.twK, d.twPh);
            return (
              <circle
                key={`dust-${i}`}
                cx={x.toFixed(2)}
                cy={y.toFixed(2)}
                r={(d.r * (0.8 + 0.2 * tw)).toFixed(2)}
                fill={`url(#br-bokeh-${scheme}-${d.grad})`}
                opacity={(d.alpha * tw).toFixed(3)}
              />
            );
          })}
        </g>

        {/* Diffraction hero stars: core, spike length and spike width all breathe. */}
        <g style={{ mixBlendMode: 'plus-lighter' }}>
          {sparkleTable.map((s, i) => {
            const tw = twinkle(w, s.k, s.ph);
            const x = -OVER + s.x * SPAN + 54 * Math.sin(TAU * (1 * w + s.ph));
            const y = s.y * VB_H + 40 * Math.sin(TAU * (1 * w + s.ph * 1.7));
            const spike = s.size * (0.55 + 0.65 * tw);
            return (
              <g key={`sparkle-${i}`} opacity={(s.base + 0.5 * tw).toFixed(3)}>
                <circle
                  cx={x.toFixed(2)}
                  cy={y.toFixed(2)}
                  r={(s.size * 0.62).toFixed(2)}
                  fill={`url(#br-spark-${scheme})`}
                />
                <path
                  d={starSpikes(x, y, spike, spike * 0.11)}
                  fill={pal.sparkle}
                  opacity={0.85}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export { BokehRibbon };
import React from 'react';
import { useCurrentFrame } from 'remotion';

export type CandleWindScheme = 'taper' | 'beeswax' | 'bordeaux';

interface CandleWindProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: CandleWindScheme;
}

interface Pal {
  waxLit: string;
  wax: string;
  waxDeep: string;
  waxEdge: string;
  pool: string;
  drip: string;
  char: string;
}

const PALETTES: Record<CandleWindScheme, Pal> = {
  taper: {
    waxLit: '#ffdca8',
    wax: '#f0e3cd',
    waxDeep: '#8d7a63',
    waxEdge: '#fff4de',
    pool: '#c9ab84',
    drip: '#e6d5ba',
    char: '#140f0c',
  },
  beeswax: {
    waxLit: '#ffdb96',
    wax: '#e0ab5a',
    waxDeep: '#6b4a1c',
    waxEdge: '#ffe9b8',
    pool: '#b8832f',
    drip: '#d9a851',
    char: '#171008',
  },
  bordeaux: {
    waxLit: '#ffb9a4',
    wax: '#6e2130',
    waxDeep: '#2b0a12',
    waxEdge: '#a83a4c',
    pool: '#4a1620',
    drip: '#5c1c28',
    char: '#0f0708',
  },
};

const VB_W = 1600;
const VB_H = 900;
const TAU = Math.PI * 2;

/* Layout, from the reference frame. The candle sits left of centre so the flame
   leans into open darkness on the right. */
const AX = 620;
const RIM_Y = 648;
const WICK_Y = 600;
/* The envelope starts this far BELOW the wick tip. Ending it exactly at the tip
   leaves a hairline of background between flame and char; overlapping is what
   makes the flame look seated. */
const FLAME_Y = WICK_Y + 9;
const WAX_HALF_TOP = 39;
const WAX_HALF_BOT = 33;

/* Flame proportions measured off the reference: 9:1 slenderness, widest at 7%
   of height, near-linear convergence to 65%, then a needle collapse. */
const H0 = 556;
const WMAX = 33;
const BEND_MAX = 262;

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/* Flame half-width as a fraction of max width, against t = height fraction.
   Three regimes, matched to the reference profile: a fast flare-out of the
   throat in the lowest tenth, a near-straight convergence through the body,
   then the needle collapse that carries the top third. */
const profile = (t: number) => {
  const flare = 0.6 + 0.4 * smoothstep(0, 0.09, t);
  const x = clamp(t, 0, 1);
  /* Two smoothstep branches that agree in value AND derivative at t=0.8, so
     the silhouette has no shoulder. The tip keeps a floor: a profile that
     reaches zero spends the last of its length below one pixel wide, which
     reads as a stray hairline rather than a flame tip. */
  const body = 1 - 0.5 * smoothstep(0.09, 0.8, x);
  const tip = 0.06 + 0.44 * Math.pow(1 - smoothstep(0.8, 1, x), 1.1);
  return flare * (x <= 0.8 ? body : tip);
};

const SAMPLES = 110;

const CandleWind: React.FC<CandleWindProps> = ({
  width = 1920,
  height = 1080,
  totalFrames = 240,
  speed = 1,
  scheme = 'taper',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  /* Wrap into [0,1) so every sine below is bit identical at u = 1 and u = 0.
     sin(2pi + x) differs from sin(x) in the last bits, and on an antialiased
     edge that is enough to move a pixel and leave a visible seam. */
  const w = u - Math.floor(u);
  const k = Math.max(1, Math.round(speed));
  const p = PALETTES[scheme];
  const pid = `cw-${scheme}`;

  /* --- wind ------------------------------------------------------------
     Two integer-cycle gust signals: a lazy 2-cycle swell and a faster 5-cycle
     flutter, each raised to a power so the gust arrives fast and dies away
     slowly instead of breathing symmetrically. Both cycles are whole numbers,
     so the wind returns exactly to where it started at the seam. */
  const swell = Math.pow(0.5 + 0.5 * Math.sin(TAU * 2 * k * w + 1.1), 2.0);
  const gust = Math.pow(0.5 + 0.5 * Math.sin(TAU * 5 * k * w + 4.2), 2.4);
  const wind = 0.58 * swell + 0.42 * gust;

  /* Wind stretches and thins the flame, so height and girth are coupled. */
  const H = H0 * (1 + 0.075 * Math.sin(TAU * 3 * k * w + 0.5) - 0.05 * wind);
  const WM = WMAX * (1 - 0.24 * wind);
  const coreH = H * 0.76;
  const coreW = WM * 0.46;

  /* Lateral wander of the axis, growing with height the way a real plume
     snaking above the convection zone does. */
  const wander = 4.2 * Math.sin(TAU * 3 * k * w + 2.2);

  const axisAt = (t: number, bend: number, h: number) =>
    AX + bend * Math.pow(t, 1.75) + wander * t * t;

  const bendMain = BEND_MAX * wind;

  /* Per-height flicker: the tip dances, the base is anchored to the wick. The
     factor t keeps the base steady and the integer 7-cycle keeps it periodic. */
  const flick = (t: number, phase: number) =>
    1 + 0.085 * t * Math.sin(TAU * t * 3 + TAU * 7 * k * w + phase);

  /* Turbulence. A gust-bent flame does not have a clean silhouette: shear makes
     the edges scallop and roll up into curls as they rise. Two integer-cycle
     waves in t (spatial frequency along the flame) crossed with the temporal
     cycle, weighted toward the upper flame where shear is strongest. */
  const turb = (t: number, phase: number) => {
    const env = Math.pow(t, 1.3) * (1 - 0.35 * smoothstep(0.72, 1, t));
    return (
      1 +
      env *
        (0.14 * Math.sin(TAU * (3 * t) + TAU * 7 * k * w + phase) +
          0.07 * Math.sin(TAU * (6 * t) - TAU * 5 * k * w + phase * 1.7) +
          0.03 * Math.sin(TAU * (11 * t) + TAU * 11 * k * w + phase * 2.6))
    );
  };

  const outline = (
    bend: number,
    h: number,
    halfMax: number,
    prof: (t: number) => number,
    phase: number,
    squash: number,
    anchor = 0.55,
  ) => {
    const pts: string[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const y = FLAME_Y - h * t;
      /* anchor=0 pins the half-width to nothing at the wick so the flame sits
         on the wick instead of hovering above it on a visible flat skirt. */
      const hw =
        halfMax * prof(t) * flick(t, phase) * turb(t, phase) * squash * (1 - anchor * (1 - t));
      pts.push(`${(axisAt(t, bend, h) - hw).toFixed(2)},${y.toFixed(2)}`);
    }
    for (let i = SAMPLES; i >= 0; i--) {
      const t = i / SAMPLES;
      const y = FLAME_Y - h * t;
      const hw =
        halfMax *
        prof(t) *
        flick(t, phase + 0.9) *
        turb(t, phase + 1.3) *
        squash *
        (1 - anchor * (1 - t));
      pts.push(`${(axisAt(t, bend, h) + hw).toFixed(2)},${y.toFixed(2)}`);
    }
    return `M${pts.join('L')}Z`;
  };

  /* Every inner layer reuses the envelope's axis AND is clipped to the
     envelope silhouette. Widths and turbulence phases may then differ freely:
     whatever the inner shapes do, they physically cannot draw outside the
     flame, which is what produced the detached sliver and stray flecks. */
  const flamePath = outline(bendMain, H, WM, profile, 0.4, 1, 0.72);
  const corePath = outline(bendMain, coreH, coreW, profile, 2.1, 1, 0.8);
  /* Blue skirt, anchored hard to the wick: it sits in the still air right at
     the base, so it gets the most aggressive taper-to-nothing of the three. */
  const bluePath = outline(bendMain, H * 0.22, WM * 0.82, profile, 3.3, 1, 1);

  const tipX = axisAt(1, bendMain, H);
  const tipY = WICK_Y - H;

  /* Flame luminance, used to drive the glow and the wax lighting together. */
  const lum = 0.72 + 0.28 * Math.sin(TAU * 4 * k * w + 1.9) - 0.12 * wind;

  const defs: React.ReactNode[] = [
    <radialGradient
      key="amb"
      id={`${pid}-amb`}
      cx="0.5"
      cy="0.5"
      r="0.5"
    >
      <stop offset="0" stopColor="#ff9a3c" stopOpacity="0.3" />
      <stop offset="0.35" stopColor="#c25a1c" stopOpacity="0.13" />
      <stop offset="0.7" stopColor="#5a2408" stopOpacity="0.04" />
      <stop offset="1" stopColor="#2a0e02" stopOpacity="0" />
    </radialGradient>,
    <radialGradient key="glow" id={`${pid}-glow`} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#ffb765" stopOpacity="0.5" />
      <stop offset="0.22" stopColor="#ff8c2a" stopOpacity="0.26" />
      <stop offset="0.55" stopColor="#c4531a" stopOpacity="0.08" />
      <stop offset="1" stopColor="#8a3210" stopOpacity="0" />
    </radialGradient>,
    <linearGradient
      key="flame"
      id={`${pid}-flame`}
      gradientUnits="userSpaceOnUse"
      x1={AX}
      y1={WICK_Y}
      x2={AX}
      y2={WICK_Y - H0}
    >
      <stop offset="0" stopColor="#ffe9a8" />
      <stop offset="0.12" stopColor="#fff6d2" />
      <stop offset="0.3" stopColor="#ffdf72" />
      <stop offset="0.55" stopColor="#ffab34" />
      <stop offset="0.78" stopColor="#f26a1c" />
      <stop offset="0.93" stopColor="#d33a12" />
      <stop offset="1" stopColor="#a8240c" stopOpacity="0.5" />
    </linearGradient>,
    <linearGradient
      key="core"
      id={`${pid}-core`}
      gradientUnits="userSpaceOnUse"
      x1={AX}
      y1={WICK_Y}
      x2={AX}
      y2={WICK_Y - H0}
    >
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="0.35" stopColor="#fffbe8" />
      <stop offset="0.7" stopColor="#ffe9a0" stopOpacity="0.8" />
      <stop offset="1" stopColor="#ffb03c" stopOpacity="0" />
    </linearGradient>,
    <linearGradient
      key="blue"
      id={`${pid}-blue`}
      gradientUnits="userSpaceOnUse"
      x1={AX}
      y1={WICK_Y}
      x2={AX}
      y2={WICK_Y - H0 * 0.24}
    >
      <stop offset="0" stopColor="#1d5fd6" stopOpacity="0.95" />
      <stop offset="0.4" stopColor="#4a8ae8" stopOpacity="0.7" />
      <stop offset="0.75" stopColor="#9d8fe0" stopOpacity="0.35" />
      <stop offset="1" stopColor="#c9a8e8" stopOpacity="0" />
    </linearGradient>,
    <linearGradient
      key="wax"
      id={`${pid}-wax`}
      gradientUnits="userSpaceOnUse"
      x1={AX}
      y1={RIM_Y}
      x2={AX}
      y2={VB_H}
    >
      <stop offset="0" stopColor={p.waxLit} />
      <stop offset="0.06" stopColor={p.wax} />
      <stop offset="0.34" stopColor={p.waxDeep} />
      <stop offset="0.72" stopColor="#241a12" />
      <stop offset="1" stopColor="#0d0908" />
    </linearGradient>,
    <linearGradient
      key="dripg"
      id={`${pid}-dripg`}
      gradientUnits="userSpaceOnUse"
      x1={AX - 20}
      y1={RIM_Y}
      x2={AX + 40}
      y2={RIM_Y}
    >
      <stop offset="0" stopColor={p.waxEdge} stopOpacity="0.85" />
      <stop offset="0.45" stopColor={p.drip} stopOpacity="0.5" />
      <stop offset="1" stopColor="#1a120c" stopOpacity="0.75" />
    </linearGradient>,
    <clipPath key="fclip" id={`${pid}-fclip`}>
      <path d={flamePath} />
    </clipPath>,
    <filter
      key="fb"
      id={`${pid}-fb`}
      x="-40%"
      y="-30%"
      width="200%"
      height="170%"
    >
      <feGaussianBlur stdDeviation="7" />
    </filter>,
    <filter
      key="fs"
      id={`${pid}-fs`}
      x="-40%"
      y="-30%"
      width="200%"
      height="170%"
    >
      <feGaussianBlur stdDeviation="2.2" />
    </filter>,
    <filter
      key="fg"
      id={`${pid}-fg`}
      x="0"
      y="0"
      width="100%"
      height="100%"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.85"
        numOctaves="2"
        seed="23"
        result="n"
      />
      <feColorMatrix
        in="n"
        type="matrix"
        values="0 0 0 0 0.6  0 0 0 0 0.55  0 0 0 0 0.5  0.85 0 0 0 -0.42"
      />
      <feOffset dx={(1.4 * Math.sin(TAU * k * w)).toFixed(3)} dy="0" />
    </filter>,
  ];

  const waxHalf = (y: number) =>
    mix(WAX_HALF_TOP, WAX_HALF_BOT, clamp01((y - RIM_Y) / (VB_H - RIM_Y)));

  const waxTop = (() => {
    let d = '';
    for (let i = 0; i <= 24; i++) {
      const y = RIM_Y + (VB_H - RIM_Y) * (i / 24);
      d += `${i === 0 ? 'M' : 'L'}${(AX - waxHalf(y)).toFixed(2)},${y.toFixed(2)}`;
    }
    for (let i = 24; i >= 0; i--) {
      const y = RIM_Y + (VB_H - RIM_Y) * (i / 24);
      d += `L${(AX + waxHalf(y)).toFixed(2)},${y.toFixed(2)}`;
    }
    return `${d}Z`;
  })();

  /* Melted rim: uneven, lumpy, with the pool hollowed out around the wick. */
  const rim = (() => {
    const rx = WAX_HALF_TOP;
    let d = '';
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU;
      const lump =
        1 + 0.05 * Math.sin(a * 3 + 0.6) + 0.035 * Math.sin(a * 5 + 2.1) - 0.03 * smoothstep(0.2, 1, Math.cos(a));
      d += `${i === 0 ? 'M' : 'L'}${(AX + Math.cos(a) * rx * lump).toFixed(2)},${(
        RIM_Y +
        Math.sin(a) * 8.4 * lump
      ).toFixed(2)}`;
    }
    return `${d}Z`;
  })();

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>{defs}</defs>
      <rect width={VB_W} height={VB_H} fill="#050403" />

      {/* Ambient haze: the flame's own light scattering in the dark air. */}
      <ellipse
        cx={(AX + 14).toFixed(1)}
        cy={(WICK_Y - H * 0.42).toFixed(1)}
        rx="620"
        ry="470"
        fill={`url(#${pid}-amb)`}
        opacity={(0.55 + 0.45 * lum).toFixed(3)}
      />
      <ellipse
        cx={(AX + BEND_MAX * 0.22 * wind).toFixed(1)}
        cy={(WICK_Y - H * 0.3).toFixed(1)}
        rx={(150 + 90 * wind).toFixed(1)}
        ry={(230 + 60 * wind).toFixed(1)}
        fill={`url(#${pid}-glow)`}
        opacity={lum.toFixed(3)}
      />

      {/* No drawn smoke wisp. A stroked path carrying a vertical alpha gradient
          inevitably leaves its far end visible while the end near the flame is
          transparent, so what reads on screen is a hairline floating beside the
          flame with nothing attaching it. Vapour is carried by the glow
          ellipses instead, which have no silhouette to give them away. */}

      {/* Candle body, lit from the flame and falling into shadow. */}
      <path d={waxTop} fill={`url(#${pid}-wax)`} />
      <path
        d={rim}
        fill={p.pool}
        opacity={(0.8 + 0.2 * lum).toFixed(3)}
      />
      <ellipse
        cx={AX}
        cy={(RIM_Y - 1.5).toFixed(1)}
        rx="17"
        ry="4.2"
        fill={p.waxDeep}
        opacity="0.7"
      />

      {/* Frozen drips: the prominent right-hand run and a smaller left shoulder. */}
      <path
        d={`M${(AX + 27).toFixed(1)},${(RIM_Y - 3).toFixed(1)} C${(AX + 44).toFixed(
          1,
        )},${(RIM_Y + 26).toFixed(1)} ${(AX + 45).toFixed(1)},${(RIM_Y + 52).toFixed(
          1,
        )} ${(AX + 36).toFixed(1)},${(RIM_Y + 86).toFixed(1)} C${(AX + 32).toFixed(
          1,
        )},${(RIM_Y + 98).toFixed(1)} ${(AX + 22).toFixed(1)},${(RIM_Y + 96).toFixed(
          1,
        )} ${(AX + 24).toFixed(1)},${(RIM_Y + 80).toFixed(1)} C${(AX + 26).toFixed(
          1,
        )},${(RIM_Y + 48).toFixed(1)} ${(AX + 20).toFixed(1)},${(RIM_Y + 24).toFixed(
          1,
        )} ${(AX + 27).toFixed(1)},${(RIM_Y - 3).toFixed(1)} Z`}
        fill={`url(#${pid}-dripg)`}
      />
      <path
        d={`M${(AX - 26).toFixed(1)},${(RIM_Y - 2).toFixed(1)} C${(AX - 33).toFixed(
          1,
        )},${(RIM_Y + 16).toFixed(1)} ${(AX - 31).toFixed(1)},${(RIM_Y + 32).toFixed(
          1,
        )} ${(AX - 25).toFixed(1)},${(RIM_Y + 44).toFixed(1)} C${(AX - 21).toFixed(
          1,
        )},${(RIM_Y + 50).toFixed(1)} ${(AX - 15).toFixed(1)},${(RIM_Y + 46).toFixed(
          1,
        )} ${(AX - 17).toFixed(1)},${(RIM_Y + 34).toFixed(1)} C${(AX - 19).toFixed(
          1,
        )},${(RIM_Y + 18).toFixed(1)} ${(AX - 21).toFixed(1)},${(RIM_Y + 8).toFixed(
          1,
        )} ${(AX - 26).toFixed(1)},${(RIM_Y - 2).toFixed(1)} Z`}
        fill={`url(#${pid}-dripg)`}
        opacity="0.75"
      />

      {/* Flame. The soft envelope is drawn unclipped so it can bloom outside the
          silhouette; the core and the blue skirt are clipped to that silhouette
          so they can never emerge from the side of the flame. */}
      <g opacity={lum.toFixed(3)}>
        <path
          d={flamePath}
          fill={`url(#${pid}-flame)`}
          filter={`url(#${pid}-fb)`}
          opacity="0.85"
        />
        <path d={flamePath} fill={`url(#${pid}-flame)`} />
        <g clipPath={`url(#${pid}-fclip)`}>
          <path d={corePath} fill={`url(#${pid}-core)`} filter={`url(#${pid}-fs)`} />
          <path d={bluePath} fill={`url(#${pid}-blue)`} />
        </g>
      </g>

      {/* Charred wick tip, drawn over the blue skirt so it reads as a silhouette. */}
      <path
        d={`M${AX - 2.1},${(WICK_Y + 42).toFixed(1)} L${(AX + 0.6).toFixed(1)},${(
          WICK_Y + 6
        ).toFixed(1)} L${(AX + 2.2).toFixed(1)},${(WICK_Y - 9).toFixed(1)} L${(AX - 1.4).toFixed(
          1,
        )},${(WICK_Y - 9).toFixed(1)} L${(AX + 0.2).toFixed(1)},${(WICK_Y + 6).toFixed(1)} L${(
          AX + 2.4
        ).toFixed(1)},${(WICK_Y + 42).toFixed(1)} Z`}
        fill={p.char}
      />
      <ellipse
        cx={AX}
        cy={(WICK_Y - 5).toFixed(1)}
        rx="4.6"
        ry="6.4"
        fill={p.char}
        opacity="0.95"
      />
      <ellipse
        cx={AX}
        cy={(WICK_Y + 26).toFixed(1)}
        rx="3.4"
        ry="16"
        fill="#ff8a2a"
        opacity={lum.toFixed(3)}
        filter={`url(#${pid}-fs)`}
      />

      <rect width={VB_W} height={VB_H} fill="none" />
      <rect
        width={VB_W}
        height={VB_H}
        filter={`url(#${pid}-fg)`}
        opacity="0.05"
        style={{ mixBlendMode: 'overlay' }}
      />
    </svg>
  );
};

export { CandleWind };

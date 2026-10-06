import React from 'react';
import { useCurrentFrame } from 'remotion';
import { hexToRgb } from '../utils/colors';

export type NebulaFlowScheme = 'nebula' | 'aurora' | 'ember';

interface NebulaFlowProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: NebulaFlowScheme;
}

/* [position along the panorama, colour]. Each scheme is one full traversal of a
   deliberate hue ramp; the two ends are both deep so the drift never reveals a
   hard edge of the gradient. */
type Stop = [number, string];

interface Pal {
  ramp: Stop[];
  ground: string;
  dust: string;
  ray: string;
  grain: number;
}

const PALETTES: Record<NebulaFlowScheme, Pal> = {
  nebula: {
    ramp: [
      [0.0, '#4a2a12'],
      [0.1, '#c8801f'],
      [0.2, '#f0b551'],
      [0.3, '#fbe6bd'],
      [0.4, '#d9c2d6'],
      [0.5, '#8f8ee0'],
      [0.6, '#4a52c4'],
      [0.7, '#26307e'],
      [0.79, '#1a1746'],
      [0.87, '#7d1a4e'],
      [0.94, '#d13a70'],
      [1.0, '#4a0d2c'],
    ],
    ground: '#07080d',
    dust: '#05060c',
    ray: '#ffe9c2',
    grain: 0.055,
  },
  aurora: {
    ramp: [
      [0.0, '#062a34'],
      [0.11, '#12897f'],
      [0.22, '#57dcbf'],
      [0.31, '#ccfff0'],
      [0.42, '#8fb6f2'],
      [0.54, '#3a4ec0'],
      [0.66, '#1b1f5e'],
      [0.78, '#2d1860'],
      [0.88, '#7a37c8'],
      [1.0, '#20073f'],
    ],
    ground: '#050a0e',
    dust: '#031008',
    ray: '#d6fff2',
    grain: 0.05,
  },
  ember: {
    ramp: [
      [0.0, '#330d10'],
      [0.11, '#ad3016'],
      [0.22, '#e8832e'],
      [0.32, '#ffdba2'],
      [0.44, '#e55d4a'],
      [0.56, '#a83268'],
      [0.7, '#5a2160'],
      [0.82, '#2c1246'],
      [0.92, '#c81c46'],
      [1.0, '#3d0818'],
    ],
    ground: '#0d0708',
    dust: '#0a0304',
    ray: '#ffd6b4',
    grain: 0.06,
  },
};

const VB_W = 1600;
const VB_H = 900;

/* Full bleed. The panorama is drawn larger than the frame so no edge can ever
   enter shot. The margin must cover the FULL travel of the sway in both
   directions, not half of it: panX sweeps -SWAY_X..+SWAY_X, so anything less
   than SWAY_X of overscan leaves a bare strip of ground at the frame edge on
   the frames where the pan is at maximum. */
const SWAY_X = 190;
const SWAY_Y = 44;
const MARGIN_X = SWAY_X + 60;
const MARGIN_Y = SWAY_Y + 60;
const PX0 = -MARGIN_X;
const PY0 = -MARGIN_Y;
const SPAN = VB_W + 2 * MARGIN_X;
const PH = VB_H + 2 * MARGIN_Y;

const TAU = Math.PI * 2;

const NBLOB = 128;
const NFIL = 44;
const NDUST = 30;
const NSTAR = 240;
const NSHAFT = 6;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/* Deterministic hash. Nothing in a seamless loop may touch Math.random(). */
const rand = (i: number, salt: number) => {
  const s = Math.sin(i * 127.1 + salt * 311.7 + 0.37) * 43758.5453123;
  return s - Math.floor(s);
};

const rampAt = (stops: Stop[], t: number) => {
  const x = clamp01(t);
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (x <= b) return [ca, cb, b === a ? 0 : (x - a) / (b - a)] as const;
  }
  const last = stops[stops.length - 1];
  return [last[1], last[1], 0] as const;
};

const mixHex = (ca: string, cb: string, k: number) => {
  const a = hexToRgb(ca);
  const b = hexToRgb(cb);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(
    a[1] + (b[1] - a[1]) * k,
  )},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
};

/* Everything below is generated once at module load, so a render only pays for
   the per-frame arithmetic and the SVG paint. */

const BLOBS = Array.from({ length: NBLOB }, (_, i) => {
  const t = (i + rand(i, 7)) / NBLOB;
  const rx = 40 + rand(i, 1) * 190;
  return {
    i,
    t,
    x: PX0 + t * SPAN + (rand(i, 2) - 0.5) * 60,
    y: PY0 + rand(i, 3) * PH,
    rx,
    ry: rx * (0.4 + rand(i, 4) * 0.8),
    rot: rand(i, 5) * 180,
    op: 0.18 + rand(i, 6) * 0.4,
    ax: 14 + rand(i, 8) * 34,
    ay: 9 + rand(i, 9) * 26,
    c1: 1 + Math.floor(rand(i, 10) * 3),
    c2: 1 + Math.floor(rand(i, 11) * 3),
    p1: rand(i, 12) * TAU,
    p2: rand(i, 13) * TAU,
  };
});

const FIL = Array.from({ length: NFIL }, (_, i) => {
  const t = (i + 0.5 + (rand(i, 31) - 0.5) * 0.7) / NFIL;
  const x0 = PX0 + t * SPAN;
  const y0 = PY0 + 60 + rand(i, 32) * (PH - 120);
  const len = 200 + rand(i, 33) * 520;
  const slope = (rand(i, 34) - 0.5) * 240;
  const bright = i % 5 === 2;
  return {
    i,
    t,
    d: `M${x0.toFixed(1)},${y0.toFixed(1)} C${(x0 + len * 0.34).toFixed(1)},${(
      y0 + slope * 0.15 + (rand(i, 35) - 0.5) * 120
    ).toFixed(1)} ${(x0 + len * 0.67).toFixed(1)},${(
      y0 + slope * 0.7 + (rand(i, 36) - 0.5) * 120
    ).toFixed(1)} ${(x0 + len).toFixed(1)},${(y0 + slope).toFixed(1)}`,
    bright,
    w: bright ? 0.9 + rand(i, 37) * 0.9 : 1.2 + rand(i, 37) * 3.4,
    op: bright ? 0.3 + rand(i, 38) * 0.26 : 0.12 + rand(i, 38) * 0.2,
    ax: 12 + rand(i, 39) * 24,
    ay: 8 + rand(i, 40) * 15,
    c1: 1 + Math.floor(rand(i, 41) * 2),
    p1: rand(i, 42) * TAU,
  };
});

const DUSTLANE = Array.from({ length: NDUST }, (_, i) => {
  const t = (i + rand(i, 21) * 0.9) / NDUST;
  return {
    i,
    t,
    x: PX0 + t * SPAN,
    y: PY0 + rand(i, 22) * PH,
    rx: 120 + rand(i, 23) * 280,
    ry: 44 + rand(i, 24) * 110,
    rot: (rand(i, 25) - 0.5) * 70,
    op: 0.3 + rand(i, 26) * 0.34,
    ax: 16 + rand(i, 29) * 30,
    p1: rand(i, 28) * TAU,
    c1: 1 + Math.floor(rand(i, 27) * 2),
  };
});

const STARS = Array.from({ length: NSTAR }, (_, i) => {
  const t = (i + rand(i, 51)) / NSTAR;
  return {
    i,
    x: PX0 + t * SPAN,
    y: PY0 + rand(i, 52) * PH,
    r: 0.5 + Math.pow(rand(i, 53), 3.2) * 2.3,
    base: 0.18 + rand(i, 54) * 0.72,
    c: 1 + Math.floor(rand(i, 55) * 3),
    p: rand(i, 56) * TAU,
    tint: rand(i, 57) > 0.74,
  };
});

/* Volumetric shafts: long soft cones of light, the thing that sells "space
   footage" more than any amount of noise. */
const SHAFTS = Array.from({ length: NSHAFT }, (_, i) => {
  const t = (i + 0.5 + (rand(i, 71) - 0.5) * 0.5) / NSHAFT;
  return {
    i,
    t,
    x: PX0 + t * SPAN + (rand(i, 72) - 0.5) * 260,
    y: PY0 - 60 + rand(i, 73) * 220,
    len: 520 + rand(i, 74) * 620,
    w: 90 + rand(i, 75) * 190,
    lean: (rand(i, 76) - 0.5) * 260,
    op: 0.05 + rand(i, 77) * 0.09,
    ax: 18 + rand(i, 78) * 26,
    c1: 1 + Math.floor(rand(i, 79) * 2),
    p1: rand(i, 80) * TAU,
  };
});

/* Hero stars. Spikes are wedges filled with a user-space radial gradient
   centred on the star, so brightness falls off with distance from the core
   along every ray no matter which way the ray points. */
const HERO: Array<[number, number, number, number]> = [
  [0.06, 0.62, 1.0, 6],
  [0.19, 0.24, 0.5, 4],
  [0.34, 0.78, 0.62, 6],
  [0.47, 0.3, 0.44, 4],
  [0.61, 0.7, 0.9, 6],
  [0.74, 0.22, 0.5, 4],
  [0.88, 0.6, 0.66, 6],
  [0.97, 0.35, 0.42, 4],
];

const NebulaFlow: React.FC<NebulaFlowProps> = ({
  width = 1920,
  height = 1080,
  totalFrames = 240,
  speed = 1,
  scheme = 'nebula',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  /* Wrap into [0,1) so every sine below is bit identical at u = 1 and u = 0.
     sin(2pi + x) differs from sin(x) in the last bits, and that is enough to
     move an antialiased edge by a rounding step and leave a visible seam. */
  const w = u - Math.floor(u);
  const k = Math.max(1, Math.round(speed));
  const p = PALETTES[scheme];
  const pid = `nfl-${scheme}`;

  /* One slow traverse and return per loop, as a sine rather than a linear pan:
     a linear pan would have to jump back at the wrap, a sine reaches zero
     velocity at both ends, which is what makes the loop read as continuous. */
  const panX = -SWAY_X * Math.sin(TAU * k * w);
  const panY = -SWAY_Y * Math.sin(TAU * k * w * 2 + 0.8);

  /* Very slow zoom, 1 cycle, under 1.5%. Enough to keep the frame alive,
     small enough that the ramp's position on screen does not visibly pump. */
  const zoom = 1.012 + 0.014 * Math.sin(TAU * k * w);

  const defs: React.ReactNode[] = [];

  p.ramp.forEach(([, c], gi) => {
    defs.push(
      <radialGradient key={`${pid}-b${gi}`} id={`${pid}-b${gi}`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={c} stopOpacity="0.82" />
        <stop offset="0.32" stopColor={c} stopOpacity="0.42" />
        <stop offset="0.68" stopColor={c} stopOpacity="0.14" />
        <stop offset="1" stopColor={c} stopOpacity="0" />
      </radialGradient>,
    );
  });

  defs.push(
    <linearGradient
      key={`${pid}-base`}
      id={`${pid}-base`}
      gradientUnits="userSpaceOnUse"
      x1={PX0}
      y1={0}
      x2={PX0 + SPAN}
      y2={0}
    >
      {p.ramp.map(([at, c], i) => (
        <stop key={i} offset={at} stopColor={c} />
      ))}
    </linearGradient>,
    <linearGradient
      key={`${pid}-basev`}
      id={`${pid}-basev`}
      gradientUnits="userSpaceOnUse"
      x1={0}
      y1={PY0}
      x2={0}
      y2={PY0 + PH}
    >
      <stop offset="0" stopColor="#000000" stopOpacity="0.26" />
      <stop offset="0.36" stopColor="#000000" stopOpacity="0" />
      <stop offset="0.72" stopColor="#000000" stopOpacity="0" />
      <stop offset="1" stopColor="#000000" stopOpacity="0.3" />
    </linearGradient>,
    <radialGradient key={`${pid}-dust`} id={`${pid}-dust`} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor={p.dust} stopOpacity="0.9" />
      <stop offset="0.5" stopColor={p.dust} stopOpacity="0.44" />
      <stop offset="1" stopColor={p.dust} stopOpacity="0" />
    </radialGradient>,
    <radialGradient key={`${pid}-shaft`} id={`${pid}-shaft`} cx="0.5" cy="0" r="0.9">
      <stop offset="0" stopColor={p.ray} stopOpacity="0.7" />
      <stop offset="0.45" stopColor={p.ray} stopOpacity="0.22" />
      <stop offset="1" stopColor={p.ray} stopOpacity="0" />
    </radialGradient>,
    <radialGradient key={`${pid}-halo`} id={`${pid}-halo`} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
      <stop offset="0.2" stopColor="#ffffff" stopOpacity="0.28" />
      <stop offset="0.52" stopColor="#d6e4ff" stopOpacity="0.07" />
      <stop offset="1" stopColor="#d6e4ff" stopOpacity="0" />
    </radialGradient>,
    <radialGradient key={`${pid}-vig`} id={`${pid}-vig`} cx="0.5" cy="0.5" r="0.72">
      <stop offset="0" stopColor="#000000" stopOpacity="0" />
      <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
      <stop offset="0.86" stopColor="#000000" stopOpacity="0.24" />
      <stop offset="1" stopColor="#000000" stopOpacity="0.62" />
    </radialGradient>,
  );

  HERO.forEach(([, , s], i) => {
    const r = Math.round(320 * s);
    defs.push(
      <radialGradient
        key={`${pid}-h${i}`}
        id={`${pid}-h${i}`}
        gradientUnits="userSpaceOnUse"
        cx={0}
        cy={0}
        r={r}
      >
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="0.08" stopColor="#ffffff" stopOpacity="0.46" />
        <stop offset="0.4" stopColor="#eaf0ff" stopOpacity="0.13" />
        <stop offset="1" stopColor="#eaf0ff" stopOpacity="0" />
      </radialGradient>,
    );
  });

  defs.push(
    <filter
      key={`${pid}-fgas`}
      id={`${pid}-fgas`}
      x="-25%"
      y="-25%"
      width="150%"
      height="150%"
    >
      <feGaussianBlur stdDeviation="5" />
    </filter>,
    <filter
      key={`${pid}-fdust`}
      id={`${pid}-fdust`}
      x="-40%"
      y="-40%"
      width="180%"
      height="180%"
    >
      <feGaussianBlur stdDeviation="16" />
    </filter>,
    <filter
      key={`${pid}-fgrain`}
      id={`${pid}-fgrain`}
      x="0"
      y="0"
      width="100%"
      height="100%"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.82"
        numOctaves="2"
        seed="17"
        result="n"
      />
      <feColorMatrix
        in="n"
        type="matrix"
        values="0 0 0 0 0.55  0 0 0 0 0.55  0 0 0 0 0.55  0.9 0 0 0 -0.34"
      />
      {/* Sub-pixel drift so the grain reads as emulsion rather than a frozen
          texture, and returns exactly to zero at the seam. */}
      <feOffset dx={(1.6 * Math.sin(TAU * k * w)).toFixed(3)} dy="0" />
    </filter>,
  );

  /* ---------------- layers ---------------- */

  const shafts: React.ReactNode[] = [];
  for (const s of SHAFTS) {
    const dx = s.ax * Math.sin(TAU * k * w * s.c1 + s.p1);
    shafts.push(
      <path
        key={`sh${s.i}`}
        d={`M${(-s.w / 2).toFixed(1)},0 L${(s.w / 2).toFixed(1)},0 L${(
          s.w * 0.28 + s.lean
        ).toFixed(1)},${s.len.toFixed(1)} L${(-s.w * 0.34 + s.lean).toFixed(1)},${s.len.toFixed(
          1,
        )} Z`}
        fill={`url(#${pid}-shaft)`}
        opacity={s.op.toFixed(3)}
        transform={`translate(${(s.x + dx).toFixed(1)} ${s.y.toFixed(1)})`}
        filter={`url(#${pid}-fgas)`}
      />,
    );
  }

  const blobs: React.ReactNode[] = [];
  for (const b of BLOBS) {
    const gi = Math.round(clamp01(b.t) * (p.ramp.length - 1));
    const bx = b.x + b.ax * Math.sin(TAU * k * w * b.c1 + b.p1);
    const by = b.y + b.ay * Math.sin(TAU * k * w * b.c2 + b.p2);
    blobs.push(
      <ellipse
        key={`b${b.i}`}
        cx={bx.toFixed(2)}
        cy={by.toFixed(2)}
        rx={b.rx.toFixed(1)}
        ry={b.ry.toFixed(1)}
        fill={`url(#${pid}-b${gi})`}
        opacity={b.op.toFixed(3)}
        transform={`rotate(${b.rot.toFixed(1)} ${bx.toFixed(2)} ${by.toFixed(2)})`}
      />,
    );
  }

  const filaments: React.ReactNode[] = [];
  for (const f of FIL) {
    const [ca, cb, m] = rampAt(p.ramp, f.t);
    const dx = f.ax * Math.sin(TAU * k * w * f.c1 + f.p1);
    const dy = f.ay * Math.sin(TAU * k * w * f.c1 + f.p1 + 1.2);
    filaments.push(
      <path
        key={`f${f.i}`}
        d={f.d}
        fill="none"
        stroke={f.bright ? '#ffffff' : mixHex(ca, cb, m)}
        strokeWidth={f.w.toFixed(2)}
        strokeLinecap="round"
        opacity={f.op.toFixed(3)}
        transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`}
      />,
    );
  }

  const dust: React.ReactNode[] = [];
  for (const d of DUSTLANE) {
    const dx = d.ax * Math.sin(TAU * k * w * d.c1 + d.p1);
    dust.push(
      <ellipse
        key={`d${d.i}`}
        cx={(d.x + dx).toFixed(2)}
        cy={d.y.toFixed(2)}
        rx={d.rx.toFixed(1)}
        ry={d.ry.toFixed(1)}
        fill={`url(#${pid}-dust)`}
        opacity={d.op.toFixed(3)}
        transform={`rotate(${d.rot.toFixed(1)} ${(d.x + dx).toFixed(2)} ${d.y.toFixed(2)})`}
      />,
    );
  }

  const stars: React.ReactNode[] = [];
  for (const s of STARS) {
    /* Scintillation. A plain sine reads as a gentle pulse, not a twinkle: real
       stars flare briefly and then sit dark. Squaring the wave drives it to
       zero for most of the cycle and spikes it fast, and each star runs its own
       integer cycle count plus phase so the field never blinks in unison. */
    const raw = 0.5 + 0.5 * Math.sin(TAU * k * w * s.c + s.p);
    const tw = raw * raw * (3 - 2 * raw);
    const amp = 0.35 + 0.65 * tw;
    const [ca, cb, m] = rampAt(p.ramp, s.tint ? s.i / NSTAR : 0.5);
    stars.push(
      <circle
        key={`s${s.i}`}
        cx={s.x.toFixed(1)}
        cy={s.y.toFixed(1)}
        r={(s.r * (0.82 + 0.3 * tw)).toFixed(2)}
        fill={s.tint ? mixHex(ca, cb, m) : '#ffffff'}
        opacity={(s.base * amp).toFixed(3)}
      />,
    );
  }

  HERO.forEach(([tx, ty, s, rays], i) => {
    /* Hero stars scintillate harder than the field: they flare bright then
       relax, and the spikes extend with the core so the whole star breathes
       rather than just the white dot brightening. */
    const raw = 0.5 + 0.5 * Math.sin(TAU * k * w * (1 + (i % 3)) + i * 1.7);
    const tw = raw * raw * (3 - 2 * raw);
    const gain = 0.45 + 0.55 * tw;
    const dx = 8 * Math.sin(TAU * k * w + i * 0.9);
    const dy = 6 * Math.sin(TAU * k * w + i * 0.9 + 1.4);
    const x = PX0 + tx * SPAN + dx;
    const y = PY0 + ty * PH + dy;
    const core = 5.6 * s * (0.85 + 0.3 * tw);
    const len = 165 * s * (0.7 + 0.55 * tw);
    const hw = Math.max(0.9, 2 * s * (0.8 + 0.4 * tw));
    const g: React.ReactNode[] = [
      <circle key="halo" cx={0} cy={0} r={core * 5.4} fill={`url(#${pid}-halo)`} opacity={0.5} />,
    ];
    for (let r = 0; r < rays; r++) {
      const a = (r * 360) / rays + 12;
      g.push(
        <path
          key={a}
          d={`M0,0 L${-hw.toFixed(2)},${-len.toFixed(1)} L${hw.toFixed(2)},${-len.toFixed(1)} Z`}
          fill={`url(#${pid}-h${i})`}
          transform={`rotate(${a})`}
        />,
      );
    }
    g.push(<circle key="core" cx={0} cy={0} r={core.toFixed(2)} fill="#ffffff" opacity={0.95} />);
    stars.push(
      <g key={`h${i}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} opacity={gain.toFixed(3)}>
        {g}
      </g>,
    );
  });

  /* Translate by the pan alone. The panorama is already laid out from PX0/PY0,
     so adding that origin here as well would double-count the offset and push
     the image off-centre. */
  const ox = panX.toFixed(2);
  const oy = panY.toFixed(2);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>{defs}</defs>
      <rect width={VB_W} height={VB_H} fill={p.ground} />
      <g transform={`translate(${ox} ${oy})`}>
        <g transform={`translate(${VB_W / 2} ${VB_H / 2}) scale(${zoom.toFixed(5)}) translate(${
          -VB_W / 2
        } ${-VB_H / 2})`}>
          {/* Base gradient + vertical shaping */}
          <rect x={PX0} y={PY0} width={SPAN} height={PH} fill={`url(#${pid}-base)`} />
          <rect x={PX0} y={PY0} width={SPAN} height={PH} fill={`url(#${pid}-basev)`} />
          {blobs}
          {shafts}
          <g filter={`url(#${pid}-fgas)`}>{filaments}</g>
          <g filter={`url(#${pid}-fdust)`}>{dust}</g>
          {stars}
        </g>
      </g>
      {/* Lens: vignette, then grain on top of everything including the vignette,
          which is how real emulsion behaves. */}
      <rect width={VB_W} height={VB_H} fill={`url(#${pid}-vig)`} />
      <rect
        width={VB_W}
        height={VB_H}
        filter={`url(#${pid}-fgrain)`}
        opacity={p.grain}
        style={{ mixBlendMode: 'overlay' }}
      />
    </svg>
  );
};

export { NebulaFlow };

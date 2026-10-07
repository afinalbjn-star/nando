import React from 'react';
import { useCurrentFrame } from 'remotion';
import { hexToRgb } from '../utils/colors';

export type GrowthChartScheme = 'spectrum' | 'glacier' | 'ember';

interface GrowthChartProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: GrowthChartScheme;
}

/* Six bars, warm to cool, as in the reference: the colour ramp and the height
   ramp run in the same direction, so the ascent reads twice over. */
interface Pal {
  bars: string[];
  arrow: [string, string, string];
  arrowGleam: string;
  slabTop: string;
  slabFront: string;
  slabSide: string;
  shadow: string;
  bg: string;
}

const PALETTES: Record<GrowthChartScheme, Pal> = {
  spectrum: {
    bars: ['#f5394f', '#ff6a2b', '#ffab00', '#ffe029', '#3ee08a', '#26c6f0'],
    arrow: ['#ffdca6', '#ff8a2e', '#b8480c'],
    arrowGleam: '#fffaf0',
    slabTop: '#ffffff',
    slabFront: '#eceff4',
    slabSide: '#dae0e9',
    shadow: '#7d8798',
    bg: '#ffffff',
  },
  glacier: {
    bars: ['#7fd4ff', '#3ab4f5', '#1291dc', '#0f6cbd', '#14509b', '#1b3a78'],
    arrow: ['#eaf5ff', '#8fc9f5', '#3f7fc4'],
    arrowGleam: '#ffffff',
    slabTop: '#ffffff',
    slabFront: '#eef3f9',
    slabSide: '#dee6f0',
    shadow: '#78899f',
    bg: '#fcfdff',
  },
  ember: {
    bars: ['#ff5f2e', '#ff9d12', '#ffc400', '#ffe97a', '#fff4c8', '#fffaf0'],
    arrow: ['#fff3cf', '#ffa63d', '#dd641c'],
    arrowGleam: '#fffdf5',
    slabTop: '#fffdf9',
    slabFront: '#f6f0e8',
    slabSide: '#eae0d4',
    shadow: '#9a8672',
    bg: '#fffdfa',
  },
};

const VB_W = 1600;
const VB_H = 900;
const TAU = Math.PI * 2;

/* ---------- world-space scene ---------- */

const NB = 6;
const BW = 1;
const GAP = 0.36;
const PITCH = BW + GAP;
const BD = 1.5;
const ROW = (NB - 1) * PITCH + BW;

const H0 = 1.15;
const H1 = 3.95;
const BAR_H = Array.from({ length: NB }, (_, i) => H0 + ((H1 - H0) * i) / (NB - 1));

const SLAB_X0 = -0.85;
const SLAB_X1 = ROW + 0.85;
const SLAB_Z0 = -0.85;
const SLAB_Z1 = BD + 0.85;
const SLAB_T = 0.4;

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/* Height of the bar top at world x, extended linearly past both ends so the
   arrow tail and head still have something to clear. */
const barTopAt = (x: number) => {
  const i = (x - BW / 2) / PITCH;
  return H0 + ((H1 - H0) * clamp(i, 0, NB - 1)) / (NB - 1);
};

/* Arrow. Its height is derived from the bar-top profile plus a widening gap,
   not launched as a free exponential. A pure exponential has to start low
   enough to sit near the short bars, and because the bars rise linearly that
   starting height puts the shaft BELOW the middle bars, so the arrow reads as
   sagging downward. Tying it to the bar profile makes the clearance
   structural; the exponential only shapes the gap. */
const ARR_X0 = -0.45;
const ARR_X1 = ROW + 0.35;
const ARR_Z = BD * 0.5;
const ARR_D = 0.3;
const ARR_T = 0.3;
const GAP0 = 0.5;
const GAP1 = 1.5;
const KSWEEP = 2.4;
const HEAD_L = 1.1;
const HEAD_W = 0.56;

const ARR_N = 72;

const arrY = (s: number) => {
  const x = ARR_X0 + (ARR_X1 - ARR_X0) * s;
  const gap = GAP0 + (GAP1 - GAP0) * Math.pow(s, 0.75);
  const boost = GAP0 * (Math.exp(KSWEEP * s) - 1) / (Math.exp(KSWEEP) - 1);
  return barTopAt(x) + gap + boost;
};

const ARR_SPINE = Array.from({ length: ARR_N + 1 }, (_, i) => {
  const s = i / ARR_N;
  return [ARR_X0 + (ARR_X1 - ARR_X0) * s, arrY(s)] as const;
});

/* ---------- isometric projection ---------- */

const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;

/* Camera sweep. Around 20 degrees the row runs nearly horizontal while still
   showing both its front and side faces; past ~35 degrees the row tilts hard
   down-right and every bar slides off the bottom of the frame. */
const TH0 = 0.35;
const TH_AMP = 0.17;

type P3 = readonly [number, number, number];

const basis = (th: number) => {
  const c = Math.cos(th);
  const s = Math.sin(th);
  /* Screen offset per unit of world x (along the row) and world z (depth). */
  return {
    ax: (c + s) * C30,
    ay: (c - s) * S30,
    bx: (s - c) * C30,
    by: (s + c) * S30,
  };
};

const project = (p: P3, th: number, ox: number, oy: number, sc: number): [number, number] => {
  const b = basis(th);
  return [ox + (p[0] * b.ax + p[2] * b.bx) * sc, oy + (p[0] * b.ay + p[2] * b.by - p[1]) * sc];
};

const poly = (pts: P3[], th: number, ox: number, oy: number, sc: number) =>
  pts
    .map((p, i) => {
      const [X, Y] = project(p, th, ox, oy, sc);
      return `${i === 0 ? 'M' : 'L'}${X.toFixed(2)},${Y.toFixed(2)}`;
    })
    .join('') + 'Z';

/* Scene corners that must stay inside the frame: slab extents, the tallest bar
   top, and the arrow head. Fitted once over the extremes of the camera sweep,
   so nothing is ever cropped and the scale never breathes. */
const SCENE_CORNERS: P3[] = (() => {
  const pts: P3[] = [];
  for (const x of [SLAB_X0, SLAB_X1]) {
    for (const z of [SLAB_Z0, SLAB_Z1]) {
      pts.push([x, -SLAB_T, z], [x, 0, z]);
    }
  }
  pts.push([ROW + BW, H1, 0], [ROW + BW, H1, BD], [0, H0, 0], [ARR_X0, arrY(0), ARR_Z]);
  const [ex, ey] = ARR_SPINE[ARR_N];
  const [px, py] = ARR_SPINE[ARR_N - 1];
  const tl = Math.hypot(ex - px, ey - py) || 1;
  const ux = (ex - px) / tl;
  const uy = (ey - py) / tl;
  for (const z of [ARR_Z - 0.3, ARR_Z + ARR_D + 0.3]) {
    pts.push([ex + ux * HEAD_L, ey + uy * HEAD_L, z]);
  }
  return pts;
})();

const FIT = (() => {
  const M = 74;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const th of [TH0 - TH_AMP, TH0, TH0 + TH_AMP]) {
    for (const p of SCENE_CORNERS) {
      const b = basis(th);
      minX = Math.min(minX, p[0] * b.ax + p[2] * b.bx);
      maxX = Math.max(maxX, p[0] * b.ax + p[2] * b.bx);
      minY = Math.min(minY, p[0] * b.ay + p[2] * b.by - p[1]);
      maxY = Math.max(maxY, p[0] * b.ay + p[2] * b.by - p[1]);
    }
  }
  const sc = Math.min((VB_W - 2 * M) / (maxX - minX), (VB_H - 2 * M) / (maxY - minY));
  return {
    sc,
    ox: VB_W / 2 - ((minX + maxX) / 2) * sc,
    oy: VB_H / 2 - ((minY + maxY) / 2) * sc,
  };
})();

/* Face brightness. The projection is orthographic, so a world-space normal does
   not change as the camera orbits: these factors stay constant while the
   shading sweeps across the scene, which is what makes the sway read as one
   light source rather than as relighting. */
const F_TOP = 1;
const F_FRONT = 0.82;
const F_SIDE = 0.64;

const shade = (hex: string, k: number) => {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};

const GrowthChart: React.FC<GrowthChartProps> = ({
  width = 1920,
  height = 1080,
  totalFrames = 240,
  speed = 1,
  scheme = 'spectrum',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  /* Wrap into [0,1) so every sine below is bit identical at u = 1 and u = 0. */
  const w = u - Math.floor(u);
  const k = Math.max(1, Math.round(speed));
  const p = PALETTES[scheme];
  const pid = `gc-${scheme}`;

  /* One slow orbit per loop. A sine, not a linear spin: it reaches zero angular
     velocity at both ends, so the loop closes without a visible jerk. */
  const th = TH0 + TH_AMP * Math.sin(TAU * k * w);
  const { ox, oy, sc } = FIT;

  const defs: React.ReactNode[] = [];
  for (let i = 0; i < NB; i++) {
    const c = p.bars[i];
    defs.push(
      <linearGradient
        key={`${pid}-top${i}`}
        id={`${pid}-top${i}`}
        gradientUnits="userSpaceOnUse"
        x1={i * PITCH}
        y1={BAR_H[i]}
        x2={i * PITCH + BD}
        y2={BAR_H[i] - 0.9}
      >
        <stop offset="0" stopColor={shade(c, F_TOP * 1.04)} />
        <stop offset="1" stopColor={shade(c, F_TOP * 0.86)} />
      </linearGradient>,
      <linearGradient
        key={`${pid}-fr${i}`}
        id={`${pid}-fr${i}`}
        gradientUnits="userSpaceOnUse"
        x1={0}
        y1={BAR_H[i]}
        x2={0}
        y2={0}
      >
        <stop offset="0" stopColor={shade(c, F_FRONT)} />
        <stop offset="0.55" stopColor={shade(c, F_FRONT * 0.94)} />
        <stop offset="1" stopColor={shade(c, F_FRONT * 0.82)} />
      </linearGradient>,
    );
  }

  defs.push(
    <linearGradient
      key={`${pid}-arrow`}
      id={`${pid}-arrow`}
      gradientUnits="userSpaceOnUse"
      x1={ARR_X1}
      y1={arrY(1) + HEAD_W}
      x2={ARR_X0}
      y2={arrY(0)}
    >
      <stop offset="0" stopColor={p.arrow[0]} />
      <stop offset="0.4" stopColor={p.arrow[1]} />
      <stop offset="1" stopColor={p.arrow[2]} />
    </linearGradient>,
    <linearGradient key={`${pid}-arrowtop`} id={`${pid}-arrowtop`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={p.arrow[0]} />
      <stop offset="1" stopColor={p.arrow[1]} />
    </linearGradient>,
    <linearGradient
      key={`${pid}-head`}
      id={`${pid}-head`}
      gradientUnits="userSpaceOnUse"
      x1={ARR_X1 - HEAD_W}
      y1={arrY(1)}
      x2={ARR_X1 + HEAD_L}
      y2={arrY(1) + HEAD_L}
    >
      <stop offset="0" stopColor={p.arrow[1]} />
      <stop offset="0.6" stopColor={p.arrow[2]} />
      <stop offset="1" stopColor={p.arrow[1]} />
    </linearGradient>,
    <radialGradient key={`${pid}-ground`} id={`${pid}-ground`} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor={p.shadow} stopOpacity="0.34" />
      <stop offset="0.55" stopColor={p.shadow} stopOpacity="0.12" />
      <stop offset="1" stopColor={p.shadow} stopOpacity="0" />
    </radialGradient>,
    <radialGradient key={`${pid}-contact`} id={`${pid}-contact`} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor={p.shadow} stopOpacity="0.42" />
      <stop offset="0.5" stopColor={p.shadow} stopOpacity="0.18" />
      <stop offset="1" stopColor={p.shadow} stopOpacity="0" />
    </radialGradient>,
    <filter key={`${pid}-softer`} id={`${pid}-softer`} x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="22" />
    </filter>,
  );

  /* Travelling gleams along the shaft. Position is a wrapped fraction and the
     alpha envelope takes it to zero at both ends of the path, so the wrap is
     invisible: nothing pops in or out at the seam. */
  const gleams = [0, 0.47].map((ph, gi) => {
    const gp = (w * k + ph) % 1;
    return { gi, gp, env: Math.pow(Math.sin(Math.PI * gp), 0.7) };
  });

  const out: React.ReactNode[] = [];

  /* Ground shadow, offset down-right to match the light coming off the top
     face, so the slab looks like it sits on something. */
  {
    const cxw = (SLAB_X0 + SLAB_X1) / 2;
    const czw = (SLAB_Z0 + SLAB_Z1) / 2;
    const halfX = (SLAB_X1 - SLAB_X0) / 2;
    const halfZ = (SLAB_Z1 - SLAB_Z0) / 2;
    const corners: P3[] = (
      [
        [cxw - halfX, -SLAB_T, czw - halfZ],
        [cxw + halfX, -SLAB_T, czw - halfZ],
        [cxw + halfX, -SLAB_T, czw + halfZ],
        [cxw - halfX, -SLAB_T, czw + halfZ],
      ] as P3[]
    ).map((q) => [q[0] + 0.35, q[1] - 0.5, q[2] + 0.35] as P3);
    const pts = corners.map((q) => project(q, th, ox, oy, sc));
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    out.push(
      <ellipse
        key="ground"
        cx={((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(1)}
        cy={((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(1)}
        rx={((Math.max(...xs) - Math.min(...xs)) * 0.52).toFixed(1)}
        ry={((Math.max(...ys) - Math.min(...ys)) * 0.62).toFixed(1)}
        fill={`url(#${pid}-ground)`}
        filter={`url(#${pid}-softer)`}
      />,
    );
  }

  /* Slab: side, then front, then top. A white slab on a white field has no
     readable boundary of its own, so every face carries a hairline edge;
     without one the platform simply disappears. */
  const slabFaces: Array<[string, P3[], string]> = [
    [
      'side',
      [
        [SLAB_X1, -SLAB_T, SLAB_Z0],
        [SLAB_X1, -SLAB_T, SLAB_Z1],
        [SLAB_X1, 0, SLAB_Z1],
        [SLAB_X1, 0, SLAB_Z0],
      ],
      p.slabSide,
    ],
    [
      'front',
      [
        [SLAB_X0, -SLAB_T, SLAB_Z1],
        [SLAB_X1, -SLAB_T, SLAB_Z1],
        [SLAB_X1, 0, SLAB_Z1],
        [SLAB_X0, 0, SLAB_Z1],
      ],
      p.slabFront,
    ],
    [
      'top',
      [
        [SLAB_X0, 0, SLAB_Z0],
        [SLAB_X1, 0, SLAB_Z0],
        [SLAB_X1, 0, SLAB_Z1],
        [SLAB_X0, 0, SLAB_Z1],
      ],
      p.slabTop,
    ],
  ];
  for (const [key, pts, fill] of slabFaces) {
    out.push(
      <path
        key={key}
        d={poly(pts, th, ox, oy, sc)}
        fill={fill}
        stroke={p.shadow}
        strokeOpacity={0.22}
        strokeWidth={1.2}
      />,
    );
  }

  /* Contact shadows, before the bars so the bars sit on them. */
  for (let i = 0; i < NB; i++) {
    const x0 = i * PITCH;
    const [cxs, cys] = project([x0 + BW / 2, 0.005, BD / 2], th, ox, oy, sc);
    out.push(
      <ellipse
        key={`ao${i}`}
        cx={cxs.toFixed(1)}
        cy={(cys + BD * 0.09 * sc).toFixed(1)}
        rx={(BW * 0.8 * sc).toFixed(1)}
        ry={(BD * 0.66 * sc).toFixed(1)}
        fill={`url(#${pid}-contact)`}
      />,
    );
  }

  /* Bars. Each breathes on its own phase so the ascent ripples rather than
     pulsing in unison. */
  for (let i = 0; i < NB; i++) {
    const br = 0.05 * Math.sin(TAU * k * w + i * 0.52);
    const h = BAR_H[i] * (1 + br);
    const x0 = i * PITCH;
    const x1 = x0 + BW;
    const top: P3[] = [
      [x0, h, 0],
      [x1, h, 0],
      [x1, h, BD],
      [x0, h, BD],
    ];
    out.push(
      <path
        key={`bs${i}`}
        d={poly(
          [
            [x1, 0, 0],
            [x1, h, 0],
            [x1, h, BD],
            [x1, 0, BD],
          ],
          th,
          ox,
          oy,
          sc,
        )}
        fill={shade(p.bars[i], F_SIDE)}
        stroke={shade(p.bars[i], F_SIDE * 0.7)}
        strokeOpacity={0.3}
        strokeWidth={1}
      />,
      <path
        key={`bf${i}`}
        d={poly(
          [
            [x0, 0, BD],
            [x1, 0, BD],
            [x1, h, BD],
            [x0, h, BD],
          ],
          th,
          ox,
          oy,
          sc,
        )}
        fill={`url(#${pid}-fr${i})`}
      />,
      <path key={`bt${i}`} d={poly(top, th, ox, oy, sc)} fill={`url(#${pid}-top${i})`} />,
      <path
        key={`be${i}`}
        d={poly(top, th, ox, oy, sc)}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.6}
        strokeWidth={1.5}
      />,
    );
  }

  /* Arrow: top face, front face, then the head. */
  {
    const zf = ARR_Z + ARR_D;
    /* Outline walked up one side and back down the other; concatenating
       low/high pairs would zig-zag the fill. */
    const lo: P3[] = [];
    const hi: P3[] = [];
    const tlo: P3[] = [];
    const thi: P3[] = [];
    for (let i = 0; i <= ARR_N; i++) {
      const [x, y] = ARR_SPINE[i];
      lo.push([x, y, zf]);
      hi.push([x, y + ARR_T, zf]);
      tlo.push([x, y + ARR_T, ARR_Z]);
      thi.push([x, y + ARR_T, zf]);
    }

    const [ex, ey] = ARR_SPINE[ARR_N];
    const [px, py] = ARR_SPINE[ARR_N - 1];
    const tl = Math.hypot(ex - px, ey - py) || 1;
    const ux = (ex - px) / tl;
    const uy = (ey - py) / tl;
    const apex: P3 = [ex + ux * HEAD_L, ey + uy * HEAD_L, ARR_Z];
    const bl: P3 = [ex - uy * HEAD_W, ey + ux * HEAD_W, ARR_Z];
    const br: P3 = [ex + uy * HEAD_W, ey - ux * HEAD_W, ARR_Z];
    const head: P3[] = [bl, br, apex];
    /* The head is extruded to the same depth as the shaft so it does not read
       as a flat sticker pasted onto an extruded ribbon. */
    const apexF: P3 = [apex[0], apex[1], zf];
    const blF: P3 = [bl[0], bl[1], zf];
    const brF: P3 = [br[0], br[1], zf];

    /* The head gets its own gradient over its own extent: reusing the shaft
       gradient left the head pale, because that gradient's dark stop is
       anchored at the tail end. Comments cannot sit inside a JSX attribute
       list, so it lives out here. */
    out.push(
      <path key="arrtop" d={poly([...thi, ...tlo.reverse()], th, ox, oy, sc)} fill={`url(#${pid}-arrowtop)`} />,
      <path
        key="arrfront"
        d={poly([...lo, ...hi.reverse()], th, ox, oy, sc)}
        fill={`url(#${pid}-arrow)`}
        strokeLinejoin="round"
      />,
      <path
        key="arrheadside"
        d={poly([blF, bl, apex, apexF], th, ox, oy, sc)}
        fill={shade(p.arrow[2], 0.86)}
      />,
      <path key="arrhead" d={poly(head, th, ox, oy, sc)} fill={`url(#${pid}-head)`} />,
      <path key="arrheadtop" d={poly(head, th, ox, oy, sc)} fill={p.arrow[0]} opacity="0.5" />,
      <path
        key="arrheadfront"
        d={poly([blF, brF, apexF], th, ox, oy, sc)}
        fill="none"
        stroke={p.arrow[2]}
        strokeOpacity={0.4}
        strokeWidth={1.3}
      />,
    );

    /* Gleams ride the shaft front as a short span of the spine rather than a
       free-floating rect, so they can never overhang the ribbon. */
    for (const g of gleams) {
      if (g.env < 0.02) continue;
      const SPAN_I = Math.max(10, Math.round(ARR_N * 0.34));
      const i0 = clamp(Math.round(g.gp * ARR_N - SPAN_I / 2), 0, ARR_N);
      const i1 = clamp(i0 + SPAN_I, 0, ARR_N);
      if (i1 - i0 < 2) continue;
      const steps = 40;
      const a: P3[] = [];
      const b: P3[] = [];
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const pos = i0 + (i1 - i0) * t;
        const i = Math.round(pos);
        const [sx, sy] = ARR_SPINE[i];
        const [nx, ny] = ARR_SPINE[Math.min(ARR_N, i + 1)];
        const frac = pos - i;
        const px = sx + (nx - sx) * frac;
        const py = sy + (ny - sy) * frac;
        const env = Math.sin(Math.PI * t);
        a.push([px, py + ARR_T * (0.06 + 0.8 * env), zf + 0.006]);
        b.push([px, py + ARR_T * (0.94 + 0.05 * env), zf + 0.006]);
      }
      out.push(
        <path
          key={`gl${g.gi}`}
          d={poly([...a, ...b.reverse()], th, ox, oy, sc)}
          fill={p.arrowGleam}
          opacity={(g.env * 0.6).toFixed(3)}
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
      <defs>{defs}</defs>
      <rect width={VB_W} height={VB_H} fill={p.bg} />
      <g>{out}</g>
    </svg>
  );
};

export { GrowthChart };

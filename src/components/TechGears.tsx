import React from 'react';
import { useCurrentFrame } from 'remotion';

export type TechGearsScheme = 'blue' | 'graphite' | 'teal';

interface TechGearsProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: TechGearsScheme;
}

interface Tone {
  hi: string;
  lit: string;
  mid: string;
  dark: string;
  edge: string;
}

interface Pal {
  bg: string;
  bgEdge: string;
  shadow: string;
  blue: Tone;
  chrome: Tone;
}

const PALETTES: Record<TechGearsScheme, Pal> = {
  blue: {
    bg: '#ffffff', bgEdge: '#e6eaf1', shadow: '#1e3050',
    blue: { hi: '#4f7ddc', lit: '#2151c0', mid: '#173d9e', dark: '#0f2b72', edge: '#081c4c' },
    chrome: { hi: '#ffffff', lit: '#dfe4ea', mid: '#a8b0ba', dark: '#6f7883', edge: '#4a525c' },
  },
  graphite: {
    bg: '#fbfbfc', bgEdge: '#dde0e5', shadow: '#171a1f',
    blue: { hi: '#8d939c', lit: '#5a6069', mid: '#3b4048', dark: '#252930', edge: '#14171b' },
    chrome: { hi: '#ffffff', lit: '#e6e8ec', mid: '#b2b8c0', dark: '#767d87', edge: '#4a505a' },
  },
  teal: {
    bg: '#ffffff', bgEdge: '#e2f0ef', shadow: '#17423f',
    blue: { hi: '#7fe3dc', lit: '#33b8ad', mid: '#1a8c86', dark: '#0e5b5a', edge: '#073635' },
    chrome: { hi: '#ffffff', lit: '#e0ecec', mid: '#a9bcbc', dark: '#6d8282', edge: '#425353' },
  },
};

const VB_W = 1600;
const VB_H = 900;
const TAU = Math.PI * 2;

/* Tooth profile: a flank up to a tapered tip, then a flank down, with the root
   swept as a real arc so the valleys do not facet on low tooth counts.

   Proportions matter more than anything else here. Real gear teeth are roughly
   12% of the outer radius deep and occupy about 30% of the pitch at the tip.
   Making the root shallower than about 0.86 of the tip turns them into square
   tabs instead. */
const gearPath = (teeth: number, rOut: number, rRoot: number) => {
  const step = TAU / teeth;
  const pt = (r: number, a: number) =>
    `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  const tip = rOut * 0.995;
  const mid = (rRoot + tip) / 2;
  const parts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    parts.push(`${i === 0 ? 'M' : 'L'}${pt(rRoot, a + step * 0.16)}`);
    // Sides bow slightly instead of running dead radial. Straight flanks are
    // what make a gear read as castle crenellation rather than a tooth.
    parts.push(`Q${pt(mid, a + step * 0.25)} ${pt(tip, a + step * 0.36)}`);
    parts.push(`L${pt(tip, a + step * 0.64)}`);
    parts.push(`Q${pt(mid, a + step * 0.75)} ${pt(rRoot, a + step * 0.84)}`);
    parts.push(`A${rRoot} ${rRoot} 0 0 1 ${pt(rRoot, a + step * 1.16)}`);
  }
  parts.push('Z');
  return parts.join(' ');
};

interface Gear {
  id: string;
  x: number;
  y: number;
  rOut: number;
  rRoot: number;
  teeth: number;
  bore: number;
  rim: number;
  tone: 'blue' | 'chrome';
  /** Lightening holes through the web. Zero means a solid dish. */
  holes: number;
  bolts: number;
  /** Whole number of tooth pitches per loop, so the loop closes exactly. */
  spin: number;
  bobPhase: number;
  bobAmp: number;
  depth: number;
}

const GEARS: Gear[] = [
  // Cropped at the left edge, behind everything: reads as a larger mechanism.
  { id: 'g-l', x: -150, y: 300, rOut: 300, rRoot: 262, teeth: 16, bore: 74, rim: 0.7, tone: 'blue', holes: 8, bolts: 10, spin: -4, bobPhase: 0.82, bobAmp: 5, depth: 0.4 },
  { id: 'g-top', x: 828, y: 214, rOut: 108, rRoot: 94, teeth: 12, bore: 30, rim: 0.72, tone: 'chrome', holes: 0, bolts: 6, spin: 6, bobPhase: 0.3, bobAmp: 7, depth: 0.55 },
  { id: 'g-big', x: 556, y: 446, rOut: 226, rRoot: 198, teeth: 14, bore: 52, rim: 0.68, tone: 'blue', holes: 6, bolts: 8, spin: 5, bobPhase: 0.0, bobAmp: 9, depth: 0.85 },
  { id: 'g-in', x: 566, y: 428, rOut: 146, rRoot: 128, teeth: 11, bore: 40, rim: 0.7, tone: 'chrome', holes: 0, bolts: 6, spin: -8, bobPhase: 0.62, bobAmp: 6, depth: 1.0 },
  { id: 'g-mid', x: 1024, y: 606, rOut: 236, rRoot: 206, teeth: 14, bore: 54, rim: 0.68, tone: 'blue', holes: 6, bolts: 8, spin: -7, bobPhase: 0.45, bobAmp: 8, depth: 1.0 },
  // Cropped at the bottom right, in front.
  { id: 'g-br', x: 1596, y: 878, rOut: 262, rRoot: 228, teeth: 15, bore: 62, rim: 0.7, tone: 'blue', holes: 7, bolts: 9, spin: 9, bobPhase: 0.15, bobAmp: 6, depth: 1.0 },
];

const TechGears: React.FC<TechGearsProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'blue',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];

  /* Wrap the phase into [0, 1) before anything consumes it. At u = 1 this is
     exactly 0, so every sine below evaluates to precisely its u = 0 value.
     Without it sin(2*pi + x) differs from sin(x) in the last bits, which shifts
     an antialiased edge by a rounding step and leaves a faint seam. */
  const w = u - Math.floor(u);

  const osc = (k: number, phase = 0) =>
    Math.sin(Math.PI * 2 * (k * w * speed + phase));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="tg-bg" cx="0.42" cy="0.38" r="0.82">
          <stop offset="0" stopColor={p.bg} />
          <stop offset="0.6" stopColor={p.bg} />
          <stop offset="1" stopColor={p.bgEdge} />
        </radialGradient>

        <filter id="tg-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="tg-drop" x="-30%" y="-30%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
        <filter id="tg-gloss" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>

        {GEARS.map((g) => {
          const t = g.tone === 'blue' ? p.blue : p.chrome;
          const faceR = g.rOut * g.rim;
          return (
            <React.Fragment key={`def-${g.id}`}>
              {/* Muka: cahaya datang dari kiri atas. */}
              <linearGradient
                id={`${g.id}-body`} gradientUnits="userSpaceOnUse"
                x1={g.x - g.rOut} y1={g.y - g.rOut}
                x2={g.x + g.rOut * 0.9} y2={g.y + g.rOut}
              >
                <stop offset="0" stopColor={t.hi} />
                <stop offset="0.26" stopColor={t.lit} />
                <stop offset="0.62" stopColor={t.mid} />
                <stop offset="1" stopColor={t.dark} />
              </linearGradient>

              {/* Sisi tebal: lebih gelap karena tidak kena cahaya langsung. */}
              <linearGradient
                id={`${g.id}-side`} gradientUnits="userSpaceOnUse"
                x1={g.x - g.rOut} y1={g.y - g.rOut}
                x2={g.x + g.rOut} y2={g.y + g.rOut}
              >
                <stop offset="0" stopColor={t.dark} />
                <stop offset="1" stopColor={t.mid} />
              </linearGradient>

              <radialGradient
                id={`${g.id}-dish`} gradientUnits="userSpaceOnUse"
                cx={g.x - g.rOut * 0.22} cy={g.y - g.rOut * 0.26}
                r={g.rOut * 0.86}
              >
                <stop offset="0" stopColor={t.hi} stopOpacity="0.7" />
                <stop offset="0.42" stopColor={t.lit} stopOpacity="0.3" />
                <stop offset="1" stopColor={t.dark} stopOpacity="0.08" />
              </radialGradient>

              <linearGradient
                id={`${g.id}-bore`} gradientUnits="userSpaceOnUse"
                x1={g.x - g.bore} y1={g.y - g.bore}
                x2={g.x + g.bore} y2={g.y + g.bore}
              >
                <stop offset="0" stopColor={t.edge} />
                <stop offset="0.34" stopColor={t.dark} />
                <stop offset="0.62" stopColor={t.lit} />
                <stop offset="1" stopColor={t.hi} />
              </linearGradient>

              {/* Wall shading inside a lightening hole: dark at the top where
                  the rim occludes, white at the bottom where light gets in. */}
            </React.Fragment>
          );
        })}
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#tg-bg)" />

      <g transform={`rotate(${(2.4 * osc(1, 0.2)).toFixed(3)} 800 450)`}>
        {GEARS.map((g) => {
          const t = g.tone === 'blue' ? p.blue : p.chrome;
          // One tooth pitch per unit of spin, so the gear lands back on an
          // identical silhouette at u = 1. SVG rotate takes DEGREES, so the
          // radians must be converted or the loop ends at a random offset angle.
          const rotDeg = ((TAU * g.spin * w * speed * 180) / Math.PI) / g.teeth;
          const dy = osc(1, g.bobPhase) * g.bobAmp;
          const body = gearPath(g.teeth, g.rOut, g.rRoot);
          const faceR = g.rOut * g.rim;
          const ex = g.rOut * 0.022;
          const ey = g.rOut * 0.028;

          return (
            <g key={g.id} transform={`translate(${g.x} ${(g.y + dy).toFixed(2)})`}>
              {/* Wide ambient occlusion on the backdrop. */}
              <circle
                cx={ex * 1.9} cy={ey * 2.1} r={g.rOut * 0.98}
                fill={p.shadow} opacity={0.16 * g.depth}
                filter="url(#tg-drop)"
              />
              {/* Cast shadow and extrusion both sit in a translate OUTSIDE the
                  rotation. Nesting the other way round would make the offset
                  direction spin with the gear, so the shadow would swing around
                  the light instead of staying down and to the right. */}
              <g transform={`translate(${(ex * 1.2).toFixed(2)} ${(ey * 1.3).toFixed(2)})`}>
                <g transform={`rotate(${rotDeg.toFixed(4)})`}>
                  <path
                    d={body} fill={p.shadow}
                    opacity={0.32 * g.depth} filter="url(#tg-soft)"
                  />
                </g>
              </g>

              {/* The sliver that shows past the face is the tooth side wall,
                  which is the single strongest 3D cue on a flat shape. */}
              <g transform={`translate(${ex.toFixed(2)} ${ey.toFixed(2)})`}>
                <g transform={`rotate(${rotDeg.toFixed(4)})`}>
                  <path
                    d={body}
                    fill={`url(#${g.id}-side)`}
                    stroke={t.edge} strokeWidth={1} strokeOpacity={0.45}
                    strokeLinejoin="round"
                  />
                </g>
              </g>

              <g transform={`rotate(${rotDeg.toFixed(4)})`}>
                {/* Ambient occlusion pooling in the tooth valleys. Kept weak:
                    on a gear cropped by the frame edge the disc's own circular
                    outline shows up as an odd lens of dark on the backdrop. */}
                <circle r={g.rRoot + 7} fill={t.dark} opacity={0.2 * g.depth} />

                {/* Thin light stroke: the chamfer on every tooth tip. */}
                <path
                  d={body}
                  fill={`url(#${g.id}-body)`}
                  stroke={t.hi}
                  strokeWidth={3}
                  strokeOpacity={0.55}
                  strokeLinejoin="round"
                />

                <circle r={faceR} fill={`url(#${g.id}-dish)`} />

                  {/* Bolts on a bolt circle, outside the lightening holes. */}
                  {Array.from({ length: g.bolts }).map((_, i) => {
                    const a = (i / g.bolts) * TAU + 0.42;
                    return (
                      <circle
                        key={`b${i}`}
                        cx={Math.cos(a) * faceR * 0.84}
                        cy={Math.sin(a) * faceR * 0.84}
                        r={faceR * 0.036}
                        fill={t.edge}
                        opacity={0.75}
                      />
                    );
                  })}

                  {/* Lightening holes: a light disc plus a shadowed arc across
                      the top of its wall, which is what actually reads as a hole.
                      A shared gradient does not work here because user space
                      spans the whole gear, so the top holes came out dark. */}
                  {Array.from({ length: g.holes }).map((_, i) => {
                    const a = (i / g.holes) * TAU + 0.2;
                    const hx = Math.cos(a) * faceR * 0.56;
                    const hy = Math.sin(a) * faceR * 0.56;
                    const hr = faceR * 0.145;
                    return (
                      <g key={`h${i}`}>
                        <circle cx={hx} cy={hy} r={hr} fill={p.bg} />
                        <path
                          d={`M ${(-hr * 0.86).toFixed(2)} ${(-hr * 0.5).toFixed(2)} A ${hr.toFixed(2)} ${hr.toFixed(2)} 0 0 1 ${(hr * 0.86).toFixed(2)} ${(-hr * 0.5).toFixed(2)}`}
                          transform={`translate(${hx.toFixed(2)} ${hy.toFixed(2)})`}
                          fill="none" stroke={t.dark} strokeWidth={2.6}
                          strokeOpacity={0.6} strokeLinecap="round"
                        />
                        <path
                          d={`M ${(-hr * 0.86).toFixed(2)} ${(hr * 0.5).toFixed(2)} A ${hr.toFixed(2)} ${hr.toFixed(2)} 0 0 0 ${(hr * 0.86).toFixed(2)} ${(hr * 0.5).toFixed(2)}`}
                          transform={`translate(${hx.toFixed(2)} ${hy.toFixed(2)})`}
                          fill="none" stroke={t.hi} strokeWidth={1.8}
                          strokeOpacity={0.7} strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                </g>

              {/* Highlights live OUTSIDE the rotation. They come from a fixed
                  light, so spinning them with the gear makes the part look like
                  it is dragging its own reflection around. */}
              <circle
                r={faceR} fill="none"
                stroke={t.hi} strokeWidth={1.1} strokeOpacity={0.18}
              />
              <ellipse
                cx={-faceR * 0.34} cy={-faceR * 0.46}
                rx={faceR * 0.72} ry={faceR * 0.24}
                transform={`rotate(-34 ${(-faceR * 0.34).toFixed(2)} ${(-faceR * 0.46).toFixed(2)})`}
                fill="#ffffff" opacity={0.34}
                filter="url(#tg-gloss)"
              />
              <path
                d={`M ${-faceR * 0.78} ${-faceR * 0.62} A ${faceR} ${faceR} 0 0 1 ${faceR * 0.34} ${-faceR * 0.94}`}
                fill="none" stroke="#ffffff" strokeWidth={3.4}
                strokeOpacity={0.62} strokeLinecap="round"
                filter="url(#tg-soft)"
              />
              <path
                d={`M ${faceR * 0.72} ${faceR * 0.7} A ${faceR} ${faceR} 0 0 1 ${-faceR * 0.5} ${faceR * 0.86}`}
                fill="none" stroke={t.hi} strokeWidth={2.6}
                strokeOpacity={0.4} strokeLinecap="round"
                filter="url(#tg-soft)"
              />

              {/* Bore and hub stay outside the spin so the lip highlight stays
                  anchored to the light, as in a real render. */}
              {/* Bore: a narrow chamfer, not a drawn ring. A wide dark donut
                  here reads as a black outline rather than a hole. */}
              <circle r={g.bore * 1.16} fill={`url(#${g.id}-bore)`} />
              <circle
                r={g.bore * 1.16} fill="none"
                stroke={t.hi} strokeWidth={1} strokeOpacity={0.4}
              />
              <circle r={g.bore} fill={p.bg} />
              <path
                d={`M ${-g.bore * 0.72} ${-g.bore * 0.66} A ${g.bore} ${g.bore} 0 0 1 ${g.bore * 0.6} ${-g.bore * 0.8}`}
                fill="none" stroke={t.dark} strokeWidth={1.8}
                strokeOpacity={0.34} strokeLinecap="round"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export { TechGears };

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { LAND_SAMPLES } from './landMask';

export type SignalGlobeScheme = 'violet' | 'indigo' | 'crimson';

interface SignalGlobeProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: SignalGlobeScheme;
}

interface Pal {
  bgIn: string;
  bgOut: string;
  halo: string;
  ocean: string;
  oceanEdge: string;
  landLit: string;
  landMid: string;
  landDark: string;
  arcCool: string;
  arcHot: string;
  nodeCore: string;
  burstCore: string;
  burstEdge: string;
  bokeh: string;
}

const PALETTES: Record<SignalGlobeScheme, Pal> = {
  violet: {
    bgIn: '#1B1030',
    bgOut: '#07040E',
    halo: '#6B3FA8',
    ocean: '#241640',
    oceanEdge: '#B9A4E8',
    landLit: '#EFE6FF',
    landMid: '#B7A2DC',
    landDark: '#5C4A7C',
    arcCool: '#DCD0F2',
    arcHot: '#FF74DC',
    nodeCore: '#FFF4FF',
    burstCore: '#FFE0F6',
    burstEdge: '#FF5FD2',
    bokeh: '#C9A6F0',
  },
  indigo: {
    bgIn: '#0E1836',
    bgOut: '#04060F',
    halo: '#2E4FA0',
    ocean: '#141F42',
    oceanEdge: '#9FC0EC',
    landLit: '#E6F0FF',
    landMid: '#94AEDA',
    landDark: '#435A82',
    arcCool: '#CFDEF6',
    arcHot: '#63D8FF',
    nodeCore: '#F0F8FF',
    burstCore: '#DDF0FF',
    burstEdge: '#5CC8FF',
    bokeh: '#8FB6E8',
  },
  crimson: {
    bgIn: '#2A0E16',
    bgOut: '#0C0406',
    halo: '#8E2F3C',
    ocean: '#38141E',
    oceanEdge: '#EDA8AE',
    landLit: '#FFEDE8',
    landMid: '#DDA098',
    landDark: '#7A4A46',
    arcCool: '#F2D4CE',
    arcHot: '#FF8A5C',
    nodeCore: '#FFF2EC',
    burstCore: '#FFE2D4',
    burstEdge: '#FF7A5C',
    bokeh: '#EEA08E',
  },
};

const VB_W = 1600;
const VB_H = 900;
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

/* Europe, the Atlantic and North Africa fill the lit face, as in the reference,
   so the centre of the projection sits over the eastern Atlantic. */
const C_LON = 14;
const C_LAT = 30;

const GLOBE_R = 372;
const GLOBE_CX = 1000;
const GLOBE_CY = 468;
/* Kept fully inside the frame: at r=430 centred on y=424 the circle ran off the
   top and bottom edges, which read as a cropped duplicate rather than a planet. */
const ECHO_R = 396;
const ECHO_CX = 468;
const ECHO_CY = 452;

/* Deterministic hash -> [0,1). Every node, arc and particle is derived from
   this, never from Math.random(), or the render would differ between the two
   passes of a frame and nothing would hold still. */
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

const toVec = (lon: number, lat: number): [number, number, number] => {
  const la = lat * D2R;
  const lo = lon * D2R;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

const norm = (v: [number, number, number]): [number, number, number] => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};

/* Orthographic projection about a sub-view point. `d` is the depth: above zero
   means the point faces us. */
const project = (
  v: [number, number, number],
  clon: number,
  clat: number,
  r: number,
  cx: number,
  cy: number,
) => {
  const lo = v[0] * Math.cos(clon * D2R) - v[2] * Math.sin(clon * D2R);
  const z0 = v[0] * Math.sin(clon * D2R) + v[2] * Math.cos(clon * D2R);
  const y1 = v[1] * Math.cos(clat * D2R) - z0 * Math.sin(clat * D2R);
  const z1 = v[1] * Math.sin(clat * D2R) + z0 * Math.cos(clat * D2R);
  return { x: cx + lo * r, y: cy - y1 * r, d: z1 };
};

const hexToRgbTuple = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
};

/* Hub cities, weighted toward the reference's cluster over Europe and the
   Atlantic. Longitudes are real, so the network reads as a real one. The Benelux
   band is deliberately thinned: stacking Paris/London/Amsterdam/Berlin/Brussels
   at 4K buried the European coastline under a solid glow, and the coast was the
   point of the piece. */
const HUBS: [number, number][] = [
  [-0.13, 51.51], [12.5, 41.9], [13.4, 52.52], [16.37, 48.21],
  [21.01, 52.23], [-3.7, 40.42], [9.19, 45.46], [18.07, 59.33],
  [-6.26, 53.35], [-8.62, 41.15], [3.38, 6.52], [31.24, 30.04],
  [37.62, 55.75], [28.98, 41.01], [23.73, 37.98], [-9.14, 38.72],
  [10.75, 59.91], [19.04, 47.5], [55.27, 25.2],
  [72.88, 19.08], [77.21, 28.61], [100.5, 13.76], [121.47, 31.23],
];

interface Arc {
  a: [number, number, number];
  b: [number, number, number];
  bulge: number;
  hot: boolean;
  escape: number;
  phase: number;
  speed: number;
}

/* Arcs between hub pairs, plus a scatter of free arcs whose far end is lifted
   clear of the limb. Those are what give the reference its long-exposure
   streaks shooting past the silhouette. */
const ARCS: Arc[] = (() => {
  const out: Arc[] = [];
  for (let i = 0; i < 44; i++) {
    const ia = Math.floor(hash(i * 3.1) * HUBS.length);
    let ib = Math.floor(hash(i * 7.7 + 11) * HUBS.length);
    if (ib === ia) ib = (ib + 1) % HUBS.length;
    out.push({
      a: toVec(HUBS[ia][0], HUBS[ia][1]),
      b: toVec(HUBS[ib][0], HUBS[ib][1]),
      bulge: 0.05 + hash(i * 5.3) * 0.16,
      hot: hash(i * 13.9) > 0.74,
      escape: 0,
      phase: hash(i * 17.1),
      speed: hash(i * 19.7) > 0.6 ? 2 : 1,
    });
  }
  for (let i = 0; i < 16; i++) {
    const la = 26 + hash(i * 23.3) * 30;
    const lo = -34 + hash(i * 29.9) * 74;
    out.push({
      a: toVec(lo, la),
      b: toVec(lo + 6 + hash(i * 31.1) * 16, la + 8 + hash(i * 37.3) * 16),
      bulge: 0.06 + hash(i * 41.7) * 0.1,
      hot: hash(i * 43.9) > 0.5,
      escape: 0.18 + hash(i * 47.3) * 0.3,
      phase: hash(i * 53.1),
      speed: hash(i * 59.9) > 0.5 ? 2 : 1,
    });
  }
  return out;
})();

interface Burst {
  lon: number;
  lat: number;
  n: number;
  reach: number;
  cycles: number;
  phase: number;
  size: number;
}

const BURSTS: Burst[] = [
  { lon: 6, lat: 47, n: 90, reach: 0.3, cycles: 2, phase: 0, size: 1 },
  { lon: -12, lat: 51, n: 70, reach: 0.34, cycles: 2, phase: 0.37, size: 1.15 },
  { lon: 22, lat: 31, n: 46, reach: 0.2, cycles: 1, phase: 0.61, size: 0.8 },
  { lon: -30, lat: 34, n: 54, reach: 0.26, cycles: 2, phase: 0.14, size: 0.95 },
  { lon: 40, lat: 44, n: 34, reach: 0.17, cycles: 1, phase: 0.82, size: 0.7 },
];

const STEPS = 30;

export const SignalGlobe: React.FC<SignalGlobeProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'violet',
}) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) * speed;
  const pal = PALETTES[scheme];

  /* The view drifts a few degrees rather than turning a full revolution. A
     complete turn would carry the continents off the lit face and back, so the
     network would empty out and refill twice per loop; a small oscillation keeps
     Europe lit throughout and still reads as a slow, deliberate survey. Every
     term is an integer number of cycles in u, so frame 240 reproduces frame 0. */
  const lon = C_LON + 7 * Math.sin(TAU * u);
  const lat = C_LAT + 3.5 * Math.sin(TAU * (u + 1 / 3));
  const echoLon = C_LON - 26 + 9 * Math.sin(TAU * (u + 2 / 3));
  const glow = 0.5 + 0.5 * Math.sin(TAU * (u + 1 / 4));

  /* Land as a stipple of sampled points on a real land mask. The mask is
     required: drawing every raw coastline sample also put dots in the oceans,
     which drowned the shape in featureless noise. */
  const land = (clon: number, clat: number, r: number, cx: number, cy: number, lit: boolean, key: string) => (
    <g key={key}>
      {LAND_SAMPLES.map((p, i) => {
        const s = project(toVec(p[0], p[1]), clon, clat, r, cx, cy);
        if (s.d <= 0.015) return null;
        const l = Math.min(1, Math.max(0, (s.d - 0.015) / 0.45));
        /* The dots are the ground plane, not the hero. Near-white fill at high
           opacity merged into a solid sheet and swallowed the network arcs
           crossing them, so the layer sits at roughly half the luminance and
           the arcs carry the brightness. */
        const rad = (lit ? 1.1 : 0.85) + (lit ? 0.85 : 0) * l;
        return (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={rad}
            fill={lit ? (l > 0.55 ? pal.landLit : l > 0.24 ? pal.landMid : pal.landDark) : pal.landMid}
            fillOpacity={(lit ? 0.2 : 0.3) + (lit ? 0.3 : 0) * l}
          />
        );
      })}
    </g>
  );

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={width} height={height}>
      <defs>
        <radialGradient id="sg-bg" cx="62%" cy="46%" r="82%">
          <stop offset="0%" stopColor={pal.bgIn} />
          <stop offset="100%" stopColor={pal.bgOut} />
        </radialGradient>
        <radialGradient id="sg-halo" cx="62%" cy="52%" r="46%">
          <stop offset="0%" stopColor={rgba(pal.halo, 0.22 + 0.06 * glow)} />
          <stop offset="100%" stopColor={rgba(pal.halo, 0)} />
        </radialGradient>
        {/* The reference reads as a solid, softly lit sphere; without an opaque
            base the ocean let the background through and looked hollow. */}
        <radialGradient id="sg-sphere" cx="40%" cy="32%" r="76%">
          <stop offset="0%" stopColor={pal.landMid} stopOpacity="0.5" />
          <stop offset="34%" stopColor={pal.ocean} stopOpacity="0.92" />
          <stop offset="72%" stopColor={pal.ocean} stopOpacity="0.86" />
          <stop offset="100%" stopColor={pal.bgOut} stopOpacity="0.98" />
        </radialGradient>
        <radialGradient id="sg-terminator" cx="34%" cy="34%" r="82%">
          <stop offset="0%" stopColor={rgba(pal.bgOut, 0)} />
          <stop offset="58%" stopColor={rgba(pal.bgOut, 0.2)} />
          <stop offset="100%" stopColor={rgba(pal.bgOut, 0.95)} />
        </radialGradient>
        <clipPath id="sg-disc">
          <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} />
        </clipPath>
        <clipPath id="sg-echo">
          <circle cx={ECHO_CX} cy={ECHO_CY} r={ECHO_R} />
        </clipPath>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#sg-bg)" />
      <rect width={VB_W} height={VB_H} fill="url(#sg-halo)" />

      {/* Out-of-focus motes, largest and softest. */}
      {Array.from({ length: 26 }, (_, i) => {
        const bx = hash(i * 2.3) * VB_W;
        const by = hash(i * 4.1) * VB_H;
        const ph = hash(i * 6.7);
        const rr = 1.6 + hash(i * 8.9) * 5.5;
        const tw = 0.16 + 0.34 * (0.5 + 0.5 * Math.sin(TAU * (2 * u + ph)));
        return (
          <circle
            key={`b${i}`}
            cx={bx + 26 * Math.sin(TAU * (u + ph))}
            cy={by + 20 * Math.sin(TAU * (u + ph + 0.5))}
            r={rr}
            fill={rgba(pal.bokeh, tw)}
          />
        );
      })}

      {/* The dimmer second planet, behind and to the left. */}
      <g clipPath="url(#sg-echo)" opacity="0.22">
        <circle cx={ECHO_CX} cy={ECHO_CY} r={ECHO_R} fill="url(#sg-sphere)" />
        {land(echoLon, lat, ECHO_R, ECHO_CX, ECHO_CY, false, 'echo')}
      </g>
      <circle cx={ECHO_CX} cy={ECHO_CY} r={ECHO_R} fill="none" stroke={rgba(pal.oceanEdge, 0.3)} strokeWidth="1.2" />

      {/* The lit planet. */}
      <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} fill="url(#sg-sphere)" />

      <g clipPath="url(#sg-disc)">
        {land(lon, lat, GLOBE_R, GLOBE_CX, GLOBE_CY, true, 'main')}

        {/* Network arcs. The dash period is 16 and the offset advances by an
            exact multiple of it per cycle, so the travelling pulse is identical
            at u = 0 and u = 1. */}
        {ARCS.map((arc, i) => {
          const pts: { x: number; y: number; d: number }[] = [];
          for (let s = 0; s <= STEPS; s++) {
            const t = s / STEPS;
            const bx = arc.a[0] + (arc.b[0] - arc.a[0]) * t;
            const by = arc.a[1] + (arc.b[1] - arc.a[1]) * t;
            const bz = arc.a[2] + (arc.b[2] - arc.a[2]) * t;
            /* The escape term lifts the far end clear of the limb, which is what
               produces the streaks that leave the silhouette entirely. */
            const rr = (1 + arc.bulge * Math.sin(Math.PI * t)) * (1 + arc.escape * Math.max(0, t - 0.45) * 2.2);
            pts.push(project(norm([bx, by, bz]), lon, lat, GLOBE_R * rr, GLOBE_CX, GLOBE_CY));
          }
          if (!pts.some((p) => p.d > 0)) return null;
          const d = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
          const col = arc.hot ? pal.arcHot : pal.arcCool;
          const off = -16 * arc.speed * (u + arc.phase);
          return (
            <g key={`a${i}`}>
              {/* A dark under-stroke first: the arcs are hairlines over a pale
                  dot field and without it they dissolved into it. One thin
                  casing only — a wide one merged neighbouring arcs into a
                  single dark corridor and scoured voids through the stipple. */}
              <path d={d} fill="none" stroke={rgba(pal.bgOut, 0.5)} strokeWidth="3.2" strokeLinecap="round" />
              <path d={d} fill="none" stroke={rgba(col, 0.45)} strokeWidth="1.7" strokeLinecap="round" />
              <path d={d} fill="none" stroke={rgba(col, 0.85)} strokeWidth="2.2" strokeDasharray="3 13" strokeDashoffset={off} />
              <path
                d={d}
                fill="none"
                stroke={rgba(pal.nodeCore, 0.95)}
                strokeWidth="2.6"
                strokeDasharray="1.2 14.8"
                strokeDashoffset={off * 2}
              />
            </g>
          );
        })}

        {/* Particle bursts. Each particle's life is an integer number of cycles
            and sin^2 is zero at both ends of life, so nothing pops when the life
            wraps at the loop point. */}
        {BURSTS.map((b, bi) => (
          <g key={`u${bi}`}>
            {Array.from({ length: b.n }, (_, i) => {
              const th = hash(bi * 61.7 + i * 1.7) * TAU;
              const ph = Math.acos(1 - 2 * hash(bi * 71.3 + i * 3.9));
              const dir: [number, number, number] = [
                Math.sin(ph) * Math.cos(th),
                Math.cos(ph),
                Math.sin(ph) * Math.sin(th),
              ];
              const life = (u * b.cycles + hash(bi * 83.1 + i * 5.3) + b.phase) % 1;
              const env = Math.sin(Math.PI * life) ** 2;
              const p = project(norm(dir), lon, lat, GLOBE_R * (0.012 + b.reach * life), GLOBE_CX, GLOBE_CY);
              if (p.d <= 0.02) return null;
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={(0.9 + 1.5 * hash(bi * 97.7 + i * 7.7)) * b.size}
                  fill={rgba(life < 0.5 ? pal.burstCore : pal.burstEdge, env * 0.85 * p.d)}
                />
              );
            })}
          </g>
        ))}

        {/* Hubs. A plain sine reads as breathing; the smoothstepped sine sits near
            zero for most of the cycle and spikes fast, which is how a pinhead
            highlight behaves. Each hub gets its own integer cycle and phase. */}
        {HUBS.map((h, i) => {
          const p = project(toVec(h[0], h[1]), lon, lat, GLOBE_R, GLOBE_CX, GLOBE_CY);
          if (p.d <= 0.04) return null;
          const cyc = 1 + Math.floor(hash(i * 2.9) * 2);
          const raw = 0.5 + 0.5 * Math.sin(TAU * (cyc * u + hash(i * 4.3)));
          const tw = raw * raw * (3 - 2 * raw);
          const s = (1.5 + 2.6 * tw) * (0.55 + 0.45 * p.d);
          return (
            <g key={`h${i}`} opacity={0.35 + 0.65 * p.d}>
              <circle cx={p.x} cy={p.y} r={s * 4} fill={rgba(pal.arcHot, 0.06 * tw)} />
              <circle cx={p.x} cy={p.y} r={s} fill={rgba(pal.nodeCore, 0.55 + 0.45 * tw)} />
            </g>
          );
        })}

        <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} fill="url(#sg-terminator)" />
      </g>

      {/* Limb light last, so it sits over the terminator. */}
      <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} fill="none" stroke={rgba(pal.oceanEdge, 0.5)} strokeWidth="1.8" />
    </svg>
  );
};
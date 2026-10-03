import React from 'react';
import { useCurrentFrame } from 'remotion';

export type ParticleOrbScheme = 'rose' | 'ice' | 'ember';

interface ParticleOrbProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: ParticleOrbScheme;
}

interface Pal {
  bgInner: string;
  bgMid: string;
  bgOuter: string;
  halo: string;
  deep: string;
  mid: string;
  glow: string;
  pale: string;
  white: string;
  ring: string;
}

/* Dark violet ground, rose particles, near-white highlights. */
const PALETTES: Record<ParticleOrbScheme, Pal> = {
  rose: {
    bgInner: '#180b22', bgMid: '#0a0513', bgOuter: '#020106',
    halo: '#ff5fa2', deep: '#7d2a63', mid: '#d94f9a', glow: '#ff74b0',
    pale: '#ffd0e6', white: '#fff4fa', ring: '#ffc2de',
  },
  ice: {
    bgInner: '#08182c', bgMid: '#040c18', bgOuter: '#01040a',
    halo: '#7fd8ff', deep: '#245f8f', mid: '#4aa8e0', glow: '#74c9ff',
    pale: '#d8f2ff', white: '#f2fbff', ring: '#c2e8ff',
  },
  ember: {
    bgInner: '#1e0d08', bgMid: '#0e0603', bgOuter: '#050201',
    halo: '#ff9a4d', deep: '#8f3a12', mid: '#e06a2a', glow: '#ff8a3d',
    pale: '#ffdcbe', white: '#fff4e8', ring: '#ffd3ac',
  },
};

const VB_W = 1600;
const VB_H = 900;
const CX = 800;
const CY = 445;

const R_SPHERE = 300;
const DOTS = 5200;

const RING_A = 430;
const RING_B = 124;
const RING_TILT = -20;

// Deterministic noise: a seeded LCG evaluated once at module load, so every
// frame and every render sees an identical layout. Never Math.random().
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

interface Puff {
  a: number;
  rad: number;
  size: number;
  op: number;
  spin: number;
  tw: number;
}

// Built once per scheme and cached, so the per-frame work is array indexing and
// arithmetic only. The golden angle keeps coverage even, while jittering both the
// latitude and the longitude destroys the latitude banding a pure Fibonacci
// spiral leaves visible at the poles.
const SPHERE_BY_SCHEME = new Map<
  string,
  { x: number; y: number; z: number; j: number; ph: number; c1: string; c2: string; c3: string }[]
>();

const sphereFor = (scheme: ParticleOrbScheme) => {
  let s = SPHERE_BY_SCHEME.get(scheme);
  if (!s) {
    const p = PALETTES[scheme];
    const r = lcg(424242);
    const golden = Math.PI * (3 - Math.sqrt(5));
    s = [];
    for (let i = 0; i < DOTS; i++) {
      const y = 1 - ((i + 0.5 + (r() - 0.5) * 1.1) / DOTS) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i + (r() - 0.5) * 0.16;
      const t = r();
      s.push({
        x: Math.cos(th) * rad,
        y,
        z: Math.sin(th) * rad,
        j: 1 + (r() - 0.5) * 0.035,
        ph: r(),
        c1: t < 0.5 ? p.deep : p.mid,
        c2: t < 0.35 ? p.mid : t < 0.8 ? p.glow : p.pale,
        c3: t < 0.55 ? p.pale : p.white,
      });
    }
    SPHERE_BY_SCHEME.set(scheme, s);
  }
  return s;
};

const PUFFS = (() => {
  const r = lcg(90210);
  const out: Puff[] = [];
  for (let i = 0; i < 16; i++) {
    out.push({
      a: r() * Math.PI * 2,
      rad: 120 + r() * 520,
      size: 6 + r() * 22,
      op: 0.05 + r() * 0.14,
      spin: (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3)),
      tw: r(),
    });
  }
  return out;
})();

const ORBITERS = [
  { t0: 0.08, spin: 1, size: 3.4 },
  { t0: 0.33, spin: -1, size: 2.6 },
  { t0: 0.61, spin: 1, size: 2.2 },
  { t0: 0.86, spin: -1, size: 3 },
];

// Ramanujan's approximation, exact enough to split the ring in half cleanly.
const ellipseLen = (a: number, b: number) => {
  const h = ((a - b) * (a - b)) / ((a + b) * (a + b));
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
};

const RING_C = ellipseLen(RING_A, RING_B);

// Fixed rotation axis, tilted. A full 2*pi turn about ANY fixed axis is the
// identity, so the loop still closes exactly while the tilt stays interesting.
const AXIS = (() => {
  const v = [0.26, 1, 0.1];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m] as const;
})();

const LIGHT = (() => {
  const v = [-0.45, 0.55, 0.7];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m] as const;
})();

const ParticleOrb: React.FC<ParticleOrbProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'rose',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];
  const TAU = Math.PI * 2;

  const osc = (k: number, phase = 0) => Math.sin(Math.PI * 2 * (k * u * speed + phase));
  const cyc = (k: number, phase = 0) => 0.5 + 0.5 * osc(k, phase);

  const sphere = sphereFor(scheme);

  const theta = TAU * u * speed;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const [kx, ky, kz] = AXIS;
  const [lx, ly, lz] = LIGHT;

  const breathe = 1 + 0.014 * osc(1, 0.2);
  const haloPulse = 0.55 + 0.45 * cyc(1, 0.1);
  const tilt = RING_TILT + 2.2 * osc(1, 0.45);
  const ringTiltRad = (tilt * Math.PI) / 180;

  // Computed once, then drawn in two passes: a wide faint disc behind every
  // bright dot fakes the bloom far more cheaply than filtering 5000 elements.
  const field = sphere.map((d) => {
    // Rodrigues rotation about the fixed tilted axis.
    const px = d.x * d.j * breathe;
    const py = d.y * d.j * breathe;
    const pz = d.z * d.j * breathe;
    const dot = kx * px + ky * py + kz * pz;
    const rx = px * cosT + (ky * pz - kz * py) * sinT + kx * dot * (1 - cosT);
    const ry = py * cosT + (kz * px - kx * pz) * sinT + ky * dot * (1 - cosT);
    const rz = pz * cosT + (kx * py - ky * px) * sinT + kz * dot * (1 - cosT);

    const depth = (rz + 1) / 2;
    const lam = Math.max(0, rx * lx + ry * ly + rz * lz);
    const bright = depth * (0.42 + 0.58 * lam);
    const tw = 0.78 + 0.22 * cyc(1, d.ph);
    return {
      x: CX + rx * R_SPHERE,
      y: CY + ry * R_SPHERE,
      r: 0.85 + 2 * depth,
      fill: bright > 0.44 ? d.c3 : bright > 0.2 ? d.c2 : d.c1,
      op: (0.07 + 0.93 * Math.pow(bright, 0.85)) * tw,
      bright,
    };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="po-bg" cx="0.5" cy="0.49" r="0.72">
          <stop offset="0" stopColor={p.bgInner} />
          <stop offset="0.45" stopColor={p.bgMid} />
          <stop offset="1" stopColor={p.bgOuter} />
        </radialGradient>
        <radialGradient id="po-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.halo} stopOpacity="0.42" />
          <stop offset="0.34" stopColor={p.halo} stopOpacity="0.2" />
          <stop offset="0.62" stopColor={p.glow} stopOpacity="0.08" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        {/* Specular wash from the upper left, screen-blended over the dots. */}
        <radialGradient id="po-spec" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.white} stopOpacity="0.26" />
          <stop offset="0.5" stopColor={p.pale} stopOpacity="0.08" />
          <stop offset="1" stopColor={p.pale} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="po-vig" cx="0.5" cy="0.49" r="0.7">
          <stop offset="0.46" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.72" />
        </radialGradient>
        <filter id="po-soft" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="w" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="t" />
          <feMerge>
            <feMergeNode in="w" />
            <feMergeNode in="t" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="po-bokeh" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#po-bg)" />

      <g filter="url(#po-bokeh)">
        {PUFFS.map((pf, i) => {
          const t = pf.a + TAU * u * speed * pf.spin;
          return (
            <circle
              key={i}
              cx={CX + Math.cos(t) * pf.rad}
              cy={CY + Math.sin(t) * pf.rad * 0.72}
              r={pf.size * (0.85 + 0.3 * cyc(1, pf.tw))}
              fill={i % 3 === 0 ? p.glow : p.halo}
              opacity={pf.op * (0.5 + 0.5 * cyc(1, pf.tw))}
            />
          );
        })}
      </g>

      <circle
        cx={CX} cy={CY} r={R_SPHERE * 1.5}
        fill="url(#po-halo)" opacity={haloPulse}
      />
      <circle
        cx={CX} cy={CY} r={R_SPHERE * 0.98}
        fill="url(#po-halo)" opacity={0.5 + 0.5 * cyc(2, 0.35)}
      />

      {/* Back half of the orbit ring, drawn behind the sphere. */}
      <g transform={`rotate(${tilt.toFixed(2)} ${CX} ${CY})`}>
        <ellipse
          cx={CX} cy={CY} rx={RING_A} ry={RING_B} fill="none"
          stroke={p.ring} strokeWidth={1.9} strokeOpacity={0.48}
          strokeDasharray={`${RING_C / 2} ${RING_C / 2}`}
        />
      </g>

      {field.map((d, i) =>
        d.bright > 0.52 ? (
          <circle
            key={`g${i}`} cx={d.x.toFixed(2)} cy={d.y.toFixed(2)}
            r={(d.r * 2.3).toFixed(2)} fill={d.fill}
            opacity={(d.bright * 0.12).toFixed(3)}
          />
        ) : null,
      )}

      {field.map((d, i) => (
        <circle
          key={i} cx={d.x.toFixed(2)} cy={d.y.toFixed(2)}
          r={d.r.toFixed(2)} fill={d.fill}
          opacity={d.op.toFixed(3)}
        />
      ))}

      <circle
        cx={CX - R_SPHERE * 0.34} cy={CY - R_SPHERE * 0.38} r={R_SPHERE * 0.92}
        fill="url(#po-spec)" opacity={haloPulse}
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Front half of the ring, plus the travelling lights. */}
      <g filter="url(#po-soft)">
        <g transform={`rotate(${tilt.toFixed(2)} ${CX} ${CY})`}>
          <ellipse
            cx={CX} cy={CY} rx={RING_A} ry={RING_B} fill="none"
            stroke={p.ring} strokeWidth={2.5} strokeOpacity={0.9}
            strokeDasharray={`${RING_C / 2} ${RING_C / 2}`}
            strokeDashoffset={-RING_C / 2}
          />
        </g>
        {ORBITERS.map((o, i) => {
          const t = (o.t0 + u * speed * o.spin) * TAU;
          const ex = CX + Math.cos(t) * RING_A;
          const ey = CY + Math.sin(t) * RING_B;
          const rx = CX + (ex - CX) * Math.cos(ringTiltRad) - (ey - CY) * Math.sin(ringTiltRad);
          const ry = CY + (ex - CX) * Math.sin(ringTiltRad) + (ey - CY) * Math.cos(ringTiltRad);
          return (
            <circle
              key={`o${i}`}
              cx={rx.toFixed(2)} cy={ry.toFixed(2)}
              r={(o.size * (0.8 + 0.35 * cyc(1, i * 0.25))).toFixed(2)}
              fill={i % 2 === 0 ? p.white : p.pale}
              opacity={(0.55 + 0.45 * cyc(1, i * 0.25)).toFixed(3)}
            />
          );
        })}
      </g>

      <rect width={VB_W} height={VB_H} fill="url(#po-vig)" />
    </svg>
  );
};

export { ParticleOrb };
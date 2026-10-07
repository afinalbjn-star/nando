import React from 'react';
import { useCurrentFrame } from 'remotion';
import { lerpColor } from '../utils/colors';

export type BeamLatticeScheme = 'steel' | 'abyss' | 'ember';

interface BeamLatticeProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: BeamLatticeScheme;
}

/* One flat colour pair per beam family. A face is a solid lerp between the
   two, so the piece stays flat-vector: no gradients, no soft shadow, and the
   hard value jump between facets is the only depth cue. */
interface Tone {
  lit: string;
  shade: string;
}

interface Pal {
  bg: string;
  up: Tone[];
  down: Tone[];
}

const PALETTES: Record<BeamLatticeScheme, Pal> = {
  steel: {
    bg: '#FFFFFF',
    up: [
      { lit: '#9FC2D8', shade: '#3E5867' },
      { lit: '#8FB6CE', shade: '#33505F' },
      { lit: '#A8CBDE', shade: '#4A6472' },
      { lit: '#B4D3E3', shade: '#557081' },
    ],
    down: [
      { lit: '#6E8C9C', shade: '#16272F' },
      { lit: '#5E7C8C', shade: '#12222A' },
      { lit: '#7C99A8', shade: '#1B2D35' },
      { lit: '#8CA8B6', shade: '#22363F' },
    ],
  },
  abyss: {
    bg: '#0B1218',
    up: [
      { lit: '#7CC0EC', shade: '#17394F' },
      { lit: '#68B2E2', shade: '#123043' },
      { lit: '#8ECBEE', shade: '#1D4358' },
      { lit: '#A4D8F2', shade: '#26566B' },
    ],
    down: [
      { lit: '#2F7096', shade: '#081B26' },
      { lit: '#245E80', shade: '#061620' },
      { lit: '#3D87AC', shade: '#0C2632' },
      { lit: '#559BBE', shade: '#12333F' },
    ],
  },
  ember: {
    bg: '#150E0A',
    up: [
      { lit: '#EBAC72', shade: '#5B3119' },
      { lit: '#E0A065', shade: '#522B16' },
      { lit: '#F3BB84', shade: '#68391F' },
      { lit: '#F8C99A', shade: '#734427' },
    ],
    down: [
      { lit: '#B5733E', shade: '#391B0D' },
      { lit: '#A46635', shade: '#32180B' },
      { lit: '#C48349', shade: '#452112' },
      { lit: '#D09257', shade: '#552B16' },
    ],
  },
};

const VB_W = 1600;
const VB_H = 900;
const CX = 800;
const CY = 452;
const MARGIN = 0.05;

const TAU = Math.PI * 2;

const LEVELS = 4;
const R0 = 300;
/* Each ring is an up/down triangle pair, so its outline is a hexagon of
   circumradius R and inradius 0.866*R. Nesting needs the next ring's
   circumradius to sit inside that inradius, hence RING_Q < 0.866. 0.58 keeps
   the central void clear while the four rings stay visibly distinct. */
const RING_Q = 0.58;
/* Ring offsets are small relative to R0. The reference figure is 1.14 as tall
   as it is wide, which is the theoretical H/W of a pointy-top hexagon, 2/sqrt3.
   Spreading the rings far apart in z would widen the silhouette instead and
   make the figure read squat, so keep z modest and let the 3D turn supply the
   depth. */
const RING_Z = [40, 13, -13, -40];
const RING_W = [17, 11.5, 8, 5.6];

/* A constant lean, so the hexagon is never dead-on and the far side of the
   cage stays visible. */
const BASE_TILT = 0.35;

/* Light from the upper left, slightly in front of the camera. Fixed, so facet
   values never swim: the figure turns, the shading does not. */
const LIGHT: readonly [number, number, number] = (() => {
  const v = [-0.55, 0.72, 0.46];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
})();

type Vec3 = readonly [number, number, number];

interface BeamSpec {
  a: Vec3;
  b: Vec3;
  w: number;
  ring: number;
  up: boolean;
}

const polar = (deg: number, r: number, z: number): Vec3 => [
  Math.cos((deg * Math.PI) / 180) * r,
  Math.sin((deg * Math.PI) / 180) * r,
  z,
];

/* Static geometry, built once at module load. Just the four nested hexagram
   pairs: an up-pointing and a down-pointing equilateral triangle per ring,
   which together trace a hexagon of circumradius R and inradius 0.866*R.
   Nesting needs the next ring's circumradius to sit inside that inradius, hence
   RING_Q < 0.866.

   There are deliberately no radial struts between rings. The reference lattice
   is nested hexagrams only, and a connector can only ever terminate at a
   vertex, where its flat end cap then reads as a stub hanging in the open void
   of the neighbouring ring. Removing them matches the reference and removes the
   artifact. */
const BEAMS: readonly BeamSpec[] = (() => {
  const out: BeamSpec[] = [];
  for (let i = 0; i < LEVELS; i++) {
    const r = R0 * Math.pow(RING_Q, i);
    for (const degs of [
      [90, 210, 330],
      [270, 30, 150],
    ]) {
      const pts = degs.map((d) => polar(d, r, RING_Z[i]));
      for (let e = 0; e < 3; e++) {
        out.push({ a: pts[e], b: pts[(e + 1) % 3], w: RING_W[i], ring: i, up: degs[0] === 90 });
      }
    }
  }
  return out;
})();

const FACE_INDICES: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 2, 3],
  [7, 6, 5, 4],
  [0, 4, 5, 1],
  [1, 5, 6, 2],
  [2, 6, 7, 3],
  [3, 7, 4, 0],
];

const rotY = (v: Vec3, a: number): Vec3 => [
  v[0] * Math.cos(a) + v[2] * Math.sin(a),
  v[1],
  -v[0] * Math.sin(a) + v[2] * Math.cos(a),
];

const rotX = (v: Vec3, a: number): Vec3 => [
  v[0],
  v[1] * Math.cos(a) - v[2] * Math.sin(a),
  v[1] * Math.sin(a) + v[2] * Math.cos(a),
];

interface Face {
  x: number[];
  y: number[];
  fill: string;
  /* Sort key is the NEAREST corner (max z), not the centroid. A long beam
     overlapping a short one has a centroid that says nothing about which is in
     front: the beam only wins the pixels it actually covers if its whole body
     is drawn after. Keying on max z keeps the closer of two crossing beams on
     top for the whole extent of the crossing. */
  depth: number;
}

/* Every animated term is an integer number of cycles in u, so u = 1 reproduces
   u = 0 exactly and the loop is seamless. Yaw is the gesture: a *partial* turn.
   A full revolution would carry the hexagon edge-on twice per loop and collapse
   the figure to a bar; +/-0.4 rad reveals the depth of the cage without ever
   losing the silhouette. Tilt, roll, bob, the per-ring rise and the breath are
   phase-offset copies at a fraction of that amplitude, so the rings move
   against each other instead of as one rigid block. */
const pose = (u: number) => ({
  yaw: 0.4 * Math.sin(TAU * u),
  tilt: BASE_TILT + 0.11 * Math.sin(TAU * (u + 1 / 3)),
  roll: 0.05 * Math.sin(TAU * (u + 1 / 6)),
  bob: 22 * Math.sin(TAU * (u + 2 / 3)),
  breathe: 1 + 0.05 * Math.sin(TAU * 2 * u),
});

/* Rings rise and fall out of phase with each other instead of rotating out of
   phase. Rise is safe where shear was not: every beam of a triangle takes its
   whole ring's rise, so the triangle translates as a unit and no vertex ever
   pulls away from the beams meeting it, whereas rotating a ring would leave
   each triangle's vertex stranded at the old angle. */
const ringRise = (i: number, u: number) => 13 * Math.sin(TAU * (u + i / LEVELS));

/* The six box faces of an extruded square beam, each with a flat value from the
   single fixed light. Unit scale, centred on the origin; the caller fits it. */
function facesOf(spec: BeamSpec, tone: Tone, rot: (v: Vec3) => Vec3, roll: number): Face[] {
  const { a, b, w } = spec;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const dl = Math.hypot(dx, dy, dz) || 1;
  const d: Vec3 = [dx / dl, dy / dl, dz / dl];

  const ref: Vec3 = Math.abs(d[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0];
  let rx = ref[1] * d[2] - ref[2] * d[1];
  let ry = ref[2] * d[0] - ref[0] * d[2];
  let rz = ref[0] * d[1] - ref[1] * d[0];
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl;
  ry /= rl;
  rz /= rl;
  const ux = d[1] * rz - d[2] * ry;
  const uy = d[2] * rx - d[0] * rz;
  const uz = d[0] * ry - d[1] * rx;

  const mk = (base: Vec3, s1: number, s2: number): Vec3 => [
    base[0] + rx * w * s1 + ux * w * s2,
    base[1] + ry * w * s1 + uy * w * s2,
    base[2] + rz * w * s1 + uz * w * s2,
  ];

  const project = (v: Vec3) => {
    const p = rot(v);
    return {
      x: p[0] * Math.cos(roll) - p[1] * Math.sin(roll),
      y: p[0] * Math.sin(roll) + p[1] * Math.cos(roll),
      z: p[2],
    };
  };

  /* The face normal comes from the projected face centre against the projected
     beam centre. Taking it from the unrotated centre instead would key the
     lighting to object space and the values would swim as the cage turns. */
  const centre: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const cp = project(centre);
  const corners: Vec3[] = [
    mk(a, 1, 1),
    mk(a, 1, -1),
    mk(a, -1, -1),
    mk(a, -1, 1),
    mk(b, 1, 1),
    mk(b, 1, -1),
    mk(b, -1, -1),
    mk(b, -1, 1),
  ];
  const pts = corners.map(project);

  const out: Face[] = [];
  for (const fi of FACE_INDICES) {
    const v = fi.map((i) => pts[i]);
    let fx = 0;
    let fy = 0;
    let fz = 0;
    for (const q of v) {
      fx += q.x / 4 - cp.x / 4;
      fy += q.y / 4 - cp.y / 4;
      fz += q.z / 4 - cp.z / 4;
    }
    const fl = Math.hypot(fx, fy, fz) || 1;
    const nz = fz / fl;
    // Camera looks along -Z: a facet turned away from it is not drawn.
    if (nz <= 0) continue;
    const lam = Math.max(0, (fx / fl) * LIGHT[0] + (fy / fl) * LIGHT[1] + nz * LIGHT[2]);
    out.push({
      x: v.map((q) => q.x),
      y: v.map((q) => q.y),
      fill: lerpColor(tone.shade, tone.lit, 0.26 + 0.74 * lam),
      depth: Math.max(v[0].z, v[1].z, v[2].z, v[3].z),
    });
  }
  return out;
}

/* The lattice for one instant, in object space, with the given rise per ring. */
function lattice(pal: Pal, u: number): Face[] {
  const { yaw, tilt, roll } = pose(u);
  const full = (v: Vec3): Vec3 => rotX(rotY(v, yaw), tilt);

  const faces: Face[] = [];
  for (const spec of BEAMS) {
    /* Both ends of a ring beam take the same rise, so the ring shears against
       the others instead of moving as one rigid block, and no joint separates:
       a triangle's three beams all ride the same ring's rise. */
    const rise = ringRise(spec.ring, u);
    const lifted: BeamSpec = {
      a: [spec.a[0], spec.a[1], spec.a[2] + rise],
      b: [spec.b[0], spec.b[1], spec.b[2] + rise],
      w: spec.w,
      ring: spec.ring,
      up: spec.up,
    };
    const tone = spec.up ? pal.up[spec.ring] : pal.down[spec.ring];
    faces.push(...facesOf(lifted, tone, full, roll));
  }
  faces.sort((p, q) => p.depth - q.depth);
  return faces;
}

/* Fit is solved once, at module load, by scanning the whole loop. Doing it per
   frame would make the figure breathe in scale as the bbox changes with the
   turn; solving it against the union of every frame's bbox gives one constant
   scale that is guaranteed to clear the frame at every instant. */
const FIT: { s: number } = (() => {
  let maxX = 0;
  let maxY = 0;
  const dummy: Pal = PALETTES.steel;
  for (let i = 0; i < 48; i++) {
    for (const f of lattice(dummy, i / 48)) {
      for (let k = 0; k < f.x.length; k++) {
        maxX = Math.max(maxX, Math.abs(f.x[k]));
        maxY = Math.max(maxY, Math.abs(f.y[k]));
      }
    }
  }
  return { s: Math.min((VB_W * (1 - MARGIN)) / (2 * maxX), (VB_H * (1 - MARGIN)) / (2 * maxY)) };
})();

export const BeamLattice: React.FC<BeamLatticeProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'steel',
}) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) * speed;
  const pal = PALETTES[scheme];
  const s = FIT.s * pose(u).breathe;
  const cy = CY + pose(u).bob;
  const faces = lattice(pal, u);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={width} height={height}>
      <rect width={VB_W} height={VB_H} fill={pal.bg} />
      {faces.map((f, k) => (
        <polygon
          key={k}
          points={f.x.map((x, i) => `${(CX + x * s).toFixed(2)},${(cy - f.y[i] * s).toFixed(2)}`).join(' ')}
          fill={f.fill}
          stroke={f.fill}
          /* The stroke matches the fill and is sized to cover the antialiasing
             seam between the six faces of a beam; without it the box edges show
             through as pale pinholes. */
          strokeWidth={1.1}
        />
      ))}
    </svg>
  );
};

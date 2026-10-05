import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame } from 'remotion';

export type ChromeRibbonsScheme = 'prismatic' | 'ember' | 'ice';

interface ChromeRibbonsProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: ChromeRibbonsScheme;
}

interface Pal {
  /* Cosine palette offsets for R, G and B, evenly spaced a third of a cycle
     apart. Uneven offsets put two channels in phase and the palette collapses
     to two hues. */
  phase: [number, number, number];
  gain: number;
  spec: number;
}

const WARM: Pal = { phase: [0.02, 0.3533, 0.6867], gain: 0.98, spec: 1.3 };
const COOL: Pal = { phase: [0.54, 0.8733, 0.2067], gain: 0.98, spec: 1.3 };

/* The reference gives the two forms different colour: the lower left sweep is
   copper and orange, the upper right one is blue and white. A single scheme
   applied to both was the reason this never matched. */
const SCHEMES: Record<ChromeRibbonsScheme, [Pal, Pal]> = {
  prismatic: [WARM, COOL],
  ember: [WARM, WARM],
  ice: [COOL, COOL],
};

const NS = 460;
const NV = 72;
const TAU = Math.PI * 2;

/* Y is negative for the lower form. three.js puts +y up on screen, so writing
   control points in SVG order silently mirrors the whole composition. */
type Pt = [number, number, number];

/* Both spines run well past the frame edges. The reference is a macro view: the
   forms crop on every side and only a wedge of black negative space is visible.
   Sizing them to fit inside the frame was the single biggest miss. */
/* Kept well apart in y. With widths this large an overlap folds both surfaces
   through each other and the result reads as fish scales rather than metal. */
const SPINE_A: Pt[] = [
  [-1600, -830, -200],
  [-760, -600, 260],
  [80, -470, -220],
  [860, -350, 280],
  [1560, -230, -160],
  [2100, -120, 200],
];

const SPINE_B: Pt[] = [
  [420, 900, 180],
  [960, 660, -240],
  [1460, 500, 260],
  [1880, 370, -180],
  [2300, 300, 220],
];

type Profile = {
  spine: Pt[];
  width: number;
  thick: number;
  twist: number;
  dir: number;
};

/* Near round, and barely any twist. A flat section with a strong twist folds the
   sheet through itself; the reference is a clean tube that simply turns. */
const PROFILES: Profile[] = [
  { spine: SPINE_A, width: 380, thick: 190, twist: 0.32, dir: 1 },
  { spine: SPINE_B, width: 330, thick: 165, twist: -0.28, dir: -1 },
];

/* THREE's Frenet frames are used deliberately. A hand rolled rotation
   minimising frame looks like the right tool here, but its v2 = tL x t_i term
   goes to zero on a smooth curve, and dividing by it turned numerical noise into
   a sawtooth along the whole ribbon. The remaining problem was a visible crease
   at inflection points, which is handled by keeping the spines free of them
   rather than by changing the frame maths. */
const buildRibbon = (pr: Profile, spin: number) => {
  const curve = new THREE.CatmullRomCurve3(
    pr.spine.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'catmullrom',
    0.5,
  );
  const frames = curve.computeFrenetFrames(NS, false);

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const P = curve.getPointAt(s);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    const belly = Math.pow(Math.sin(Math.PI * s), 0.5);
    const w = pr.width * (0.3 + 0.7 * belly);
    const th = pr.thick * (0.34 + 0.66 * belly);
    const tw = Math.pow(s, 0.9) * pr.twist + spin * pr.dir;
    const c = Math.cos(tw);
    const sn = Math.sin(tw);

    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1;
      // Film thickness rides in uv.x. A custom attribute is not guaranteed to be
      // bound by ShaderMaterial; uv always is.
      uv.push((v + 1) / 2 + s * 2.2, 0);

      const ang = v * Math.PI;
      const lx = Math.cos(ang) * w;
      const ly = Math.sin(ang) * th;
      const rx = lx * c - ly * sn;
      const ry = lx * sn + ly * c;

      pos.push(
        P.x + N.x * rx + B.x * ry,
        P.y + N.y * rx + B.y * ry,
        P.z + N.z * rx + B.z * ry,
      );
    }
  }

  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j;
      const b = a + NV + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
};

const VERT = `
  varying vec3 vN;
  varying vec3 vV;
  varying float vB;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalMatrix * normal;
    vV = -mv.xyz;
    vB = uv.x;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = `
  precision highp float;
  varying vec3 vN;
  varying vec3 vV;
  varying float vB;
  uniform vec3 uPhase;
  uniform float uGain;
  uniform float uSpec;
  uniform float uThick;

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vV);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 1.0);

    // Reflection of a dark studio with two strip lights. Metal is mostly a
    // reflection of its surroundings, so the tonal range comes from here and the
    // film only tints it.
    vec3 R = reflect(-V, N);
    float env = smoothstep(-0.4, 0.72, R.y);
    vec3 envCol = mix(vec3(0.0), vec3(1.0), pow(env, 3.1));
    envCol += vec3(1.0) * pow(max(1.0 - abs(R.y - 0.36) * 9.0, 0.0), 2.0) * 1.6;
    envCol += vec3(0.8, 0.9, 1.0) * pow(max(1.0 - abs(R.y + 0.02) * 17.0, 0.0), 2.0) * 0.95;

    // Thin film, driven only by the view angle. An earlier version multiplied in
    // the cross section parameter to get bands, and that is what produced the
    // striped oil slick look: the reference has no banding at all, only a sheen
    // that slides across the curvature of the tube.
    // A gentle film sweep across the ribbon, not discrete stripes. Dropping the
    // cross section term entirely went too far the other way: the reference does
    // have fine striations, just soft ones that follow the surface.
    float t = vB * 5.5 + fres * 2.2 + uThick;
    vec3 film = 0.5 + 0.5 * cos(6.2831853 * (uPhase + t));

    vec3 L = normalize(vec3(-0.42, 0.78, 0.52));
    vec3 H = normalize(L + V);
    float glint = pow(max(dot(N, H), 0.0), 180.0);

    vec3 col = envCol * uGain * mix(vec3(1.0), film, 0.42);
    col += vec3(1.0) * glint * uSpec;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const Sheet: React.FC<{ pr: Profile; pal: Pal; spin: number; thick: number }> = ({
  pr, pal, spin, thick,
}) => {
  const geo = useMemo(() => buildRibbon(pr, spin), [pr, spin]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.DoubleSide,
        uniforms: {
          uPhase: { value: new THREE.Vector3(...pal.phase) },
          uGain: { value: pal.gain },
          uSpec: { value: pal.spec },
          uThick: { value: thick },
        },
      }),
    [],
  );

  mat.uniforms.uThick.value = thick;
  mat.uniforms.uPhase.value.set(...pal.phase);
  mat.uniforms.uGain.value = pal.gain;
  mat.uniforms.uSpec.value = pal.spec;

  return <mesh geometry={geo} material={mat} />;
};

const ChromeRibbons: React.FC<ChromeRibbonsProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'prismatic',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const pair = SCHEMES[scheme];

  // One whole turn per loop, so the twist lands back on its start orientation.
  const spin = TAU * u * speed;
  // Symmetric sines, not ramps: a ramp ends on a different value than it began
  // and the loop pops.
  const thickA = 0.2 + 0.35 * Math.sin(TAU * u * speed);
  const thickB = 0.2 + 0.35 * Math.sin(TAU * u * speed + 1.35);

  return (
    <div style={{ width, height, background: '#000000' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 2600], fov: 46, near: 1, far: 16000 }}
        gl={{ antialias: true, alpha: false }}
        flat
        style={{ background: '#000000' }}
      >
        <Sheet pr={PROFILES[0]} pal={pair[0]} spin={spin} thick={thickA} />
        <Sheet pr={PROFILES[1]} pal={pair[1]} spin={spin} thick={thickB} />
      </ThreeCanvas>
    </div>
  );
};

export { ChromeRibbons };

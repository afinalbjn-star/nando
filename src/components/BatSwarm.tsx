import React from 'react';
import { useCurrentFrame } from 'remotion';

export type BatSwarmScheme = 'classic' | 'moon' | 'blood';

interface BatSwarmProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: BatSwarmScheme;
}

interface Pal {
  hot: string;
  mid: string;
  deep: string;
  edge: string;
  bat: string;
}

const PALETTES: Record<BatSwarmScheme, Pal> = {
  classic: { hot: '#ffa32b', mid: '#f4830c', deep: '#d06000', edge: '#a84600', bat: '#040202' },
  moon: { hot: '#2b3c66', mid: '#141d35', deep: '#06080f', edge: '#02030a', bat: '#e9f1ff' },
  blood: { hot: '#8e1122', mid: '#5c0714', deep: '#200409', edge: '#330107', bat: '#120103' },
};

const VB_W = 1600;
const VB_H = 900;
const CX = 800;
const CY = 440;
const FLOCK = 96;

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/* The wing is split at mid span so the outer panel can rotate against the inner
   one. A bat wing is not a rigid paddle: the tip whips through the stroke while
   the shoulder leads, and that bend is most of what makes a flap read as real.
   The two panels overlap by about two units across the joint so the seam never
   opens into a tear when the tip swings. */
const WING_INNER =
  'M 2.5,-2 C 11,-8.5 20,-11.2 28.6,-11.2 ' +
  'C 28,-8 26.8,-5 25.2,-2 C 23.7,-0.4 21.7,2 19.7,4.2 ' +
  'C 15.7,4.6 9,5.6 2.5,4.6 Z';

const WING_OUTER =
  'M 26.4,-11 C 33.5,-10.5 43,-10.4 48.5,-6.5 ' +
  'C 43,-2 40,1 35.5,3.2 C 33.5,0.6 31,2 28.5,4.2 ' +
  'C 27,2 26.2,0 26.4,-2 C 26.6,-5 26.4,-8 26.4,-11 Z';

const JOINT_X = 27.2;
const JOINT_Y = 1.5;
const SH_X = 2.5;
const SH_Y = 1.5;

const BODY =
  'M 0,-12.6 L -3.6,-13 L -2.4,-8.6 L -3.2,3.6 L 0,10.2 L 3.2,3.6 ' +
  'L 2.4,-8.6 L 3.6,-13 Z';

/* Asymmetric wingbeat: the power stroke drives the wing down in under a third of
   the cycle, the recovery carries it back up over the remaining two thirds.
   Returns -1 (fully down) to +1 (fully up). */
const DOWN = 0.34;
const flapCurve = (phi: number) => {
  const t = phi < DOWN ? phi / DOWN : (phi - DOWN) / (1 - DOWN);
  const e = t * t * (3 - 2 * t);
  return phi < DOWN ? 1 - 2 * e : -1 + 2 * e;
};

interface Bat {
  ang: number;
  spreadAng: number;
  baseR: number;
  lane: number;
  phase: number;
  flapK: number;
  flapPh: number;
  size: number;
  rot: number;
  bob: number;
}

const BATS = (() => {
  const r = lcg(31337);
  const out: Bat[] = [];
  const flapPool = [14, 18, 22, 26];
  for (let i = 0; i < FLOCK; i++) {
    // Phase is spread evenly so a steady stream of bats sits at every depth,
    // rather than the whole flock arriving at once.
    const phase = (i / FLOCK + r() * 0.7 / FLOCK) % 1;
    const laneAng = r() * Math.PI * 2;
    out.push({
      ang: laneAng,
      spreadAng: (r() - 0.5) * 1.15,
      baseR: 60 + Math.pow(r(), 0.7) * 560,
      lane: (r() - 0.5) * 190,
      phase,
      flapK: flapPool[Math.floor(r() * flapPool.length)],
      flapPh: r(),
      size: 0.5 + r() * 0.62,
      rot: (r() - 0.5) * 26,
      bob: 2.4 + r() * 3.4,
    });
  }
  return out;
})();

const BatSwarm: React.FC<BatSwarmProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'classic',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];

  // Bats fly out of the depths toward the camera and dissolve as they pass it.
  // Wrapping the depth phase keeps the whole cycle identical at u = 0 and u = 1.
  const near: JSX.Element[] = [];
  const mid: JSX.Element[] = [];
  const far: JSX.Element[] = [];

  BATS.forEach((b, i) => {
    const d = (u * speed + b.phase) % 1;

    const persp = Math.min(8, 1 / (2.2 - d * 2.15));
    const spread = 0.42 + 1.55 * Math.abs(2 * d - 1);
    const ang = b.ang + b.spreadAng * d;
    const rad = b.baseR * spread;

    const x = CX + Math.cos(ang) * rad * 1.34;
    const y = CY + Math.sin(ang) * rad * 0.7 + b.lane * d;

    const phi = (b.flapK * u * speed + b.flapPh) % 1;
    const c = flapCurve(phi);
    // Held slightly below level: a silhouette that goes fully edge-on on the
    // upstroke collapses into a sliver and stops reading as a bat.
    const inner = c * 32 - 7;
    const outer = (c - flapCurve((phi + 0.92) % 1)) * 9;
    const fold = 1 - 0.17 * Math.max(0, c);
    const bob = c * b.bob;

    // Invisible at both ends of the depth range, so the wrap is never seen.
    const fin = Math.min(1, d / 0.16);
    const fout = Math.min(1, (1 - d) / 0.17);
    const op = fin * fout;
    if (op <= 0.004) return;

    const s = b.size * persp * (0.1 + 0.9 * d);
    const wing = (
      <>
        <g>
          <g transform={`translate(${SH_X} ${SH_Y}) scale(${fold.toFixed(3)} 1) translate(${-SH_X} ${-SH_Y})`}>
            <g transform={`rotate(${inner.toFixed(2)} ${SH_X} ${SH_Y})`}>
              <path d={WING_INNER} />
              <g transform={`rotate(${outer.toFixed(2)} ${JOINT_X} ${JOINT_Y})`}>
                <path d={WING_OUTER} />
              </g>
            </g>
          </g>
        </g>
        <g transform="scale(-1 1)">
          <g transform={`translate(${SH_X} ${SH_Y}) scale(${fold.toFixed(3)} 1) translate(${-SH_X} ${-SH_Y})`}>
            <g transform={`rotate(${(-inner).toFixed(2)} ${SH_X} ${SH_Y})`}>
              <path d={WING_INNER} />
              <g transform={`rotate(${(-outer).toFixed(2)} ${JOINT_X} ${JOINT_Y})`}>
                <path d={WING_OUTER} />
              </g>
            </g>
          </g>
        </g>
        <path d={BODY} transform={`translate(0 ${bob.toFixed(2)})`} />
      </>
    );

    const el = (
      <g
        key={i}
        transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${b.rot.toFixed(2)}) scale(${s.toFixed(4)})`}
        fill={p.bat}
        opacity={op.toFixed(3)}
      >
        {wing}
      </g>
    );

    if (s >= 1.7) near.push(el);
    else if (s >= 0.55) mid.push(el);
    else far.push(el);
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="bs-bg" cx="0.5" cy="0.47" r="0.7">
          <stop offset="0" stopColor={p.hot} />
          <stop offset="0.42" stopColor={p.mid} />
          <stop offset="1" stopColor={p.deep} />
        </radialGradient>
        {/* The light the swarm is flying out of. */}
        <radialGradient id="bs-source" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.hot} stopOpacity="0.5" />
          <stop offset="0.5" stopColor={p.hot} stopOpacity="0.12" />
          <stop offset="1" stopColor={p.hot} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bs-vig" cx="0.5" cy="0.47" r="0.68">
          <stop offset="0.44" stopColor={p.edge} stopOpacity="0" />
          <stop offset="1" stopColor={p.edge} stopOpacity="0.7" />
        </radialGradient>
        <filter id="bs-blur-mid" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation={1.2} />
        </filter>
        <filter id="bs-blur-near" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={2.6} />
        </filter>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#bs-bg)" />
      <circle cx={CX} cy={CY} r={420} fill="url(#bs-source)" />

      {far}
      <g filter="url(#bs-blur-mid)">{mid}</g>
      <g filter="url(#bs-blur-near)">{near}</g>

      <rect width={VB_W} height={VB_H} fill="url(#bs-vig)" />
    </svg>
  );
};

export { BatSwarm };
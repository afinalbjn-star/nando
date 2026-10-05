import React from 'react';
import { useCurrentFrame } from 'remotion';

export type GlassOrbsScheme = 'noir' | 'ice' | 'ember';

interface GlassOrbsProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: GlassOrbsScheme;
}

interface Pal {
  skyTop: string;
  skyLow: string;
  floor: string;
  aCore: string;
  aMid: string;
  aEdge: string;
  aGlow: string;
  bCore: string;
  bMid: string;
  bEdge: string;
  bGlow: string;
  key: string;
}

const PALETTES: Record<GlassOrbsScheme, Pal> = {
  noir: {
    skyTop: '#060a11', skyLow: '#1e2c3b', floor: '#0b1017',
    aCore: '#eafdff', aMid: '#4ad4ec', aEdge: '#072f49', aGlow: '#39c8e8',
    bCore: '#ffe8f7', bMid: '#ec5aab', bEdge: '#4a0a30', bGlow: '#e8469a',
    key: '#cfe8ff',
  },
  ice: {
    skyTop: '#070910', skyLow: '#252d39', floor: '#0c1016',
    aCore: '#f4fcff', aMid: '#9ad4ee', aEdge: '#152c42', aGlow: '#8ec8e8',
    bCore: '#f8f4ff', bMid: '#b4c4ec', bEdge: '#232a4e', bGlow: '#9fb0e0',
    key: '#e0e8f5',
  },
  ember: {
    skyTop: '#090604', skyLow: '#30211a', floor: '#0e0906',
    aCore: '#fff3e2', aMid: '#ffb25c', aEdge: '#572808', aGlow: '#ff9d3d',
    bCore: '#ffe9e3', bMid: '#f2806f', bEdge: '#4a1214', bGlow: '#f4635a',
    key: '#ffe0c8',
  },
};

const VB_W = 1600;
const VB_H = 900;
/* The far edge of the floor. Orbs sit closer to the camera than this, so their
   contact points project below it, which is what sells the ground plane. */
const HORIZON = 552;
const TAU = Math.PI * 2;

const ORBS = [
  { x: 574, y: 388, r: 170, phase: 0, tone: 'a' as const },
  { x: 1014, y: 452, r: 216, phase: 0.36, tone: 'b' as const },
];

const GlassOrbs: React.FC<GlassOrbsProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'noir',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];

  const osc = (k: number, phase = 0) => Math.sin(Math.PI * 2 * (k * u * speed + phase));
  const cyc = (k: number, phase = 0) => 0.5 + 0.5 * osc(k, phase);

  const pose = (o: typeof ORBS[number]) => {
    const bob = osc(1, o.phase) * 15;
    const lift = osc(2, o.phase + 0.11);
    return {
      x: o.x + osc(1, o.phase + 0.28) * 11,
      y: o.y + bob,
      lift,
      squash: 1 - 0.016 * lift,
      pulse: 0.86 + 0.14 * cyc(1, o.phase + 0.4),
      contact: o.y + bob + o.r,
    };
  };

  const drawOrb = (o: typeof ORBS[number], dim: boolean) => {
    const { x, y, lift, squash, pulse } = pose(o);
    const core = o.tone === 'a' ? p.aCore : p.bCore;
    const mid = o.tone === 'a' ? p.aMid : p.bMid;
    const edge = o.tone === 'a' ? p.aEdge : p.bEdge;
    const glow = o.tone === 'a' ? p.aGlow : p.bGlow;
    const id = o.tone;
    const k = dim ? 0.66 : 1;

    return (
      <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
        <circle
          r={(o.r * (1.66 + 0.06 * lift)).toFixed(2)}
          fill={`url(#go-${id}-bloom)`}
          opacity={(0.5 * pulse * k).toFixed(3)}
        />
        <ellipse
          rx={o.r.toFixed(2)}
          ry={(o.r * squash).toFixed(2)}
          fill={`url(#go-${id}-body)`}
        />
        {/* Light caught inside the glass, turning once per loop. */}
        <g transform={`rotate(${(TAU * u * speed).toFixed(2)})`}>
          <ellipse
            cx={(-o.r * 0.3).toFixed(2)}
            cy={(o.r * 0.14).toFixed(2)}
            rx={(o.r * 0.56).toFixed(2)}
            ry={(o.r * 0.4).toFixed(2)}
            fill={mid}
            opacity={((0.3 + 0.1 * cyc(2, o.phase)) * k).toFixed(3)}
            filter="url(#go-soft)"
          />
        </g>
        <ellipse
          rx={o.r.toFixed(2)}
          ry={(o.r * squash).toFixed(2)}
          fill={`url(#go-${id}-wrap)`}
          style={{ mixBlendMode: 'screen' }}
          opacity={dim ? 0.5 : 1}
        />
        {/* Tight specular. A wide one reads as plastic, not glass. */}
        <ellipse
          cx={(-o.r * 0.34).toFixed(2)}
          cy={(-o.r * 0.44).toFixed(2)}
          rx={(o.r * 0.16).toFixed(2)}
          ry={(o.r * 0.1).toFixed(2)}
          fill={core}
          opacity={((0.72 + 0.12 * cyc(1, o.phase)) * k).toFixed(3)}
          transform={`rotate(-34 ${(-o.r * 0.34).toFixed(2)} ${(-o.r * 0.44).toFixed(2)})`}
          filter="url(#go-soft)"
        />
        <ellipse
          rx={(o.r - 1.2).toFixed(2)}
          ry={(o.r * squash - 1.2).toFixed(2)}
          fill="none"
          stroke={core}
          strokeWidth={1.4}
          opacity={((0.16 + 0.08 * cyc(1, o.phase + 0.2)) * k).toFixed(3)}
        />
      </g>
    );
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="go-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="0.6" stopColor={p.skyLow} />
          <stop offset="0.613" stopColor={p.skyLow} />
          <stop offset="0.615" stopColor={p.floor} />
          <stop offset="1" stopColor={p.floor} />
        </linearGradient>

        {(['a', 'b'] as const).map((t) => {
          const core = t === 'a' ? p.aCore : p.bCore;
          const mid = t === 'a' ? p.aMid : p.bMid;
          const edge = t === 'a' ? p.aEdge : p.bEdge;
          const glow = t === 'a' ? p.aGlow : p.bGlow;
          return (
            <React.Fragment key={t}>
              <radialGradient id={`go-${t}-body`} cx="0.36" cy="0.3" r="0.8">
                <stop offset="0" stopColor={core} />
                <stop offset="0.18" stopColor={mid} />
                <stop offset="0.5" stopColor={mid} stopOpacity="0.88" />
                {/* Deep falloff toward the rim is what makes it read as glass. */}
                <stop offset="0.8" stopColor={edge} stopOpacity="0.94" />
                <stop offset="0.94" stopColor={edge} />
                <stop offset="1" stopColor={edge} />
              </radialGradient>
              <radialGradient id={`go-${t}-bloom`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0.3" stopColor={glow} stopOpacity="0.6" />
                <stop offset="0.6" stopColor={glow} stopOpacity="0.18" />
                <stop offset="1" stopColor={glow} stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`go-${t}-wrap`} cx="0.7" cy="0.76" r="0.6">
                <stop offset="0.4" stopColor={glow} stopOpacity="0.4" />
                <stop offset="0.7" stopColor={mid} stopOpacity="0.14" />
                <stop offset="1" stopColor={mid} stopOpacity="0" />
              </radialGradient>
            </React.Fragment>
          );
        })}

        {/* Reflections fade with distance down the floor. */}
        <linearGradient id="go-refl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="0.78" stopColor="#ffffff" stopOpacity="0.09" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <mask id="go-reflmask">
          <rect
            x="0" y={HORIZON - 4} width={VB_W} height={VB_H - HORIZON + 4}
            fill="url(#go-refl)"
          />
        </mask>

        <radialGradient id="go-vig" cx="0.5" cy="0.46" r="0.74">
          <stop offset="0.32" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.74" />
        </radialGradient>
        <filter id="go-soft" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="go-contact" x="-40%" y="-100%" width="180%" height="300%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#go-sky)" />

      <ellipse
        cx={740} cy={300} rx={600} ry={400}
        fill="url(#go-a-bloom)"
        opacity={0.26}
        filter="url(#go-soft)"
      />

      {/* Far edge of the floor. Drawn before the orbs: it is behind them, and
          putting it on top slices a bright line straight through the pair. */}
      <rect x="0" y={HORIZON - 1} width={VB_W} height="2" fill={p.key} opacity={0.14} />

      {/* Each orb reflects about its own contact point, not the horizon. A shared
          mirror line puts the near orb's reflection at the wrong depth. */}
      <g mask="url(#go-reflmask)">
        {ORBS.map((o, i) => {
          const { contact } = pose(o);
          return (
            <g key={`r${i}`} transform={`translate(0 ${(contact * 2).toFixed(2)}) scale(1 -1)`}>
              {drawOrb(o, true)}
            </g>
          );
        })}
      </g>

      {ORBS.map((o, i) => {
        const { x, contact, lift } = pose(o);
        return (
          <g key={`c${i}`}>
            <ellipse
              cx={x}
              cy={contact + 3}
              rx={(o.r * 0.66 * (1 + 0.09 * lift)).toFixed(2)}
              ry={(o.r * 0.075).toFixed(2)}
              fill="#000000"
              opacity={0.62}
              filter="url(#go-contact)"
            />
            <ellipse
              cx={x}
              cy={contact + 1}
              rx={(o.r * 0.3).toFixed(2)}
              ry={(o.r * 0.03).toFixed(2)}
              fill="#000000"
              opacity={0.5}
            />
          </g>
        );
      })}

      {ORBS.map((o, i) => (
        <React.Fragment key={i}>{drawOrb(o, false)}</React.Fragment>
      ))}

      <rect width={VB_W} height={VB_H} fill="url(#go-vig)" />
    </svg>
  );
};

export { GlassOrbs };

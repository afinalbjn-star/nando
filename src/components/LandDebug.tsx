import React from 'react';
import { useCurrentFrame } from 'remotion';
import { LAND_SAMPLES } from './landMask';

/* Debug only: land stipple alone, no arcs, no glow, no terminator. Used to judge
   whether the geography reads without the network layer hiding it. */
export const LandDebug: React.FC = () => {
  const frame = useCurrentFrame();
  const u = frame / 240;
  const TAU = Math.PI * 2;
  const D2R = Math.PI / 180;
  const lon = 14 + 7 * Math.sin(TAU * u);
  const lat = 30 + 3.5 * Math.sin(TAU * (u + 1 / 3));
  const R = 372;
  const CX = 800;
  const CY = 450;

  const toVec = (lo: number, la: number): [number, number, number] => {
    const l = la * D2R;
    const g = lo * D2R;
    return [Math.cos(l) * Math.sin(g), Math.sin(l), Math.cos(l) * Math.cos(g)];
  };
  const project = (v: [number, number, number], clon: number, clat: number) => {
    const lo = v[0] * Math.cos(clon * D2R) - v[2] * Math.sin(clon * D2R);
    const z0 = v[0] * Math.sin(clon * D2R) + v[2] * Math.cos(clon * D2R);
    const y1 = v[1] * Math.cos(clat * D2R) - z0 * Math.sin(clat * D2R);
    const z1 = v[1] * Math.sin(clat * D2R) + z0 * Math.cos(clat * D2R);
    return { x: CX + lo * R, y: CY - y1 * R, d: z1 };
  };

  return (
    <svg viewBox="0 0 1600 900" width={3200} height={1800}>
      <rect width={1600} height={900} fill="#0B0715" />
      <circle cx={CX} cy={CY} r={R} fill="#141033" />
      {LAND_SAMPLES.map((p, i) => {
        const s = project(toVec(p[0], p[1]), lon, lat);
        if (s.d <= 0.015) return null;
        return <circle key={i} cx={s.x} cy={s.y} r={2.2} fill="#EFE6FF" fillOpacity={0.5 + 0.5 * s.d} />;
      })}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#B9A4E8" strokeWidth="1.5" />
      <text x={20} y={40} fill="#B9A4E8" fontSize={28}>samples: {LAND_SAMPLES.length}</text>
    </svg>
  );
};
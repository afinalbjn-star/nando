import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { LAND_PTS } from './landData';

interface GlobeOrbitProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;

function toVec(lon: number, lat: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

const GlobeOrbit: React.FC<GlobeOrbitProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;

  const model = useMemo(() => {
    const pts = LAND_PTS.map(([lon, lat]) => {
      const [x, y, z] = toVec(lon, lat);
      return { x, y, z };
    });
    return { pts };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, height * 0.9);
    bg.addColorStop(0, '#0a1c38');
    bg.addColorStop(1, '#020813');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.52;
    const R = height * 0.30;
    const rot = t * 1;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const rings = [
      { r: R * 1.45, tilt: 0.42, speed: 1, sats: 3, color: '120,200,255' },
      { r: R * 1.75, tilt: -0.30, speed: 2, sats: 2, color: '170,140,255' },
    ];

    for (const rg of rings) {
      ctx.save();
      ctx.strokeStyle = 'rgba(' + rg.color + ',0.22)';
      ctx.lineWidth = Math.max(0.8, width / 2400);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rg.r, Math.abs(rg.r * Math.sin(rg.tilt)) + rg.r * 0.12, 0, 0, PI2);
      ctx.stroke();
      ctx.restore();
      for (let k = 0; k < rg.sats; k++) {
        const a = t * rg.speed + (k * PI2) / rg.sats;
        const ox = Math.cos(a) * rg.r;
        const oy = Math.sin(a) * rg.r * Math.sin(rg.tilt);
        const oz = Math.sin(a) * rg.r * Math.cos(rg.tilt);
        const sx = cx + ox;
        const sy = cy + oy;
        const front = oz > 0;
        const sr = (front ? 5 : 3.2) * (width / 1920);
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.4);
        glow.addColorStop(0, 'rgba(255,255,255,' + (front ? 0.95 : 0.4) + ')');
        glow.addColorStop(0.4, 'rgba(' + rg.color + ',' + (front ? 0.55 : 0.22) + ')');
        glow.addColorStop(1, 'rgba(' + rg.color + ',0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - sr * 2.4, sy - sr * 2.4, sr * 4.8, sr * 4.8);
      }
    }

    ctx.fillStyle = 'rgb(225,240,255)';
    for (const p of model.pts) {
      const x1 = p.x * cosR + p.z * sinR;
      const z1 = -p.x * sinR + p.z * cosR;
      if (z1 < -0.15) continue;
      ctx.beginPath();
      ctx.arc(cx + x1 * R, cy - p.y * R, 1.2 * (width / 1920), 0, PI2);
      ctx.fill();
    }

    const atm = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.1);
    atm.addColorStop(0, 'rgba(90,160,255,0.16)');
    atm.addColorStop(1, 'rgba(90,160,255,0)');
    ctx.fillStyle = atm;
    ctx.fillRect(cx - R * 1.15, cy - R * 1.15, R * 2.3, R * 2.3);
  }, [frame, width, height, totalFrames, speed, t, model]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#04101f' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { GlobeOrbit };

import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { LAND_PTS, OCEAN_PTS } from './landData';

interface GlobeNightProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;

function hash2(i: number, j: number) {
  let s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function toVec(lon: number, lat: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

const GlobeNight: React.FC<GlobeNightProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;

  const model = useMemo(() => {
    const pts: { x: number; y: number; z: number; ocean: boolean; city: boolean }[] = [];
    for (const [lon, lat] of LAND_PTS) {
      const [x, y, z] = toVec(lon, lat);
      pts.push({ x, y, z, ocean: false, city: hash2(Math.round(lon * 10), Math.round(lat * 10)) > 0.93 });
    }
    for (const [lon, lat] of OCEAN_PTS) {
      const [x, y, z] = toVec(lon, lat);
      pts.push({ x, y, z, ocean: true, city: false });
    }
    return { pts };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#01040a';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 90; i++) {
      const bx = hash2(i, 3) * width;
      const by = hash2(i, 17) * height;
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.9));
      ctx.fillStyle = 'rgba(200,220,255,' + (tw * 0.5).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(bx, by, (0.6 + hash2(i, 29)) * (width / 1920), 0, PI2);
      ctx.fill();
    }

    const cx = width * 0.5;
    const cy = height * 0.52;
    const R = height * 0.36;
    const rot = t * 1;
    const tilt = 0.18;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const sunA = 0.9;
    const sun: [number, number, number] = [Math.cos(sunA), 0.25, Math.sin(sunA)];

    for (const p of model.pts) {
      const x1 = p.x * cosR + p.z * sinR;
      const z1 = -p.x * sinR + p.z * cosR;
      const y1 = p.y * cosT - z1 * sinT;
      const z2 = p.y * sinT + z1 * cosT;
      if (z2 < -0.15) continue;
      const sx = cx + x1 * R;
      const sy = cy - y1 * R;
      const day = Math.max(-1, Math.min(1, x1 * sun[0] + y1 * sun[1] + z2 * sun[2]));
      const dayF = Math.max(0, Math.min(1, (day + 0.25) / 0.5));
      if (p.ocean) {
        ctx.fillStyle = 'rgba(70,120,200,' + (0.05 + dayF * 0.14).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, width / 2560, 0, PI2);
        ctx.fill();
      } else if (dayF > 0.45) {
        const b = Math.floor(150 + dayF * 105);
        ctx.fillStyle = 'rgb(' + b + ',' + Math.min(255, b + 15) + ',255)';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4 * (width / 1920), 0, PI2);
        ctx.fill();
      } else {
        const nightF = 1 - dayF;
        if (p.city) {
          const tw = 0.5 + 0.5 * Math.sin(t * 3 + (sx + sy) * 0.05);
          ctx.fillStyle = 'rgba(255,190,110,' + (nightF * (0.35 + tw * 0.45)).toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.8 * (width / 1920), 0, PI2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(60,90,160,' + (nightF * 0.30).toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(sx, sy, width / 2560, 0, PI2);
          ctx.fill();
        }
      }
    }

    ctx.save();
    const atm = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.12);
    atm.addColorStop(0, 'rgba(90,160,255,0.20)');
    atm.addColorStop(1, 'rgba(90,160,255,0)');
    ctx.fillStyle = atm;
    ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, model]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#01040a' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { GlobeNight };

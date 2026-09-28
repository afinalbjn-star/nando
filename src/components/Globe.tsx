import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { LAND_PTS, OCEAN_PTS } from './landData';

interface GlobeProps {
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

interface P3 { x: number; y: number; z: number; lon: number; lat: number; ocean: boolean; }

function toVec(lon: number, lat: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

const Globe: React.FC<GlobeProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;

  const model = useMemo(() => {
    const pts: P3[] = [];
    for (const [lon, lat] of LAND_PTS) {
      const [x, y, z] = toVec(lon, lat);
      pts.push({ x, y, z, lon, lat, ocean: false });
    }
    for (const [lon, lat] of OCEAN_PTS) {
      const [x, y, z] = toVec(lon, lat);
      pts.push({ x, y, z, lon, lat, ocean: true });
    }
    const pairs: [number, number][] = [];
    const TH = 0.08;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].ocean) continue;
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[j].ocean) continue;
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const dz = pts[i].z - pts[j].z;
        if (dx * dx + dy * dy + dz * dz < TH * TH) pairs.push([i, j]);
      }
    }
    return { pts, pairs };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, height * 0.9);
    bg.addColorStop(0, '#0a2547');
    bg.addColorStop(0.55, '#061a36');
    bg.addColorStop(1, '#020813');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 70; i++) {
      const bx = hash2(i, 3) * width;
      const by = hash2(i, 17) * height;
      const drift = Math.sin(t * 1 + i) * 8 * (width / 1920);
      const tw = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.9));
      const br = Math.floor(100 + tw * 120);
      ctx.fillStyle = 'rgba(' + br + ',' + (br + 20) + ',255,' + (0.25 + tw * 0.5).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(bx + drift, by, (1 + hash2(i, 29)) * (width / 1920), 0, PI2);
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

    interface SP { x: number; y: number; z: number; ocean: boolean; seed: number; }
    const sp: SP[] = new Array(model.pts.length);
    for (let i = 0; i < model.pts.length; i++) {
      const p = model.pts[i];
      const x1 = p.x * cosR + p.z * sinR;
      const z1 = -p.x * sinR + p.z * cosR;
      const y1 = p.y * cosT - z1 * sinT;
      const z2 = p.y * sinT + z1 * cosT;
      sp[i] = { x: cx + x1 * R, y: cy - y1 * R, z: z2, ocean: p.ocean, seed: i };
    }

    ctx.lineWidth = Math.max(0.5, width / 3840);
    for (const [a, b] of model.pairs) {
      const A = sp[a];
      const B = sp[b];
      if (A.z < -0.1 || B.z < -0.1) continue;
      ctx.strokeStyle = 'rgba(90,165,255,0.22)';
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    }

    for (const p of sp) {
      if (p.z < -0.15) continue;
      if (p.ocean) {
        ctx.fillStyle = 'rgba(90,150,230,0.28)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, width / 2560, 0, PI2);
        ctx.fill();
      } else {
        const halo = 3.0 * (width / 1920);
        const core = 1.4 * (width / 1920);
        ctx.fillStyle = 'rgba(120,190,255,0.28)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, halo, 0, PI2);
        ctx.fill();
        ctx.fillStyle = 'rgb(235,245,255)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, core, 0, PI2);
        ctx.fill();
      }
    }
  }, [frame, width, height, totalFrames, speed, t, model]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#04101f' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { Globe };

import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { LAND_PTS } from './landData';

interface GlobeArcsProps {
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

const GlobeArcs: React.FC<GlobeArcsProps> = ({
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
    const arcs: [number, number][] = [];
    for (let k = 0; k < 16; k++) {
      const a = Math.floor(hash2(k, 1) * pts.length);
      let b = Math.floor(hash2(k, 2) * pts.length);
      if (b === a) b = (b + 137) % pts.length;
      arcs.push([a, b]);
    }
    return { pts, arcs };
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

    const cx = width * 0.5;
    const cy = height * 0.52;
    const R = height * 0.36;
    const rot = t * 1;
    const tilt = 0.18;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const proj = (x: number, y: number, z: number) => {
      const x1 = x * cosR + z * sinR;
      const z1 = -x * sinR + z * cosR;
      const y1 = y * cosT - z1 * sinT;
      const z2 = y * sinT + z1 * cosT;
      return { x: cx + x1 * R, y: cy - y1 * R, z: z2 };
    };

    ctx.fillStyle = 'rgb(235,245,255)';
    for (const p of model.pts) {
      const q = proj(p.x, p.y, p.z);
      if (q.z < -0.15) continue;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 1.1 * (width / 1920), 0, PI2);
      ctx.fill();
    }

    const SEGS = 26;
    for (let ai = 0; ai < model.arcs.length; ai++) {
      const A = model.pts[model.arcs[ai][0]];
      const B = model.pts[model.arcs[ai][1]];
      const head = ((t / PI2 + ai * 0.37) % 1 + 1) % 1;
      let dot = A.x * B.x + A.y * B.y + A.z * B.z;
      dot = Math.max(-1, Math.min(1, dot));
      const ang = Math.acos(dot);
      const alt = 0.25 + hash2(ai, 9) * 0.3;
      const hue = ai % 2 === 0 ? '90,200,255' : '150,120,255';
      for (let sgi = 0; sgi < SEGS; sgi++) {
        const u0 = sgi / SEGS;
        const u1 = (sgi + 1) / SEGS;
        const um = (u0 + u1) / 2;
        const lift0 = 1 + Math.sin(u0 * Math.PI) * alt;
        const lift1 = 1 + Math.sin(u1 * Math.PI) * alt;
        const w0 = Math.sin((1 - u0) * ang) / Math.sin(ang);
        const w1 = Math.sin(u0 * ang) / Math.sin(ang);
        const v0 = Math.sin((1 - u1) * ang) / Math.sin(ang);
        const v1 = Math.sin(u1 * ang) / Math.sin(ang);
        const p0 = proj((A.x * w0 + B.x * w1) * lift0, (A.y * w0 + B.y * w1) * lift0, (A.z * w0 + B.z * w1) * lift0);
        const p1 = proj((A.x * v0 + B.x * v1) * lift1, (A.y * v0 + B.y * v1) * lift1, (A.z * v0 + B.z * v1) * lift1);
        if (p0.z < 0 && p1.z < 0) continue;
        let d = Math.abs(um - head);
        d = Math.min(d, 1 - d);
        const glow = Math.exp(-(d * d) / 0.004);
        const alpha = 0.10 + glow * 0.75;
        ctx.strokeStyle = 'rgba(' + hue + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = (1 + glow * 1.6) * (width / 1920);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      const hp = proj(
        (A.x * Math.sin((1 - head) * ang) + B.x * Math.sin(head * ang)) / Math.sin(ang),
        (A.y * Math.sin((1 - head) * ang) + B.y * Math.sin(head * ang)) / Math.sin(ang),
        (A.z * Math.sin((1 - head) * ang) + B.z * Math.sin(head * ang)) / Math.sin(ang),
      );
      if (hp.z > -0.1) {
        const hr = 5 * (width / 1920);
        const hg = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, hr);
        hg.addColorStop(0, 'rgba(255,255,255,0.95)');
        hg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(hp.x - hr, hp.y - hr, hr * 2, hr * 2);
      }
    }
  }, [frame, width, height, totalFrames, speed, t, model]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#04101f' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { GlobeArcs };

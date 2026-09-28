import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { LAND_PTS } from './landData';

interface GlobeHoloProps {
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

const GlobeHolo: React.FC<GlobeHoloProps> = ({
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

    ctx.fillStyle = '#02080c';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.52;
    const R = height * 0.36;
    const rot = t * 1;
    const flicker = 0.82 + 0.10 * Math.sin(t * 8) + 0.08 * Math.sin(t * 13 + 1);

    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.strokeStyle = 'rgba(60,220,230,0.16)';
    ctx.lineWidth = Math.max(0.6, width / 3200);
    for (let k = -3; k <= 3; k++) {
      const lat = (k / 3.4) * (Math.PI / 2);
      const rr = Math.cos(lat) * R;
      const yy = cy - Math.sin(lat) * R;
      ctx.beginPath();
      ctx.ellipse(cx, yy, rr, Math.max(1, rr * 0.12), 0, 0, PI2);
      ctx.stroke();
    }
    for (let k = 0; k < 6; k++) {
      const a = rot + (k * Math.PI) / 6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(Math.cos(a)) * R, R, 0, 0, PI2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(120,240,245,0.85)';
    for (const p of model.pts) {
      const x1 = p.x * cosR + p.z * sinR;
      const z1 = -p.x * sinR + p.z * cosR;
      if (z1 < -0.15) continue;
      ctx.beginPath();
      ctx.arc(cx + x1 * R, cy - p.y * R, 1.1 * (width / 1920), 0, PI2);
      ctx.fill();
    }
    ctx.restore();

    const scanY = height * (((t / PI2) % 1 + 1) % 1);
    const sh = height * 0.09;
    const scan = ctx.createLinearGradient(0, scanY - sh, 0, scanY + sh);
    scan.addColorStop(0, 'rgba(120,240,245,0)');
    scan.addColorStop(0.5, 'rgba(120,240,245,' + (0.20 * flicker).toFixed(3) + ')');
    scan.addColorStop(1, 'rgba(120,240,245,0)');
    ctx.fillStyle = scan;
    ctx.fillRect(0, Math.max(0, scanY - sh), width, sh * 2);

    ctx.save();
    const base = ctx.createLinearGradient(0, cy + R * 0.4, 0, cy + R * 1.1);
    base.addColorStop(0, 'rgba(60,220,230,0)');
    base.addColorStop(1, 'rgba(60,220,230,0.12)');
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.ellipse(cx, cy + R * 1.02, R * 0.7, R * 0.08, 0, 0, PI2);
    ctx.fill();
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, model]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#02080c' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { GlobeHolo };

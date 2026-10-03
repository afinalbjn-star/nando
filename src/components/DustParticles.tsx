import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

interface DustParticlesProps {
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

const DustParticles: React.FC<DustParticlesProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;

  const parts = useMemo(() => {
    const arr: { x: number; y: number; r: number; cyc: number; ph: number; tone: number }[] = [];
    for (let i = 0; i < 130; i++) {
      arr.push({
        x: hash2(i, 1),
        y: hash2(i, 2),
        r: 0.6 + hash2(i, 3) * 2.6,
        cyc: 1 + Math.floor(hash2(i, 4) * 3),
        ph: hash2(i, 5) * PI2,
        tone: hash2(i, 6),
      });
    }
    return arr;
  }, []);

  const orbs = useMemo(() => {
    const arr: { x: number; y: number; r: number; cyc: number; ph: number }[] = [];
    for (let i = 0; i < 10; i++) {
      arr.push({
        x: hash2(i, 11),
        y: hash2(i, 12),
        r: 30 + hash2(i, 13) * 90,
        cyc: 1 + Math.floor(hash2(i, 14) * 2),
        ph: hash2(i, 15) * PI2,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const o of orbs) {
      const yy = (((o.y + (t / PI2) * o.cyc) % 1) + 1) % 1;
      const oy = yy * height;
      const ox = (o.x + 0.02 * Math.sin(t * 1 + o.ph)) * width;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + o.ph);
      const orad = o.r * (width / 1920);
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, orad);
      g.addColorStop(0, 'rgba(255,230,180,' + (0.05 + tw * 0.05).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ox - orad * 2, oy - orad * 2, orad * 4, orad * 4);
    }

    for (const p of parts) {
      const yy = (((p.y + (t / PI2) * p.cyc) % 1) + 1) % 1;
      const yy2 = 1 - yy;
      const px = (p.x + 0.015 * Math.sin(t * 1 + p.ph + yy2 * 4)) * width;
      const py = yy2 * height;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + p.ph * 3);
      const warm = p.tone > 0.5;
      const col = warm ? '255,220,170' : '200,220,255';
      const rr = p.r * (width / 1920);
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr * 3);
      g.addColorStop(0, 'rgba(' + col + ',' + (0.35 + tw * 0.45).toFixed(2) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - rr * 6, py - rr * 6, rr * 12, rr * 12);
    }

    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t, parts, orbs]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#000' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { DustParticles };

import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface HudRadarProps {
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

const HudRadar: React.FC<HudRadarProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const unit = width / 1920;
    ctx.fillStyle = '#020409';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.52;
    const R = Math.min(width, height) * 0.42;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const bx = hash2(i, 3) * width;
      const by = hash2(i, 17) * height;
      const pink = hash2(i, 29) > 0.72;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      const br = (6 + hash2(i, 41) * 26) * unit;
      const col = pink ? '255,110,160' : '90,170,255';
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, 'rgba(' + col + ',' + (0.25 + tw * 0.4).toFixed(2) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - br * 2, by - br * 2, br * 4, br * 4);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.62);
    ctx.translate(-cx, -cy);

    const ring = (r: number, style: string, w: number) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, PI2);
      ctx.stroke();
    };

    ring(R * 1.0, 'rgba(80,160,255,0.28)', 1.2 * unit);
    ring(R * 0.97, 'rgba(80,160,255,0.12)', 1 * unit);

    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * PI2;
      const long = i % 6 === 0;
      const r0 = R * (long ? 0.90 : 0.94);
      const r1 = R * 0.97;
      ctx.strokeStyle = 'rgba(120,200,255,' + (long ? 0.5 : 0.25) + ')';
      ctx.lineWidth = (long ? 2 : 1) * unit;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }

    interface Seg { r: number; n: number; len: number; rot: number; color: string; alpha: number; w: number; }
    const segs: Seg[] = [
      { r: 0.84, n: 40, len: 0.55, rot: t * 1, color: '90,200,255', alpha: 0.75, w: 7 },
      { r: 0.76, n: 28, len: 0.35, rot: -t * 1, color: '90,200,255', alpha: 0.55, w: 5 },
      { r: 0.66, n: 48, len: 0.7, rot: t * 2, color: '120,220,255', alpha: 0.6, w: 4 },
      { r: 0.55, n: 24, len: 0.3, rot: -t * 2, color: '255,120,170', alpha: 0.7, w: 5 },
      { r: 0.44, n: 36, len: 0.5, rot: t * 1, color: '90,200,255', alpha: 0.5, w: 3.5 },
      { r: 0.33, n: 20, len: 0.4, rot: -t * 3, color: '255,130,180', alpha: 0.65, w: 4 },
      { r: 0.24, n: 28, len: 0.6, rot: t * 2, color: '120,220,255', alpha: 0.55, w: 3 },
      { r: 0.15, n: 16, len: 0.5, rot: t * 3, color: '90,200,255', alpha: 0.6, w: 2.5 },
    ];
    for (const sg of segs) {
      const rr = R * sg.r;
      for (let i = 0; i < sg.n; i++) {
        const a0 = sg.rot + (i / sg.n) * PI2;
        const a1 = a0 + (sg.len / sg.n) * PI2;
        ctx.strokeStyle = 'rgba(' + sg.color + ',' + sg.alpha + ')';
        ctx.lineWidth = sg.w * unit;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, rr, a0, a1);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }

    ring(R * 0.09, 'rgba(150,220,255,0.8)', 2 * unit);
    ctx.strokeStyle = 'rgba(150,220,255,0.5)';
    ctx.lineWidth = 1.4 * unit;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.14, cy);
    ctx.lineTo(cx + R * 0.14, cy);
    ctx.moveTo(cx, cy - R * 0.14);
    ctx.lineTo(cx, cy + R * 0.14);
    ctx.stroke();

    for (let k = 0; k < 2; k++) {
      const uu = (((t / PI2) + k * 0.5) % 1 + 1) % 1;
      ctx.strokeStyle = 'rgba(120,210,255,' + ((1 - uu) * 0.5).toFixed(3) + ')';
      ctx.lineWidth = 1.6 * unit;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, uu * R * 0.5), 0, PI2);
      ctx.stroke();
    }

    ctx.restore();

    ctx.save();
    const vg = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.5);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,5,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#020409' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { HudRadar };

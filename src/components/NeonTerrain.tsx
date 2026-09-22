import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface NeonTerrainProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;

const NeonTerrain: React.FC<NeonTerrainProps> = ({
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

    ctx.fillStyle = '#010108';
    ctx.fillRect(0, 0, width, height);

    const ROWS = 50;
    const COLS = 120;
    const vanishY = height * 0.25;
    const bottomY = height * 1.3;

    const project = (gx: number, row: number) => {
      const depth = row / (ROWS - 1);
      const perspScale = Math.pow(1 - depth * 0.92, 1.8);
      const px = width * 0.5 + (gx - width * 0.5) * perspScale;
      const py = vanishY + (bottomY - vanishY) * depth;
      return { x: px, y: py, scale: perspScale, depth };
    };

    const wave = (gx: number, row: number) => {
      const nx = gx / width;
      const d = row / (ROWS - 1);
      const amp = (1 - d * 0.6) * 120;
      const w1 = Math.sin(nx * 6 + t * 2.5 + d * 5) * amp;
      const w2 = Math.sin(nx * 10 - t * 1.8 + d * 3) * amp * 0.5;
      const w3 = Math.cos(nx * 4 + t * 1.2 + d * 6) * amp * 0.7;
      return w1 + w2 + w3;
    };

    for (let row = ROWS - 1; row >= 0; row--) {
      const fy = row / (ROWS - 1);
      const depth = fy;
      const alpha = 0.5 + (1 - depth) * 0.5;
      const baseHue = 220 + fy * 80;

      const points: { x: number; y: number }[] = [];
      for (let col = 0; col <= COLS; col++) {
        const gx = (col / COLS) * width * 1.2 - width * 0.1;
        const p = project(gx, row);
        const h = wave(gx, row);
        points.push({ x: p.x, y: p.y - h * p.scale });
      }

      const glowHue = (baseHue + Math.sin(t + fy * 3) * 20).toFixed(1);
      const coreHue = ((baseHue + 30) % 360).toFixed(1);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        if (i === 0) ctx.moveTo(points[i].x, points[i].y);
        else ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = 'hsla(' + glowHue + ',90%,55%,' + (alpha * 0.3).toFixed(2) + ')';
      ctx.lineWidth = 6 + (1 - depth) * 4;
      ctx.filter = 'blur(3px)';
      ctx.stroke();
      ctx.filter = 'none';

      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        if (i === 0) ctx.moveTo(points[i].x, points[i].y);
        else ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = 'hsla(' + coreHue + ',95%,70%,' + alpha.toFixed(2) + ')';
      ctx.lineWidth = 2 + (1 - depth) * 2;
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        if (i === 0) ctx.moveTo(points[i].x, points[i].y);
        else ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = 'hsla(' + coreHue + ',100%,85%,' + (alpha * 0.6).toFixed(2) + ')';
      ctx.lineWidth = 0.8 + (1 - depth) * 0.5;
      ctx.stroke();

      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);

    const leftG = ctx.createRadialGradient(width * 0.15, height * 0.6, 0, width * 0.15, height * 0.6, width * 0.25);
    leftG.addColorStop(0, 'rgba(200,50,180,' + (0.08 + pulse * 0.04).toFixed(3) + ')');
    leftG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftG;
    ctx.fillRect(0, 0, width, height);

    const rightG = ctx.createRadialGradient(width * 0.85, height * 0.6, 0, width * 0.85, height * 0.6, width * 0.25);
    rightG.addColorStop(0, 'rgba(50,150,255,' + (0.08 + pulse * 0.04).toFixed(3) + ')');
    rightG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rightG;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#010108' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { NeonTerrain };

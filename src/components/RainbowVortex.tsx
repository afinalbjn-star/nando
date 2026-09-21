import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface RainbowVortexProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;

const ARMS = 26;
const SEGS = 42;
const TWIST = 4.2;

const RainbowVortex: React.FC<RainbowVortexProps> = ({
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

    const cx = width * 0.42;
    const cy = height * 0.5;
    const maxR = Math.sqrt(Math.max(cx, width - cx) ** 2 + Math.max(cy, height - cy) ** 2) * 1.08;

    ctx.fillStyle = '#0a0014';
    ctx.fillRect(0, 0, width, height);

    const rot = t * 1;
    const breathe = 1 + Math.sin(t * 2) * 0.03;

    for (let k = 0; k < ARMS; k++) {
      const a0 = (k / ARMS) * PI2;
      let prevLX = 0; let prevLY = 0; let prevRX = 0; let prevRY = 0;

      for (let sgi = 0; sgi <= SEGS; sgi++) {
        const f = sgi / SEGS;
        const r = 4 + f * maxR * breathe;
        const ang = a0 + rot + TWIST * Math.pow(1 - f, 1.6);
        const wHalf = (2 + f * maxR * 0.075) * 0.5;

        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;

        const tangX = -Math.sin(ang);
        const tangY = Math.cos(ang);

        const lx = px + tangX * wHalf;
        const ly = py + tangY * wHalf;
        const rx = px - tangX * wHalf;
        const ry = py - tangY * wHalf;

        if (sgi > 0) {
          let hue = ((ang % PI2) + PI2) % PI2 / PI2 * 360;
          const shade = 52 + 14 * Math.sin(f * 9 + k * 1.3);
          ctx.beginPath();
          ctx.moveTo(prevLX, prevLY);
          ctx.lineTo(lx, ly);
          ctx.lineTo(rx, ry);
          ctx.lineTo(prevRX, prevRY);
          ctx.closePath();
          ctx.fillStyle = `hsl(${hue.toFixed(1)},95%,${shade.toFixed(1)}%)`;
          ctx.fill();
        }
        prevLX = lx; prevLY = ly; prevRX = rx; prevRY = ry;
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const sheen = 0.5 + 0.5 * Math.sin(t * 2);
    const sg = ctx.createLinearGradient(0, height, width, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, `rgba(255,255,255,${(0.1 + sheen * 0.1).toFixed(3)})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.16);
    gg.addColorStop(0, 'rgba(180,255,220,0.55)');
    gg.addColorStop(0.5, 'rgba(80,200,255,0.2)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.16, 0, PI2);
    ctx.fill();
  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#0a0014' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { RainbowVortex };
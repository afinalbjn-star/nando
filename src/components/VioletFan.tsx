import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface VioletFanProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function sstep(e0: number, e1: number, x: number): number {
  const k = clamp((x - e0) / (e1 - e0), 0, 1);
  return k * k * (3 - 2 * k);
}

const LW = 640;
const LH = 360;
const BLADES = 24;
const SPREAD = 1.75;

const VioletFan: React.FC<VioletFanProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const t = (frame / totalFrames) * PI2 * speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!bufRef.current) {
      bufRef.current = document.createElement('canvas');
      bufRef.current.width = LW;
      bufRef.current.height = LH;
    }
    const buf = bufRef.current;
    const bctx = buf.getContext('2d');
    if (!bctx) return;

    const imgData = bctx.createImageData(LW, LH);
    const data = imgData.data;
    const ox = LW * 0.52;
    const oy = LH * 1.12;
    const pitch = (SPREAD * 2) / BLADES;
    const rMax = LH * 1.05;

    for (let py = 0; py < LH; py++) {
      for (let px = 0; px < LW; px++) {
        const dx = px - ox;
        const dy = py - oy;
        const r = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        const raw = ang + Math.PI / 2;
        const d = Math.atan2(Math.sin(raw), Math.cos(raw));

        let R = 4; let G = 2; let B = 10;

        if (Math.abs(d) < SPREAD + pitch) {
          const bend = 0.22 * Math.sin(t * 1 + r * 0.004)
            + 0.06 * Math.sin(t * 2 + r * 0.009);
          const ph = (d + bend) / pitch;
          const i = Math.floor(ph);
          const u = ph - i;

          const edgeRaw = sstep(0, 0.22, u) * sstep(1, 0.78, u);
          const edge = Math.pow(edgeRaw, 1.5);
          const core = Math.exp(-((u - 0.45) * (u - 0.45)) / 0.008);
          const rN = clamp(r / rMax, 0, 1);
          const tip = sstep(0.35, 0.9, rN);
          const baseD = sstep(0, 0.35, rN);
          const shimmer = 0.75 + 0.25 * Math.sin(t * 2 + i * 0.7);
          const mid = Math.exp(-((rN - 0.55) * (rN - 0.55)) / 0.06);

          const blade = edge * baseD;
          R += blade * (80 + 50 * shimmer);
          G += blade * 8;
          B += blade * (120 + 40 * shimmer);

          R += core * baseD * 170;
          G += core * baseD * 50;
          B += core * baseD * 130;

          R += tip * edge * 30;
          G += tip * edge * 120;
          B += tip * edge * 255;

          R += mid * edge * 90;
          B += mid * edge * 70;
        }

        const idx = (py * LW + px) * 4;
        data[idx] = Math.floor(clamp(R, 0, 255));
        data[idx + 1] = Math.floor(clamp(G, 0, 255));
        data[idx + 2] = Math.floor(clamp(B, 0, 255));
        data[idx + 3] = 255;
      }
    }

    bctx.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, 0, 0, width, height);

    const topWash = ctx.createLinearGradient(0, 0, 0, height * 0.35);
    topWash.addColorStop(0, 'rgba(70,100,255,0.04)');
    topWash.addColorStop(1, 'rgba(70,100,255,0)');
    ctx.fillStyle = topWash;
    ctx.fillRect(0, 0, width, height * 0.35);
  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#030109' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { VioletFan };
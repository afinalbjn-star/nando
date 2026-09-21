import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface InkBloomProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

interface Particle {
  phase: number;
  xBase: number;
  rise: number;
  size: number;
  swayAmp: number;
  swaySp: number;
  swayPh: number;
  driftSp: number;
  driftPh: number;
  color: [number, number, number];
  alpha: number;
}

function buildParticles(count: number, cyanFrac: number, sizeBase = 60, sizeVar = 160, alphaBase = 0.2, alphaVar = 0.4, hot = false, riseMul = 1): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const h1 = hash(i * 1.37);
    const h2 = hash(i * 3.71 + 100);
    const h3 = hash(i * 7.93 + 200);
    const h4 = hash(i * 5.17 + 300);
    const h5 = hash(i * 9.31 + 400);
    const isCyan = hot ? false : h1 < cyanFrac;
    const cxOffset = hot ? (h2 - 0.5) * 0.14 : isCyan ? 0.16 + h2 * 0.12 : -0.14 + h2 * 0.3;
    let color: [number, number, number];
    if (hot) {
      const k = h3;
      if (k < 0.4) color = [255, 120, 180];
      else if (k < 0.75) color = [255, 170, 210];
      else color = [255, 220, 235];
    } else if (isCyan) {
      const k = h3;
      color = k < 0.5 ? [0, 229, 255] : [0, 170, 200];
    } else {
      const k = h3;
      if (k < 0.4) color = [255, 46, 136];
      else if (k < 0.7) color = [255, 107, 176];
      else color = [200, 20, 110];
    }
    arr.push({
      phase: h4,
      xBase: 0.5 + cxOffset * (0.5 + h3 * 0.5),
      rise: (hot ? 0.45 + h2 * 0.3 : 0.85 + h2 * 0.3) * riseMul,
      size: sizeBase + h3 * sizeVar,
      swayAmp: 20 + h4 * 70,
      swaySp: h5 > 0.5 ? 1 : 2,
      swayPh: h5 * PI2,
      driftSp: h4 > 0.5 ? 1 : 3,
      driftPh: h2 * PI2,
      color,
      alpha: alphaBase + h5 * alphaVar,
    });
  }
  return arr;
}

const MAGENTA = buildParticles(300, 0);
const CYAN = buildParticles(110, 1, 60, 160, 0.2, 0.4, false, 1.18);
const BASE = buildParticles(26, 0, 200, 220, 0.05, 0.09);
const HOT = buildParticles(70, 0, 36, 70, 0.5, 0.4, true);

const InkBloom: React.FC<InkBloomProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const progress = (frame / totalFrames) * speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    const drawSet = (set: Particle[]) => {
      for (let i = 0; i < set.length; i++) {
        const p = set[i];
        const age = (progress + p.phase) % 1;
        const fade = Math.sin(Math.PI * age);
        const a = fade * fade * p.alpha;

        const yBase = height * 1.02;
        const y = yBase - age * p.rise * height * 1.15;
        const x = p.xBase * width
          + Math.sin(t * p.swaySp + p.swayPh) * p.swayAmp
          + Math.sin(t * p.driftSp + p.driftPh + age * 5) * p.swayAmp * 0.4;
        const r = p.size * (0.4 + age * 1.8);

        const [cr, cg, cb] = p.color;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${(a * 0.32).toFixed(3)})`);
        g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${(a * 0.16).toFixed(3)})`);
        g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, PI2);
        ctx.fill();
      }
    };

    drawSet(BASE);
    drawSet(MAGENTA);
    drawSet(CYAN);
    drawSet(HOT);

    const NUM_TENDRILS = 42;
    for (let i = 0; i < NUM_TENDRILS; i++) {
      const h1 = hash(i * 4.3 + 700);
      const h2 = hash(i * 8.7 + 800);
      const h3 = hash(i * 2.9 + 900);
      const age = (progress + h1) % 1;
      const fade = Math.sin(Math.PI * age);
      const a = fade * fade * (0.07 + h3 * 0.1);

      const yBase = height * 1.0;
      const y = yBase - age * (0.7 + h2 * 0.4) * height;
      const x = width * (0.36 + h2 * 0.32)
        + Math.sin(t * 1 + h3 * PI2) * 60
        + Math.sin(t * 2 + h1 * PI2 + age * 4) * 30;
      const w = 5 + h3 * 14;
      const len = 90 + h1 * 220;
      const tilt = (h2 - 0.5) * 1.4 + Math.sin(t * 1 + h1 * PI2) * 0.35;
      const cyan = h1 > 0.78;
      const cr = cyan ? 0 : 255;
      const cg = cyan ? 220 : 60 + Math.floor(h3 * 80);
      const cb = cyan ? 255 : 150;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.scale(1, len / Math.max(w, 1));
      const tg = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
      tg.addColorStop(0, `rgba(${cr},${cg},${cb},${a.toFixed(3)})`);
      tg.addColorStop(0.6, `rgba(${cr},${cg},${cb},${(a * 0.4).toFixed(3)})`);
      tg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(0, 0, w, 0, PI2);
      ctx.fill();
      ctx.restore();
    }

    const glowPulse = 0.5 + 0.5 * Math.sin(t * 2);
    const gg = ctx.createRadialGradient(
      width * 0.45, height * 1.0, 0, width * 0.45, height * 1.0, width * 0.4,
    );
    gg.addColorStop(0, `rgba(255,180,200,${(0.34 + glowPulse * 0.14).toFixed(3)})`);
    gg.addColorStop(0.4, `rgba(255,80,150,${(0.13 + glowPulse * 0.07).toFixed(3)})`);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'source-over';
    const NUM_CARVE = 34;
    for (let i = 0; i < NUM_CARVE; i++) {
      const h1 = hash(i * 6.1 + 1100);
      const h2 = hash(i * 3.3 + 1200);
      const h3 = hash(i * 7.7 + 1300);
      const age = (progress + h1) % 1;
      const fade = Math.sin(Math.PI * age);
      const a = fade * fade * (0.12 + h3 * 0.16);
      const y = height * 1.0 - age * (0.55 + h2 * 0.4) * height;
      const x = width * (0.38 + h2 * 0.28)
        + Math.sin(t * 1 + h3 * PI2) * 50;
      const r = 40 + h1 * 110;
      const cg = ctx.createRadialGradient(x, y, 0, x, y, r);
      cg.addColorStop(0, `rgba(0,0,0,${a.toFixed(3)})`);
      cg.addColorStop(0.7, `rgba(0,0,0,${(a * 0.5).toFixed(3)})`);
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, PI2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';
    const corePulse = 0.5 + 0.5 * Math.sin(t * 2);
    const core = ctx.createRadialGradient(
      width * 0.45, height * 1.02, 0, width * 0.45, height * 1.02, width * 0.13,
    );
    core.addColorStop(0, `rgba(255,235,245,${(0.5 + corePulse * 0.2).toFixed(3)})`);
    core.addColorStop(0.4, `rgba(255,140,190,${(0.25 + corePulse * 0.12).toFixed(3)})`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'source-over';
  }, [frame, width, height, totalFrames, speed, t, progress]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#000' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { InkBloom };
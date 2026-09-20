import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface FacetedMosaicProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const FacetedMosaic: React.FC<FacetedMosaicProps> = ({
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

    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    const facets: { pts: [number,number][]; brightness: number; h: number }[] = [];

    const NUM_RINGS = 14;
    const baseSect = 12;
    const ringSpeeds = [1,1,1,1,2,2,2,2,3,3,3,4,4,5];

    for (let ri = 0; ri < NUM_RINGS; ri++) {
      const ringFrac = ri / NUM_RINGS;
      const nextFrac = (ri + 1) / NUM_RINGS;
      const rInner = ringFrac * maxR;
      const rOuter = nextFrac * maxR;
      const numSect = baseSect + ri * 3;
      const ringRot = t * ringSpeeds[ri] + ri * 0.4;

      for (let si = 0; si < numSect; si++) {
        const a0 = (si / numSect) * PI2 + ringRot;
        const a1 = ((si + 1) / numSect) * PI2 + ringRot;
        const aMid = (a0 + a1) * 0.5;

        const h = hash(ri * 100 + si);
        const jitterIn = (hash(ri * 100 + si + 1000) - 0.5) * (rOuter - rInner) * 0.3;
        const jitterOut = (hash(ri * 100 + si + 2000) - 0.5) * (rOuter - rInner) * 0.3;

        const rI = rInner + jitterIn;
        const rO = rOuter + jitterOut;

        const p0: [number, number] = [cx + Math.cos(a0) * rI, cy + Math.sin(a0) * rI];
        const p1: [number, number] = [cx + Math.cos(a0) * rO, cy + Math.sin(a0) * rO];
        const p2: [number, number] = [cx + Math.cos(aMid) * (rO * 0.95 + rI * 0.05), cy + Math.sin(aMid) * (rO * 0.95 + rI * 0.05)];
        const p3: [number, number] = [cx + Math.cos(a1) * rO, cy + Math.sin(a1) * rO];
        const p4: [number, number] = [cx + Math.cos(a1) * rI, cy + Math.sin(a1) * rI];

        const spec = Math.pow(Math.cos(aMid * 4 + t * 2 + ri * 0.8) * 0.5 + 0.5, 2.5);
        const brightness = clamp(h * 0.5 + spec * 0.5, 0, 1);

        facets.push({ pts: [p0, p1, p2, p3, p4], brightness, h });
      }
    }

    for (const f of facets) {
      const { pts, brightness, h } = f;
      const base = brightness * 220 + 20;

      const rShift = h > 0.7 ? 10 : 0;
      const bShift = h > 0.7 ? 20 : 0;

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) {
        ctx.lineTo(pts[k][0], pts[k][1]);
      }
      ctx.closePath();

      const gx = (pts[0][0] + pts[pts.length - 1][0]) * 0.5;
      const gy = (pts[0][1] + pts[pts.length - 1][1]) * 0.5;
      const gx2 = pts[2][0];
      const gy2 = pts[2][1];

      const grad = ctx.createLinearGradient(gx, gy, gx2, gy2);
      const dark = Math.floor(base * 0.15);
      const mid = Math.floor(base * 0.6);
      grad.addColorStop(0, `rgb(${dark},${dark},${dark + bShift})`);
      grad.addColorStop(0.4, `rgb(${mid + rShift},${mid},${mid + bShift})`);
      grad.addColorStop(0.7, `rgb(${Math.floor(base) + rShift},${Math.floor(base)},${Math.floor(base) + bShift})`);
      grad.addColorStop(1, `rgb(${Math.floor(base * 0.35)},${Math.floor(base * 0.35)},${Math.floor(base * 0.4)})`);
      ctx.fillStyle = grad;
      ctx.fill();

      if (brightness > 0.7) {
        ctx.strokeStyle = `rgba(255,255,255,${((brightness - 0.7) * 1.5).toFixed(2)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.08);
    centerGrad.addColorStop(0, 'rgba(255,255,255,1)');
    centerGrad.addColorStop(0.2, 'rgba(240,240,245,0.8)');
    centerGrad.addColorStop(0.5, 'rgba(200,205,215,0.3)');
    centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.08, 0, PI2);
    ctx.fill();

  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#050505' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { FacetedMosaic };
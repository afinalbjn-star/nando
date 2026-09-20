import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type FacetScheme = 'gold' | 'rose' | 'emerald' | 'violet';

interface ColorFacetProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: FacetScheme;
}

const PI2 = Math.PI * 2;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

interface SchemeColors {
  bg: string;
  r: number; g: number; b: number;
  rHi: number; gHi: number; bHi: number;
  centerR: number; centerG: number; centerB: number;
}

const schemes: Record<FacetScheme, SchemeColors> = {
  gold:    { bg: '#0a0800', r: 60, g: 45, b: 10, rHi: 255, gHi: 210, bHi: 80, centerR: 255, centerG: 220, centerB: 100 },
  rose:    { bg: '#0a0005', r: 55, g: 15, b: 30, rHi: 255, gHi: 100, bHi: 160, centerR: 255, centerG: 140, centerB: 180 },
  emerald: { bg: '#000a05', r: 10, g: 50, b: 30, rHi: 80, gHi: 255, bHi: 170, centerR: 100, centerG: 255, centerB: 180 },
  violet:  { bg: '#05000a', r: 40, g: 10, b: 55, rHi: 180, gHi: 100, bHi: 255, centerR: 200, centerG: 130, centerB: 255 },
};

const ColorFacet: React.FC<ColorFacetProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'gold',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const sc = schemes[scheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    ctx.fillStyle = sc.bg;
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
      const base = brightness;

      const darkR = Math.floor(sc.r * 0.15 * (1 + base * 0.5));
      const darkG = Math.floor(sc.g * 0.15 * (1 + base * 0.5));
      const darkB = Math.floor(sc.b * 0.15 * (1 + base * 0.5));

      const midR = Math.floor(sc.r * 0.6 + sc.rHi * base * 0.4);
      const midG = Math.floor(sc.g * 0.6 + sc.gHi * base * 0.4);
      const midB = Math.floor(sc.b * 0.6 + sc.bHi * base * 0.4);

      const hiR = Math.floor(sc.rHi * base);
      const hiG = Math.floor(sc.gHi * base);
      const hiB = Math.floor(sc.bHi * base);

      const endR = Math.floor(sc.r * 0.35);
      const endG = Math.floor(sc.g * 0.35);
      const endB = Math.floor(sc.b * 0.4);

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
      grad.addColorStop(0, `rgb(${darkR},${darkG},${darkB})`);
      grad.addColorStop(0.4, `rgb(${midR},${midG},${midB})`);
      grad.addColorStop(0.7, `rgb(${hiR},${hiG},${hiB})`);
      grad.addColorStop(1, `rgb(${endR},${endG},${endB})`);
      ctx.fillStyle = grad;
      ctx.fill();

      if (brightness > 0.7) {
        ctx.strokeStyle = `rgba(255,255,255,${((brightness - 0.7) * 1.5).toFixed(2)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.08);
    centerGrad.addColorStop(0, `rgba(${sc.centerR},${sc.centerG},${sc.centerB},1)`);
    centerGrad.addColorStop(0.2, `rgba(${sc.centerR},${sc.centerG},${sc.centerB},0.8)`);
    centerGrad.addColorStop(0.5, `rgba(${Math.floor(sc.centerR*0.6)},${Math.floor(sc.centerG*0.6)},${Math.floor(sc.centerB*0.6)},0.3)`);
    centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.08, 0, PI2);
    ctx.fill();

  }, [frame, width, height, totalFrames, speed, t, sc]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: sc.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { ColorFacet };
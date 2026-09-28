import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type PolyScheme = 'poly' | 'mint' | 'sunset' | 'ocean' | 'grape';

interface PastelPolyProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: PolyScheme;
}

const SCHEMES: Record<PolyScheme, { hueShift: number; bg: string }> = {
  poly:   { hueShift: 0, bg: '#d9b8d4' },
  mint:   { hueShift: -122, bg: '#b8d9cc' },
  sunset: { hueShift: -272, bg: '#e8c4b4' },
  ocean:  { hueShift: -77, bg: '#b4c8e4' },
  grape:  { hueShift: 24, bg: '#cdb4e0' },
};

const PI2 = Math.PI * 2;

function hash2(i: number, j: number) {
  let s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const PastelPoly: React.FC<PastelPolyProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'poly',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = (frame / totalFrames) * PI2 * speed;
  const s = SCHEMES[scheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, width, height);

    const GX = 8;
    const GY = 6;
    const cw = width / GX;
    const ch = height / GY;

    const px: number[][] = [];
    const py: number[][] = [];
    for (let j = -1; j <= GY + 1; j++) {
      px[j + 1] = [];
      py[j + 1] = [];
      for (let i = -1; i <= GX + 1; i++) {
        const jx = (hash2(i, j) - 0.5) * 0.55;
        const jy = (hash2(i + 40, j + 80) - 0.5) * 0.55;
        const wob = 0.02;
        const bx0 = (i + 0.5 + jx) * cw;
        const by0 = (j + 0.5 + jy) * ch;
        px[j + 1][i + 1] = bx0 + Math.sin(t * 1 + i * 0.9 + j * 0.5) * cw * wob;
        py[j + 1][i + 1] = by0 + Math.cos(t * 1 + i * 0.6 + j * 0.8) * ch * wob;
      }
    }

    const vColor = (i: number, j: number): [number, number, number] => {
      const gx = i / GX;
      const gy = j / GY;
      const hue = 292 + s.hueShift + 62 * Math.sin(gx * 3.4 + 1.2) * Math.cos(gy * 2.9 + 0.5)
        + 14 * Math.sin(t * 1 + i * 0.8 + j * 1.1);
      const sat = 42 + 14 * Math.sin(gx * 5 + gy * 3 + 2);
      const li = 72 + 7 * Math.sin(t * 2 + i * 1.3 + j * 0.7) + 4 * Math.sin(gx * 7 + gy * 5);
      return [((hue % 360) + 360) % 360, sat, Math.max(60, Math.min(86, li))];
    };

    const paintTri = (
      ax: number, ay: number, ac: [number, number, number],
      bx: number, by: number, bc: [number, number, number],
      cx2: number, cy2: number, cc: [number, number, number],
    ) => {
      const mx = (ax + bx + cx2) / 3;
      const my = (ay + by + cy2) / 3;
      const ndx = (mx - width * 0.5) / (width * 0.5);
      const ndy = (my - height * 0.5) / (height * 0.5);
      const tdist = Math.sqrt(ndx * ndx + ndy * ndy) / Math.SQRT2;
      const k = 1 + 0.09 * Math.sin(t * 2 - tdist * 3.0);
      const sx = (x: number) => mx + (x - mx) * k;
      const sy = (y: number) => my + (y - my) * k;
      const g = ctx.createLinearGradient(sx(ax), sy(ay), (sx(bx) + sx(cx2)) / 2, (sy(by) + sy(cy2)) / 2);
      g.addColorStop(0, 'hsl(' + ac[0].toFixed(1) + ',' + ac[1].toFixed(0) + '%,' + ac[2].toFixed(1) + '%)');
      g.addColorStop(0.5, 'hsl(' + bc[0].toFixed(1) + ',' + bc[1].toFixed(0) + '%,' + bc[2].toFixed(1) + '%)');
      g.addColorStop(1, 'hsl(' + cc[0].toFixed(1) + ',' + cc[1].toFixed(0) + '%,' + cc[2].toFixed(1) + '%)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx(ax), sy(ay));
      ctx.lineTo(sx(bx), sy(by));
      ctx.lineTo(sx(cx2), sy(cy2));
      ctx.closePath();
      ctx.fill();
    };

    for (let j = 0; j <= GY + 1; j++) {
      for (let i = 0; i <= GX + 1; i++) {
        const A = [px[j][i], py[j][i]] as [number, number];
        const B = [px[j][i + 1], py[j][i + 1]] as [number, number];
        const C = [px[j + 1][i], py[j + 1][i]] as [number, number];
        const D = [px[j + 1][i + 1], py[j + 1][i + 1]] as [number, number];
        const cA = vColor(i - 1, j - 1);
        const cB = vColor(i, j - 1);
        const cC = vColor(i - 1, j);
        const cD = vColor(i, j);
        if ((i + j) % 2 === 0) {
          paintTri(A[0], A[1], cA, B[0], B[1], cB, D[0], D[1], cD);
          paintTri(A[0], A[1], cA, D[0], D[1], cD, C[0], C[1], cC);
        } else {
          paintTri(A[0], A[1], cA, B[0], B[1], cB, C[0], C[1], cC);
          paintTri(B[0], B[1], cB, D[0], D[1], cD, C[0], C[1], cC);
        }
      }
    }
  }, [frame, width, height, totalFrames, speed, t, s]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: s.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { PastelPoly };
export type { PolyScheme };

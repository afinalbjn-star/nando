import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

type HoloScheme = 'original' | 'aurora' | 'sunset' | 'ocean' | 'forest';

interface HoloMarbleProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: HoloScheme;
}

const PI2 = Math.PI * 2;

function hash(n: number) {
  let s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

function noise2d(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + iy * 157);
  const b = hash(ix + 1 + iy * 157);
  const c = hash(ix + (iy + 1) * 157);
  const d = hash(ix + 1 + (iy + 1) * 157);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, oct: number) {
  let v = 0;
  let a = 0.5;
  let shift = 100;
  for (let i = 0; i < oct; i++) {
    v += a * noise2d(x, y);
    x = x * 2 + shift;
    y = y * 2 + shift;
    a *= 0.5;
  }
  return v;
}

function domainWarp(x: number, y: number, t: number) {
  const qx = fbm(x + 0.0, y + 0.0, 4);
  const qy = fbm(x + 5.2, y + 1.3, 4);
  const rx = fbm(x + 4.0 * qx + 1.7 + t * 0.3, y + 4.0 * qy + 9.2 + t * 0.2, 4);
  const ry = fbm(x + 4.0 * qx + 8.3 + t * 0.2, y + 4.0 * qy + 2.8 + t * 0.15, 4);
  return fbm(x + 4.0 * rx, y + 4.0 * ry, 5);
}

function hsv2rgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

const SCHEMES: Record<HoloScheme, { hueOffset: number; hueRange: number; grayBase: number; grayRange: number; glowR: number; glowG: number; glowB: number; bg: string }> = {
  original: { hueOffset: 0, hueRange: 360, grayBase: 40, grayRange: 180, glowR: 180, glowG: 200, glowB: 255, bg: '#0a0a0a' },
  aurora:   { hueOffset: 120, hueRange: 180, grayBase: 30, grayRange: 140, glowR: 50, glowG: 220, glowB: 150, bg: '#060a08' },
  sunset:   { hueOffset: 300, hueRange: 120, grayBase: 45, grayRange: 160, glowR: 255, glowG: 120, glowB: 80, bg: '#0a0606' },
  ocean:    { hueOffset: 180, hueRange: 100, grayBase: 35, grayRange: 150, glowR: 60, glowG: 150, glowB: 255, bg: '#06080c' },
  forest:   { hueOffset: 80, hueRange: 140, grayBase: 38, grayRange: 155, glowR: 100, glowG: 200, glowB: 80, bg: '#060a06' },
};

const HoloMarble: React.FC<HoloMarbleProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'original',
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

    const S = 0.25;
    const iw = Math.floor(width * S);
    const ih = Math.floor(height * S);
    const imgData = ctx.createImageData(iw, ih);
    const data = imgData.data;

    const tc1 = Math.cos(t);
    const tc2 = Math.sin(t);

    for (let py = 0; py < ih; py++) {
      for (let px = 0; px < iw; px++) {
        const nx = px / iw * 5;
        const ny = py / ih * 5;

        const warp1 = domainWarp(nx, ny, tc1);
        const warp2 = domainWarp(nx + 50, ny + 50, tc2);
        const val = domainWarp(nx + warp1 * 2.5, ny + warp2 * 2.5, tc1 * 0.4);

        const darkBase = fbm(nx * 2 + tc1 * 0.1, ny * 2 + tc2 * 0.1, 5);
        const darkMask = Math.pow(Math.max(0, 1 - darkBase * 1.5), 2);

        const edge = Math.abs(Math.sin(val * 10));
        const holo = Math.pow(edge, 0.5);

        const angle = Math.atan2(warp2 - 0.5, warp1 - 0.5);
        const hueShift = Math.cos(t) * 30;
        const rawHue = (angle / Math.PI * 180 + 180 + hueShift + s.hueOffset) % 360;
        const hue = rawHue < 0 ? rawHue + 360 : rawHue;
        const holoColor = hsv2rgb(hue, 0.8, holo);

        const marble = Math.abs(Math.sin(val * 8 + darkBase * 3));
        const marbleSharp = Math.pow(marble, 0.6);

        const gray = s.grayBase + marbleSharp * s.grayRange * 0.7 + darkMask * s.grayRange * 0.3;

        const blend = holo * 0.8 * darkMask;
        const r = gray * (1 - blend) + holoColor.r * blend;
        const g = gray * (1 - blend) + holoColor.g * blend;
        const b = gray * (1 - blend) + holoColor.b * blend;

        const sparkle = Math.pow(Math.max(0, noise2d(px * 0.5 + tc1 * 10, py * 0.5 + tc2 * 10) - 0.85), 3) * 15;
        const edgeHL = Math.pow(edge, 8) * 0.3 * darkMask;

        const idx = (py * iw + px) * 4;
        data[idx] = Math.min(255, r + edgeHL * 180 + sparkle);
        data[idx + 1] = Math.min(255, g + edgeHL * 200 + sparkle);
        data[idx + 2] = Math.min(255, b + edgeHL * 220 + sparkle);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(canvas, 0, 0, iw, ih, 0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.5);
    glow.addColorStop(0, 'rgba(' + s.glowR + ',' + s.glowG + ',' + s.glowB + ',' + (0.04 + pulse * 0.02).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

  }, [frame, width, height, totalFrames, speed, t, s]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: s.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { HoloMarble };
export type { HoloScheme };

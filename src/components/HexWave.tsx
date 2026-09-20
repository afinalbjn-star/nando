import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type HexWaveScheme = 'crimson' | 'emerald' | 'violet' | 'ocean';

interface HexWaveProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: HexWaveScheme;
}

const PI2 = Math.PI * 2;
const SQRT3 = Math.sqrt(3);
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

interface SchemeColors {
  bg1: string; bg2: string; bg3: string;
  rBase: number; gBase: number; bBase: number;
  rPeak: number; gPeak: number; bPeak: number;
  edgeR: number; edgeG: number; edgeB: number;
  glowR: number; glowG: number; glowB: number;
}

const schemes: Record<HexWaveScheme, SchemeColors> = {
  crimson: {
    bg1: '#1a0200', bg2: '#2a0500', bg3: '#0d0100',
    rBase: 200, gBase: 20, bBase: 10,
    rPeak: 255, gPeak: 80, bPeak: 40,
    edgeR: 255, edgeG: 100, edgeB: 60,
    glowR: 255, glowG: 60, glowB: 20,
  },
  emerald: {
    bg1: '#001a08', bg2: '#002a0f', bg3: '#000d04',
    rBase: 10, gBase: 160, bBase: 80,
    rPeak: 40, gPeak: 255, bPeak: 140,
    edgeR: 60, edgeG: 255, edgeB: 160,
    glowR: 30, glowG: 255, glowB: 120,
  },
  violet: {
    bg1: '#0d001a', bg2: '#15002a', bg3: '#06000d',
    rBase: 100, gBase: 20, bBase: 180,
    rPeak: 180, gPeak: 80, bPeak: 255,
    edgeR: 200, edgeG: 100, edgeB: 255,
    glowR: 160, glowG: 60, glowB: 255,
  },
  ocean: {
    bg1: '#000d1a', bg2: '#00152a', bg3: '#00060d',
    rBase: 10, gBase: 80, bBase: 180,
    rPeak: 40, gPeak: 160, bPeak: 255,
    edgeR: 60, edgeG: 180, edgeB: 255,
    glowR: 30, glowG: 140, glowB: 255,
  },
};

const HexWave: React.FC<HexWaveProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'crimson',
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

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, sc.bg1);
    bgGrad.addColorStop(0.5, sc.bg2);
    bgGrad.addColorStop(1, sc.bg3);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const hexSize = 32;
    const hexW = hexSize * 2;
    const hexH = SQRT3 * hexSize;
    const cols = Math.ceil(width / (hexW * 0.75)) + 2;
    const rows = Math.ceil(height / hexH) + 2;

    const centerX = width * 0.5;
    const centerY = height * 0.5;

    const lightX = width * (0.5 + 0.3 * Math.cos(t * 1));
    const lightY = height * (0.5 + 0.2 * Math.sin(t * 1));
    const lightX2 = width * (0.3 + 0.25 * Math.cos(t * 2 + 2));
    const lightY2 = height * (0.6 + 0.2 * Math.sin(t * 2 + 2));
    const lightX3 = width * (0.7 + 0.2 * Math.cos(t * 1 + 4));
    const lightY3 = height * (0.3 + 0.15 * Math.sin(t * 1 + 4));

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * hexW * 0.75;
        const y = row * hexH + (col % 2 === 1 ? hexH * 0.5 : 0);

        const dx0 = x - centerX;
        const dy0 = y - centerY;
        const distCenter = Math.sqrt(dx0 * dx0 + dy0 * dy0);
        const angleToCenter = Math.atan2(dy0, dx0);

        const spiral = Math.sin(angleToCenter * 3 + distCenter * 0.008 - t * 2) * 20;
        const ripple1 = Math.sin(distCenter * 0.015 - t * 2) * 18;
        const ripple2 = Math.cos(distCenter * 0.01 + t * 1) * 12;
        const wave1 = Math.sin(x * 0.004 + t * 1) * 20;
        const wave2 = Math.cos(y * 0.005 + t * 2) * 14;
        const wave3 = Math.sin((x + y) * 0.003 + t * 1) * 10;
        const wave4 = Math.cos((x - y) * 0.002 + t * 3) * 8;
        const breathe = Math.sin(t * 1) * 8;
        const torusWave = Math.sin(distCenter * 0.006 + t * 1) * Math.cos(angleToCenter * 2 + t * 1) * 15;

        const yOffset = spiral + ripple1 + ripple2 + wave1 + wave2 + wave3 + wave4 + breathe + torusWave;
        const py = y + yOffset;

        const dx1 = x - lightX;
        const dy1 = py - lightY;
        const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const light1 = Math.exp(-dist1 * dist1 / (width * width * 0.08));

        const dx2 = x - lightX2;
        const dy2 = py - lightY2;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const light2 = Math.exp(-dist2 * dist2 / (width * width * 0.12)) * 0.6;

        const dx3 = x - lightX3;
        const dy3 = py - lightY3;
        const dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
        const light3 = Math.exp(-dist3 * dist3 / (width * width * 0.1)) * 0.4;

        const totalLight = clamp(light1 + light2 + light3, 0, 1);

        const shimmer = Math.sin(t * 3 + col * 0.5 + row * 0.7) * 0.5 + 0.5;
        const spec = Math.pow(shimmer, 3) * 0.3;
        const brightness = clamp(totalLight * 0.85 + spec + 0.08, 0, 1);

        const rVal = Math.floor(sc.rBase + (sc.rPeak - sc.rBase) * brightness);
        const gVal = Math.floor(sc.gBase + (sc.gPeak - sc.gBase) * brightness);
        const bVal = Math.floor(sc.bBase + (sc.bPeak - sc.bBase) * brightness);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (PI2 / 6) * i + PI2 / 12;
          const hx = x + Math.cos(angle) * hexSize;
          const hy = py + Math.sin(angle) * hexSize;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(x - hexSize, py - hexSize, x + hexSize, py + hexSize);
        grad.addColorStop(0, `rgb(${Math.floor(rVal * 0.3)},${Math.floor(gVal * 0.3)},${Math.floor(bVal * 0.3)})`);
        grad.addColorStop(0.3, `rgb(${rVal},${gVal},${bVal})`);
        grad.addColorStop(0.6, `rgb(${Math.min(255, rVal + 30)},${Math.min(255, gVal + 20)},${Math.min(255, bVal + 10)})`);
        grad.addColorStop(1, `rgb(${Math.floor(rVal * 0.5)},${Math.floor(gVal * 0.5)},${Math.floor(bVal * 0.5)})`);
        ctx.fillStyle = grad;
        ctx.fill();

        if (brightness > 0.6) {
          ctx.strokeStyle = `rgba(${sc.edgeR},${sc.edgeG},${sc.edgeB},${((brightness - 0.6) * 0.8).toFixed(2)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(${Math.floor(sc.rBase * 0.3)},${Math.floor(sc.gBase * 0.3)},${Math.floor(sc.bBase * 0.3)},${(0.3 + brightness * 0.4).toFixed(2)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    const glowGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, width * 0.35);
    glowGrad.addColorStop(0, `rgba(${sc.glowR},${sc.glowG},${sc.glowB},0.15)`);
    glowGrad.addColorStop(0.5, `rgba(${sc.glowR},${sc.glowG},${sc.glowB},0.05)`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    const glowGrad2 = ctx.createRadialGradient(lightX2, lightY2, 0, lightX2, lightY2, width * 0.3);
    glowGrad2.addColorStop(0, `rgba(${sc.glowR},${sc.glowG},${sc.glowB},0.1)`);
    glowGrad2.addColorStop(0.5, `rgba(${sc.glowR},${sc.glowG},${sc.glowB},0.03)`);
    glowGrad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad2;
    ctx.fillRect(0, 0, width, height);

    const glowGrad3 = ctx.createRadialGradient(lightX3, lightY3, 0, lightX3, lightY3, width * 0.25);
    glowGrad3.addColorStop(0, `rgba(${sc.glowR},${sc.glowG},${sc.glowB},0.1)`);
    glowGrad3.addColorStop(0.5, `rgba(${sc.glowR},${sc.glowG},${sc.glowB},0.03)`);
    glowGrad3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad3;
    ctx.fillRect(0, 0, width, height);

    const ripplePulse = 0.5 + 0.5 * Math.sin(t * 2);
    const rippleGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.4 * ripplePulse);
    rippleGlow.addColorStop(0, `rgba(${sc.glowR},${sc.glowG},${sc.glowB},0.08)`);
    rippleGlow.addColorStop(0.5, `rgba(${sc.glowR},${sc.glowG},${sc.glowB},0.03)`);
    rippleGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rippleGlow;
    ctx.fillRect(0, 0, width, height);

  }, [frame, width, height, totalFrames, speed, t, sc]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: sc.bg1 }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { HexWave };
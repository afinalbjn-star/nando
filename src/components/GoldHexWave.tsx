import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

interface GoldHexWaveProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}

const PI2 = Math.PI * 2;
const SQRT3 = Math.sqrt(3);
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function hash(n: number): number { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const GoldHexWave: React.FC<GoldHexWaveProps> = ({
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

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#1a0e00');
    bgGrad.addColorStop(0.5, '#2a1500');
    bgGrad.addColorStop(1, '#0d0700');
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

        const h = hash(col * 100 + row);
        const shimmer = Math.sin(t * 3 + col * 0.5 + row * 0.7) * 0.5 + 0.5;
        const spec = Math.pow(shimmer, 3) * 0.3;

        const brightness = clamp(totalLight * 0.85 + spec + h * 0.1, 0, 1);

        const rVal = Math.floor(30 + brightness * 200);
        const gVal = Math.floor(15 + brightness * 140);
        const bVal = Math.floor(0 + brightness * 30);

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
        const rDark = Math.floor(rVal * 0.4);
        const gDark = Math.floor(gVal * 0.4);
        const bDark = Math.floor(bVal * 0.4);
        grad.addColorStop(0, `rgb(${rDark},${gDark},${bDark})`);
        grad.addColorStop(0.3, `rgb(${rVal},${gVal},${bVal})`);
        grad.addColorStop(0.6, `rgb(${Math.min(255, rVal + 30)},${Math.min(255, gVal + 20)},${Math.min(255, bVal + 5)})`);
        grad.addColorStop(1, `rgb(${Math.floor(rVal * 0.6)},${Math.floor(gVal * 0.6)},${Math.floor(bVal * 0.6)})`);
        ctx.fillStyle = grad;
        ctx.fill();

        if (brightness > 0.6) {
          ctx.strokeStyle = `rgba(255,200,50,${((brightness - 0.6) * 0.8).toFixed(2)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(80,40,0,${(0.3 + brightness * 0.4).toFixed(2)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    const glowGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, width * 0.35);
    glowGrad.addColorStop(0, 'rgba(255,200,80,0.15)');
    glowGrad.addColorStop(0.5, 'rgba(255,160,40,0.05)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    const glowGrad2 = ctx.createRadialGradient(lightX2, lightY2, 0, lightX2, lightY2, width * 0.3);
    glowGrad2.addColorStop(0, 'rgba(255,180,60,0.1)');
    glowGrad2.addColorStop(0.5, 'rgba(255,140,30,0.03)');
    glowGrad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad2;
    ctx.fillRect(0, 0, width, height);

    const glowGrad3 = ctx.createRadialGradient(lightX3, lightY3, 0, lightX3, lightY3, width * 0.25);
    glowGrad3.addColorStop(0, 'rgba(255,190,70,0.1)');
    glowGrad3.addColorStop(0.5, 'rgba(255,150,40,0.03)');
    glowGrad3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad3;
    ctx.fillRect(0, 0, width, height);

    const ripplePulse = 0.5 + 0.5 * Math.sin(t * 2);
    const rippleGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.4 * ripplePulse);
    rippleGlow.addColorStop(0, 'rgba(255,180,60,0.08)');
    rippleGlow.addColorStop(0.5, 'rgba(255,140,30,0.03)');
    rippleGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rippleGlow;
    ctx.fillRect(0, 0, width, height);

  }, [frame, width, height, totalFrames, speed, t]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#1a0e00' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { GoldHexWave };
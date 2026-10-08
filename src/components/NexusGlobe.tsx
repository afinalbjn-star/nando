import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';
import { LAND_SAMPLES } from './landMask';

/**
 * NexusGlobe v5 — Centered, clean network visualization
 * - Fibers ("hair") completely removed.
 * - Globe centered and slightly enlarged.
 * - Thick, solid network arcs.
 * - Traveling signals are single glowing node dots (not streaks).
 */

export type NexusScheme = 'amethyst' | 'violet' | 'sapphire' | 'crimson';

interface NexusGlobeProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: NexusScheme;
}

const PALS = {
  amethyst: {
    bg0: '#190A33', bg1: '#05010A',
    oceanLit: '#4A1D82', oceanDark: '#170630',
    land: '#D29CFF',
    nodeCore: '#FFFFFF', nodeGlow: '#EABFFF',
    arcBase: 'rgba(210, 160, 255, 0.35)', arcGlow: '#FFFFFF'
  },
  violet: {
    bg0: '#140E33', bg1: '#03020A',
    oceanLit: '#382580', oceanDark: '#100A30',
    land: '#A89CFF',
    nodeCore: '#FFFFFF', nodeGlow: '#D0C4FF',
    arcBase: 'rgba(160, 150, 255, 0.35)', arcGlow: '#FFFFFF'
  },
  sapphire: {
    bg0: '#07102E', bg1: '#01030D',
    oceanLit: '#1D3B82', oceanDark: '#081230',
    land: '#8AB0FF',
    nodeCore: '#FFFFFF', nodeGlow: '#BBD4FF',
    arcBase: 'rgba(120, 160, 255, 0.35)', arcGlow: '#FFFFFF'
  },
  crimson: {
    bg0: '#330814', bg1: '#0F0205',
    oceanLit: '#821D32', oceanDark: '#2E0810',
    land: '#FF9CB0',
    nodeCore: '#FFFFFF', nodeGlow: '#FFC4D0',
    arcBase: 'rgba(255, 140, 160, 0.35)', arcGlow: '#FFFFFF'
  }
};

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function toVec(lon: number, lat: number) {
  const rLon = lon * D2R; const rLat = lat * D2R;
  return [Math.cos(rLat) * Math.sin(rLon), Math.sin(rLat), Math.cos(rLat) * Math.cos(rLon)];
}

function slerp(p0: number[], p1: number[], t: number, bulge: number) {
  const dot = p0[0] * p1[0] + p0[1] * p1[1] + p0[2] * p1[2];
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  if (Math.abs(theta) < 0.0001) return [p0[0], p0[1], p0[2]];
  
  const sinTheta = Math.sin(theta);
  const a = Math.sin((1 - t) * theta) / sinTheta;
  const b = Math.sin(t * theta) / sinTheta;
  
  const h = Math.sin(t * Math.PI) * bulge;
  const r = 1.0 + h;
  return [(p0[0] * a + p1[0] * b) * r, (p0[1] * a + p1[1] * b) * r, (p0[2] * a + p1[2] * b) * r];
}

const HUBS = [
  [-3.7, 40.4], [-0.1, 51.5], [2.4, 48.9], [13.4, 52.5], [12.5, 41.9],
  [-74.0, 40.7], [-87.6, 41.8], [-118.2, 34.1], [-43.2, -22.9], [37.6, 55.8],
  [55.3, 25.2], [100.5, 13.8], [139.7, 35.7], [151.2, -33.9], [18.1, 59.3], 
  [-9.1, 38.7], [28.9, 41.0]
];

const ARCS = (() => {
  const out = [];
  for (let i = 0; i < 35; i++) {
    const a = Math.floor(hash(i * 2.1) * HUBS.length);
    let b = Math.floor(hash(i * 3.7 + 5) * HUBS.length);
    if (a === b) b = (b + 1) % HUBS.length;
    out.push({
      p0: toVec(HUBS[a][0], HUBS[a][1]),
      p1: toVec(HUBS[b][0], HUBS[b][1]),
      bulge: 0.12 + hash(i * 1.1) * 0.22, // Nice tall arcs
      speed: 1 + Math.floor(hash(i * 4.3) * 2),
      phase: hash(i * 7.9)
    });
  }
  return out;
})();

export const NexusGlobe: React.FC<NexusGlobeProps> = ({
  width = 3840, height = 2160, totalFrames = 240, speed = 1, scheme = 'amethyst'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = PALS[scheme];
  
  const u = (frame / totalFrames) * speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Centered, prominent globe
    const R = height * 0.46;
    const CX = width * 0.5;
    const CY = height * 0.5;
    const DOT_SIZE = R * 0.0075; 
    
    // Continuous spin, tilt earth
    const rotLon = u * TAU; 
    const tilt = 15 * D2R;
    const cosLon = Math.cos(rotLon); const sinLon = Math.sin(rotLon);
    const cosTilt = Math.cos(tilt); const sinTilt = Math.sin(tilt);

    function transform(x: number, y: number, z: number) {
      const x1 = x * cosLon + z * sinLon;
      const y1 = y;
      const z1 = -x * sinLon + z * cosLon;
      const x2 = x1;
      const y2 = y1 * cosTilt - z1 * sinTilt;
      const z2 = y1 * sinTilt + z1 * cosTilt;
      return { px: CX + x2 * R, py: CY - y2 * R, pz: z2 };
    }

    // 1. Background
    const bgGrad = ctx.createRadialGradient(CX, CY, R * 0.5, CX, CY, width * 0.7);
    bgGrad.addColorStop(0, pal.bg0); bgGrad.addColorStop(1, pal.bg1);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Globe Base
    const baseGrad = ctx.createRadialGradient(CX - R*0.3, CY - R*0.3, 0, CX, CY, R);
    baseGrad.addColorStop(0, pal.oceanLit);
    baseGrad.addColorStop(0.65, pal.oceanDark);
    baseGrad.addColorStop(1, pal.bg1);
    ctx.fillStyle = baseGrad;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.fill();

    // 3. Landmass
    ctx.fillStyle = pal.land;
    for (const [lon, lat] of LAND_SAMPLES) {
      const rLon = lon * D2R; const rLat = lat * D2R;
      const x = Math.cos(rLat) * Math.sin(rLon);
      const y = Math.sin(rLat);
      const z = Math.cos(rLat) * Math.cos(rLon);
      const { px, py, pz } = transform(x, y, z);
      
      if (pz > 0) { 
        ctx.globalAlpha = Math.max(0, Math.min(1, pz * 4));
        ctx.fillRect(px - DOT_SIZE/2, py - DOT_SIZE/2, DOT_SIZE, DOT_SIZE);
      }
    }
    ctx.globalAlpha = 1.0;

    // 4. Subtle Atmospheric Rim Glow
    const rim = ctx.createRadialGradient(CX, CY, R * 0.98, CX, CY, R * 1.06);
    rim.addColorStop(0, 'rgba(255, 255, 255, 0)');
    rim.addColorStop(0.3, `${pal.land}33`); // ~20% opacity matching land
    rim.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(CX, CY, R * 1.06, 0, TAU); ctx.fill();

    // 5. Network Arcs & Node Signals
    ctx.lineCap = 'round';
    ARCS.forEach(arc => {
      const segments = 40;
      const pts = [];
      for(let s=0; s<=segments; s++) {
        const t = s / segments;
        const p3d = slerp(arc.p0, arc.p1, t, arc.bulge);
        pts.push(transform(p3d[0], p3d[1], p3d[2]));
      }
      
      if (!pts.some(p => p.pz > -0.1)) return;

      // Draw Thicker Base Arc
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
      ctx.strokeStyle = pal.arcBase;
      ctx.lineWidth = R * 0.007; // Thicker lines
      ctx.stroke();

      // Traveling Glowing Node (Dot only, no comet streak)
      const progress = (u * arc.speed + arc.phase) % 1;
      const p3d = slerp(arc.p0, arc.p1, progress, arc.bulge);
      const p = transform(p3d[0], p3d[1], p3d[2]);

      if (p.pz > 0) {
        ctx.beginPath();
        const nodeRadius = R * 0.012; // Noticeable glowing dot
        ctx.arc(p.px, p.py, nodeRadius, 0, TAU);
        ctx.fillStyle = pal.arcGlow;
        ctx.shadowBlur = 18;
        ctx.shadowColor = pal.nodeGlow;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    });

    // 6. Hub Nodes
    HUBS.forEach(([lon, lat], i) => {
      const rLon = lon * D2R; const rLat = lat * D2R;
      const x = Math.cos(rLat) * Math.sin(rLon);
      const y = Math.sin(rLat);
      const z = Math.cos(rLat) * Math.cos(rLon);
      const { px, py, pz } = transform(x, y, z);
      
      if (pz > 0.05) {
        const pulse = 0.5 + 0.5 * Math.sin(TAU * (u * 3 + hash(i)));
        const rBase = R * 0.006; 
        
        ctx.globalAlpha = Math.max(0, Math.min(1, pz * 3));
        
        // Glow
        ctx.beginPath(); ctx.arc(px, py, rBase * (2.5 + pulse * 1.5), 0, TAU);
        ctx.fillStyle = `${pal.nodeGlow}66`; 
        ctx.fill();
        
        // Core
        ctx.beginPath(); ctx.arc(px, py, rBase, 0, TAU);
        ctx.fillStyle = pal.nodeCore; 
        ctx.fill();

        ctx.globalAlpha = 1.0;
      }
    });

  }, [frame, width, height, u, pal]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: pal.bg1 }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

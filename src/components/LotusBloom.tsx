import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * LotusBloom (3D Blooming Flower) - Refined
 * Bright, wide, elegant thin petals, flawless mirroring.
 */

export type LotusScheme = 'lotus' | 'crystal' | 'ember';

interface LotusBloomProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: LotusScheme;
}

const SCHEMES = {
  lotus: {
    bgTop: '#150A26',
    bgBottom: '#05020A',
    core: '#FFFBE6',
    rings: [
      { N: 6,  scale: 0.35, basePitch: 0.10, color: '#FFF3B0' },
      { N: 8,  scale: 0.60, basePitch: 0.40, color: '#FFB3D9' },
      { N: 12, scale: 0.85, basePitch: 0.70, color: '#F772B5' },
      { N: 16, scale: 1.10, basePitch: 1.00, color: '#D64096' },
      { N: 20, scale: 1.35, basePitch: 1.25, color: '#9E2A70' }
    ]
  },
  crystal: {
    bgTop: '#0B1A2E',
    bgBottom: '#02060A',
    core: '#E6FBFF',
    rings: [
      { N: 6,  scale: 0.35, basePitch: 0.10, color: '#B0F3FF' },
      { N: 8,  scale: 0.60, basePitch: 0.40, color: '#B3D9FF' },
      { N: 12, scale: 0.85, basePitch: 0.70, color: '#72B5F7' },
      { N: 16, scale: 1.10, basePitch: 1.00, color: '#4096D6' },
      { N: 20, scale: 1.35, basePitch: 1.25, color: '#2A709E' }
    ]
  },
  ember: {
    bgTop: '#260A0A',
    bgBottom: '#0A0202',
    core: '#FFF1E6',
    rings: [
      { N: 6,  scale: 0.35, basePitch: 0.10, color: '#FFD3B0' },
      { N: 8,  scale: 0.60, basePitch: 0.40, color: '#FF9B73' },
      { N: 12, scale: 0.85, basePitch: 0.70, color: '#F75C3A' },
      { N: 16, scale: 1.10, basePitch: 1.00, color: '#D62A1A' },
      { N: 20, scale: 1.35, basePitch: 1.25, color: '#9E150B' }
    ]
  }
};

const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

const mul = (v: any, s: number) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
const norm = (v: any) => { 
  const m = Math.sqrt(v.x**2 + v.y**2 + v.z**2); 
  return m === 0 ? v : mul(v, 1/m); 
};

const rotate3D = (v: any, pitch: number, yaw: number, roll: number) => {
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  const y1 = v.y * cx - v.z * sx;
  const z1 = v.y * sx + v.z * cx;
  
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x2 = v.x * cy + z1 * sy;
  const z2 = -v.x * sy + z1 * cy;
  
  const cz = Math.cos(roll), sz = Math.sin(roll);
  const x3 = x2 * cz - y1 * sz;
  const y3 = x2 * sz + y1 * cz;
  
  return { x: x3, y: y3, z: z2 };
};

const TAU = Math.PI * 2;

export const LotusBloom: React.FC<LotusBloomProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'lotus'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = SCHEMES[scheme];
  
  const u = (frame / totalFrames) * speed;

  const geometry = useMemo(() => {
    // Elegant Thin Petal Geometry
    const H = 600; // Length
    const W = 280; // Broad width for lotus look
    const B = 220; // Outward cup bend

    const baseVerts = [
      { x: 0, y: 0, z: 0 },                 // 0: Base
      { x: -W, y: H * 0.45, z: B * 0.7 },   // 1: Left
      { x: W, y: H * 0.45, z: B * 0.7 },    // 2: Right
      { x: 0, y: H * 0.50, z: B },          // 3: Center Spine
      { x: 0, y: H, z: B * 1.5 }            // 4: Tip
    ];

    // Double-sided flat faces
    const petalFaces = [
      [0, 1, 3],
      [0, 3, 2],
      [1, 4, 3],
      [3, 4, 2]
    ];

    // Particles clustering at center
    const particles = Array.from({ length: 80 }).map(() => ({
      x: (Math.random() - 0.5) * 600,
      z: (Math.random() - 0.5) * 600,
      yStart: Math.random(),
      speed: 0.5 + Math.random() * 1.5,
      size: 2 + Math.random() * 6,
    }));

    return { baseVerts, petalFaces, particles };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Moody background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, theme.bgTop);
    bgGrad.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const focalLength = 5000;
    const camZ = -5500;
    const CX = width / 2;
    // Shift down to make floor reflection highly visible
    const CY = height * 0.60; 
    
    // Smooth camera rotation
    const globalYaw = u * TAU; 
    // Looking slightly down at the flower
    const camPitch = -0.15; 

    // Y points UP in world space!
    const project = (p: any) => {
      const dz = p.z - camZ;
      if (dz < 1) return null;
      const s = focalLength / dz;
      return { x: CX + p.x * s, y: CY - p.y * s, z: p.z, s }; 
    };

    const l1 = norm({ x: 0, y: 1, z: 0.2 });   
    const l2 = norm({ x: 0.5, y: 0.5, z: -1 }); 

    const renderList: any[] = [];

    // 1. Process Petals
    theme.rings.forEach((ring, rIdx) => {
      // Gentle breathing animation
      const currentPitch = ring.basePitch + Math.sin(u * TAU - rIdx * 0.9) * 0.12;

      for (let i = 0; i < ring.N; i++) {
        const yaw = (i / ring.N) * TAU;

        const petalWorldVerts = geometry.baseVerts.map(v => {
          const scaled = mul(v, ring.scale);
          const pitched = rotate3D(scaled, currentPitch, 0, 0);
          return rotate3D(pitched, 0, yaw, 0);
        });

        geometry.petalFaces.forEach(f => {
          const p0 = petalWorldVerts[f[0]];
          const p1 = petalWorldVerts[f[1]];
          const p2 = petalWorldVerts[f[2]];

          // Normal
          const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
          const vx = p2.x - p0.x, vy = p2.y - p0.y, vz = p2.z - p0.z;
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz);
          if (nlen > 0) { nx /= nlen; ny /= nlen; nz /= nlen; }

          // Extreme Brightness Lighting (Absolute dot product for thin faces)
          const baseCol = hexToRgb(ring.color);
          const d1 = Math.abs(nx * l1.x + ny * l1.y + nz * l1.z);
          const d2 = Math.abs(nx * l2.x + ny * l2.y + nz * l2.z);
          
          const ambient = 0.65; // High ambient to guarantee brightness
          const intensity = Math.min(1, ambient + d1 * 0.4 + d2 * 0.2);
          
          const colorStr = `rgb(${Math.floor(baseCol.r * intensity)},${Math.floor(baseCol.g * intensity)},${Math.floor(baseCol.b * intensity)})`;

          // Camera Transform REAL Face
          const rp0 = rotate3D(p0, camPitch, globalYaw, 0);
          const rp1 = rotate3D(p1, camPitch, globalYaw, 0);
          const rp2 = rotate3D(p2, camPitch, globalYaw, 0);
          const cz = (rp0.z + rp1.z + rp2.z) / 3;

          // No culling required for thin polygons
          renderList.push({ type: 'poly', z: cz, color: colorStr, verts: [rp0, rp1, rp2], alpha: 1.0 });

          // Camera Transform REFLECTED Face
          const ref0 = { x: p0.x, y: -p0.y, z: p0.z };
          const ref1 = { x: p1.x, y: -p1.y, z: p1.z };
          const ref2 = { x: p2.x, y: -p2.y, z: p2.z };
          
          const rref0 = rotate3D(ref0, camPitch, globalYaw, 0);
          const rref1 = rotate3D(ref1, camPitch, globalYaw, 0);
          const rref2 = rotate3D(ref2, camPitch, globalYaw, 0);
          const rfcz = (rref0.z + rref1.z + rref2.z) / 3;

          // Reversed winding for reflection
          renderList.push({ type: 'poly', z: rfcz, color: colorStr, verts: [rref0, rref2, rref1], alpha: 0.35 });
        });
      }
    });

    // 2. Process Particles
    geometry.particles.forEach(p => {
      const yProgress = (p.yStart + u * p.speed) % 1.0;
      const y = 50 + yProgress * 1500; 
      
      const opacity = Math.sin(yProgress * Math.PI);
      const pX = p.x + Math.sin(y * 0.005 + p.yStart * TAU) * 150;
      const pZ = p.z + Math.cos(y * 0.005 + p.yStart * TAU) * 150;

      const pWorld = { x: pX, y, z: pZ };
      const pCam = rotate3D(pWorld, camPitch, globalYaw, 0);
      renderList.push({ type: 'particle', z: pCam.z, pCam, size: p.size, opacity, color: theme.core });
      
      const pRefWorld = { x: pX, y: -y, z: pZ };
      const pRefCam = rotate3D(pRefWorld, camPitch, globalYaw, 0);
      renderList.push({ type: 'particle', z: pRefCam.z, pCam: pRefCam, size: p.size, opacity: opacity * 0.3, color: theme.core });
    });

    // 3. Process Glowing Core
    const coreCam = rotate3D({ x: 0, y: 80, z: 0 }, camPitch, globalYaw, 0);
    renderList.push({ type: 'core', z: coreCam.z, pCam: coreCam, isReflect: false });
    
    const coreRefCam = rotate3D({ x: 0, y: -80, z: 0 }, camPitch, globalYaw, 0);
    renderList.push({ type: 'core', z: coreRefCam.z, pCam: coreRefCam, isReflect: true });

    // Precise Z-Sort
    renderList.sort((a, b) => b.z - a.z);

    // Draw
    renderList.forEach(item => {
      if (item.type === 'poly') {
        const p0 = project(item.verts[0]);
        const p1 = project(item.verts[1]);
        const p2 = project(item.verts[2]);

        if (p0 && p1 && p2) {
          ctx.globalAlpha = item.alpha;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.closePath();
          
          ctx.fillStyle = item.color;
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 1.0;
          ctx.fill();
          ctx.stroke();
        }
      } 
      else if (item.type === 'particle') {
        const p = project(item.pCam);
        if (p) {
          ctx.globalAlpha = item.opacity;
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, item.size * p.s, 0, TAU);
          ctx.fill();
        }
      }
      else if (item.type === 'core') {
        const p = project(item.pCam);
        if (p) {
          ctx.globalAlpha = item.isReflect ? 0.35 : 1.0;
          ctx.fillStyle = theme.core;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 100 * p.s, 0, TAU);
          ctx.fill();
          
          const auraGrad = ctx.createRadialGradient(p.x, p.y, 50 * p.s, p.x, p.y, 500 * p.s);
          auraGrad.addColorStop(0, `${theme.core}99`);
          auraGrad.addColorStop(1, `${theme.core}00`);
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 500 * p.s, 0, TAU);
          ctx.fill();
        }
      }
    });

    ctx.globalAlpha = 1.0; 

  }, [frame, width, height, u, theme, geometry]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: theme.bgTop }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

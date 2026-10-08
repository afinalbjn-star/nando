import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * RibbonFlow (Twisted Tendrils)
 * An organic, elegant 3D structure made of flowing ribbons branching from a central spine.
 * Fully parametric, mathematically animated, and seamlessly looping.
 */

export type RibbonScheme = 'coral' | 'abyss' | 'flora';

interface RibbonFlowProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: RibbonScheme;
}

const SCHEMES = {
  coral: {
    bgTop: '#5CE1E6',
    bgBottom: '#007A94',
    blocks: ['#FF007A', '#FF2865', '#FF5B55', '#FF953E', '#FFC824']
  },
  abyss: {
    bgTop: '#001A33',
    bgBottom: '#00050A',
    blocks: ['#00F0FF', '#009DFF', '#0055FF', '#3B00FF', '#7A00FF']
  },
  flora: {
    bgTop: '#FFEBF0',
    bgBottom: '#FFA1B8',
    blocks: ['#00FF87', '#60E02D', '#A1C000', '#D69B00', '#FF6B00']
  }
};

const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

const cross = (a: any, b: any) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});
const add = (a: any, b: any) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: any, b: any) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (v: any, s: number) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
const mag = (v: any) => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
const norm = (v: any) => { const m = mag(v); return m === 0 ? v : mul(v, 1 / m); };

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

export const RibbonFlow: React.FC<RibbonFlowProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'coral'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = SCHEMES[scheme];
  
  const u = (frame / totalFrames) * speed;

  const strandsData = useMemo(() => {
    const strands = [];
    const N = 220; // Number of ribbon tentacles
    
    for(let i = 0; i < N; i++) {
      const t = i / (N - 1); 
      // Spine goes from bottom to top
      const Y = -1400 + t * 2800;
      // Golden angle distribution wraps them beautifully around the spine
      const theta = i * 2.39996; 

      // Interpolate the gradient palette across the spine
      const cT = t * (theme.blocks.length - 1);
      const idx = Math.floor(cT);
      const fract = cT - idx;
      const c1 = hexToRgb(theme.blocks[idx]);
      const c2 = hexToRgb(theme.blocks[Math.min(idx + 1, theme.blocks.length - 1)]);
      const baseColor = {
        r: c1.r + (c2.r - c1.r) * fract,
        g: c1.g + (c2.g - c1.g) * fract,
        b: c1.b + (c2.b - c1.b) * fract
      };

      strands.push({ Y, theta, baseColor, index: i });
    }
    return strands;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Elegant linear background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, theme.bgTop);
    bgGrad.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const focalLength = 5500;
    const camZ = -5000;
    const CX = width / 2;
    const CY = height / 2;
    
    // Seamless loop animation properties
    const phase = u * TAU;
    const globalYaw = u * TAU; 
    const globalPitch = 0.15 + Math.sin(u * TAU) * 0.15; // Slow majesty rocking
    const globalRoll = 0;

    const project = (p: any) => {
      const dz = p.z - camZ;
      if (dz < 1) return null;
      const s = focalLength / dz;
      return { x: CX + p.x * s, y: CY + p.y * s, z: p.z, s };
    };

    const l1 = norm({ x: -1, y: 1, z: 0.8 }); // Main Key Light
    const l2 = norm({ x: 1, y: 0.5, z: 0.3 }); // Soft Fill Light

    const renderedFaces: { z: number, color: string, verts: any[] }[] = [];

    const SEG = 4; // 4 articulated joints per strand for a smooth curve

    strandsData.forEach(strand => {
      // Start slightly off-center to form a thick core
      let currP = { 
        x: 80 * Math.cos(strand.theta), 
        y: strand.Y, 
        z: 80 * Math.sin(strand.theta) 
      };
      
      // The wave makes the tendrils breathe and undulate organically
      const wave = Math.sin(strand.Y * 0.004 - phase);
      
      // Initial growth direction
      let currPitch = 0.5 + wave * 0.25; 
      let currYaw = strand.theta + wave * 0.15;

      for (let s = 0; s < SEG; s++) {
        const L = 250; // Length of each ribbon segment
        const W = 45;  // Ribbon width
        const D = 18;  // Ribbon thickness

        const dir = {
          x: Math.cos(currPitch) * Math.sin(currYaw),
          y: Math.sin(currPitch),
          z: Math.cos(currPitch) * Math.cos(currYaw)
        };

        const nextP = add(currP, mul(dir, L));
        
        // Build the 3D box for this segment
        const F = norm(sub(nextP, currP));
        let U = { x: 0, y: 1, z: 0 };
        if (Math.abs(F.y) > 0.99) U = { x: 1, y: 0, z: 0 };
        const R_vec = norm(cross(U, F));
        const V_vec = norm(cross(F, R_vec));

        const wR = mul(R_vec, W / 2);
        const dV = mul(V_vec, D / 2);

        // 8 local vertices
        const localVerts = [
          sub(sub(currP, wR), dV), add(sub(currP, wR), dV), add(add(currP, wR), dV), sub(add(currP, wR), dV),
          sub(sub(nextP, wR), dV), add(sub(nextP, wR), dV), add(add(nextP, wR), dV), sub(add(nextP, wR), dV)
        ];

        // Apply global animation
        const boxVerts = localVerts.map(v => rotate3D(v, globalPitch, globalYaw, globalRoll));

        // 6 strictly CCW faces for perfect backface culling
        const faces = [
          [0, 3, 2, 1], // Base
          [4, 5, 6, 7], // Tip
          [0, 1, 5, 4], // Bottom
          [1, 2, 6, 5], // Right
          [2, 3, 7, 6], // Top
          [3, 0, 4, 7]  // Left
        ];

        faces.forEach(f => {
          const p0 = boxVerts[f[0]], p1 = boxVerts[f[1]], p2 = boxVerts[f[2]], p3 = boxVerts[f[3]];
          
          // Dynamic Normal calculation
          const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
          const vx = p2.x - p0.x, vy = p2.y - p0.y, vz = p2.z - p0.z;
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz);
          if (nlen > 0) { nx /= nlen; ny /= nlen; nz /= nlen; }

          const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
          const cy = (p0.y + p1.y + p2.y + p3.y) / 4;
          const cz = (p0.z + p1.z + p2.z + p3.z) / 4;
          
          const toCam = norm({ x: CX - cx, y: CY - cy, z: camZ - cz });
          const dotCam = nx * toCam.x + ny * toCam.y + nz * toCam.z;

          // Cull faces pointing away from the camera
          if (dotCam <= 0) return;

          // Studio Lighting
          const d1 = Math.max(0, nx * l1.x + ny * l1.y + nz * l1.z);
          const d2 = Math.max(0, nx * l2.x + ny * l2.y + nz * l2.z);
          
          // Outer segments are fully bright, inner segments are deeply shadowed (ambient occlusion)
          const ambientOcclusion = 0.35 + 0.65 * (s / (SEG - 1)); 
          const intensity = Math.min(1, 0.2 + d1 * 0.75 + d2 * 0.25) * ambientOcclusion;

          const r = Math.floor(strand.baseColor.r * intensity);
          const g = Math.floor(strand.baseColor.g * intensity);
          const b = Math.floor(strand.baseColor.b * intensity);

          renderedFaces.push({
            z: cz,
            color: `rgb(${r},${g},${b})`,
            verts: [p0, p1, p2, p3]
          });
        });

        // Advance the curve for the next segment
        currP = nextP;
        currPitch -= 0.35; // The ribbon bends gracefully downwards
        currYaw += 0.20;   // The ribbon twists sideways
      }
    });

    // Precision Painter's Algorithm
    renderedFaces.sort((a, b) => b.z - a.z);

    // Render Polygons
    renderedFaces.forEach(f => {
      const proj = f.verts.map(project);
      
      if (proj.every(p => p !== null)) {
        ctx.beginPath();
        ctx.moveTo(proj[0].x, proj[0].y);
        ctx.lineTo(proj[1].x, proj[1].y);
        ctx.lineTo(proj[2].x, proj[2].y);
        ctx.lineTo(proj[3].x, proj[3].y);
        ctx.closePath();
        
        ctx.fillStyle = f.color;
        // Anti-aliasing seamless edge trick
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 1.0;
        
        ctx.fill();
        ctx.stroke();
      }
    });

  }, [frame, width, height, u, theme, strandsData]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: theme.bgTop }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

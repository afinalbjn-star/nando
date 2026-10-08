import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * SpiralRing (Twisted Torus)
 * An elegant 3D ring made of discrete rectangular blocks twisting in a Möbius-like spiral.
 * Features studio-quality double-lighting and flawless 3D painter's algorithm depth sorting.
 */

export type SpiralScheme = 'ocean' | 'amethyst' | 'emerald';

interface SpiralRingProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: SpiralScheme;
}

// Generate a smooth palindromic gradient array for seamless color looping
const generatePalette = (colors: string[]) => {
  // Create a perfectly seamless looping gradient
  return [...colors, ...colors.slice(1, -1).reverse()];
};

const PALS = {
  ocean: {
    bg: '#9BA6B8', // Soft purplish-blue-grey from reference
    blocks: generatePalette([
      '#00F5FF', '#00D4FF', '#00A3FF', '#0066FF', '#4D00FF'
    ])
  },
  amethyst: {
    bg: '#2A203B',
    blocks: generatePalette([
      '#E0B0FF', '#C88EE6', '#B06CCD', '#984BB4', '#80299B'
    ])
  },
  emerald: {
    bg: '#1A2F25',
    blocks: generatePalette([
      '#52FFB8', '#3CE09A', '#26C27D', '#10A35F', '#008542'
    ])
  }
};

const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

const normalize = (v: {x: number, y: number, z: number}) => {
  const len = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
  return len === 0 ? v : { x: v.x/len, y: v.y/len, z: v.z/len };
};

const rotate3D = (v: {x: number, y: number, z: number}, pitch: number, yaw: number, roll: number) => {
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

export const SpiralRing: React.FC<SpiralRingProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'ocean'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = PALS[scheme];
  
  const u = (frame / totalFrames) * speed;

  const geometry = useMemo(() => {
    // Proportions tightly matched to reference
    const w = 11;  // Very thin blocks
    const h = 180; // Radial length (cross section)
    const d = 180; // Depth (cross section)
    
    const verts = [
      { x: -w, y: -h, z: -d }, { x: w, y: -h, z: -d },
      { x: w, y: h, z: -d },   { x: -w, y: h, z: -d },
      { x: -w, y: -h, z: d },  { x: w, y: -h, z: d },
      { x: w, y: h, z: d },    { x: -w, y: h, z: d }
    ];

    const faces = [
      { id: 'front',  n: { x: 0, y: 0, z: -1 }, v: [0, 3, 2, 1] },
      { id: 'back',   n: { x: 0, y: 0, z: 1 },  v: [5, 6, 7, 4] },
      { id: 'left',   n: { x: -1, y: 0, z: 0 }, v: [4, 7, 3, 0] },
      { id: 'right',  n: { x: 1, y: 0, z: 0 },  v: [1, 2, 6, 5] },
      { id: 'top',    n: { x: 0, y: -1, z: 0 }, v: [4, 0, 1, 5] },
      { id: 'bottom', n: { x: 0, y: 1, z: 0 },  v: [3, 7, 6, 2] }
    ];

    const blocks = [];
    const N = 120; // High density to match reference

    for (let i = 0; i < N; i++) {
      // Global gradient spread perfectly around the ring
      const cIdx = Math.floor((i / N) * pal.blocks.length);
      blocks.push({
        i,
        baseColor: hexToRgb(pal.blocks[cIdx])
      });
    }

    return { verts, faces, blocks, N };
  }, [pal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Elegant gradient background
    const bgGrad = ctx.createRadialGradient(width/2, height/2, 200, width/2, height/2, height);
    bgGrad.addColorStop(0, pal.bg);
    bgGrad.addColorStop(1, '#6A7588'); // Soft shadow vignette
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const focalLength = 5000;
    const camZ = -3500;
    const CX = width / 2;
    const CY = height / 2;
    
    // The twist propagates smoothly over the duration for an elegant, slow motion
    const phase = u * TAU;
    const R = 450; 
    const k = 2;   // Number of full twists creating a symmetrical inner star

    const project = (p: { x: number, y: number, z: number }) => {
      const dz = p.z - camZ;
      if (dz < 1) return null;
      const s = focalLength / dz;
      return { x: CX + p.x * s, y: CY + p.y * s, z: p.z, s };
    };

    // Premium Studio Lighting
    const l1 = normalize({ x: -1.0, y: -0.8, z: -0.8 }); // Main strong light
    const l2 = normalize({ x: 0.8, y: 0.5, z: -0.2 });   // Gentle fill light

    // Very slight global tilt to view the 3D volume
    const globalPitch = 0.1; 
    const globalYaw = 0.0;

    // Calculate World State
    const renderedBlocks = geometry.blocks.map(b => {
      // Blocks are physically stationary...
      const theta = (b.i / geometry.N) * TAU;
      
      // ...but the twist phase propagates through them!
      const phi = k * theta + phase; 

      const worldVerts = geometry.verts.map(v => {
        // 1. Twist around local Y (tangent)
        const v1 = rotate3D(v, 0, phi, 0);
        // 2. Translate out to ring radius
        const v2 = { x: v1.x + R, y: v1.y, z: v1.z };
        // 3. Orbit around Z axis
        const v3 = rotate3D(v2, 0, 0, theta);
        // 4. Global tilt
        return rotate3D(v3, globalPitch, globalYaw, 0);
      });

      const centerZ = worldVerts.reduce((sum, v) => sum + v.z, 0) / 8;

      const worldFaces = geometry.faces.map(f => {
        // Same rotations for normals
        const n1 = rotate3D(f.n, 0, phi, 0);
        const n2 = rotate3D(n1, 0, 0, theta);
        const wn = rotate3D(n2, globalPitch, globalYaw, 0);
        
        const fv = f.v.map(idx => worldVerts[idx]);
        const center = fv.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }), { x: 0, y: 0, z: 0 });
        center.x /= 4; center.y /= 4; center.z /= 4;

        const toCam = normalize({ x: CX - center.x, y: CY - center.y, z: camZ - center.z });

        // Backface culling
        const dotCam = wn.x * toCam.x + wn.y * toCam.y + wn.z * toCam.z;
        if (dotCam <= 0) return null;

        // High-contrast lighting
        const d1 = Math.max(0, wn.x * l1.x + wn.y * l1.y + wn.z * l1.z);
        const d2 = Math.max(0, wn.x * l2.x + wn.y * l2.y + wn.z * l2.z);
        
        const ambient = 0.2;
        // Exaggerated diffuse curve for deep, elegant shadows
        const intensity = Math.min(1, ambient + Math.pow(d1, 1.5) * 0.85 + d2 * 0.2);

        const r = Math.floor(b.baseColor.r * intensity);
        const g = Math.floor(b.baseColor.g * intensity);
        const bl = Math.floor(b.baseColor.b * intensity);

        return {
          z: center.z,
          color: `rgb(${r},${g},${bl})`,
          verts: fv
        };
      }).filter(f => f !== null);

      return { centerZ, faces: worldFaces };
    });

    // Sort blocks back-to-front
    renderedBlocks.sort((a, b) => b.centerZ - a.centerZ);

    renderedBlocks.forEach(b => {
      b.faces.sort((f1, f2) => f2!.z - f1!.z);

      b.faces.forEach(f => {
        if (!f) return;
        const p0 = project(f.verts[0]);
        const p1 = project(f.verts[1]);
        const p2 = project(f.verts[2]);
        const p3 = project(f.verts[3]);

        if (p0 && p1 && p2 && p3) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          
          // Pure polygon fill with no thick outlines matches the reference's sleek look
          ctx.fillStyle = f.color;
          // Sub-pixel anti-aliasing fix
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 1.0;
          
          ctx.fill();
          ctx.stroke();
        }
      });
    });

  }, [frame, width, height, u, pal, geometry]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#000' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

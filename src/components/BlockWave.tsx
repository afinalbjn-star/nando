import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * BlockWave (Domino Ribbon)
 * An elegant 3D twisting ribbon made of solid rectangular blocks.
 * Employs a custom 3D painter's algorithm for flawless depth sorting.
 */

export type BlockScheme = 'lilac' | 'ocean' | 'sunset';

interface BlockWaveProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: BlockScheme;
}

const PALS = {
  lilac: {
    bg: '#D2D0E0',
    blocks: ['#6B52FF', '#9E80F9', '#5E3BF3', '#64A3F6', '#8740E4', '#B490FF']
  },
  ocean: {
    bg: '#C0D8E0',
    blocks: ['#0077B6', '#0096C7', '#48CAE4', '#90E0EF', '#03045E', '#023E8A']
  },
  sunset: {
    bg: '#E0D0C0',
    blocks: ['#FF7B54', '#FFB26B', '#FFD56F', '#939B62', '#E05D5D', '#FF5B5B']
  }
};

const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

// Standard 3D Rotation helper (X, Y, Z axis)
const rotate3D = (v: {x: number, y: number, z: number}, pitch: number, yaw: number, roll: number) => {
  // Pitch (X)
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  const y1 = v.y * cx - v.z * sx;
  const z1 = v.y * sx + v.z * cx;
  // Yaw (Y)
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x2 = v.x * cy + z1 * sy;
  const z2 = -v.x * sy + z1 * cy;
  // Roll (Z)
  const cz = Math.cos(roll), sz = Math.sin(roll);
  const x3 = x2 * cz - y1 * sz;
  const y3 = x2 * sz + y1 * cz;
  return { x: x3, y: y3, z: z2 };
};

export const BlockWave: React.FC<BlockWaveProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'lilac'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = PALS[scheme];
  
  const u = (frame / totalFrames) * speed;

  const geometry = useMemo(() => {
    // A single block is WxHxD
    const w = 25;  // Thickness along X
    const h = 450; // Height
    const d = 250; // Depth
    
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
    const numBlocks = 160;
    const spacing = 55;
    const startX = -(numBlocks * spacing) / 2;

    for (let i = 0; i < numBlocks; i++) {
      const x = startX + i * spacing;
      blocks.push({
        i, x,
        baseColor: hexToRgb(pal.blocks[i % pal.blocks.length])
      });
    }

    return { verts, faces, blocks };
  }, [pal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    const focalLength = 3500;
    const camZ = -3000;
    const CX = width / 2;
    const CY = height / 2;
    const phase = u * Math.PI * 2;

    const project = (p: { x: number, y: number, z: number }) => {
      const dz = p.z - camZ;
      if (dz < 1) return null;
      const s = focalLength / dz;
      return { x: CX + p.x * s, y: CY + p.y * s, z: p.z, s };
    };

    // Calculate World State for all blocks
    const renderedBlocks = geometry.blocks.map(b => {
      const k = 0.0010; // Wave frequency
      const angle = b.x * k - phase;

      // Position in wave
      const tx = b.x;
      const ty = Math.sin(angle) * 500;
      const tz = Math.cos(angle) * 350;

      // Twist/Rotation (The elegant ribbon effect)
      const pitch = Math.cos(angle) * Math.PI / 2.5; 
      const yaw = Math.cos(angle) * Math.PI / 8;
      const roll = Math.sin(angle) * Math.PI / 1.5; 

      // Transform Vertices
      const worldVerts = geometry.verts.map(v => {
        const r = rotate3D(v, pitch, yaw, roll);
        return { x: r.x + tx, y: r.y + ty, z: r.z + tz };
      });

      // Calculate Block Center Z for coarse sorting
      const centerZ = worldVerts.reduce((sum, v) => sum + v.z, 0) / 8;

      // Transform and light faces
      const worldFaces = geometry.faces.map(f => {
        // Rotate normal
        const wn = rotate3D(f.n, pitch, yaw, roll);
        
        // Face center for sorting and lighting
        const fv = f.v.map(idx => worldVerts[idx]);
        const center = fv.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }), { x: 0, y: 0, z: 0 });
        center.x /= 4; center.y /= 4; center.z /= 4;

        // Vector to camera
        const toCam = { x: CX - center.x, y: CY - center.y, z: camZ - center.z };
        const dist = Math.sqrt(toCam.x**2 + toCam.y**2 + toCam.z**2);
        toCam.x /= dist; toCam.y /= dist; toCam.z /= dist;

        // Backface culling
        const dotCam = wn.x * toCam.x + wn.y * toCam.y + wn.z * toCam.z;
        if (dotCam <= 0) return null; // Facing away

        // Lighting (Ambient + Diffuse)
        const lightDir = { x: -0.5, y: -0.7, z: -0.5 };
        const lLen = Math.sqrt(lightDir.x**2 + lightDir.y**2 + lightDir.z**2);
        lightDir.x /= lLen; lightDir.y /= lLen; lightDir.z /= lLen;

        const diffuse = Math.max(0, wn.x * lightDir.x + wn.y * lightDir.y + wn.z * lightDir.z);
        const ambient = 0.35;
        const intensity = Math.min(1, ambient + diffuse * 0.75);

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

    // 1. Sort blocks back-to-front
    renderedBlocks.sort((a, b) => b.centerZ - a.centerZ);

    // 2. Draw
    renderedBlocks.forEach(b => {
      // Sort faces inside block back-to-front
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
          
          ctx.fillStyle = f.color;
          ctx.fill();

          // Subtle bevel/edge to separate the blocks clearly as seen in the reference
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    });

  }, [frame, width, height, u, pal, geometry]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: pal.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * CrystalCluster (Iridescent Starburst)
 * A stunning 3D crystal urchin with highly optimized iridescent lighting
 * and dynamic painter's algorithm depth sorting.
 */

export type CrystalScheme = 'iridescent' | 'neon' | 'obsidian';

interface CrystalClusterProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: CrystalScheme;
}

const normalize = (v: {x: number, y: number, z: number}) => {
  const len = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
  return len === 0 ? v : { x: v.x/len, y: v.y/len, z: v.z/len };
};

const SCHEMES = {
  iridescent: {
    base: { r: 25, g: 25, b: 30 },
    bg: '#000000',
    l1: { col: { r: 255, g: 40, b: 150 }, dir: normalize({ x: -1, y: 1, z: 0.8 }) },
    l2: { col: { r: 30, g: 255, b: 120 }, dir: normalize({ x: 1, y: -0.5, z: 0.8 }) },
    l3: { col: { r: 255, g: 210, b: 40 }, dir: normalize({ x: 0, y: -1, z: -0.2 }) }
  },
  neon: {
    base: { r: 15, g: 20, b: 25 },
    bg: '#05050A',
    l1: { col: { r: 0, g: 255, b: 255 }, dir: normalize({ x: -1, y: 0.5, z: 1 }) },
    l2: { col: { r: 255, g: 0, b: 255 }, dir: normalize({ x: 1, y: 0.5, z: 1 }) },
    l3: { col: { r: 255, g: 255, b: 0 }, dir: normalize({ x: 0, y: -1, z: 0.2 }) }
  },
  obsidian: {
    base: { r: 5, g: 5, b: 5 },
    bg: '#080808',
    l1: { col: { r: 255, g: 100, b: 50 }, dir: normalize({ x: -1, y: 1, z: 1 }) },
    l2: { col: { r: 50, g: 150, b: 255 }, dir: normalize({ x: 1, y: -1, z: 1 }) },
    l3: { col: { r: 255, g: 50, b: 150 }, dir: normalize({ x: 0, y: 1, z: -1 }) }
  }
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

export const CrystalCluster: React.FC<CrystalClusterProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'iridescent'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = SCHEMES[scheme];
  
  const u = (frame / totalFrames) * speed;

  const geometry = useMemo(() => {
    const spikes = [];
    const N = 180; // Very dense crystal cluster
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle for perfect spherical distribution

    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2; 
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const dx = Math.cos(theta) * radius;
      const dz = Math.sin(theta) * radius;

      // Align +Z vector to the (dx, y, dz) direction
      const yaw = Math.atan2(dx, dz);
      const pitch = Math.asin(-y); 

      // Pseudo-random organic variations for each crystal shard
      const r_out = 850 + Math.sin(i * 137.5) * 450;
      const r_mid = r_out * 0.75;
      const w = 35 + Math.sin(i * 99.1) * 20;
      const r_in = 60; // Inner core anchor

      // 6 Vertices defining an elongated diamond / crystal shard
      const localVerts = [
        { x: 0, y: 0, z: r_in },      // 0: inner root
        { x: w, y: 0, z: r_mid },     // 1: right edge
        { x: 0, y: w, z: r_mid },     // 2: top edge
        { x: -w, y: 0, z: r_mid },    // 3: left edge
        { x: 0, y: -w, z: r_mid },    // 4: bottom edge
        { x: 0, y: 0, z: r_out }      // 5: outer tip
      ];

      // Pre-calculate the base positions of the spikes
      const worldBaseVerts = localVerts.map(v => {
        const v1 = rotate3D(v, pitch, 0, 0);
        return rotate3D(v1, 0, yaw, 0);
      });

      spikes.push({ verts: worldBaseVerts });
    }

    // 8 triangular faces per crystal shard (CCW winding)
    const faces = [
      { v: [0, 2, 1] }, { v: [0, 3, 2] }, { v: [0, 4, 3] }, { v: [0, 1, 4] },
      { v: [5, 1, 2] }, { v: [5, 2, 3] }, { v: [5, 3, 4] }, { v: [5, 4, 1] }
    ];

    return { spikes, faces };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Deep space background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    const focalLength = 5500;
    const camZ = -5000;
    const CX = width / 2;
    const CY = height / 2;
    
    // Elegant, majestic seamless loop rotation
    const globalYaw = u * TAU;
    const globalPitch = Math.sin(u * TAU) * 0.35;
    const globalRoll = Math.cos(u * TAU) * 0.15;

    const project = (p: { x: number, y: number, z: number }) => {
      const dz = p.z - camZ;
      if (dz < 1) return null;
      const s = focalLength / dz;
      return { x: CX + p.x * s, y: CY + p.y * s, z: p.z, s };
    };

    const renderedFaces: { z: number, color: string, verts: {x:number,y:number,z:number}[] }[] = [];

    // Process all spikes
    geometry.spikes.forEach(spike => {
      // Apply global animation rotation
      const animVerts = spike.verts.map(v => rotate3D(v, globalPitch, globalYaw, globalRoll));

      geometry.faces.forEach(f => {
        const p0 = animVerts[f.v[0]];
        const p1 = animVerts[f.v[1]];
        const p2 = animVerts[f.v[2]];

        // Calculate face normal dynamically
        const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
        const vx = p2.x - p0.x, vy = p2.y - p0.y, vz = p2.z - p0.z;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz);
        if (nlen > 0) { nx/=nlen; ny/=nlen; nz/=nlen; }

        const center = {
          x: (p0.x + p1.x + p2.x) / 3,
          y: (p0.y + p1.y + p2.y) / 3,
          z: (p0.z + p1.z + p2.z) / 3
        };

        const toCam = normalize({ x: CX - center.x, y: CY - center.y, z: camZ - center.z });
        
        // Backface culling
        const dotCam = nx * toCam.x + ny * toCam.y + nz * toCam.z;
        if (dotCam <= 0) return;

        // Calculate illumination from the 3 colored lights
        const d1 = Math.max(0, nx * theme.l1.dir.x + ny * theme.l1.dir.y + nz * theme.l1.dir.z);
        const d2 = Math.max(0, nx * theme.l2.dir.x + ny * theme.l2.dir.y + nz * theme.l2.dir.z);
        const d3 = Math.max(0, nx * theme.l3.dir.x + ny * theme.l3.dir.y + nz * theme.l3.dir.z);

        // Power curves for glossy crystal appearance
        const i1 = Math.pow(d1, 2.5);
        const i2 = Math.pow(d2, 2.5);
        const i3 = Math.pow(d3, 2.5);

        // Specular sharp highlights
        const spec = Math.pow(Math.max(0, d1), 16) * 1.5 
                   + Math.pow(Math.max(0, d2), 16) * 1.5 
                   + Math.pow(Math.max(0, d3), 16) * 1.5;

        // Additive color blending
        let r = theme.base.r + i1 * theme.l1.col.r + i2 * theme.l2.col.r + i3 * theme.l3.col.r + spec * 255;
        let g = theme.base.g + i1 * theme.l1.col.g + i2 * theme.l2.col.g + i3 * theme.l3.col.g + spec * 255;
        let b = theme.base.b + i1 * theme.l1.col.b + i2 * theme.l2.col.b + i3 * theme.l3.col.b + spec * 255;

        renderedFaces.push({
          z: center.z,
          color: `rgb(${Math.min(255, Math.floor(r))},${Math.min(255, Math.floor(g))},${Math.min(255, Math.floor(b))})`,
          verts: [p0, p1, p2]
        });
      });
    });

    // Z-Sort for Painter's Algorithm
    renderedFaces.sort((a, b) => b.z - a.z);

    // Draw polygons
    renderedFaces.forEach(f => {
      const p0 = project(f.verts[0]);
      const p1 = project(f.verts[1]);
      const p2 = project(f.verts[2]);

      if (p0 && p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        
        ctx.fillStyle = f.color;
        // Subpixel aliasing gap fix
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 1.0;
        
        ctx.fill();
        ctx.stroke();
      }
    });

  }, [frame, width, height, u, theme, geometry]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: theme.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * VelvetDahlia (Dense 3D Flower) - REVISION
 * Replaced blocky polygons with perfectly smooth 2D Bezier projections.
 * Introduced extreme top-down camera angle, deep radial gradients, and velvet rim-lighting.
 */

export type DahliaScheme = 'violet' | 'crimson' | 'gold';

interface VelvetDahliaProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: DahliaScheme;
}

const SCHEMES = {
  violet: {
    bgTop: '#100522',
    bgBottom: '#050011',
    coreDark: '#0A001A', // Deep center void
    petalBase: '#3D007A',
    petalTip: '#8C1AFF',
    rimLight: '#D9B3FF'
  },
  crimson: {
    bgTop: '#220505',
    bgBottom: '#110000',
    coreDark: '#1A0000',
    petalBase: '#7A0000',
    petalTip: '#FF1A1A',
    rimLight: '#FFB3B3'
  },
  gold: {
    bgTop: '#221A05',
    bgBottom: '#110A00',
    coreDark: '#1A1100',
    petalBase: '#7A5C00',
    petalTip: '#FFC81A',
    rimLight: '#FFEBB3'
  }
};

const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

const lerpColor = (c1: any, c2: any, t: number) => ({
  r: c1.r + (c2.r - c1.r) * t,
  g: c1.g + (c2.g - c1.g) * t,
  b: c1.b + (c2.b - c1.b) * t
});

const rgbToStr = (c: any) => `rgb(${Math.floor(c.r)},${Math.floor(c.g)},${Math.floor(c.b)})`;

const norm = (v: any) => { 
  const m = Math.sqrt(v.x**2 + v.y**2 + v.z**2); 
  return m === 0 ? v : { x: v.x/m, y: v.y/m, z: v.z/m }; 
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

export const VelvetDahlia: React.FC<VelvetDahliaProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'violet'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = SCHEMES[scheme];
  
  const u = (frame / totalFrames) * speed;

    const geometry = useMemo(() => {
    // Elegant, Smooth Velvet Petal Base Vectors (Larger for more majestic feel)
    const H = 550; // Length
    const W = 360; // Control point width for Bezier curve
    const B = 220; // Forward bend (cup shape)

    const v = [
      { x: 0, y: 0, z: 0 },              // 0: Base
      { x: -W, y: H * 0.5, z: B * 0.8 }, // 1: Control Left
      { x: W, y: H * 0.5, z: B * 0.8 },  // 2: Control Right
      { x: 0, y: H, z: B * 1.5 }         // 3: Tip
    ];

    // Distribute 650 petals using a tight 3D Fibonacci spiral dome
    const N = 650;
    const petals = [];
    
    const coreDark = hexToRgb(theme.coreDark);
    const petalBase = hexToRgb(theme.petalBase);
    const petalTip = hexToRgb(theme.petalTip);
    const rimLight = hexToRgb(theme.rimLight);

    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      
      const yaw = i * 2.39996; 
      const radius = Math.pow(t, 0.55) * 1650; // Scaled up radius to fill the 4K screen
      const yOffset = t * 800 - 400; // Deeper center well
      const basePitch = Math.pow(t, 0.9) * 1.05; // Inner points UP, Outer points OUT
      const scale = 0.15 + t * 0.85; 
      
      // Interpolate colors based on distance from the deep dark core
      const tCol = Math.pow(t, 0.7); // Colors brighten quickly from center
      const baseCol = lerpColor(coreDark, petalBase, tCol);
      const tipCol = lerpColor(coreDark, petalTip, tCol);
      const rimCol = lerpColor(petalBase, rimLight, tCol);

      const ao = 0.1 + 0.9 * Math.pow(t, 0.5); // Deep shadows in the center

      petals.push({ t, yaw, radius, yOffset, basePitch, scale, baseCol, tipCol, rimCol, ao });
    }

    return { v, petals };
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, theme.bgTop);
    bgGrad.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const focalLength = 6000;
    const camZ = -6000;
    const CX = width / 2;
    const CY = height / 2 + 100; // Adjusted for new scale
    
    const globalYaw = u * TAU; 
    const camPitch = -0.65; // Looking steeply DOWN into the core

    const project = (p: any) => {
      const dz = p.z - camZ;
      if (dz < 1) return null;
      const s = focalLength / dz;
      return { x: CX + p.x * s, y: CY - p.y * s, z: p.z, s }; 
    };

    const lightDir = norm({ x: -0.5, y: 1, z: 0.8 }); // Soft studio top-light

    const renderList: any[] = [];

    geometry.petals.forEach(petal => {
      // Gentle breathing organic wave
      const wave = Math.sin(u * TAU - petal.radius * 0.005);
      const currentPitch = petal.basePitch + wave * 0.12;

      const worldVerts = geometry.v.map(vert => {
        const sv = { x: vert.x * petal.scale, y: vert.y * petal.scale, z: vert.z * petal.scale };
        const pv = rotate3D(sv, currentPitch, 0, 0);
        const mv = { x: pv.x, y: pv.y + petal.yOffset, z: pv.z + petal.radius };
        const yv = rotate3D(mv, 0, petal.yaw, 0);
        return rotate3D(yv, camPitch, globalYaw, 0);
      });

      const p0 = worldVerts[0]; // Base
      const p1 = worldVerts[1]; // Left
      const p2 = worldVerts[2]; // Right
      const p3 = worldVerts[3]; // Tip

      // Calculate Normal for 3D Lighting
      const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
      const vx = p3.x - p0.x, vy = p3.y - p0.y, vz = p3.z - p0.z;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz);
      if (nlen > 0) { nx /= nlen; ny /= nlen; nz /= nlen; }

      // View vector
      const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
      const cy = (p0.y + p1.y + p2.y + p3.y) / 4;
      const cz = (p0.z + p1.z + p2.z + p3.z) / 4;
      
      const vCamX = CX - cx, vCamY = CY - cy, vCamZ = camZ - cz;
      const dotCam = nx * vCamX + ny * vCamY + nz * vCamZ;
      
      // Because we are drawing flat planes, we must render BOTH sides (inside and outside of the flower).
      // We flip the normal if we are looking at the back face so lighting still works.
      const isBackFace = dotCam < 0;
      const effNx = isBackFace ? -nx : nx;
      const effNy = isBackFace ? -ny : ny;
      const effNz = isBackFace ? -nz : nz;

      // Soft Lighting using effective normals
      const d1 = Math.max(0, effNx * lightDir.x + effNy * lightDir.y + effNz * lightDir.z);
      
      // Make the outside (back faces) slightly darker to enhance the 3D volume
      const backFaceShadow = isBackFace ? 0.75 : 1.0;
      const intensity = Math.min(1, (0.4 + d1 * 0.6) * petal.ao * backFaceShadow);

      const rB = Math.floor(petal.baseCol.r * intensity);
      const gB = Math.floor(petal.baseCol.g * intensity);
      const bB = Math.floor(petal.baseCol.b * intensity);

      const rT = Math.floor(petal.tipCol.r * intensity);
      const gT = Math.floor(petal.tipCol.g * intensity);
      const bT = Math.floor(petal.tipCol.b * intensity);

      const rR = Math.floor(petal.rimCol.r * intensity);
      const gR = Math.floor(petal.rimCol.g * intensity);
      const bR = Math.floor(petal.rimCol.b * intensity);

      renderList.push({
        z: cz,
        colorBase: `rgb(${rB},${gB},${bB})`,
        colorTip: `rgb(${rT},${gT},${bT})`,
        colorRim: `rgb(${rR},${gR},${bR})`,
        verts: worldVerts
      });
    });

    renderList.sort((a, b) => b.z - a.z);

    renderList.forEach(item => {
      const pBase = project(item.verts[0]);
      const pLeft = project(item.verts[1]);
      const pRight = project(item.verts[2]);
      const pTip = project(item.verts[3]);
      
      if (pBase && pLeft && pRight && pTip) {
        // Gradient from base to tip gives huge 3D depth to the flat bezier
        const grad = ctx.createLinearGradient(pBase.x, pBase.y, pTip.x, pTip.y);
        grad.addColorStop(0, item.colorBase);
        grad.addColorStop(1, item.colorTip);

        ctx.beginPath();
        ctx.moveTo(pBase.x, pBase.y);
        // Smooth spoon/petal curve via quadratic controls
        ctx.quadraticCurveTo(pLeft.x, pLeft.y, pTip.x, pTip.y);
        ctx.quadraticCurveTo(pRight.x, pRight.y, pBase.x, pBase.y);
        ctx.closePath();
        
        ctx.fillStyle = grad;
        ctx.fill();

        // Velvet Rim Highlight (Stroke)
        ctx.strokeStyle = item.colorRim;
        ctx.lineWidth = Math.max(0.5, 6.0 * pTip.s); // Scales perfectly in distance
        ctx.stroke();
      }
    });

  }, [frame, width, height, u, theme, geometry]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: theme.bgTop }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

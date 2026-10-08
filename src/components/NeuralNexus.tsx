import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * NeuralNexus — A majestic 3D neural network cloud floating over a metallic gear podium.
 * Features a perfectly seamless loop, depth-sorted nodes and edges,
 * and a premium pastel/synthwave aesthetic.
 * Grid floor removed as requested.
 */

export type NeuralScheme = 'neon' | 'cyber' | 'aurora';

interface NeuralNexusProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: NeuralScheme;
}

const PALS = {
  neon: {
    bg: ['#1A103C', '#0A0515'],
    podium: { top: '#7A8C9E', sideLight: '#5A6C7E', sideDark: '#2A3C4E' },
    nodes: ['#FFA6C9', '#A6C9FF', '#FFD1A6', '#FFFFFF'],
    edges: 'rgba(180, 180, 255, 0.6)'
  },
  cyber: {
    bg: ['#0A1A25', '#020A10'],
    podium: { top: '#4A5A6A', sideLight: '#3A4A5A', sideDark: '#1A2A3A' },
    nodes: ['#00FF9D', '#00B8FF', '#B800FF', '#FFFFFF'],
    edges: 'rgba(100, 255, 200, 0.5)'
  },
  aurora: {
    bg: ['#051510', '#020A05'],
    podium: { top: '#6A7A6A', sideLight: '#4A5A4A', sideDark: '#2A3A2A' },
    nodes: ['#B7FF00', '#00FF88', '#0088FF', '#FFFFFF'],
    edges: 'rgba(150, 255, 150, 0.5)'
  }
};

const TAU = Math.PI * 2;

const createRandom = (seed: number) => () => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const NeuralNexus: React.FC<NeuralNexusProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'neon'
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = PALS[scheme];
  
  const u = (frame / totalFrames) * speed;

  const { nodes, edges, podiumPts } = useMemo(() => {
    const rand = createRandom(1337);
    
    // Abstract chunky neural cloud volume
    const isInsideVolume = (x: number, y: number, z: number) => {
      // Cleft
      if (Math.abs(x) < 0.08 && y < 0.2) return false;
      
      // 1. Main top volume
      if (x**2 + (y+0.1)**2 + z**2 < 0.82**2) return true;
      // 2. Front lobe
      if (x**2 + (y-0.3)**2 + (z+0.4)**2 < 0.58**2) return true;
      // 3. Back lobe
      if (x**2 + (y-0.4)**2 + (z-0.5)**2 < 0.58**2) return true;
      
      return false;
    };

    // 1. Neural Nodes
    const n = [];
    while (n.length < 750) { 
      const x = (rand() - 0.5) * 2;
      const y = (rand() - 0.5) * 2;
      const z = (rand() - 0.5) * 2;
      
      if (isInsideVolume(x, y, z)) {
        n.push({
          x: x * 480,          
          y: y * 450 - 50,     
          z: z * 500,          
          color: pal.nodes[Math.floor(rand() * pal.nodes.length)],
          size: rand() > 0.95 ? rand() * 12 + 6 : rand() * 4 + 2 
        });
      }
    }

    // 2. Edges (Neural wireframe)
    const e = [];
    for (let i = 0; i < n.length; i++) {
      let connections = 0;
      for (let j = i + 1; j < n.length; j++) {
        const dx = n[i].x - n[j].x;
        const dy = n[i].y - n[j].y;
        const dz = n[i].z - n[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < 125 && connections < 7) { 
          e.push({ i, j });
          connections++;
        }
      }
    }

    // 3. Podium Gear Points
    const pPts = [];
    const teeth = 8;
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * TAU;
      const r = 350 + Math.sin(angle * teeth) * 35; 
      pPts.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });
    }

    return { nodes: n, edges: e, podiumPts: pPts };
  }, [pal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- SETUP ---
    ctx.clearRect(0, 0, width, height);
    
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, pal.bg[1]);
    bgGrad.addColorStop(1, pal.bg[0]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // --- CAMERA ENGINE ---
    const focalLength = 3500;
    const camZ = -2000;
    const CX = width / 2;
    const CY = height / 2 + 100; // Shift camera down slightly 

    function project(p: { x: number, y: number, z: number }) {
      const dz = p.z - camZ;
      if (dz < 10) return null;
      const scale = focalLength / dz;
      return {
        x: CX + p.x * scale,
        y: CY + p.y * scale,
        scale,
        z: p.z 
      };
    }

    // --- 1. METALLIC PODIUM ---
    const podiumYTop = 500;
    const podiumYBot = 750;
    
    const walls = [];
    for (let i = 0; i < podiumPts.length; i++) {
      const next = (i + 1) % podiumPts.length;
      const p1 = podiumPts[i];
      const p2 = podiumPts[next];
      
      const p1Top = project({ x: p1.x, y: podiumYTop, z: p1.z });
      const p2Top = project({ x: p2.x, y: podiumYTop, z: p2.z });
      const p1Bot = project({ x: p1.x, y: podiumYBot, z: p1.z });
      const p2Bot = project({ x: p2.x, y: podiumYBot, z: p2.z });
      
      if (!p1Top || !p2Top || !p1Bot || !p2Bot) continue;

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const normal = Math.atan2(dx, -dz);
      
      const light = Math.max(0, Math.cos(normal - (-Math.PI / 4)));
      
      const toCam = Math.atan2(p1.x, p1.z - camZ);
      if (Math.cos(normal - toCam) < -0.1) continue;

      walls.push({
        z: (p1Top.z + p2Top.z) / 2,
        draw: () => {
          ctx.beginPath();
          ctx.moveTo(p1Top.x, p1Top.y);
          ctx.lineTo(p2Top.x, p2Top.y);
          ctx.lineTo(p2Bot.x, p2Bot.y);
          ctx.lineTo(p1Bot.x, p1Bot.y);
          ctx.closePath();
          
          ctx.fillStyle = pal.podium.sideDark;
          ctx.fill();
          ctx.fillStyle = pal.podium.sideLight;
          ctx.globalAlpha = light;
          ctx.fill();
          ctx.globalAlpha = 1.0;

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; 
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    walls.sort((a, b) => b.z - a.z).forEach(w => w.draw());

    // Podium Top Cap
    ctx.beginPath();
    podiumPts.forEach((p, i) => {
      const proj = project({ x: p.x, y: podiumYTop, z: p.z });
      if (!proj) return;
      if (i === 0) ctx.moveTo(proj.x, proj.y);
      else ctx.lineTo(proj.x, proj.y);
    });
    ctx.closePath();
    ctx.fillStyle = pal.podium.top;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Central core glowing hole
    ctx.beginPath();
    podiumPts.forEach((p, i) => {
      const proj = project({ x: p.x * 0.35, y: podiumYTop, z: p.z * 0.35 });
      if (!proj) return;
      if (i === 0) ctx.moveTo(proj.x, proj.y);
      else ctx.lineTo(proj.x, proj.y);
    });
    ctx.closePath();
    ctx.fillStyle = pal.bg[1];
    ctx.fill();
    ctx.stroke();


    // --- 2. STEM / CONNECTION ---
    const stemTop = project({ x: 0, y: -100, z: 0 });
    const stemBot = project({ x: 0, y: podiumYTop, z: 0 });
    if (stemTop && stemBot) {
      ctx.beginPath();
      ctx.moveTo(stemTop.x, stemTop.y);
      ctx.lineTo(stemBot.x, stemBot.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = stemTop.scale * 6;
      ctx.stroke();
    }


    // --- 3. 3D NETWORK CLOUD ---
    const brainRotY = u * TAU; 
    
    const renderList: { z: number, draw: () => void }[] = [];

    const projectedNodes = nodes.map(n => {
      const rx = n.x * Math.cos(brainRotY) - n.z * Math.sin(brainRotY);
      const rz = n.x * Math.sin(brainRotY) + n.z * Math.cos(brainRotY);
      
      const p = project({ x: rx, y: n.y, z: rz });
      return { ...p, color: n.color, size: n.size };
    });

    projectedNodes.forEach(p => {
      if (!p) return;
      renderList.push({
        z: p.z,
        draw: () => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.scale * p.size, 0, TAU);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      });
    });

    edges.forEach(e => {
      const p1 = projectedNodes[e.i];
      const p2 = projectedNodes[e.j];
      if (!p1 || !p2) return;

      renderList.push({
        z: (p1.z + p2.z) / 2, 
        draw: () => {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = pal.edges;
          ctx.lineWidth = 1.0 * ((p1.scale + p2.scale) / 2);
          ctx.stroke();
        }
      });
    });

    renderList.sort((a, b) => b.z - a.z).forEach(item => item.draw());

  }, [frame, width, height, u, pal, nodes, edges, podiumPts]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: pal.bg[0] }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

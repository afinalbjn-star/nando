import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * PolyTunnel — Elegant pseudo-3D low-poly tunnel.
 * Replicates the provided reference: concentric chiseled rings, 
 * depth of field (via scaling), neon split lighting, and accordion zig-zag.
 */

export type PolyScheme = 'neon' | 'cyber' | 'plasma' | 'mono';

interface PolyTunnelProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: PolyScheme;
}

const PALS = {
  neon: { left: [255, 0, 80], right: [0, 200, 255] },     // Pink to Cyan (Reference)
  cyber: { left: [0, 255, 120], right: [180, 0, 255] },   // Green to Purple
  plasma: { left: [255, 100, 0], right: [0, 100, 255] },  // Orange to Blue
  mono: { left: [255, 255, 255], right: [100, 100, 100] } // White to Grey
};

const TAU = Math.PI * 2;

export const PolyTunnel: React.FC<PolyTunnelProps> = ({
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Deep black background
    ctx.fillStyle = '#020005';
    ctx.fillRect(0, 0, width, height);

    const SIDES = 12; // Dodecagon
    const RINGS = 40; 
    const CX = width / 2;
    const CY = height / 2;
    const loopCycles = 4; // Advance 4 rings per loop (ensures parity matches)

    // Gentle rotation over time to make the loop seamless
    const rot = u * (TAU / SIDES) * loopCycles;

    function getRing(i: number) {
      // z_index is the floating point depth
      const z_index = i - u * loopCycles;
      
      // Exponential scaling for infinite perspective zoom
      const r_base = width * 1.5 * Math.pow(0.85, z_index);
      
      // Accordion fold: even rings are peaks, odd rings are valleys
      const isEven = i % 2 === 0;
      const r = r_base * (isEven ? 1.0 : 0.88);

      const pts = [];
      for (let j = 0; j < SIDES; j++) {
        const theta = j * (TAU / SIDES) + rot;
        pts.push({
          x: CX + Math.cos(theta) * r,
          y: CY + Math.sin(theta) * r,
          theta: theta
        });
      }
      return pts;
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Draw from back to front (larger index = deeper = smaller radius)
    // Draw past 0 to ensure the camera passes *through* the front rings safely
    for (let i = RINGS; i >= -4; i--) {
      const outer = getRing(i);
      const inner = getRing(i + 1);

      const z_index = i - u * loopCycles;
      
      // Distance fading (Fog to hide the infinite convergence)
      // Completely visible until z=15, then fades to black at z=35
      const fog = Math.max(0, Math.min(1, (z_index - 15) / 20));
      
      // Proximity fade (so rings passing the camera don't clip harshly)
      const prox = Math.max(0, Math.min(1, (2 - z_index) / 3));

      for (let j = 0; j < SIDES; j++) {
        const nextJ = (j + 1) % SIDES;

        const p1 = outer[j];
        const p2 = outer[nextJ];
        const p3 = inner[nextJ];
        const p4 = inner[j];

        // Determine face lighting based on screen-space angle
        // Use p1.theta + half a segment to avoid the 360-to-0 average wrap-around bug
        const face_angle = p1.theta + (TAU / SIDES) / 2;
        let ang = (face_angle % TAU + TAU) % TAU;
        
        // Map left (PI) to 0, right (0) to 1
        const blend = (Math.cos(ang) + 1) / 2;

        let rC = pal.left[0] * (1 - blend) + pal.right[0] * blend;
        let gC = pal.left[1] * (1 - blend) + pal.right[1] * blend;
        let bC = pal.left[2] * (1 - blend) + pal.right[2] * blend;

        // Chiseled Shading
        // Accordion: Alternating inward/outward facing
        const z_shade = (i % 2 === 0) ? 1.0 : 0.35;
        // Facets: Alternating panels
        const facet_shade = (j % 2 === 0) ? 1.0 : 0.65;

        // Combine lighting
        let bright = z_shade * facet_shade;
        
        // Deepen shadows for more dramatic 3D pop
        bright = Math.pow(bright, 0.8);

        // Apply Fog & Proximity fade
        const visibility = (1 - fog) * (1 - prox);
        
        rC = Math.round(rC * bright * visibility);
        gC = Math.round(gC * bright * visibility);
        bC = Math.round(bC * bright * visibility);

        const color = `rgb(${rC}, ${gC}, ${bC})`;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();

        // Stroke with the exact same color to prevent 1px canvas anti-aliasing gaps
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Add a global radial gradient overlay for deep cinematic glow and vignette
    ctx.globalCompositeOperation = 'screen';
    const vignette = ctx.createRadialGradient(CX, CY, width * 0.1, CX, CY, width * 0.7);
    vignette.addColorStop(0, 'rgba(255, 0, 100, 0.15)'); // Center glow
    vignette.addColorStop(0.5, 'rgba(0, 50, 150, 0.05)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

  }, [frame, width, height, u, pal]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#000' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

import React, { useRef, useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

interface BinaryMatrixWaterfallProps {
  width?: number;
  height?: number;
  totalFrames?: number;
}

function seeded(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

// Pre-render a glyph sprite on an offscreen canvas
function createGlyphSprite(
  char: '0' | '1',
  fontSize: number,
  color: string,
  glowColor: string,
  glowBlur: number,
  blurPx: number = 0
): HTMLCanvasElement {
  const pad = Math.ceil(Math.max(glowBlur * 2, blurPx * 3) + 20);
  const w = Math.ceil(fontSize * 0.95 + pad * 2);
  const h = Math.ceil(fontSize * 1.55 + pad * 2);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (blurPx > 0) {
    ctx.filter = `blur(${blurPx}px)`;
  }

  // Draw tall, narrow digital matrix character
  ctx.save();
  ctx.translate(w * 0.5, h * 0.5);
  ctx.scale(0.85, 1.25); // Matrix proportions: tall & narrow

  ctx.font = `bold ${fontSize}px "Consolas", "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (glowBlur > 0) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }

  ctx.fillStyle = color;
  ctx.fillText(char, 0, 0);

  // Extra pass for white-hot head brilliance
  if (color === '#FFFFFF') {
    ctx.fillText(char, 0, 0);
  }

  ctx.restore();

  return canvas;
}

interface ColumnConfig {
  xPos: number; // exact horizontal pixel position
  tier: 'fg' | 'mid' | 'bg';
  charCount: number;
  rowSpacing: number;
  speedCycles: number; // integer cycles per 600 frames for 100% seamless loop
  leadCycles: number; // leader head speed
  trailLength: number;
  seed: number;
  opacity: number;
}

export const BinaryMatrixWaterfall: React.FC<BinaryMatrixWaterfallProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 600,
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const u = (frame / totalFrames) % 1.0;

  // Build sprite library once
  const sprites = useMemo(() => {
    if (typeof document === 'undefined') return null;

    return {
      // 1. Foreground giant bokeh blur sprites (matching left side of reference image)
      fg_0: createGlyphSprite('0', 165, '#34D399', '#10B981', 28, 7.5),
      fg_1: createGlyphSprite('1', 165, '#34D399', '#10B981', 28, 7.5),

      // 2. White-hot leader heads (midground)
      head_0: createGlyphSprite('0', 64, '#FFFFFF', '#34D399', 26, 0),
      head_1: createGlyphSprite('1', 64, '#FFFFFF', '#34D399', 26, 0),

      // 3. Vibrant neon emerald upper trail
      bright_0: createGlyphSprite('0', 64, '#34D399', '#10B981', 18, 0),
      bright_1: createGlyphSprite('1', 64, '#34D399', '#10B981', 18, 0),

      // 4. Emerald body stream
      body_0: createGlyphSprite('0', 64, '#10B981', '#059669', 9, 0),
      body_1: createGlyphSprite('1', 64, '#10B981', '#059669', 9, 0),

      // 5. Mint tail stream
      tail_0: createGlyphSprite('0', 64, '#059669', 'transparent', 0, 0),
      tail_1: createGlyphSprite('1', 64, '#059669', 'transparent', 0, 0),

      // 6. Dark pine ambient characters
      dim_0: createGlyphSprite('0', 64, '#047857', 'transparent', 0, 0),
      dim_1: createGlyphSprite('1', 64, '#047857', 'transparent', 0, 0),

      // 7. Background small streams
      bg_head_0: createGlyphSprite('0', 36, '#A7F3D0', '#10B981', 12, 0),
      bg_head_1: createGlyphSprite('1', 36, '#A7F3D0', '#10B981', 12, 0),
      bg_body_0: createGlyphSprite('0', 36, '#059669', '#047857', 5, 0),
      bg_body_1: createGlyphSprite('1', 36, '#059669', '#047857', 5, 0),
      bg_dim_0: createGlyphSprite('0', 36, '#064E3B', 'transparent', 0, 0),
      bg_dim_1: createGlyphSprite('1', 36, '#064E3B', 'transparent', 0, 0),
    };
  }, []);

  // Distinct column lanes with realistic non-overlapping layout
  const columns = useMemo<ColumnConfig[]>(() => {
    const list: ColumnConfig[] = [];
    const laneWidth = 62; // 62px per lane
    const numLanes = Math.floor(width / laneWidth);

    // Pick 2 specific lanes for the giant blurred foreground columns
    // One near left (x ~ 25% width), one near right (x ~ 80% width)
    const fgLane1 = Math.floor(numLanes * 0.24);
    const fgLane2 = Math.floor(numLanes * 0.82);

    for (let lane = 0; lane < numLanes; lane++) {
      const xPos = lane * laneWidth + laneWidth * 0.5;

      if (lane === fgLane1 || lane === fgLane2) {
        // Prominent foreground bokeh stream
        list.push({
          xPos,
          tier: 'fg',
          charCount: 36,
          rowSpacing: 185,
          speedCycles: lane === fgLane1 ? 1 : 2,
          leadCycles: lane === fgLane1 ? 2 : 3,
          trailLength: 16,
          seed: lane * 881 + 19,
          opacity: 0.88,
        });
        continue;
      }

      // Skip occasional lane for natural negative space rhythm
      const skipRand = seeded(lane * 17 + 3);
      if (skipRand < 0.14) continue;

      const isBg = seeded(lane * 23 + 7) > 0.65;
      const speedCycles = isBg
        ? 1 + Math.floor(seeded(lane * 29 + 11) * 2) // 1 to 2 cycles
        : 1 + Math.floor(seeded(lane * 31 + 13) * 3); // 1 to 3 cycles

      const leadCycles = speedCycles + 1 + Math.floor(seeded(lane * 37 + 17) * 2);
      const trailLength = isBg ? 10 + Math.floor(seeded(lane * 41 + 19) * 14) : 14 + Math.floor(seeded(lane * 43 + 23) * 20);

      list.push({
        xPos,
        tier: isBg ? 'bg' : 'mid',
        charCount: isBg ? 64 : 46,
        rowSpacing: isBg ? 52 : 86,
        speedCycles,
        leadCycles,
        trailLength,
        seed: lane * 313 + 47,
        opacity: isBg ? 0.52 : 0.96,
      });
    }

    // Sort: bg first, then mid, then fg on top
    return list.sort((a, b) => {
      const order = { bg: 0, mid: 1, fg: 2 };
      return order[a.tier] - order[b.tier];
    });
  }, [width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sprites) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pitch-black background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Subtle dark emerald radial ambient glow in center
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      140,
      width * 0.5,
      height * 0.5,
      width * 0.88
    );
    bgGrad.addColorStop(0, 'rgba(4, 36, 24, 0.38)');
    bgGrad.addColorStop(0.55, 'rgba(2, 18, 12, 0.18)');
    bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle camera parallax sway (100% seamless harmonic loop)
    const camAngle = u * Math.PI * 2;
    const camParallaxX = Math.sin(camAngle) * 26;

    for (const col of columns) {
      const isFg = col.tier === 'fg';
      const isBg = col.tier === 'bg';

      // Parallax shift based on layer depth
      const depthMul = isFg ? 1.7 : isBg ? 0.35 : 1.0;
      const xPixel = col.xPos + camParallaxX * depthMul;

      const totalColHeight = col.charCount * col.rowSpacing;

      // 100% seamless vertical loop progression
      const streamOffset = (u * col.speedCycles * totalColHeight) % totalColHeight;
      const leaderOffset = (u * col.leadCycles * totalColHeight) % totalColHeight;
      const leaderRow = Math.floor(leaderOffset / col.rowSpacing);

      ctx.save();
      ctx.globalAlpha = col.opacity;

      for (let r = 0; r < col.charCount; r++) {
        let yPixel = (r * col.rowSpacing + streamOffset) % totalColHeight;

        // Wrap around to handle the top edge entering seamlessly
        if (yPixel > totalColHeight - col.rowSpacing * 2) {
          yPixel -= totalColHeight;
        }

        // Only draw if visible
        if (yPixel < -col.rowSpacing || yPixel > height + col.rowSpacing) {
          continue;
        }

        // Deterministic character: 0 or 1
        // Stagger the flip time using row index to prevent global frame blink, while retaining 100% loop
        const flipCycles = 8;
        const staggeredU = (u + (r * 1.37) / col.charCount) % 1.0;
        const flipPhase = Math.floor(staggeredU * flipCycles);
        const charSeed = col.seed + r * 17 + (flipPhase % flipCycles) * 97;
        const isOne = seeded(charSeed) > 0.5;

        // Distance from descending leader head
        const distFromLeader = ((r - leaderRow) % col.charCount + col.charCount) % col.charCount;

        // Select sprite
        let sprite: HTMLCanvasElement;

        if (isFg) {
          sprite = isOne ? sprites.fg_1 : sprites.fg_0;
        } else if (isBg) {
          if (distFromLeader === 0) {
            sprite = isOne ? sprites.bg_head_1 : sprites.bg_head_0;
          } else if (distFromLeader < col.trailLength) {
            sprite = isOne ? sprites.bg_body_1 : sprites.bg_body_0;
          } else {
            sprite = isOne ? sprites.bg_dim_1 : sprites.bg_dim_0;
          }
        } else {
          // Midground tier
          if (distFromLeader === 0) {
            sprite = isOne ? sprites.head_1 : sprites.head_0;
          } else if (distFromLeader === 1 || distFromLeader === 2) {
            sprite = isOne ? sprites.bright_1 : sprites.bright_0;
          } else if (distFromLeader < col.trailLength) {
            const frac = distFromLeader / col.trailLength;
            if (frac < 0.6) {
              sprite = isOne ? sprites.body_1 : sprites.body_0;
            } else {
              sprite = isOne ? sprites.tail_1 : sprites.tail_0;
            }
          } else {
            const ambient = seeded(col.seed + r * 37);
            if (ambient > 0.88) {
              sprite = isOne ? sprites.bright_1 : sprites.bright_0;
            } else if (ambient > 0.5) {
              sprite = isOne ? sprites.body_1 : sprites.body_0;
            } else {
              sprite = isOne ? sprites.dim_1 : sprites.dim_0;
            }
          }
        }

        // Draw centered pre-rendered sprite
        ctx.drawImage(
          sprite,
          xPixel - sprite.width * 0.5,
          yPixel - sprite.height * 0.5
        );
      }

      ctx.restore();
    }
  }, [u, width, height, sprites, columns]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: '#020617' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame } from 'remotion';

export type PerforatedSheetScheme =
  | 'azure' | 'violet' | 'magenta' | 'emerald' | 'copper' | 'amber';

export type PerforatedSheetMotion = 'orbit' | 'rock';

interface PerforatedSheetProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: PerforatedSheetScheme;
  /** orbit = one full turn per loop. rock = a slow sway that also closes exactly. */
  motion?: PerforatedSheetMotion;
  /** Shifts the tunnel right so the left third stays clean for title overlays. */
  offsetX?: number;
}

interface Pal {
  bg0: string;
  bg1: string;
  key: string;
  fill: string;
  metal: string;
  metalRough: number;
  glow: string;
}

const PALETTES: Record<PerforatedSheetScheme, Pal> = {
  azure: {
    bg0: '#07293f', bg1: '#01050b',
    key: '#e2f5ff', fill: '#1f6796', metal: '#2f83bb', metalRough: 0.26, glow: '#54d4ff',
  },
  violet: {
    bg0: '#26155c', bg1: '#03020a',
    key: '#f1e9ff', fill: '#4f33a0', metal: '#6d4bc8', metalRough: 0.28, glow: '#9a78ff',
  },
  magenta: {
    bg0: '#3a0f36', bg1: '#0b0209',
    key: '#ffe6fb', fill: '#96165f', metal: '#c23b86', metalRough: 0.27, glow: '#ff5cc0',
  },
  emerald: {
    bg0: '#04332f', bg1: '#010909',
    key: '#dcfff9', fill: '#0f615c', metal: '#1a8e85', metalRough: 0.26, glow: '#3ce8d6',
  },
  copper: {
    bg0: '#3f1809', bg1: '#0b0402',
    key: '#fff0e2', fill: '#a44e1e', metal: '#c4702f', metalRough: 0.24, glow: '#ff9a45',
  },
  amber: {
    bg0: '#3d3008', bg1: '#0a0803',
    key: '#fffbe6', fill: '#9c7a12', metal: '#c9a52c', metalRough: 0.25, glow: '#ffd84a',
  },
};

const NS = 240;
const NV = 52;
const TAU = Math.PI * 2;

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};


/* A data tunnel, built as a helicoid patch rather than a swept ribbon.

   The earlier version swept a straight cross section along the spine, which
   cannot form a tube: a straight chord can never wrap a cylinder. Worse, the
   spine here recedes almost along Z while the reference vector was also Z, so
   cross(tangent, up) collapsed to zero and the whole frame degenerated. Writing
   the surface directly in cylindrical coordinates removes both problems: the
   cross section IS an arc, so the sheet genuinely wraps the axis. */
const A0 = 1.05;
const TWIST = 0.5;
const ARC_SPAN = 1.72;
const R0 = 400;
const R1 = 120;
const Z0 = -80;
const Z1 = -1700;

const radiusAt = (s: number) => R0 + Math.pow(s, 1.05) * R1;
const depthAt = (s: number) => Z0 + Math.pow(s, 1.1) * Z1;

const buildGeometry = (cellsU: number, cellsV: number) => {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const arc: number[] = [];
  let acc = 0;
  let prevZ = depthAt(0);

  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const R = radiusAt(s);
    const z = depthAt(s);
    acc += Math.abs(z - prevZ) + R * 0.14;
    prevZ = z;
    arc.push(acc);

    const base = A0 + s * TAU * TWIST;

    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1;
      const ang = base + v * ARC_SPAN;
      pos.push(Math.cos(ang) * R, Math.sin(ang) * R, z);
      uv.push(i / NS, j / NV);
    }
  }

  // u runs on length along the tunnel rather than on s, so the holes stay evenly
  // spaced instead of bunching where the twist runs fastest.
  const total = arc[arc.length - 1] || 1;
  for (let i = 0; i <= NS; i++) {
    for (let j = 0; j <= NV; j++) {
      uv[i * (NV + 1) + j * 2] = (arc[i] / total) * cellsU;
      uv[i * (NV + 1) + j * 2 + 1] = (j / NV) * cellsV;
    }
  }

  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j;
      const b = a + NV + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
};

/* Elliptical hole lattice in alpha. As the tunnel recedes, the mip chain averages
   the holes shut and the far field resolves into solid material by itself. */
const buildAlphaMap = (cells: number, radius: number) => {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  const step = size / cells;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      ctx.beginPath();
      ctx.ellipse(
        (i + 0.5) * step,
        (j + 0.5) * step,
        step * radius,
        step * radius * 0.8,
        0,
        0,
        TAU,
      );
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  return tex;
};

const buildGlowMap = () => {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
};

const Sheet: React.FC<{ pal: Pal; spin: number }> = ({ pal, spin }) => {
  const geo = useMemo(() => buildGeometry(11, 10), []);
  const alpha = useMemo(() => buildAlphaMap(4, 0.33), []);

  /* No shader patching here on purpose. An earlier version injected an aSolid
     vertex attribute to force the far field solid, which compiled to a broken
     shader and discarded every fragment. The mip chain already does the job on
     its own: once the holes fall below a pixel their average rises past
     alphaTest and the far field turns into solid metal, which is exactly the
     behaviour the reference has. */
  return (
    <group rotation={[0, 0, spin]}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color={pal.metal}
          metalness={0.52}
          roughness={pal.metalRough}
          alphaMap={alpha}
          alphaTest={0.34}
          side={THREE.DoubleSide}
          emissive={pal.fill}
          emissiveIntensity={0.45}
        />
      </mesh>
    </group>
  );
};

const PerforatedSheet: React.FC<PerforatedSheetProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'azure',
  motion = 'orbit', offsetX = 300,
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];
  const glowMap = useMemo(() => buildGlowMap(), []);

  /* Both motions close the loop exactly: orbit lands on 2*pi, rock is a
     symmetric sine. Fractional speeds would break that, so speed is only ever
     used as a whole number of turns. */
  const spin = motion === 'rock' ? Math.sin(TAU * u * speed) * 0.4 : TAU * u * speed;

  const farZ = depthAt(1);

  return (
    <div
      style={{
        width,
        height,
        // Bright pool on the right where the tunnel sits, clean dark field on
        // the left for the buyer to drop a title into.
        background: `radial-gradient(ellipse 62% 78% at 68% 50%, ${p.bg0} 0%, ${p.bg1} 68%)`,
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 1500], fov: 36, far: 9000, near: 1 }}
        gl={{ antialias: true, alpha: true }}
        flat
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.42} />
        <hemisphereLight args={['#a8dcff', '#020a14', 0.62]} />
        <directionalLight position={[-460, -560, 520]} intensity={2.3} color={p.key} />
        <directionalLight position={[520, 380, -180]} intensity={0.95} color={p.fill} />
        <pointLight position={[0, 0, -200]} intensity={2.4} color={p.glow} distance={1400} />

        <group position={[offsetX, 0, 0]}>
          <Sheet pal={p} spin={spin} />
          {/* Light source on the tunnel axis at the far end. */}
          <sprite position={[0, 0, farZ]} scale={[900, 900, 1]}>
            <spriteMaterial
              map={glowMap}
              color={p.glow}
              transparent
              opacity={0.44 + 0.1 * Math.sin(TAU * u * speed)}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </group>
      </ThreeCanvas>
    </div>
  );
};

export { PerforatedSheet };

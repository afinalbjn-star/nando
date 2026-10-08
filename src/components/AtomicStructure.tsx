import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useCurrentFrame } from 'remotion';

/**
 * AtomicStructure — true WebGL 3D atom (three.js via @remotion/three).
 * Real geometry, physically based glossy materials, environment reflections
 * on chrome orbit rings and real-time shadows.
 *
 * Seamless loop: every motion is driven by u = frame / totalFrames with
 * integer multiples of TAU, so frame 0 and frame totalFrames are identical.
 */

export type AtomScheme = 'classic' | 'neon' | 'gold';

interface AtomicStructureProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: AtomScheme;
}

interface Theme {
  background: string;
  nucleus: string;
  nucleusEmissive: string;
  electron: string;
  electronEmissive: string;
  ring: string;
  ringRoughness: number;
  envIntensity: number;
}

const SCHEMES: Record<AtomScheme, Theme> = {
  classic: {
    background: 'radial-gradient(circle at 50% 45%, #ffffff 0%, #eef2f7 55%, #d9e0ea 100%)',
    nucleus: '#d40d0d',
    nucleusEmissive: '#000000',
    electron: '#1e9be0',
    electronEmissive: '#000000',
    ring: '#d9dde3',
    ringRoughness: 0.18,
    envIntensity: 1.0,
  },
  neon: {
    background: 'radial-gradient(circle at 50% 45%, #1a0b33 0%, #0a0418 55%, #020007 100%)',
    nucleus: '#ff1f8f',
    nucleusEmissive: '#5a0030',
    electron: '#22f2ff',
    electronEmissive: '#0a8a99',
    ring: '#9aa7c7',
    ringRoughness: 0.12,
    envIntensity: 0.8,
  },
  gold: {
    background: 'radial-gradient(circle at 50% 45%, #2e2719 0%, #14100a 55%, #050402 100%)',
    nucleus: '#141414',
    nucleusEmissive: '#000000',
    electron: '#ffb81f',
    electronEmissive: '#2a1800',
    ring: '#f2c14e',
    ringRoughness: 0.15,
    envIntensity: 1.1,
  },
};

const TAU = Math.PI * 2;

const RING_R = 4;
const RING_TUBE = 0.075;
const NUCLEUS_R = 1.35;
const ELECTRON_R = 0.36;

/* Three rings evenly spaced around the view axis, each tipped so it reads as
   an ellipse, matching the classic atom icon. */
const RINGS = [0, 1, 2].map((i) => ({
  tilt: 1.2,                // tip towards the camera (radians around X)
  roll: (i * Math.PI) / 3,  // spread 60° apart around Z
  phase: (i * TAU) / 3,     // electrons start staggered
}));

/* Image-based lighting so chrome and glossy spheres get real reflections. */
const Environment: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }, [gl, scene]);
  return null;
};

const Atom: React.FC<{ u: number; theme: Theme }> = ({ u, theme }) => {
  const geo = useMemo(
    () => ({
      nucleus: new THREE.SphereGeometry(NUCLEUS_R, 128, 128),
      electron: new THREE.SphereGeometry(ELECTRON_R, 64, 64),
      ring: new THREE.TorusGeometry(RING_R, RING_TUBE, 48, 400),
    }),
    [],
  );

  const mat = useMemo(
    () => ({
      nucleus: new THREE.MeshPhysicalMaterial({
        color: theme.nucleus,
        emissive: theme.nucleusEmissive,
        roughness: 0.18,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: theme.envIntensity,
      }),
      electron: new THREE.MeshPhysicalMaterial({
        color: theme.electron,
        emissive: theme.electronEmissive,
        roughness: 0.15,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: theme.envIntensity,
      }),
      ring: new THREE.MeshStandardMaterial({
        color: theme.ring,
        metalness: 1,
        roughness: theme.ringRoughness,
        envMapIntensity: theme.envIntensity * 1.3,
      }),
    }),
    [theme],
  );

  // Global motion: one slow full turn per loop + gentle breathing tilt.
  const spinY = u * TAU;
  const tiltX = 0.22 * Math.sin(u * TAU);
  const tiltZ = 0.08 * Math.sin(u * TAU * 2);
  // Nucleus breathes very subtly.
  const pulse = 1 + 0.025 * Math.sin(u * TAU * 2);
  // Electrons: 2 full laps per loop (integer => seamless).
  const LAPS = 2;

  return (
    <group rotation={[tiltX, spinY, tiltZ]}>
      <mesh geometry={geo.nucleus} material={mat.nucleus} scale={pulse} castShadow receiveShadow />

      {RINGS.map((r, i) => {
        const a = r.phase + u * TAU * LAPS;
        return (
          // Roll around Z first, then tip around X (Euler order 'ZXY' via nesting)
          <group key={i} rotation={[0, 0, r.roll]}>
            <group rotation={[r.tilt, 0, 0]}>
              <mesh geometry={geo.ring} material={mat.ring} castShadow receiveShadow />
              {[0, Math.PI].map((off, k) => (
                <mesh
                  key={k}
                  geometry={geo.electron}
                  material={mat.electron}
                  position={[RING_R * Math.cos(a + off), RING_R * Math.sin(a + off), 0]}
                  castShadow
                  receiveShadow
                />
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
};

export const AtomicStructure: React.FC<AtomicStructureProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 240,
  speed = 1,
  scheme = 'classic',
}) => {
  const frame = useCurrentFrame();
  const theme = SCHEMES[scheme];
  // speed should be an integer to keep the loop seamless.
  const u = (frame / totalFrames) * Math.max(1, Math.round(speed));

  return (
    <div style={{ width, height, background: theme.background }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 0.6, 15], fov: 38, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Environment />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[-6, 9, 10]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-bias={-0.0004}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-camera-near={1}
          shadow-camera-far={40}
        />
        <pointLight position={[7, -4, 6]} intensity={30} color="#ffffff" />
        <Atom u={u} theme={theme} />
      </ThreeCanvas>
    </div>
  );
};

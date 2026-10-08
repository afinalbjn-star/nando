import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame } from 'remotion';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useThree } from '@react-three/fiber';

export type WaveLatticeScheme = 'olive' | 'cyber' | 'gold';

interface WaveLatticeProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: WaveLatticeScheme;
}

interface Theme {
  bg: string;
  color: string;
  roughness: number;
  metalness: number;
  light1: string;
  light2: string;
  envIntensity: number;
}

const THEMES: Record<WaveLatticeScheme, Theme> = {
  olive: {
    bg: '#0a0d12',
    color: '#848f72',
    roughness: 0.6,
    metalness: 0.2,
    light1: '#ffffff',
    light2: '#e6f0ff',
    envIntensity: 0.5,
  },
  cyber: {
    bg: '#02000a',
    color: '#00e5ff',
    roughness: 0.2,
    metalness: 0.8,
    light1: '#ff0055',
    light2: '#0055ff',
    envIntensity: 1.2,
  },
  gold: {
    bg: '#140a00',
    color: '#ffc400',
    roughness: 0.15,
    metalness: 0.9,
    light1: '#ffffff',
    light2: '#ff8800',
    envIntensity: 1.5,
  }
};

const TAU = Math.PI * 2;
const R = 1.0;
const r_inner = 0.82;
const DEPTH = 3.5;

const Environment: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }, [gl, scene]);
  return null;
};

const LatticeMesh: React.FC<{ u: number, theme: Theme }> = ({ u, theme }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // 1. Build the hexagonal tube geometry
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const hole = new THREE.Path();
    
    // Pointy-topped hexagon
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + Math.PI / 6;
      if (i === 0) {
        shape.moveTo(Math.cos(angle) * R, Math.sin(angle) * R);
        hole.moveTo(Math.cos(angle) * r_inner, Math.sin(angle) * r_inner);
      } else {
        shape.lineTo(Math.cos(angle) * R, Math.sin(angle) * R);
        hole.lineTo(Math.cos(angle) * r_inner, Math.sin(angle) * r_inner);
      }
    }
    shape.closePath();
    hole.closePath();
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 2,
    });
    geo.center(); // Center on origin so scaling/rotation is symmetric
    return geo;
  }, []);

  // 2. Precompute the grid layout (X, Z coordinates)
  const grid = useMemo(() => {
    const pts = [];
    const cols = 70;
    const rows = 60;
    const W = Math.sqrt(3) * R;
    const H = 2 * R;
    
    for (let row = -rows / 2; row < rows / 2; row++) {
      for (let col = -cols / 2; col < cols / 2; col++) {
        // Pointy-top hex grid math
        const x = col * W + (Math.abs(row) % 2 === 1 ? W / 2 : 0);
        const z = row * (H * 0.75);
        pts.push({ x, z });
      }
    }
    return pts;
  }, []);

  // 3. Animate the Y displacement on every frame
  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    // Lay the hexagon flat on the XZ plane
    dummy.rotation.x = Math.PI / 2;

    const angle = u * TAU;

    for (let i = 0; i < grid.length; i++) {
      const { x, z } = grid[i];
      const d = Math.sqrt(x * x + z * z);
      
      // Complex, seamlessly looping wave function
      const y1 = Math.sin(x * 0.12 + angle) * 3.0;
      const y2 = Math.sin(z * 0.15 - angle * 1.5) * 2.0;
      const y3 = Math.cos(d * 0.08 - angle) * 2.5;
      
      const y = y1 + y2 + y3;

      dummy.position.set(x, y, z);
      
      // Optional: Add a slight scale variation based on height
      const scaleBase = 0.95 + 0.05 * Math.sin(y * 0.5);
      dummy.scale.set(scaleBase, scaleBase, scaleBase);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [u, grid]);

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[geometry, undefined, grid.length]} 
      castShadow 
      receiveShadow
    >
      <meshStandardMaterial 
        color={theme.color} 
        roughness={theme.roughness}
        metalness={theme.metalness}
        envMapIntensity={theme.envIntensity}
      />
    </instancedMesh>
  );
};

export const WaveLattice: React.FC<WaveLatticeProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = 300,
  speed = 1,
  scheme = 'olive'
}) => {
  const frame = useCurrentFrame();
  const theme = THEMES[scheme];
  
  // speed must be integer to maintain perfect loop
  const u = (frame / totalFrames) * Math.max(1, Math.round(speed));

  return (
    <div style={{ width, height, backgroundColor: theme.bg }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 28, 45], fov: 38, near: 1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: theme.bg }}
      >
        <Environment />
        
        {/* Soft fill light */}
        <ambientLight intensity={0.5} color={theme.light2} />
        
        {/* Main key light casting deep shadows */}
        <directionalLight 
          position={[-20, 40, 20]} 
          intensity={3.5} 
          color={theme.light1}
          castShadow 
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-camera-near={10}
          shadow-camera-far={120}
          shadow-bias={-0.001}
        />
        
        {/* Rim/Accent light */}
        <pointLight position={[30, 10, -30]} intensity={4.0} color={theme.light2} />
        
        <LatticeMesh u={u} theme={theme} />
        
        {/* Add subtle fog to fade out the edges gracefully */}
        <fog attach="fog" args={[theme.bg, 60, 110]} />
      </ThreeCanvas>
    </div>
  );
};

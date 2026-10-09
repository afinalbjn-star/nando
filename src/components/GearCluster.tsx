import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame } from 'remotion';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useThree } from '@react-three/fiber';

/**
 * GearCluster — an elegant, interlocking 3D mechanical gear system.
 * Generates involute-style spur gears with procedural spokes and meshes them perfectly.
 */

const MODULE = 0.25; // Scale of the teeth
const TOOTH_DEPTH = MODULE * 1.25;
const TAU = Math.PI * 2;

interface GearDef {
  id: number;
  t: number;      // teeth
  s: number;      // spokes
  x: number;
  y: number;
  z: number;
  ratio: number;  // gear ratio relative to master (id 0)
  phase: number;  // rotational offset for meshing
}

// Procedural Gear Shape Generator
const buildGearShape = (teeth: number, spokes: number) => {
  const R = teeth * MODULE;
  const rOuter = R + MODULE;
  const rRoot = R - TOOTH_DEPTH;
  const pitch = TAU / teeth;
  const shape = new THREE.Shape();

  // Draw outer teeth
  for (let i = 0; i < teeth; i++) {
    const a0 = i * pitch - pitch * 0.25;
    const a1 = i * pitch - pitch * 0.08;
    const a2 = i * pitch + pitch * 0.08;
    const a3 = i * pitch + pitch * 0.25;

    if (i === 0) shape.moveTo(Math.cos(a0) * rRoot, Math.sin(a0) * rRoot);
    else shape.lineTo(Math.cos(a0) * rRoot, Math.sin(a0) * rRoot);

    shape.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
    shape.lineTo(Math.cos(a2) * rOuter, Math.sin(a2) * rOuter);
    shape.lineTo(Math.cos(a3) * rRoot, Math.sin(a3) * rRoot);
  }
  shape.closePath();

  // Center hole for shaft
  const shaftHole = new THREE.Path();
  shaftHole.moveTo(MODULE * 2.5, 0);
  shaftHole.absarc(0, 0, MODULE * 2.5, 0, TAU, true);
  shape.holes.push(shaftHole);

  // Spoke cutouts
  if (spokes > 0) {
    const hubR = MODULE * 4.5;
    const rimR = rRoot - MODULE * 2.5;
    
    if (rimR > hubR + MODULE) {
      const spokeAngle = TAU / spokes;
      const gapAngle = spokeAngle * 0.65; // 65% empty, 35% solid spoke
      
      for (let s = 0; s < spokes; s++) {
        const startA = s * spokeAngle + (spokeAngle - gapAngle) / 2;
        const endA = startA + gapAngle;

        const wedge = new THREE.Path();
        wedge.moveTo(Math.cos(startA) * hubR, Math.sin(startA) * hubR);
        wedge.absarc(0, 0, hubR, startA, endA, false); // CCW on inner hub
        wedge.lineTo(Math.cos(endA) * rimR, Math.sin(endA) * rimR);
        wedge.absarc(0, 0, rimR, endA, startA, true);  // CW on outer rim
        wedge.lineTo(Math.cos(startA) * hubR, Math.sin(startA) * hubR);
        shape.holes.push(wedge);
      }
    }
  }

  return shape;
};

// Gear Train Layout Planner
const getGearSetup = (): GearDef[] => {
  const g: GearDef[] = [];
  const add = (id: number, t: number, s: number, x: number, y: number, z: number, ratio: number, phase: number) => {
    g.push({ id, t, s, x, y, z, ratio, phase });
  };

  // G0: Master gear
  add(0, 36, 6, 0, 0, 0, 1, 0);

  // G1: Meshes with G0 at 0 degrees
  const d1 = (36 + 18) * MODULE; // 13.5
  add(1, 18, 0, d1, 0, 0, -2, 0.08);

  // G2: Stacked on G1
  add(2, 36, 6, d1, 0, 1.2, -2, 0);

  // G3: Meshes with G2 at 120 degrees
  const d3 = (36 + 18) * MODULE; // 13.5
  const x3 = d1 + d3 * Math.cos(TAU / 3);
  const y3 = d3 * Math.sin(TAU / 3);
  add(3, 18, 0, x3, y3, 1.2, 4, 0.08);

  // G4: Stacked on G3
  add(4, 24, 4, x3, y3, 2.4, 4, 0);

  // G5: Meshes with G0 at 210 degrees
  const d5 = (36 + 12) * MODULE; // 12.0
  const a5 = 210 * Math.PI / 180;
  const x5 = 12.0 * Math.cos(a5);
  const y5 = 12.0 * Math.sin(a5);
  add(5, 12, 0, x5, y5, 0, -3, 0.12);

  // G6: Stacked on G5
  add(6, 24, 4, x5, y5, -1.2, -3, 0);

  // G7: Meshes with G6 at 150 degrees
  const d7 = (24 + 12) * MODULE; // 9.0
  const a7 = 150 * Math.PI / 180;
  const x7 = x5 + 9.0 * Math.cos(a7);
  const y7 = y5 + 9.0 * Math.sin(a7);
  add(7, 12, 0, x7, y7, -1.2, 6, 0.12);

  return g;
};

const EnvironmentMap: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }, [gl, scene]);
  return null;
};

const SingleGear: React.FC<{ def: GearDef; u: number }> = ({ def, u }) => {
  const geo = useMemo(() => {
    const shape = buildGearShape(def.t, def.s);
    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.6,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 3,
    });
    extrudeGeo.center(); // Center on Z axis
    return extrudeGeo;
  }, [def.t, def.s]);

  // Global loop: master rotates full 360 deg (TAU). All gear ratios are integers, so it perfectly loops.
  const rotationZ = u * TAU * def.ratio + def.phase;

  return (
    <mesh position={[def.x, def.y, def.z]} rotation={[0, 0, rotationZ]} castShadow receiveShadow>
      <primitive object={geo} attach="geometry" />
      <meshPhysicalMaterial 
        color="#3d4043" 
        metalness={0.9} 
        roughness={0.35} 
        clearcoat={0.3} 
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
};

export const GearCluster: React.FC<{ width?: number; height?: number; totalFrames?: number; speed?: number }> = ({
  width = 3840,
  height = 2160,
  totalFrames = 300,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) * Math.max(1, Math.round(speed));
  const gears = useMemo(() => getGearSetup(), []);

  // Extract unique shaft positions
  const shafts = useMemo(() => {
    const map = new Map<string, {x: number, y: number, zMin: number, zMax: number}>();
    gears.forEach(g => {
      const key = `${g.x.toFixed(2)}_${g.y.toFixed(2)}`;
      if (!map.has(key)) {
        map.set(key, { x: g.x, y: g.y, zMin: g.z, zMax: g.z });
      } else {
        const s = map.get(key)!;
        s.zMin = Math.min(s.zMin, g.z);
        s.zMax = Math.max(s.zMax, g.z);
      }
    });
    return Array.from(map.values()).map(s => ({
      x: s.x, 
      y: s.y, 
      z: (s.zMax + s.zMin) / 2, 
      len: Math.max(2.0, (s.zMax - s.zMin) + 1.2)
    }));
  }, [gears]);

  const shaftGeo = useMemo(() => new THREE.CylinderGeometry(MODULE * 2.4, MODULE * 2.4, 1, 32), []);
  const shaftMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#222', metalness: 0.8, roughness: 0.5 }), []);

  // Elegant camera tilt/breathing motion (seamlessly looping)
  const tiltX = Math.sin(u * TAU) * 0.15 - 0.2;
  const tiltY = Math.cos(u * TAU) * 0.15;

  return (
    <div style={{ width, height, backgroundColor: '#0a0a0c' }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, -15, 30], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0a0c' }}
      >
        <EnvironmentMap />
        
        <ambientLight intensity={0.5} color="#ffffff" />
        <directionalLight position={[10, 20, 30]} intensity={2.0} color="#e0f0ff" castShadow shadow-bias={-0.001} />
        <directionalLight position={[-20, -10, -20]} intensity={1.5} color="#ffeedd" />
        <pointLight position={[0, 0, 15]} intensity={1.0} color="#ffffff" />

        <group rotation={[tiltX, tiltY, 0]}>
          {/* Shift the entire cluster to center it in the view */}
          <group position={[-2, 0, 0]}>
            {gears.map((g) => (
              <SingleGear key={g.id} def={g} u={u} />
            ))}
            
            {shafts.map((s, i) => (
              <mesh 
                key={`shaft_${i}`} 
                position={[s.x, s.y, s.z]} 
                rotation={[Math.PI / 2, 0, 0]} 
                geometry={shaftGeo} 
                material={shaftMat}
                scale={[1, s.len, 1]}
                castShadow
              />
            ))}
          </group>
        </group>
      </ThreeCanvas>
    </div>
  );
};

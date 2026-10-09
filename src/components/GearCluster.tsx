import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame } from 'remotion';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useThree } from '@react-three/fiber';

/**
 * GearCluster — an elegant, interlocking 3D mechanical gear system.
 * Updated: Much more complex (16 gears, multiple branches) and thicker gears.
 */

const MODULE = 0.25; 
const TOOTH_DEPTH = MODULE * 1.25;
const GEAR_DEPTH = 1.4; // Thicker gears!
const TAU = Math.PI * 2;

interface GearDef {
  id: number;
  t: number;      
  s: number;      
  x: number;
  y: number;
  z: number;
  ratio: number;  
  phase: number;  
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
  shaftHole.moveTo(MODULE * 3.0, 0);
  shaftHole.absarc(0, 0, MODULE * 3.0, 0, TAU, true);
  shape.holes.push(shaftHole);

  // Spoke cutouts
  if (spokes > 0) {
    const hubR = MODULE * 5.5;
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
  
  const pushG = (id: number, t: number, s: number, x: number, y: number, z: number, ratio: number, phase: number) => {
    g.push({ id, t, s, x, y, z, ratio, phase });
  };

  const meshGear = (id: number, pid: number, t: number, s: number, angleDeg: number, z: number, phaseAdjust: number) => {
    const p = g.find(gear => gear.id === pid)!;
    const dist = (p.t + t) * MODULE;
    const angle = angleDeg * Math.PI / 180;
    const x = p.x + Math.cos(angle) * dist;
    const y = p.y + Math.sin(angle) * dist;
    const ratio = p.ratio * (-p.t / t);
    g.push({ id, t, s, x, y, z, ratio, phase: phaseAdjust });
  };

  const stackGear = (id: number, pid: number, t: number, s: number, zOffset: number) => {
    const p = g.find(gear => gear.id === pid)!;
    const z = p.z + zOffset;
    g.push({ id, t, s, x: p.x, y: p.y, z, ratio: p.ratio, phase: 0 });
  };

  // Build a massive, deeply interconnected cluster
  const Z_STEP = 1.8; // Z offset for stacked gears

  // G0: Master gear
  pushG(0, 48, 8, 0, 0, 0, 1, 0);

  // --- Branch 1 (Right Side) ---
  meshGear(1, 0, 18, 0, 0, 0, 0.1); 
  stackGear(2, 1, 36, 6, Z_STEP);
  meshGear(3, 2, 24, 4, 120, Z_STEP, 0.05);
  stackGear(4, 3, 12, 0, Z_STEP * 2);
  meshGear(5, 4, 30, 5, -30, Z_STEP * 2, 0.08);

  // --- Branch 2 (Top Left Side) ---
  meshGear(6, 0, 24, 4, 135, 0, 0.05);
  stackGear(7, 6, 12, 0, -Z_STEP);
  meshGear(8, 7, 36, 6, 180, -Z_STEP, 0.1);
  stackGear(9, 8, 24, 3, -Z_STEP * 2); // 3 spokes strictly required to mathematically loop perfectly
  meshGear(10, 9, 15, 0, 90, -Z_STEP * 2, 0.1);

  // --- Branch 3 (Bottom Left Side) ---
  meshGear(11, 0, 15, 0, 240, 0, 0.1);
  stackGear(12, 11, 30, 5, Z_STEP);
  meshGear(13, 12, 48, 8, 280, Z_STEP, 0.03); 
  stackGear(14, 13, 18, 0, -Z_STEP);
  meshGear(15, 14, 24, 4, 210, -Z_STEP, 0.08);

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
      depth: GEAR_DEPTH,
      bevelEnabled: true,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      bevelSegments: 4,
    });
    extrudeGeo.center(); // Center on Z axis
    return extrudeGeo;
  }, [def.t, def.s]);

  // Determine material color tint based on gear ID to add visual richness
  const color = useMemo(() => {
    if (def.id % 4 === 1) return '#5e636b'; // Light Silver
    if (def.id % 4 === 2) return '#474036'; // Brassy/Bronze
    if (def.id % 4 === 3) return '#2a2c30'; // Dark Iron
    return '#3f4246'; // Standard Gunmetal
  }, [def.id]);

  // Global loop: master rotates full 360 deg (TAU). 
  // All math constraints strictly ensure every single gear is in identical visual position at u=1.
  const rotationZ = u * TAU * def.ratio + def.phase;

  return (
    <mesh position={[def.x, def.y, def.z]} rotation={[0, 0, rotationZ]} castShadow receiveShadow>
      <primitive object={geo} attach="geometry" />
      <meshPhysicalMaterial 
        color={color} 
        metalness={0.85} 
        roughness={0.25} 
        clearcoat={0.3} 
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
};

export const GearCluster: React.FC<{ width?: number; height?: number; totalFrames?: number; speed?: number }> = ({
  width = 3840,
  height = 2160,
  totalFrames = 480, // Slower default to appreciate the complexity
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
      len: Math.max(2.0, (s.zMax - s.zMin) + GEAR_DEPTH + 1.2)
    }));
  }, [gears]);

  const shaftGeo = useMemo(() => new THREE.CylinderGeometry(MODULE * 2.8, MODULE * 2.8, 1, 32), []);
  const shaftMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#111', metalness: 0.9, roughness: 0.3 }), []);

  // Elegant camera tilt/breathing motion (seamlessly looping)
  const tiltX = Math.sin(u * TAU) * 0.12 - 0.25;
  const tiltY = Math.cos(u * TAU) * 0.15;

  return (
    <div style={{ width, height, backgroundColor: '#060608' }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, -30, 58], fov: 42, near: 1, far: 250 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#060608' }}
      >
        <EnvironmentMap />
        
        <ambientLight intensity={0.6} color="#ffffff" />
        <directionalLight position={[15, 30, 40]} intensity={2.5} color="#dbeaff" castShadow shadow-bias={-0.002} />
        <directionalLight position={[-25, -15, -25]} intensity={1.5} color="#ffeedd" />
        <pointLight position={[0, 0, 20]} intensity={1.5} color="#ffffff" />

        <group rotation={[tiltX, tiltY, 0]}>
          {/* Shift the entire massive cluster to center it perfectly in the view */}
          <group position={[-2, 2, 0]}>
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

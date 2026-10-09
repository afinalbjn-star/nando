import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame } from 'remotion';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useThree } from '@react-three/fiber';

/**
 * GearCluster — an elegant, interlocking 3D mechanical gear system.
 * Updated: MASSIVE Full-Screen generative web of gears. Over 200 gears!
 */

const MODULE = 0.2; 
const TOOTH_DEPTH = MODULE * 1.25;
const GEAR_DEPTH = 2.5; // Much thicker gears
const TAU = Math.PI * 2;

// Guaranteed perfectly looping gear templates (LCM = 120 teeth)
const TEMPLATES = [
  { t: 80, s: 6 }, 
  { t: 60, s: 5 }, 
  { t: 60, s: 5 }, 
  { t: 48, s: 4 }, 
  { t: 48, s: 4 }, 
  { t: 40, s: 5 }, 
  { t: 40, s: 5 }, 
  { t: 30, s: 5 }, 
  { t: 30, s: 5 }, 
  { t: 24, s: 4 }, 
  { t: 24, s: 4 }, 
  { t: 20, s: 4 }, 
  { t: 20, s: 4 }, 
  { t: 15, s: 3 }, 
  { t: 15, s: 3 }, 
  { t: 12, s: 0 },
  { t: 12, s: 0 }
];

interface GearDef {
  id: number;
  t: number;      
  s: number;      
  x: number;
  y: number;
  z: number;
  speed: number;  
  phase: number;  
  color: string;
}

// Simple deterministic PRNG
function sfc32(a: number, b: number, c: number, d: number) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
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
    const hubR = MODULE * 5.0;
    const rimR = rRoot - MODULE * 2.2;
    
    if (rimR > hubR + MODULE) {
      const spokeAngle = TAU / spokes;
      const gapAngle = spokeAngle * 0.65;
      
      for (let s = 0; s < spokes; s++) {
        const startA = s * spokeAngle + (spokeAngle - gapAngle) / 2;
        const endA = startA + gapAngle;

        const wedge = new THREE.Path();
        wedge.moveTo(Math.cos(startA) * hubR, Math.sin(startA) * hubR);
        wedge.absarc(0, 0, hubR, startA, endA, false); 
        wedge.lineTo(Math.cos(endA) * rimR, Math.sin(endA) * rimR);
        wedge.absarc(0, 0, rimR, endA, startA, true);  
        wedge.lineTo(Math.cos(startA) * hubR, Math.sin(startA) * hubR);
        shape.holes.push(wedge);
      }
    }
  }
  return shape;
};

// Generates a massive non-overlapping tree of meshed gears
const generateWeb = (seed: number, zBase: number, count: number, boundsX: number, boundsY: number): GearDef[] => {
  const rand = sfc32(seed, seed + 1, seed + 2, seed + 3);
  const gears: GearDef[] = [];
  const queue: GearDef[] = [];
  
  const mTemplate = TEMPLATES[0]; // Start with biggest gear
  gears.push({
    id: seed * 1000,
    t: mTemplate.t, s: mTemplate.s,
    x: rand() * 40 - 20, y: rand() * 40 - 20, 
    z: zBase,
    speed: 120 / mTemplate.t,
    phase: 0,
    color: '#3d4043'
  });
  queue.push(gears[0]);

  let idCounter = 1;
  const colors = ['#5e636b', '#474036', '#2a2c30', '#3f4246', '#505358'];

  while (queue.length > 0 && gears.length < count) {
    const P = queue.shift()!;
    const spawnCount = Math.floor(rand() * 3) + 2; 
    
    let spawned = 0;
    for (let attempt = 0; attempt < 80 && spawned < spawnCount; attempt++) {
      if (gears.length >= count) break;
      
      const T = TEMPLATES[Math.floor(rand() * TEMPLATES.length)];
      // Snap angles to 45 degree increments for a very neat, organized machine look
      const angle = Math.floor(rand() * 8) * (Math.PI / 4);
      const dist = (P.t + T.t) * MODULE;
      const nx = P.x + Math.cos(angle) * dist;
      const ny = P.y + Math.sin(angle) * dist;
      
      if (Math.abs(nx) > boundsX || Math.abs(ny) > boundsY) continue;
      
      let collision = false;
      for (const E of gears) {
        if (E.id === P.id) continue;
        const d = Math.hypot(E.x - nx, E.y - ny);
        const req = (E.t + T.t) * MODULE;
        if (d < req + 0.8) { 
          collision = true;
          break;
        }
      }
      
      if (!collision) {
        const ratio = -P.t / T.t;
        const phase = P.phase * ratio + angle * (1 - ratio) + Math.PI / T.t;
        const speed = P.speed * ratio; 
        
        const newGear = {
          id: seed * 1000 + idCounter++,
          t: T.t, s: T.s,
          x: nx, y: ny,
          z: zBase,
          speed,
          phase,
          color: colors[Math.floor(rand() * colors.length)]
        };
        gears.push(newGear);
        queue.push(newGear);
        spawned++;
      }
    }
  }
  return gears;
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

const SingleGear: React.FC<{ def: GearDef; u: number; geo: THREE.ExtrudeGeometry }> = ({ def, u, geo }) => {
  const rotationZ = u * TAU * def.speed + def.phase;

  return (
    <mesh position={[def.x, def.y, def.z]} rotation={[0, 0, rotationZ]} castShadow receiveShadow>
      <primitive object={geo} attach="geometry" />
      <meshPhysicalMaterial 
        color={def.color} 
        metalness={0.9} 
        roughness={0.25} 
        clearcoat={0.4} 
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
};

export const GearCluster: React.FC<{ width?: number; height?: number; totalFrames?: number; speed?: number }> = ({
  width = 3840,
  height = 2160,
  totalFrames = 600, // Slower, elegant, massive loop
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) * Math.max(1, Math.round(speed));

  // Generate 3 massive independent layers of gears filling the screen
  const allGears = useMemo(() => {
    // Generate massive dense webs
    const layer1 = generateWeb(101, -12, 120, 110, 70);
    const layer2 = generateWeb(202, 0, 150, 110, 70);
    const layer3 = generateWeb(303, 12, 100, 110, 70);
    return [...layer1, ...layer2, ...layer3];
  }, []);

  // Pre-compute and share geometries for massive performance boost
  const geometries = useMemo(() => {
    const dict: Record<string, THREE.ExtrudeGeometry> = {};
    TEMPLATES.forEach(t => {
      const shape = buildGearShape(t.t, t.s);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: GEAR_DEPTH,
        bevelEnabled: true,
        bevelSize: 0.08,
        bevelThickness: 0.08,
        bevelSegments: 1, // Optimized for 200+ instances
      });
      geo.center(); 
      dict[`${t.t}_${t.s}`] = geo;
    });
    return dict;
  }, []);

  // Extract shafts that span across the layers for a unified machine look
  const shafts = useMemo(() => {
    return allGears.map(g => ({
      x: g.x, 
      y: g.y, 
      z: 0, // centered
      len: 32 + (Math.random() * 8) // spanning from z=-15 to z=15 approx
    }));
  }, [allGears]);

  const shaftGeo = useMemo(() => new THREE.CylinderGeometry(MODULE * 2.2, MODULE * 2.2, 1, 32), []);
  const shaftMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#111', metalness: 0.9, roughness: 0.4 }), []);

  // Subtle breathing camera motion to show off the parallax depth
  const tiltX = Math.sin(u * TAU) * 0.05 - 0.1;
  const tiltY = Math.cos(u * TAU) * 0.08;

  return (
    <div style={{ width, height, backgroundColor: '#020203' }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, -5, 95], fov: 45, near: 1, far: 400 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#020203' }}
      >
        <EnvironmentMap />
        
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight position={[30, 40, 50]} intensity={2.5} color="#dbeaff" castShadow shadow-bias={-0.001} />
        <directionalLight position={[-40, -30, -20]} intensity={1.5} color="#ffeedd" />
        <pointLight position={[0, 0, 30]} intensity={1.2} color="#ffffff" />
        <pointLight position={[40, 20, 10]} intensity={0.8} color="#aaaaff" />
        <pointLight position={[-40, -20, 10]} intensity={0.8} color="#ffaaaa" />

        <group rotation={[tiltX, tiltY, 0]}>
          <group position={[0, 0, 0]}>
            {allGears.map((g) => (
              <SingleGear key={g.id} def={g} u={u} geo={geometries[`${g.t}_${g.s}`]} />
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

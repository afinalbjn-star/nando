import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';

const TAU = Math.PI * 2;

// Deterministic seeded random
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface FiberData {
  curve: THREE.CatmullRomCurve3;
  phase1: number;
  phase2: number;
}

// Generate organic wavy neural fibers matching the reference image
function generateNeuralFibers() {
  const fibers: FiberData[] = [];
  const count = 80; // Dense array of tentacle cables
  const coreRadius = 3.1;

  let seed = 303;

  for (let i = 0; i < count; i++) {
    // Fibonacci distribution over sphere
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    const nx = Math.cos(theta) * radiusAtY;
    const ny = y;
    const nz = Math.sin(theta) * radiusAtY;

    const normal = new THREE.Vector3(nx, ny, nz).normalize();
    const p0 = normal.clone().multiplyScalar(coreRadius);

    // Coordinate basis for organic S-curve displacement
    const up = Math.abs(normal.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const t1 = new THREE.Vector3().crossVectors(normal, up).normalize();
    const t2 = new THREE.Vector3().crossVectors(normal, t1).normalize();

    // Natural flowing S-curve control points
    const amp1 = (pseudoRandom(seed++) - 0.5) * 2.8;
    const amp2 = (pseudoRandom(seed++) - 0.5) * 2.8;
    const p1 = normal.clone().multiplyScalar(coreRadius + 2.2)
      .addScaledVector(t1, amp1)
      .addScaledVector(t2, amp2);

    const amp3 = (pseudoRandom(seed++) - 0.5) * 4.0;
    const amp4 = (pseudoRandom(seed++) - 0.5) * 4.0;
    const p2 = normal.clone().multiplyScalar(coreRadius + 5.5)
      .addScaledVector(t1, -amp1 * 0.8 + amp3)
      .addScaledVector(t2, -amp2 * 0.8 + amp4);

    const amp5 = (pseudoRandom(seed++) - 0.5) * 5.0;
    const amp6 = (pseudoRandom(seed++) - 0.5) * 5.0;
    const p3 = normal.clone().multiplyScalar(coreRadius + 9.5)
      .addScaledVector(t1, amp5)
      .addScaledVector(t2, amp6);

    // Tip stretching outward dramatically (especially to the right as in reference)
    const stretchX = normal.x > -0.2 ? 4.5 : 1.0;
    const p4 = normal.clone().multiplyScalar(coreRadius + 14.0 + stretchX + pseudoRandom(seed++) * 3.5)
      .addScaledVector(t1, amp5 * 1.3)
      .addScaledVector(t2, amp6 * 1.3);

    const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4], false, 'centripetal', 0.5);
    fibers.push({
      curve,
      phase1: pseudoRandom(seed++),
      phase2: (pseudoRandom(seed++) + 0.48) % 1.0,
    });
  }

  return fibers;
}

// 3D Scene Component
const SynapseScene: React.FC<{ progress: number }> = ({ progress }) => {
  const fibers = useMemo(() => generateNeuralFibers(), []);

  // Pre-generate smooth glossy cable geometries
  const fiberGeometries = useMemo(() => {
    return fibers.map((f) => new THREE.TubeGeometry(f.curve, 40, 0.065, 8, false));
  }, [fibers]);

  // Floating ambient digital speckles & particles
  const particleData = useMemo(() => {
    const pts: { pos: THREE.Vector3; speed: number; phase: number; size: number }[] = [];
    let pSeed = 404;
    for (let i = 0; i < 280; i++) {
      const u1 = pseudoRandom(pSeed++);
      const u2 = pseudoRandom(pSeed++);
      const radius = 3.6 + pseudoRandom(pSeed++) * 16.0;
      const theta = u1 * TAU;
      const phi = Math.acos(2 * u2 - 1);
      const pos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      pts.push({
        pos,
        speed: 1.0 + Math.floor(pseudoRandom(pSeed++) * 3), // Integer multiples ensure perfect 100% loop
        phase: pseudoRandom(pSeed++) * TAU,
        size: 0.025 + pseudoRandom(pSeed++) * 0.045,
      });
    }
    return pts;
  }, []);

  // Instanced Meshes for Neon Streak Dashes along the cables
  const totalPulses = fibers.length * 2;
  const pulseMeshRef = useRef<THREE.InstancedMesh>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  // Update animated neon streaks along fiber tangents
  useLayoutEffect(() => {
    if (!pulseMeshRef.current || !particleMeshRef.current) return;

    // In 10 seconds (600 frames), pulse completes exactly 3 full journeys -> 100% seamless loop
    const CYCLES = 3;

    let pulseIdx = 0;
    fibers.forEach((f) => {
      // Pulse 1
      const t1 = (f.phase1 + progress * CYCLES) % 1.0;
      const pos1 = f.curve.getPointAt(t1);
      const tangent1 = f.curve.getTangentAt(t1);

      dummy.position.copy(pos1);
      dummy.quaternion.setFromUnitVectors(yAxis, tangent1);
      // Sleek tapered pulse length
      const streakLength1 = 0.5 + Math.sin(t1 * Math.PI) * 0.7;
      dummy.scale.set(1.0, streakLength1, 1.0);
      dummy.updateMatrix();
      pulseMeshRef.current!.setMatrixAt(pulseIdx++, dummy.matrix);

      // Pulse 2
      const t2 = (f.phase2 + progress * CYCLES) % 1.0;
      const pos2 = f.curve.getPointAt(t2);
      const tangent2 = f.curve.getTangentAt(t2);

      dummy.position.copy(pos2);
      dummy.quaternion.setFromUnitVectors(yAxis, tangent2);
      const streakLength2 = 0.5 + Math.sin(t2 * Math.PI) * 0.7;
      dummy.scale.set(1.0, streakLength2, 1.0);
      dummy.updateMatrix();
      pulseMeshRef.current!.setMatrixAt(pulseIdx++, dummy.matrix);
    });
    pulseMeshRef.current.instanceMatrix.needsUpdate = true;

    // Ambient floating particles orbital drift (periodic integer frequency)
    particleData.forEach((p, i) => {
      const angle = p.phase + progress * TAU * p.speed;
      const px = p.pos.x + Math.sin(angle) * 0.45;
      const py = p.pos.y + Math.cos(angle) * 0.45;
      const pz = p.pos.z + Math.sin(angle * 0.5) * 0.35;

      dummy.position.set(px, py, pz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(p.size, p.size, p.size);
      dummy.updateMatrix();
      particleMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    particleMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [progress, fibers, particleData, dummy, yAxis]);

  // Core rhythmic pulse (sine breathing)
  const corePulseScale = 1.0 + 0.07 * Math.sin(progress * TAU * 2);
  const coreEmissive = 4.0 + 1.5 * Math.sin(progress * TAU * 2);

  // Subtle 3D scene breathing rotation
  const swayY = Math.sin(progress * TAU) * 0.1;
  const swayX = Math.cos(progress * TAU) * 0.05;

  return (
    <group position={[-2.4, 0, 0]} rotation={[0.22 + swayX, -0.32 + swayY, 0.04]}>
      {/* 1. Ultra-Bright Luminous Cyan Inner Core Sphere */}
      <mesh scale={[corePulseScale, corePulseScale, corePulseScale]}>
        <sphereGeometry args={[2.8, 48, 48]} />
        <meshStandardMaterial
          color="#00F5FF"
          emissive="#00F0FF"
          emissiveIntensity={coreEmissive}
          roughness={0.08}
          metalness={0.2}
        />
      </mesh>

      {/* 2. Geodesic Polyhedral Crystal Cage (Matching reference triangular facets) */}
      <mesh scale={[corePulseScale * 1.07, corePulseScale * 1.07, corePulseScale * 1.07]}>
        <icosahedronGeometry args={[2.9, 2]} />
        <meshStandardMaterial
          wireframe
          color="#38BDF8"
          emissive="#0284C7"
          emissiveIntensity={2.5}
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>

      {/* 3. Deep Metallic Indigo/Purple Tendril Fibers (Vibrant sheen matching reference) */}
      {fiberGeometries.map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshStandardMaterial
            color="#4338CA"
            roughness={0.25}
            metalness={0.75}
            emissive="#1E1B4B"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}

      {/* 4. Neon Magenta/Violet Streak Dashes (Instanced Cylinders along tangents) */}
      <instancedMesh
        ref={pulseMeshRef}
        args={[undefined, undefined, totalPulses]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.078, 0.078, 1.0, 12]} />
        <meshStandardMaterial
          color="#F472B6"
          emissive="#D946EF"
          emissiveIntensity={7.0}
          roughness={0.05}
        />
      </instancedMesh>

      {/* 5. Floating Ambient Data / Light Speckles (Instanced) */}
      <instancedMesh
        ref={particleMeshRef}
        args={[undefined, undefined, particleData.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color="#E0E7FF"
          emissive="#C084FC"
          emissiveIntensity={4.0}
          roughness={0.2}
        />
      </instancedMesh>
    </group>
  );
};

export const NeuralSynapseCore: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({
  width = 3840,
  height = 2160,
  totalFrames = 600, // Exactly 10 Seconds at 60 FPS
}) => {
  const frame = useCurrentFrame();
  const progress = (frame / totalFrames) % 1.0;

  return (
    <div style={{ width, height, backgroundColor: '#02040A' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 24.5], fov: 44, near: 1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#02040A' }}
      >
        <color attach="background" args={['#02040A']} />

        {/* Cinematic Multi-Angle Lighting for Rich Highlights */}
        <ambientLight intensity={0.7} color="#1E1B4B" />
        <pointLight position={[-2.4, 0, 1]} intensity={12.0} distance={22} color="#00F5FF" />
        <directionalLight position={[18, 24, 20]} intensity={3.5} color="#A5F3FC" />
        <directionalLight position={[-20, -18, -12]} intensity={2.5} color="#818CF8" />
        <directionalLight position={[0, -20, 15]} intensity={2.0} color="#C084FC" />
        <pointLight position={[15, -10, -5]} intensity={5.0} distance={40} color="#D946EF" />

        <SynapseScene progress={progress} />
      </ThreeCanvas>
    </div>
  );
};

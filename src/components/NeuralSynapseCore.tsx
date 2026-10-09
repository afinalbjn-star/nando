import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';

const TAU = Math.PI * 2;

// Seeded pseudo-random generator for deterministic consistency
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface BranchData {
  curve: THREE.CatmullRomCurve3;
  length: number;
  tip: THREE.Vector3;
  phaseOffset: number;
}

// Generate organic neural branching structure
function generateNeuralTree() {
  const branches: BranchData[] = [];
  const primaryCount = 28;
  const coreRadius = 3.2;

  let seed = 42;

  for (let i = 0; i < primaryCount; i++) {
    // Fibonacci sphere distribution for evenly spaced roots
    const y = 1 - (i / (primaryCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    const rootDir = new THREE.Vector3(x, y, z).normalize();
    const rootPos = rootDir.clone().multiplyScalar(coreRadius);

    // Primary trunk control points
    const p0 = rootPos.clone();
    const midDistance = coreRadius + 2.5 + pseudoRandom(seed++) * 2.0;
    const p1 = rootDir.clone().multiplyScalar(midDistance).add(
      new THREE.Vector3(
        (pseudoRandom(seed++) - 0.5) * 1.5,
        (pseudoRandom(seed++) - 0.5) * 1.5,
        (pseudoRandom(seed++) - 0.5) * 1.5
      )
    );

    const tipDistance = midDistance + 3.5 + pseudoRandom(seed++) * 3.0;
    const p2 = rootDir.clone().multiplyScalar(tipDistance).add(
      new THREE.Vector3(
        (pseudoRandom(seed++) - 0.5) * 2.5,
        (pseudoRandom(seed++) - 0.5) * 2.5,
        (pseudoRandom(seed++) - 0.5) * 2.5
      )
    );

    const primaryCurve = new THREE.CatmullRomCurve3([p0, p1, p2]);
    branches.push({
      curve: primaryCurve,
      length: primaryCurve.getLength(),
      tip: p2,
      phaseOffset: pseudoRandom(seed++),
    });

    // Sub-dendrite fork 1
    const fork1Start = primaryCurve.getPointAt(0.55);
    const fork1Dir = rootDir.clone().add(
      new THREE.Vector3(
        (pseudoRandom(seed++) - 0.5) * 1.8,
        (pseudoRandom(seed++) - 0.5) * 1.8,
        (pseudoRandom(seed++) - 0.5) * 1.8
      )
    ).normalize();
    const fork1Tip = fork1Start.clone().add(fork1Dir.multiplyScalar(3.0 + pseudoRandom(seed++) * 2.0));
    const fork1Curve = new THREE.CatmullRomCurve3([
      fork1Start,
      fork1Start.clone().lerp(fork1Tip, 0.5).add(new THREE.Vector3((pseudoRandom(seed++) - 0.5), (pseudoRandom(seed++) - 0.5), (pseudoRandom(seed++) - 0.5))),
      fork1Tip,
    ]);
    branches.push({
      curve: fork1Curve,
      length: fork1Curve.getLength(),
      tip: fork1Tip,
      phaseOffset: pseudoRandom(seed++),
    });

    // Sub-dendrite fork 2
    const fork2Start = primaryCurve.getPointAt(0.75);
    const fork2Dir = rootDir.clone().add(
      new THREE.Vector3(
        (pseudoRandom(seed++) - 0.5) * 1.8,
        (pseudoRandom(seed++) - 0.5) * 1.8,
        (pseudoRandom(seed++) - 0.5) * 1.8
      )
    ).normalize();
    const fork2Tip = fork2Start.clone().add(fork2Dir.multiplyScalar(2.5 + pseudoRandom(seed++) * 2.0));
    const fork2Curve = new THREE.CatmullRomCurve3([
      fork2Start,
      fork2Start.clone().lerp(fork2Tip, 0.5).add(new THREE.Vector3((pseudoRandom(seed++) - 0.5), (pseudoRandom(seed++) - 0.5), (pseudoRandom(seed++) - 0.5))),
      fork2Tip,
    ]);
    branches.push({
      curve: fork2Curve,
      length: fork2Curve.getLength(),
      tip: fork2Tip,
      phaseOffset: pseudoRandom(seed++),
    });
  }

  return branches;
}

// Neural Synapse 3D Scene
const SynapseScene: React.FC<{ progress: number }> = ({ progress }) => {
  const branches = useMemo(() => generateNeuralTree(), []);

  // Pre-generate tube geometries for dendritic fibers
  const branchGeometries = useMemo(() => {
    return branches.map((b, idx) => {
      const radius = idx % 3 === 0 ? 0.08 : 0.045;
      return new THREE.TubeGeometry(b.curve, 20, radius, 6, false);
    });
  }, [branches]);

  // Ambient floating neurotransmitter dust particles
  const particleData = useMemo(() => {
    const pts: { pos: THREE.Vector3; speed: number; phase: number; radius: number }[] = [];
    let pSeed = 99;
    for (let i = 0; i < 180; i++) {
      const u1 = pseudoRandom(pSeed++);
      const u2 = pseudoRandom(pSeed++);
      const radius = 4.0 + pseudoRandom(pSeed++) * 9.0;
      const theta = u1 * TAU;
      const phi = Math.acos(2 * u2 - 1);
      const pos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      pts.push({
        pos,
        speed: 1.0 + Math.floor(pseudoRandom(pSeed++) * 2),
        phase: pseudoRandom(pSeed++) * TAU,
        radius: 0.04 + pseudoRandom(pSeed++) * 0.05,
      });
    }
    return pts;
  }, []);

  const pulseMeshRef = useRef<THREE.InstancedMesh>(null);
  const boutonMeshRef = useRef<THREE.InstancedMesh>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Update animated photons and breathing effects
  useLayoutEffect(() => {
    if (!pulseMeshRef.current || !boutonMeshRef.current || !particleMeshRef.current) return;

    // 1. Update Photon Pulses racing outward along fibers (sleek energy beads)
    const PULSE_SPEED = 3;
    branches.forEach((b, i) => {
      const t = (b.phaseOffset + progress * PULSE_SPEED) % 1.0;
      const pos = b.curve.getPointAt(t);

      dummy.position.copy(pos);
      // Sleek energy bead that hugs the branch curve
      const scaleCurve = Math.sin(t * Math.PI);
      const pulseScale = (0.09 + scaleCurve * 0.12) * (1.0 + 0.15 * Math.sin(progress * TAU * 2));
      dummy.scale.set(pulseScale, pulseScale, pulseScale);
      dummy.updateMatrix();
      pulseMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    pulseMeshRef.current.instanceMatrix.needsUpdate = true;

    // 2. Update Synaptic Boutons (terminal tip spheres)
    branches.forEach((b, i) => {
      dummy.position.copy(b.tip);
      const bScale = 0.12 + 0.04 * Math.sin(progress * TAU * 2 + b.phaseOffset * TAU);
      dummy.scale.set(bScale, bScale, bScale);
      dummy.updateMatrix();
      boutonMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    boutonMeshRef.current.instanceMatrix.needsUpdate = true;

    // 3. Update Floating Neurotransmitter Particles (orbital drift)
    particleData.forEach((p, i) => {
      const driftAngle = p.phase + progress * TAU * p.speed;
      const px = p.pos.x + Math.sin(driftAngle) * 0.4;
      const py = p.pos.y + Math.cos(driftAngle) * 0.4;
      const pz = p.pos.z + Math.sin(driftAngle * 0.5) * 0.3;

      dummy.position.set(px, py, pz);
      dummy.scale.set(p.radius * 0.7, p.radius * 0.7, p.radius * 0.7);
      dummy.updateMatrix();
      particleMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    particleMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [progress, branches, particleData, dummy]);

  // Harmonic Core Breathing: scale = 1.0 + 0.14 * sin(u * 2PI)
  const corePulseScale = 1.0 + 0.12 * Math.sin(progress * TAU);
  const coreEmissiveIntensity = 1.5 + 0.6 * Math.sin(progress * TAU);

  // Subtle isometric camera sway
  const groupSwayY = Math.sin(progress * TAU) * 0.08;
  const groupSwayX = Math.cos(progress * TAU) * 0.04;

  return (
    // Offset to the left by -3.5 units to allocate ~40% negative space on the right for editor typography
    <group position={[-3.5, 0, 0]} rotation={[0.18 + groupSwayX, -0.35 + groupSwayY, 0.05]}>
      {/* 1. Luminous Synapse Core Sphere */}
      <mesh scale={[corePulseScale, corePulseScale, corePulseScale]}>
        <sphereGeometry args={[3.0, 48, 48]} />
        <meshStandardMaterial
          color="#0891B2"
          emissive="#06B6D4"
          emissiveIntensity={coreEmissiveIntensity}
          roughness={0.15}
          metalness={0.6}
        />
      </mesh>

      {/* 2. Concentric Outer Polyhedral Lattice Mesh */}
      <mesh scale={[corePulseScale * 1.07, corePulseScale * 1.07, corePulseScale * 1.07]}>
        <icosahedronGeometry args={[3.15, 2]} />
        <meshStandardMaterial
          wireframe
          color="#8B5CF6"
          emissive="#7C3AED"
          emissiveIntensity={2.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* 3. Deep Indigo Dendritic Branches */}
      {branchGeometries.map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshStandardMaterial
            color="#312E81"
            roughness={0.25}
            metalness={0.7}
            emissive="#1E1B4B"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}

      {/* 4. Action Potential Photon Signal Pulses (Instanced) */}
      <instancedMesh
        ref={pulseMeshRef}
        args={[undefined, undefined, branches.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#E0F2FE"
          emissive="#22D3EE"
          emissiveIntensity={4.5}
          roughness={0.1}
        />
      </instancedMesh>

      {/* 5. Synaptic Bouton Terminals (Instanced) */}
      <instancedMesh
        ref={boutonMeshRef}
        args={[undefined, undefined, branches.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#DDD6FE"
          emissive="#A855F7"
          emissiveIntensity={3.2}
          roughness={0.15}
        />
      </instancedMesh>

      {/* 6. Floating Neurotransmitter Particles (Instanced) */}
      <instancedMesh
        ref={particleMeshRef}
        args={[undefined, undefined, particleData.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color="#BAE6FD"
          emissive="#38BDF8"
          emissiveIntensity={2.5}
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
  totalFrames = 300,
}) => {
  const frame = useCurrentFrame();
  const progress = (frame / totalFrames) % 1.0;

  return (
    <div style={{ width, height, backgroundColor: '#030712' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 24], fov: 42, near: 1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#030712' }}
      >
        <color attach="background" args={['#030712']} />

        {/* Cinematic Multi-Point Lighting */}
        <ambientLight intensity={0.6} color="#1E1B4B" />
        <directionalLight position={[15, 20, 18]} intensity={2.0} color="#A5F3FC" />
        <directionalLight position={[-15, -15, -10]} intensity={1.2} color="#4338CA" />
        <pointLight position={[-4, 0, 4]} intensity={5.0} distance={22} color="#06B6D4" />
        <pointLight position={[10, -6, -4]} intensity={3.0} distance={30} color="#8B5CF6" />

        <SynapseScene progress={progress} />
      </ThreeCanvas>
    </div>
  );
};


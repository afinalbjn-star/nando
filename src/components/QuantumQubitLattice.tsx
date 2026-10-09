import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const N = 6; // 6x6x6 lattice (sparser, matches reference)
const SPACING = 2.6;
const BG = '#0B0F17';

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const EnvironmentMap: React.FC = () => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

// Base lattice points and neighbor edges
const buildLattice = () => {
  const points: THREE.Vector3[] = [];
  const idx = (x: number, y: number, z: number) => x * N * N + y * N + z;
  const half = ((N - 1) * SPACING) / 2;
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++)
        points.push(new THREE.Vector3(x * SPACING - half, y * SPACING - half, z * SPACING - half));

  const edges: [number, number][] = [];
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++) {
        if (x < N - 1) edges.push([idx(x, y, z), idx(x + 1, y, z)]);
        if (y < N - 1) edges.push([idx(x, y, z), idx(x, y + 1, z)]);
        if (z < N - 1) edges.push([idx(x, y, z), idx(x, y, z + 1)]);
      }
  return { points, edges };
};

const LatticeMesh: React.FC<{ u: number }> = ({ u }) => {
  const { points, edges } = useMemo(buildLattice, []);
  const nodeRef = useRef<THREE.InstancedMesh>(null);
  const edgeRef = useRef<THREE.InstancedMesh>(null);
  const dustRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const nodeGeo = useMemo(() => new THREE.SphereGeometry(0.46, 32, 32), []);
  const edgeGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.075, 0.075, 1, 12);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const dustGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);

  const dust = useMemo(() => {
    const arr: { pos: THREE.Vector3; phase: number; speed: number; size: number }[] = [];
    let s = 77;
    for (let i = 0; i < 160; i++) {
      arr.push({
        pos: new THREE.Vector3(
          (pseudoRandom(s++) - 0.5) * 34,
          (pseudoRandom(s++) - 0.5) * 22,
          (pseudoRandom(s++) - 0.5) * 20
        ),
        phase: pseudoRandom(s++) * TAU,
        speed: 1 + Math.floor(pseudoRandom(s++) * 2),
        size: 0.025 + pseudoRandom(s++) * 0.04,
      });
    }
    return arr;
  }, []);

  const nodeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#F1F5F9', emissive: '#94A3B8', emissiveIntensity: 0.55, metalness: 0.9, roughness: 0.14, envMapIntensity: 3.5,
      }),
    []
  );
  const edgeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0D9488',
        emissive: '#10B981',
        emissiveIntensity: 0.6,
        metalness: 0.5,
        roughness: 0.25,
        envMapIntensity: 1.0,
      }),
    []
  );
  const dustMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#34D399', transparent: true, opacity: 0.7 }),
    []
  );

  // Double sinusoidal wave: z = sin(x*k + u*2PI) * cos(y*k - u*2PI) * A  (integer temporal cycles => seamless)
  const displaced = useMemo(() => points.map(() => new THREE.Vector3()), [points]);

  useLayoutEffect(() => {
    if (!nodeRef.current || !edgeRef.current || !dustRef.current) return;
    const ph = u * TAU;

    points.forEach((p, i) => {
      const wz = Math.sin(p.x * 0.5 + ph) * Math.cos(p.y * 0.5 - ph) * 0.45;
      const wx = Math.sin(p.y * 0.45 + ph) * Math.cos(p.z * 0.45 + ph) * 0.14;
      const wy = Math.sin(p.z * 0.5 - ph) * Math.cos(p.x * 0.5 + ph) * 0.14;
      displaced[i].set(p.x + wx, p.y + wy, p.z + wz);
      dummy.position.copy(displaced[i]);
      dummy.scale.setScalar(1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      nodeRef.current!.setMatrixAt(i, dummy.matrix);
    });
    nodeRef.current.instanceMatrix.needsUpdate = true;

    edges.forEach(([a, b], i) => {
      const p1 = displaced[a];
      const p2 = displaced[b];
      dummy.position.copy(p1).lerp(p2, 0.5);
      dummy.lookAt(p2);
      dummy.scale.set(1, 1, p1.distanceTo(p2));
      dummy.updateMatrix();
      edgeRef.current!.setMatrixAt(i, dummy.matrix);
    });
    edgeRef.current.instanceMatrix.needsUpdate = true;

    dust.forEach((d, i) => {
      const a = d.phase + ph * d.speed;
      dummy.position.set(
        d.pos.x + Math.sin(a) * 0.5,
        d.pos.y + Math.cos(a) * 0.5,
        d.pos.z + Math.sin(a * 0.5 + 1) * 0.4
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(d.size);
      dummy.updateMatrix();
      dustRef.current!.setMatrixAt(i, dummy.matrix);
    });
    dustRef.current.instanceMatrix.needsUpdate = true;
  }, [u, points, edges, displaced, dust, dummy]);

  // Gentle vertical levitation, fixed (non-rotating) orientation
  const floatY = Math.sin(u * TAU) * 0.35;

  return (
    <>
      <group position={[0, floatY, 0]} rotation={[0.36, -0.5, 0]}>
        <instancedMesh ref={nodeRef} args={[nodeGeo, nodeMat, points.length]} frustumCulled={false} />
        <instancedMesh ref={edgeRef} args={[edgeGeo, edgeMat, edges.length]} frustumCulled={false} />
      </group>
      <instancedMesh ref={dustRef} args={[dustGeo, dustMat, dust.length]} frustumCulled={false} />
    </>
  );
};

export const QuantumQubitLattice: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({ width = 3840, height = 2160, totalFrames = 600 }) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) % 1.0;

  return (
    <div style={{ width, height, backgroundColor: BG }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 2.0, 32], fov: 40, near: 1, far: 120 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: BG }}
      >
        <color attach="background" args={[BG]} />
        <EnvironmentMap />
        <ambientLight intensity={0.5} color="#99F6E4" />
        <directionalLight position={[12, 20, 18]} intensity={2.2} color="#FFFFFF" />
        <directionalLight position={[-18, -8, 10]} intensity={1.2} color="#10B981" />
        <pointLight position={[0, 0, 14]} intensity={3.0} distance={50} color="#2DD4BF" />
        <LatticeMesh u={u} />
      </ThreeCanvas>
    </div>
  );
};



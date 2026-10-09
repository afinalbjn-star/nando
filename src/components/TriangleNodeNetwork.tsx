import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame } from 'remotion';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useThree } from '@react-three/fiber';

/**
 * TriangleNodeNetwork — A "breathing" 3D wireframe tetrahedron composed of 
 * true 3D spheres (nodes) and cylinders (edges) that seamlessly loops.
 */

const TAU = Math.PI * 2;
const N = 10; // Subdivision segments per face

const THEMES = {
  ghost: {
    bg: '#f0f2f5',
    node: '#222222',
    edge: '#888888',
    nodeSize: 0.5,
    edgeSize: 0.15,
    light: '#ffffff',
    ambient: 1.5
  },
  neon: {
    bg: '#05050a',
    node: '#00ffff',
    edge: '#ff00ff',
    nodeSize: 0.45,
    edgeSize: 0.12,
    light: '#88aaff',
    ambient: 0.8
  },
  gold: {
    bg: '#0a0805',
    node: '#ffcc00',
    edge: '#aa6611',
    nodeSize: 0.55,
    edgeSize: 0.15,
    light: '#ffeecc',
    ambient: 1.0
  }
};

type ThemeKey = keyof typeof THEMES;

// Generate base points and edges
const generateNetwork = () => {
  // Canonical regular tetrahedron vertices
  const scale = 18;
  const verts = [
    new THREE.Vector3( 1,  1,  1),
    new THREE.Vector3(-1, -1,  1),
    new THREE.Vector3(-1,  1, -1),
    new THREE.Vector3( 1, -1, -1)
  ].map(v => v.normalize().multiplyScalar(scale));

  const faces = [
    [verts[0], verts[1], verts[2]],
    [verts[0], verts[2], verts[3]],
    [verts[0], verts[3], verts[1]],
    [verts[1], verts[3], verts[2]]
  ];

  const points: THREE.Vector3[] = [];
  const eps = 0.01;

  // 1. Barycentric Subdivision for flat faces
  for (const face of faces) {
    const [A, B, C] = face;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N - i; j++) {
        const k = N - i - j;
        const p = new THREE.Vector3()
          .addScaledVector(A, i / N)
          .addScaledVector(B, j / N)
          .addScaledVector(C, k / N);
        
        // Prevent duplicate vertices at edges/corners
        if (!points.some(existing => existing.distanceTo(p) < eps)) {
          points.push(p);
        }
      }
    }
  }

  // 2. Determine Edges
  const expectedEdgeLen = verts[0].distanceTo(verts[1]) / N;
  const edgePairs: [number, number][] = [];
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (Math.abs(points[i].distanceTo(points[j]) - expectedEdgeLen) < eps * 10) {
        edgePairs.push([i, j]);
      }
    }
  }

  return { points, edgePairs };
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

const NetworkMesh: React.FC<{ theme: ThemeKey; u: number }> = ({ theme, u }) => {
  const t = THEMES[theme];
  const { points, edgePairs } = useMemo(() => generateNetwork(), []);
  
  const nodeMeshRef = useRef<THREE.InstancedMesh>(null);
  const edgeMeshRef = useRef<THREE.InstancedMesh>(null);
  
  // Create base geometries
  const nodeGeo = useMemo(() => new THREE.SphereGeometry(t.nodeSize, 16, 16), [t.nodeSize]);
  const nodeMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: t.node,
    metalness: 0.6,
    roughness: 0.2,
    clearcoat: 0.8
  }), [t.node]);

  const edgeGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(t.edgeSize, t.edgeSize, 1, 8);
    // Rotate cylinder so its length aligns with the Z axis (makes lookAt easier)
    geo.rotateX(Math.PI / 2);
    return geo;
  }, [t.edgeSize]);
  
  const edgeMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: t.edge,
    metalness: 0.8,
    roughness: 0.3
  }), [t.edge]);

  // Breathing animation logic
  const getAnimatedPoint = (p: THREE.Vector3, progress: number) => {
    // 1. Calculate distance from center
    const dist = p.length();
    // 2. Multi-sine wave based on spatial coordinates and time
    // u * TAU ensures it loops perfectly when u goes from 0 to 1
    const wave1 = Math.sin(dist * 0.3 - progress * TAU) * 1.5;
    const wave2 = Math.sin(p.y * 0.2 + progress * TAU) * 1.0;
    
    // 3. Displace outwards/inwards based on the wave
    const offset = p.clone().normalize().multiplyScalar(wave1 + wave2);
    return p.clone().add(offset);
  };

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Update instance matrices every frame
  React.useLayoutEffect(() => {
    if (!nodeMeshRef.current || !edgeMeshRef.current) return;

    const animatedPoints = points.map(p => getAnimatedPoint(p, u));

    // Update Nodes
    animatedPoints.forEach((p, i) => {
      dummy.position.copy(p);
      // Pulsating scale effect
      const scale = 1.0 + Math.sin(p.length() * 0.4 - u * TAU) * 0.25;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      nodeMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    nodeMeshRef.current.instanceMatrix.needsUpdate = true;

    // Update Edges
    edgePairs.forEach(([i, j], edgeIdx) => {
      const p1 = animatedPoints[i];
      const p2 = animatedPoints[j];
      const dist = p1.distanceTo(p2);
      
      dummy.position.copy(p1).lerp(p2, 0.5); // Center of the edge
      dummy.lookAt(p2); // Orient cylinder towards p2
      dummy.scale.set(1, 1, dist); // Stretch to reach
      dummy.updateMatrix();
      edgeMeshRef.current!.setMatrixAt(edgeIdx, dummy.matrix);
    });
    edgeMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [u, points, edgePairs, dummy]);

  return (
    <group rotation={[u * TAU, u * TAU * 0.5, 0]}>
      <instancedMesh
        ref={nodeMeshRef}
        args={[nodeGeo, nodeMat, points.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={edgeMeshRef}
        args={[edgeGeo, edgeMat, edgePairs.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
    </group>
  );
};

export const TriangleNodeNetwork: React.FC<{
  theme: ThemeKey;
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
}> = ({
  theme,
  width = 3840,
  height = 2160,
  totalFrames = 300,
  speed = 1,
}) => {
  const t = THEMES[theme];
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) * Math.max(1, Math.round(speed));

  return (
    <div style={{ width, height, backgroundColor: t.bg }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 0, 60], fov: 45, near: 1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: t.bg }}
      >
        <color attach="background" args={[t.bg]} />
        <EnvironmentMap />
        
        <ambientLight intensity={t.ambient} color={t.light} />
        <directionalLight position={[20, 40, 30]} intensity={2.5} color={t.light} castShadow shadow-bias={-0.002} />
        <directionalLight position={[-20, -30, -20]} intensity={1.5} color={t.light} />
        <pointLight position={[0, 0, 20]} intensity={2.0} color={t.light} />

        <NetworkMesh theme={theme} u={u} />
      </ThreeCanvas>
    </div>
  );
};

export const NodeNetworkGhost = () => <TriangleNodeNetwork theme="ghost" />;
export const NodeNetworkNeon = () => <TriangleNodeNetwork theme="neon" />;
export const NodeNetworkGold = () => <TriangleNodeNetwork theme="gold" />;

import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const DURATION_FRAMES = 600;

// Helper: 2D Rounded Rectangle Shape
function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return shape;
}

// Helper: 3D Thumbs-Up Hand Silhouette Shape
function createThumbsUpHandShape(): THREE.Shape {
  const s = new THREE.Shape();
  // Left palm edge adjacent to the cuff
  s.moveTo(-0.6, -1.8);
  // Bottom palm base
  s.lineTo(1.6, -1.8);
  s.quadraticCurveTo(2.1, -1.8, 2.1, -1.35);

  // 4 fingers stacked vertically on the right
  // Finger 1 (pinky)
  s.quadraticCurveTo(2.6, -1.35, 2.6, -0.9);
  s.quadraticCurveTo(2.6, -0.45, 2.0, -0.45);

  // Finger 2 (ring)
  s.quadraticCurveTo(2.7, -0.45, 2.7, 0.0);
  s.quadraticCurveTo(2.7, 0.45, 2.1, 0.45);

  // Finger 3 (middle)
  s.quadraticCurveTo(2.8, 0.45, 2.8, 0.9);
  s.quadraticCurveTo(2.8, 1.35, 2.1, 1.35);

  // Finger 4 (index)
  s.quadraticCurveTo(2.7, 1.35, 2.7, 1.75);
  s.quadraticCurveTo(2.7, 2.15, 1.8, 2.15);

  // Dip into thumb crook
  s.lineTo(0.5, 2.15);
  // Thumb rising up-right
  s.lineTo(1.2, 3.6);
  // Thumb tip
  s.quadraticCurveTo(1.4, 4.2, 0.9, 4.4);
  s.quadraticCurveTo(0.3, 4.4, 0.1, 3.9);
  // Thumb outer curve going down
  s.quadraticCurveTo(-0.2, 3.2, -0.4, 2.3);
  // Left palm edge returning to cuff
  s.lineTo(-0.6, 2.0);
  s.lineTo(-0.6, -1.8);

  return s;
}

// Studio Lighting Rig with Animated Sheen Sweep
const StudioLighting: React.FC<{ progress: number }> = ({ progress }) => {
  useThree(({ camera }) => {
    camera.position.set(0, 1.5, 25);
    camera.lookAt(0, 0, 0);
  });

  // Dynamic light sheen sweep across the glossy red surface
  const sweepAngle = progress * Math.PI * 4;
  const sweepX = Math.cos(sweepAngle) * 12;
  const sweepY = Math.sin(sweepAngle) * 10;

  return (
    <>
      <ambientLight intensity={0.85} color="#fff1f2" />
      {/* Key Light: Crisp warm studio light */}
      <directionalLight position={[14, 18, 16]} intensity={2.6} color="#ffffff" castShadow />
      {/* Fill Light: Soft coral/pink bounce */}
      <directionalLight position={[-16, -10, 12]} intensity={1.2} color="#fecdd3" />
      {/* Rim Light: Sharp highlight defining the 3D silhouette */}
      <directionalLight position={[-8, 16, -18]} intensity={3.8} color="#ffe4e6" />
      {/* Dynamic glossy specular sweep */}
      <pointLight position={[sweepX, sweepY, 14]} intensity={2.2} distance={35} color="#ffffff" />
    </>
  );
};

// Main 3D Like Badge Model
const LikeBadge3DModel: React.FC<{ progress: number }> = ({ progress }) => {
  // Badge base geometry (Extruded Rounded Rectangle with smooth bevels)
  const badgeGeo = useMemo(() => {
    const shape = createRoundedRectShape(10.8, 10.8, 2.4);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 1.8,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.65,
      bevelThickness: 0.65,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, []);

  // Hand silhouette geometry
  const handGeo = useMemo(() => {
    const shape = createThumbsUpHandShape();
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.85,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.18,
      bevelThickness: 0.18,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, []);

  // Cuff pill bar geometry
  const cuffGeo = useMemo(() => {
    const shape = createRoundedRectShape(1.15, 4.0, 0.45);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.85,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.18,
      bevelThickness: 0.18,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, []);

  // Materials
  // Premium candy red glossy plastic with clearcoat shine
  const badgeMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#f43f5e', // Vibrant coral/ruby red
      roughness: 0.12,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transmission: 0.12, // Subsurface jelly glow
      ior: 1.52,
      reflectivity: 0.95,
      specularColor: new THREE.Color('#ffffff'),
    });
  }, []);

  // Bevel edge accent material for badge back/sides
  const backPlateMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e11d48',
      roughness: 0.25,
      metalness: 0.08,
    });
  }, []);

  // Porcelain glossy white for the Thumbs-Up icon
  const iconMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#f8fafc', // Ultra clean white
      roughness: 0.18,
      metalness: 0.02,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      reflectivity: 0.8,
    });
  }, []);

  // Rhythmic elastic click pulse (4 energetic pulses per 10-second loop = integer cycle 4)
  const pulsePhase = (progress * 4) % 1.0;
  // Damped harmonic bounce
  const bounceIntensity = Math.sin(pulsePhase * Math.PI) * Math.exp(-pulsePhase * 3.5);
  const badgeSquashZ = 1.0 - bounceIntensity * 0.12;
  const badgeScaleXY = 1.0 + bounceIntensity * 0.06;
  const iconPopZ = 1.55 + bounceIntensity * 0.35;

  return (
    <group scale={[badgeScaleXY, badgeScaleXY, badgeSquashZ]}>
      {/* 1. Main Glossy Red Badge Plate */}
      <mesh geometry={badgeGeo} material={badgeMaterial} castShadow receiveShadow />

      {/* 2. Embedded Interior Glow Core */}
      <mesh position={[0, 0, -0.1]} material={backPlateMaterial}>
        <boxGeometry args={[9.5, 9.5, 1.2]} />
      </mesh>

      {/* 3. 3D White Embossed Thumbs-Up Icon */}
      <group position={[-0.2, -0.2, iconPopZ]}>
        {/* Left vertical cuff bar */}
        <mesh position={[-1.75, -0.2, 0]} geometry={cuffGeo} material={iconMaterial} castShadow />

        {/* Hand with thumb & 4 fingers */}
        <mesh position={[0.7, 0, 0]} geometry={handGeo} material={iconMaterial} castShadow />
      </group>
    </group>
  );
};

// Orbiting Floating 3D Gold Sparkles & Social Reaction Particles
const FloatingSparkles: React.FC<{ progress: number }> = ({ progress }) => {
  const sparkleCount = 14;

  const sparkleData = useMemo(() => {
    const list = [];
    for (let i = 0; i < sparkleCount; i++) {
      const angleOffset = (i / sparkleCount) * Math.PI * 2;
      const radius = 8.5 + (i % 3) * 1.8;
      const yOffset = ((i % 5) - 2) * 1.8;
      const scale = 0.35 + (i % 4) * 0.14;
      const rotSpeed = 1 + (i % 3);
      const orbitCycles = 1 + (i % 2); // Integer cycles per 10s = 100% seamless
      list.push({ angleOffset, radius, yOffset, scale, rotSpeed, orbitCycles });
    }
    return list;
  }, [sparkleCount]);

  const goldSparkleMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#facc15',
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
      emissive: '#eab308',
      emissiveIntensity: 0.3,
    });
  }, []);

  const heartPinkMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#fb7185',
      roughness: 0.2,
      clearcoat: 0.8,
      emissive: '#f43f5e',
      emissiveIntensity: 0.25,
    });
  }, []);

  return (
    <group>
      {sparkleData.map((sp, idx) => {
        // Integer harmonic orbit
        const currentAngle = sp.angleOffset + progress * Math.PI * 2 * sp.orbitCycles;
        const x = Math.cos(currentAngle) * sp.radius;
        const z = Math.sin(currentAngle) * (sp.radius * 0.7);
        const y = sp.yOffset + Math.sin(progress * Math.PI * 4 + sp.angleOffset) * 1.2;
        const spin = progress * Math.PI * 2 * sp.rotSpeed;

        const isHeart = idx % 3 === 0;

        return (
          <mesh
            key={idx}
            position={[x, y, z]}
            rotation={[spin, spin * 1.2, 0]}
            scale={sp.scale}
            material={isHeart ? heartPinkMat : goldSparkleMat}
          >
            {isHeart ? (
              // Floating micro reaction orb
              <sphereGeometry args={[0.7, 16, 16]} />
            ) : (
              // 4-Point Faceted Diamond Star Sparkle
              <octahedronGeometry args={[0.9, 0]} />
            )}
          </mesh>
        );
      })}
    </group>
  );
};

// Scene Orchestration: Floating 3D Showcase with Dynamic Isometric Presentation
const LikeButtonScene: React.FC<{ progress: number }> = ({ progress }) => {
  // 100% Seamless Looping 360-degree turntable with dynamic rocking tilt
  const rotY = progress * Math.PI * 2 - Math.PI * 0.28; // Starts at heroic 3/4 isometric perspective

  // Harmonic vertical hover bobbing (2 full cycles in 10s = seamless)
  const hoverY = Math.sin(progress * Math.PI * 4) * 0.45;

  // Gentle 3D floating pitch & roll
  const tiltX = 0.32 + Math.sin(progress * Math.PI * 2) * 0.12;
  const rollZ = -0.22 + Math.cos(progress * Math.PI * 2) * 0.08;

  return (
    <>
      <StudioLighting progress={progress} />
      <FloatingSparkles progress={progress} />
      <group position={[0, hoverY, 0]} rotation={[tiltX, rotY, rollZ]}>
        <LikeBadge3DModel progress={progress} />
      </group>
    </>
  );
};

// Main Remotion Composition (Strict Alpha Channel, 4K UHD, 10s Seamless Loop)
export const GlossyLikeButton3D: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({ width = 3840, height = 2160, totalFrames = DURATION_FRAMES }) => {
  const frame = useCurrentFrame();
  const progress = (frame / totalFrames) % 1.0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 32 }}
        style={{ backgroundColor: 'transparent' }}
      >
        <LikeButtonScene progress={progress} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

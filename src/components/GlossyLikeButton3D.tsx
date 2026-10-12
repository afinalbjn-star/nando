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

// Helper: Professional 3D Thumbs-Up Hand Silhouette Shape
function createProfessionalThumbsUpHand(): THREE.Shape {
  const s = new THREE.Shape();
  // Start at bottom wrist edge
  s.moveTo(-1.2, -1.6);
  // Bottom horizontal line towards pinky side
  s.lineTo(1.8, -1.6);
  // Bottom-right corner rounding up to pinky
  s.quadraticCurveTo(2.4, -1.6, 2.4, -1.1);

  // Finger 1 (Bottom / Pinky)
  s.lineTo(2.4, -0.9);
  s.quadraticCurveTo(2.5, -0.5, 2.0, -0.5);

  // Indentation between Finger 1 & 2
  s.lineTo(1.7, -0.5);

  // Finger 2 (Ring finger)
  s.lineTo(2.3, -0.5);
  s.quadraticCurveTo(2.7, -0.5, 2.7, -0.1);
  s.quadraticCurveTo(2.7, 0.35, 2.2, 0.35);

  // Indentation between Finger 2 & 3
  s.lineTo(1.8, 0.35);

  // Finger 3 (Middle finger - longest finger)
  s.lineTo(2.5, 0.35);
  s.quadraticCurveTo(2.95, 0.35, 2.95, 0.75);
  s.quadraticCurveTo(2.95, 1.2, 2.4, 1.2);

  // Indentation between Finger 3 & 4
  s.lineTo(1.9, 1.2);

  // Finger 4 (Index finger)
  s.lineTo(2.5, 1.2);
  s.quadraticCurveTo(2.85, 1.2, 2.85, 1.6);
  s.quadraticCurveTo(2.85, 2.0, 2.2, 2.0);

  // Deep web / valley between index finger knuckle and thumb base
  s.lineTo(0.6, 2.0);
  s.quadraticCurveTo(0.1, 2.0, -0.2, 2.4);

  // Thumb inner edge shooting up-right at ~65 degree angle
  s.lineTo(0.5, 4.0);
  // Rounded thumb tip
  s.quadraticCurveTo(0.8, 4.5, 0.3, 4.7);
  s.quadraticCurveTo(-0.3, 4.7, -0.6, 4.2);
  // Thumb outer back slope descending down towards wrist
  s.quadraticCurveTo(-1.1, 3.4, -1.2, 2.2);
  // Left vertical wrist edge going straight down
  s.lineTo(-1.2, -1.6);

  return s;
}

// Studio Lighting Rig with Animated Sheen Sweep
const StudioLighting: React.FC<{ progress: number }> = ({ progress }) => {
  useThree(({ camera }) => {
    camera.position.set(0, 1.2, 27);
    camera.lookAt(0, 0, 0);
  });

  // Dynamic light sheen sweep across the glossy red surface
  const sweepAngle = progress * Math.PI * 4;
  const sweepX = Math.cos(sweepAngle) * 14;
  const sweepY = Math.sin(sweepAngle) * 12;

  return (
    <>
      <ambientLight intensity={0.9} color="#fff1f2" />
      {/* Key Light: Crisp warm studio light */}
      <directionalLight position={[14, 18, 16]} intensity={2.8} color="#ffffff" castShadow />
      {/* Fill Light: Soft coral/pink bounce */}
      <directionalLight position={[-16, -10, 12]} intensity={1.4} color="#fecdd3" />
      {/* Rim Light: Sharp highlight defining the 3D silhouette */}
      <directionalLight position={[-10, 16, -18]} intensity={4.2} color="#ffe4e6" />
      {/* Dynamic glossy specular sweep */}
      <pointLight position={[sweepX, sweepY, 15]} intensity={2.6} distance={38} color="#ffffff" />
    </>
  );
};

// Main 3D Like Badge Model
const LikeBadge3DModel: React.FC<{ progress: number }> = ({ progress }) => {
  // Badge base geometry (Extruded Rounded Rectangle with smooth bevels)
  const badgeGeo = useMemo(() => {
    const shape = createRoundedRectShape(11.2, 11.2, 2.6);
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
    const shape = createProfessionalThumbsUpHand();
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.9,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.18,
      bevelThickness: 0.18,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, []);

  // Cuff pill bar geometry (matching reference proportions)
  const cuffGeo = useMemo(() => {
    const shape = createRoundedRectShape(1.2, 4.4, 0.5);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.9,
      bevelEnabled: true,
      bevelSegments: 6,
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
      color: '#f43f5e', // Vibrant coral/ruby red matching reference
      roughness: 0.1,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transmission: 0.12, // Subsurface jelly glow
      ior: 1.54,
      reflectivity: 0.98,
      specularColor: new THREE.Color('#ffffff'),
    });
  }, []);

  // Bevel edge accent material for badge back/sides
  const backPlateMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e11d48',
      roughness: 0.22,
      metalness: 0.08,
    });
  }, []);

  // Porcelain glossy white with pink rim subsurface effect for the Thumbs-Up icon
  const iconMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#f8fafc', // Ultra clean white
      roughness: 0.16,
      metalness: 0.02,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      reflectivity: 0.85,
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
        <boxGeometry args={[9.8, 9.8, 1.2]} />
      </mesh>

      {/* 3. 3D White Embossed Thumbs-Up Icon */}
      <group position={[-0.15, -0.2, iconPopZ]}>
        {/* Left vertical cuff bar tilted ~12 degrees matching reference */}
        <mesh
          position={[-1.9, -0.15, 0]}
          rotation={[0, 0, 0.2]}
          geometry={cuffGeo}
          material={iconMaterial}
          castShadow
        />

        {/* Hand with angled thumb & sculpted 4 fingers */}
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
      const radius = 9.2 + (i % 3) * 1.8;
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
      emissiveIntensity: 0.35,
    });
  }, []);

  const heartPinkMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#fb7185',
      roughness: 0.2,
      clearcoat: 0.8,
      emissive: '#f43f5e',
      emissiveIntensity: 0.3,
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

// Scene Orchestration: Centered Hero Isometric Showcase with Elegant 3D Float
const LikeButtonScene: React.FC<{ progress: number }> = ({ progress }) => {
  // Hero Isometric perspective matching reference:
  // Base Hero Orientation: ~35 deg yaw, ~22 deg pitch, ~-12 deg roll
  // Elegant periodic floating dance (starts & ends at exact Hero Isometric pose)
  const heroYaw = -0.58; // ~33 degrees yaw showing both front face and bevel sides
  const heroPitch = 0.36; // ~21 degrees pitch showing top bevel
  const heroRoll = -0.22; // ~-12 degrees roll

  // Smooth harmonic oscillation (100% Seamless Loop across 10 seconds)
  const rotY = heroYaw + Math.sin(progress * Math.PI * 2) * 0.28;
  const tiltX = heroPitch + Math.cos(progress * Math.PI * 2) * 0.12;
  const rollZ = heroRoll + Math.sin(progress * Math.PI * 2) * 0.08;

  // Gentle vertical levitation bob (2 full cycles = seamless)
  const hoverY = Math.sin(progress * Math.PI * 4) * 0.45;

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

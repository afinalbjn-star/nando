import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const DURATION_FRAMES = 600;

// Camera and Studio Lighting setup
const StudioRig: React.FC = () => {
  useThree(({ camera }) => {
    camera.position.set(0, 3.2, 28);
    camera.lookAt(0, 0.4, 0);
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      {/* Key Light - Soft Warm Studio Sun */}
      <directionalLight position={[15, 22, 18]} intensity={2.8} color="#ffffff" castShadow />
      {/* Fill Light - Cool Industrial Fill */}
      <directionalLight position={[-18, 10, 15]} intensity={1.5} color="#e0f2fe" />
      {/* Rim / Hair Light for Crisp Silhouette Highlighting */}
      <directionalLight position={[0, 18, -20]} intensity={3.5} color="#fed7aa" />
      {/* Bottom bounce light for under-visor and straps illumination */}
      <directionalLight position={[0, -12, 10]} intensity={0.8} color="#64748b" />
    </>
  );
};

// Procedural Canvas Texture Generators
function createHelmetTexture(): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base industrial safety yellow with subtle surface gradient
  const grad = ctx.createRadialGradient(512, 400, 100, 512, 512, 600);
  grad.addColorStop(0, '#fac815');
  grad.addColorStop(0.7, '#eab308');
  grad.addColorStop(1, '#ca8a04');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Surface wear: subtle grunge spots and micro scratches
  ctx.fillStyle = 'rgba(113, 63, 18, 0.15)';
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    const rSize = Math.random() * 3.5 + 0.5;
    ctx.beginPath();
    ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Realistic scratch marks across the front dome
  ctx.strokeStyle = 'rgba(74, 43, 10, 0.35)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 25; i++) {
    const sx = 200 + Math.random() * 600;
    const sy = 250 + Math.random() * 500;
    const sl = 20 + Math.random() * 50;
    const sa = Math.random() * Math.PI - 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(sa) * sl, sy + Math.sin(sa) * sl);
    ctx.stroke();
  }

  // Silver reflective safety stripes (Prismatic Retroreflective Pattern)
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(120, 680, 260, 48);
  ctx.fillRect(644, 680, 260, 48);

  // Micro-dots on reflective tape
  ctx.fillStyle = '#94a3b8';
  for (let y = 684; y < 724; y += 8) {
    for (let x = 124; x < 376; x += 8) {
      ctx.fillRect(x, y, 2.5, 2.5);
    }
    for (let x = 648; x < 900; x += 8) {
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  }

  // Roughness Map Canvas
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 1024;
  rCanvas.height = 1024;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#666666'; // baseline roughness ~0.4
  rCtx.fillRect(0, 0, 1024, 1024);
  // Reflective tape is smooth/glossy
  rCtx.fillStyle = '#222222';
  rCtx.fillRect(120, 680, 260, 48);
  rCtx.fillRect(644, 680, 260, 48);

  const map = new THREE.CanvasTexture(canvas);
  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  return { map, roughnessMap };
}

// Safety Gear Logo Canvas (Green Cogwheel + Cross)
function createSafetyLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;
  const outerR = 190;
  const innerR = 145;
  const numTeeth = 11;
  const greenColor = '#15803d'; // Safety Green ISO standard

  ctx.fillStyle = greenColor;

  // Draw Cogwheel
  ctx.beginPath();
  for (let i = 0; i < numTeeth * 2; i++) {
    const angle = (i * Math.PI) / numTeeth - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Hole in middle
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, 115, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Inner ring
  ctx.strokeStyle = greenColor;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, 115, 0, Math.PI * 2);
  ctx.stroke();

  // Cross in the center
  ctx.fillStyle = greenColor;
  const armLen = 78;
  const armThick = 26;
  // Vertical
  ctx.fillRect(cx - armThick / 2, cy - armLen / 2, armThick, armLen);
  // Horizontal
  ctx.fillRect(cx - armLen / 2, cy - armThick / 2, armLen, armThick);

  // Subtle weathered patina on logo
  ctx.fillStyle = '#ca8a04';
  for (let i = 0; i < 35; i++) {
    const rx = cx + (Math.random() - 0.5) * 260;
    const ry = cy + (Math.random() - 0.5) * 260;
    ctx.fillRect(rx, ry, Math.random() * 4 + 1, Math.random() * 4 + 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

// Complete 3D Construction Safety Helmet
const SafetyHelmetModel: React.FC = () => {
  const { helmetTextures, logoTexture } = useMemo(() => {
    return {
      helmetTextures: createHelmetTexture(),
      logoTexture: createSafetyLogoTexture(),
    };
  }, []);

  // Main Helmet Dome Geometry (Lathe Geometry customized for helmet cross-section)
  const helmetDomeGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.0, 4.8),
      new THREE.Vector2(1.2, 4.75),
      new THREE.Vector2(2.6, 4.3),
      new THREE.Vector2(3.9, 3.4),
      new THREE.Vector2(4.8, 2.0),
      new THREE.Vector2(5.2, 0.4),
      new THREE.Vector2(5.25, -0.4),
      // Visor Rim Extrusion
      new THREE.Vector2(6.2, -0.75),
      new THREE.Vector2(6.9, -1.05),
      new THREE.Vector2(6.85, -1.25),
      new THREE.Vector2(5.5, -1.0),
      new THREE.Vector2(5.05, -0.7),
      new THREE.Vector2(4.9, -0.5),
      new THREE.Vector2(0.0, -0.5),
    ];
    const geo = new THREE.LatheGeometry(pts, 48);
    // Scale non-uniformly to give true anatomical oval shape (longer front-to-back than side-to-side)
    geo.scale(0.92, 1.0, 1.15);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Center Ridge Crest Geometry
  const crestGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.45, 0);
    shape.lineTo(-0.35, 0.9);
    shape.lineTo(0.35, 0.9);
    shape.lineTo(0.45, 0);
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 7.2,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, []);

  // Visor (Tinted Curved Polycarbonate Eye-Shield)
  const eyeShieldGeo = useMemo(() => {
    // Semi-cylindrical curved shield
    const geo = new THREE.CylinderGeometry(
      4.8,
      4.7,
      2.8,
      36,
      1,
      true,
      -Math.PI * 0.42,
      Math.PI * 0.84
    );
    geo.scale(0.9, 1.0, 1.1);
    return geo;
  }, []);

  // Materials
  const helmetMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: helmetTextures.map,
      roughnessMap: helmetTextures.roughnessMap,
      roughness: 0.38,
      metalness: 0.12,
      color: '#facc15',
    });
  }, [helmetTextures]);

  const crestMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.42,
      metalness: 0.1,
    });
  }, []);

  const visorMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#0f172a',
      transparent: true,
      opacity: 0.72,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.45,
      ior: 1.58,
      side: THREE.DoubleSide,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
  }, []);

  const blackRubberMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#18181b',
      roughness: 0.75,
      metalness: 0.2,
    });
  }, []);

  const darkMetalMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#27272a',
      roughness: 0.3,
      metalness: 0.85,
    });
  }, []);

  const lensMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.52,
      emissive: '#fef08a',
      emissiveIntensity: 0.4,
    });
  }, []);

  const ledCoreMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#ffffff',
    });
  }, []);

  const logoDecalMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [logoTexture]);

  return (
    <group position={[0, -0.4, 0]}>
      {/* 1. Main Dome Shell */}
      <mesh geometry={helmetDomeGeo} material={helmetMat} castShadow receiveShadow />

      {/* 2. Aerodynamic Center Crown Ridge */}
      <mesh
        geometry={crestGeo}
        material={crestMat}
        position={[0, 4.35, 0.4]}
        rotation={[0.18, 0, 0]}
        castShadow
      />

      {/* 3. Safety Gear Logo on Front Center/Left */}
      <mesh position={[0, 2.7, 4.88]} rotation={[-0.32, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <primitive object={logoDecalMat} />
      </mesh>

      {/* 4. Headlamp / Industrial Flashlight Rig */}
      <group position={[0, 4.85, 3.8]} rotation={[-0.42, 0, 0]}>
        {/* Lamp Mounting Bracket */}
        <mesh position={[0, -0.2, -0.2]} material={blackRubberMat}>
          <boxGeometry args={[2.1, 1.2, 1.2]} />
        </mesh>
        {/* Lamp Cylindrical Housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={darkMetalMat}>
          <cylinderGeometry args={[0.92, 0.82, 1.4, 28]} />
        </mesh>
        {/* Knurled Bezel Ring */}
        <mesh position={[0, 0, 0.65]} rotation={[Math.PI / 2, 0, 0]} material={blackRubberMat}>
          <torusGeometry args={[0.88, 0.14, 16, 28]} />
        </mesh>
        {/* Glass Lens */}
        <mesh position={[0, 0, 0.72]} material={lensMat}>
          <circleGeometry args={[0.78, 28]} />
        </mesh>
        {/* Emissive High-Power Cree LED Chip */}
        <mesh position={[0, 0, 0.45]} material={ledCoreMat}>
          <boxGeometry args={[0.3, 0.3, 0.1]} />
        </mesh>
        {/* Subtle forward beam headlight */}
        <pointLight position={[0, 0, 1.2]} intensity={2.4} color="#fef08a" distance={18} />
      </group>

      {/* 5. Drop-Down Protective Tinted Visor / Eye-Shield */}
      <group position={[0, -0.85, 0.85]}>
        <mesh geometry={eyeShieldGeo} material={visorMat} />
        {/* Visor Side Pivot Hinge Mounts */}
        <mesh position={[4.15, 0.95, -0.8]} rotation={[0, 0, Math.PI / 2]} material={blackRubberMat}>
          <cylinderGeometry args={[0.42, 0.42, 0.5, 20]} />
        </mesh>
        <mesh position={[-4.15, 0.95, -0.8]} rotation={[0, 0, Math.PI / 2]} material={blackRubberMat}>
          <cylinderGeometry args={[0.42, 0.42, 0.5, 0.5]} />
        </mesh>
      </group>

      {/* 6. Professional 4-Point Y-Strap Suspension System & Chin Cup */}
      <group position={[0, -1.0, 0]}>
        {/* Left Front Strap */}
        <mesh position={[3.6, -1.6, 0.7]} rotation={[0.2, 0.1, -0.28]} material={blackRubberMat}>
          <boxGeometry args={[0.22, 3.6, 0.55]} />
        </mesh>
        {/* Left Rear Strap */}
        <mesh position={[3.7, -1.6, -1.5]} rotation={[-0.2, 0.1, -0.28]} material={blackRubberMat}>
          <boxGeometry args={[0.22, 3.6, 0.55]} />
        </mesh>
        {/* Right Front Strap */}
        <mesh position={[-3.6, -1.6, 0.7]} rotation={[0.2, -0.1, 0.28]} material={blackRubberMat}>
          <boxGeometry args={[0.22, 3.6, 0.55]} />
        </mesh>
        {/* Right Rear Strap */}
        <mesh position={[-3.7, -1.6, -1.5]} rotation={[-0.2, -0.1, 0.28]} material={blackRubberMat}>
          <boxGeometry args={[0.22, 3.6, 0.55]} />
        </mesh>

        {/* Quick-Release Buckle on left side */}
        <mesh position={[2.9, -3.2, -0.1]} material={darkMetalMat}>
          <boxGeometry args={[0.45, 0.85, 0.7]} />
        </mesh>

        {/* Ergonomic Molded Chin Cup */}
        <mesh position={[0, -4.6, 0.3]} rotation={[0.25, 0, 0]} material={blackRubberMat}>
          <boxGeometry args={[2.5, 0.85, 1.4]} />
        </mesh>
        {/* Ventilation Slits in Chin Cup */}
        <mesh position={[-0.6, -4.55, 1.02]} rotation={[0.25, 0, 0]} material={darkMetalMat}>
          <boxGeometry args={[0.25, 0.45, 0.1]} />
        </mesh>
        <mesh position={[0, -4.55, 1.02]} rotation={[0.25, 0, 0]} material={darkMetalMat}>
          <boxGeometry args={[0.25, 0.45, 0.1]} />
        </mesh>
        <mesh position={[0.6, -4.55, 1.02]} rotation={[0.25, 0, 0]} material={darkMetalMat}>
          <boxGeometry args={[0.25, 0.45, 0.1]} />
        </mesh>
      </group>

      {/* 7. Side Accessory Mount Slots (Earmuff / Face-shield Universal Slots) */}
      <mesh position={[5.1, -0.7, 0]} material={blackRubberMat}>
        <boxGeometry args={[0.4, 0.8, 1.6]} />
      </mesh>
      <mesh position={[-5.1, -0.7, 0]} material={blackRubberMat}>
        <boxGeometry args={[0.4, 0.8, 1.6]} />
      </mesh>
    </group>
  );
};

// Floating Welding Sparks / Atmospheric Bokeh Dust (100% Seamless Periodic Loop)
const AtmosphericSparks: React.FC<{ progress: number }> = ({ progress }) => {
  const sparkCount = 85;

  const sparks = useMemo(() => {
    const list = [];
    for (let i = 0; i < sparkCount; i++) {
      // Deterministic pseudo-random distribution
      const seed = i * 133.71;
      const x = Math.sin(seed * 1.3) * 16;
      const yBase = Math.cos(seed * 2.1) * 12;
      const z = Math.sin(seed * 3.7) * 14;
      const size = 0.08 + (Math.abs(Math.sin(seed * 5.1)) % 0.16);
      const speed = 1.0 + (i % 3);
      const phase = (i / sparkCount) * Math.PI * 2;
      list.push({ x, yBase, z, size, speed, phase });
    }
    return list;
  }, []);

  const sparkMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#fb923c', // Glowing ember amber/orange
    });
  }, []);

  return (
    <group>
      {sparks.map((s, idx) => {
        // Pure integer periodic float offset ensuring 100% seamless looping
        const floatY = s.yBase + Math.sin(progress * Math.PI * 2 * s.speed + s.phase) * 2.2;
        const floatX = s.x + Math.cos(progress * Math.PI * 2 + s.phase) * 1.2;
        return (
          <mesh key={idx} position={[floatX, floatY, s.z]} material={sparkMat}>
            <sphereGeometry args={[s.size, 8, 8]} />
          </mesh>
        );
      })}
    </group>
  );
};

// Animated Turntable Showcase Scene with Harmonic Wobble
const ConstructionHelmetScene: React.FC<{ progress: number }> = ({ progress }) => {
  // Pure 360-degree rotation across the 10-second (600-frame) loop
  const rotY = progress * Math.PI * 2 - Math.PI * 0.25;

  // Subtle industrial pitch & roll breathing motion (integer cycle = 1, seamless loop)
  const tiltX = Math.sin(progress * Math.PI * 2) * 0.09 + 0.12;
  const rollZ = Math.cos(progress * Math.PI * 2) * 0.06;
  const floatY = Math.sin(progress * Math.PI * 2) * 0.35;

  return (
    <>
      <StudioRig />
      <AtmosphericSparks progress={progress} />
      <group position={[0, floatY, 0]} rotation={[tiltX, rotY, rollZ]}>
        <SafetyHelmetModel />
      </group>
    </>
  );
};

// Main Remotion Composition (Strict Alpha Channel, 4K UHD, 10s Seamless Loop)
export const ConstructionSafetyHelmet: React.FC<{
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
        <ConstructionHelmetScene progress={progress} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

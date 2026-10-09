import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function seeded(seed: number) {
  const x = Math.sin(seed * 91.3458 + 47.123) * 43758.5453;
  return x - Math.floor(x);
}

const TOTAL_STRANDS = 220;
const SEGMENTS_PER_TUBE = 84;
const RADIAL_SEGMENTS = 8;
const TUNNEL_LENGTH = 85;

class SpiralStrandCurve extends THREE.Curve<THREE.Vector3> {
  outerR: number;
  innerR: number;
  swirlTotal: number;
  phase0: number;
  length: number;

  constructor(outerR: number, innerR: number, swirlTotal: number, phase0: number, length: number) {
    super();
    this.outerR = outerR;
    this.innerR = innerR;
    this.swirlTotal = swirlTotal;
    this.phase0 = phase0;
    this.length = length;
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    // Funnel curve matching reference: wide camera mouth, compressing into spiral vortex
    const r = this.innerR + (this.outerR - this.innerR) * Math.pow(1.0 - t, 1.45);
    // Spiral twist accelerates smoothly towards the center
    const angle = this.phase0 + this.swirlTotal * Math.pow(t, 0.94);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const z = -t * this.length;
    return optionalTarget.set(x, y, z);
  }
}

export const FiberOpticStream: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({ width = 3840, height = 2160, totalFrames = 600 }) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) % 1.0;

  // Build merged geometry & strand meta
  const mergedGeometry = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];

    for (let i = 0; i < TOTAL_STRANDS; i++) {
      const tier = i % 3;
      let outerR: number;
      let innerR: number;
      let radiusTube: number;

      if (tier === 0) {
        // Foreground rim cables (prominent thick strands)
        outerR = 16.5 + seeded(i * 3 + 1) * 5.0;
        innerR = 2.4 + seeded(i * 3 + 2) * 0.9;
        radiusTube = 0.065 + seeded(i * 3 + 3) * 0.025;
      } else if (tier === 1) {
        // Mid-tier cables
        outerR = 12.5 + seeded(i * 5 + 1) * 4.2;
        innerR = 1.8 + seeded(i * 5 + 2) * 0.7;
        radiusTube = 0.05 + seeded(i * 5 + 3) * 0.018;
      } else {
        // Deep interior vortex cables
        outerR = 9.2 + seeded(i * 7 + 1) * 3.6;
        innerR = 1.3 + seeded(i * 7 + 2) * 0.5;
        radiusTube = 0.042 + seeded(i * 7 + 3) * 0.015;
      }

      // Swirl around 2.6 to 3.5 radians
      const swirlTotal = 2.7 + seeded(i * 11 + 4) * 0.8;
      const baseAngle = (i / TOTAL_STRANDS) * Math.PI * 2;
      const phase0 = baseAngle + (seeded(i * 13 + 5) - 0.5) * 0.05;

      const curve = new SpiralStrandCurve(outerR, innerR, swirlTotal, phase0, TUNNEL_LENGTH);
      const tubeGeo = new THREE.TubeGeometry(
        curve,
        SEGMENTS_PER_TUBE,
        radiusTube,
        RADIAL_SEGMENTS,
        false
      );

      // Color selection matching reference image:
      // ~52% Electric Cyan (#00F0FF)
      // ~42% Hot Laser Magenta (#FF007F)
      // ~6% Royal Ice Blue (#38BDF8)
      const randColor = seeded(i * 17 + 6);
      const colorType = randColor < 0.52 ? 0.0 : randColor < 0.94 ? 1.0 : 2.0;

      // Integer speed multiplier for 100% seamless loop
      const pulseSpeed = 2 + Math.floor(seeded(i * 19 + 7) * 4); // 2, 3, 4, 5 full cycles
      const pulseOffset = seeded(i * 23 + 8);
      const pulseDensity = 1.0 + Math.floor(seeded(i * 29 + 9) * 2); // 1 or 2 pulses

      const vertCount = tubeGeo.attributes.position.count;
      const aColorType = new Float32Array(vertCount);
      const aStrandMeta = new Float32Array(vertCount * 3);

      for (let v = 0; v < vertCount; v++) {
        aColorType[v] = colorType;
        const idx3 = v * 3;
        aStrandMeta[idx3 + 0] = pulseSpeed;
        aStrandMeta[idx3 + 1] = pulseOffset;
        aStrandMeta[idx3 + 2] = pulseDensity;
      }

      tubeGeo.setAttribute('aColorType', new THREE.BufferAttribute(aColorType, 1));
      tubeGeo.setAttribute('aStrandMeta', new THREE.BufferAttribute(aStrandMeta, 3));

      geometries.push(tubeGeo);
    }

    return mergeGeometries(geometries, false);
  }, []);

  // Material Shader for continuous longitudinal streak propagation
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCyan: { value: new THREE.Color('#00F0FF') },
        uMagenta: { value: new THREE.Color('#FF007F') },
        uIceBlue: { value: new THREE.Color('#38BDF8') },
        uCoreWhite: { value: new THREE.Color('#FFFFFF') },
        uCableDark: { value: new THREE.Color('#0C0E14') },
        uCableRim: { value: new THREE.Color('#2A3245') },
      },
      vertexShader: `
        attribute float aColorType;
        attribute vec3 aStrandMeta;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        varying float vColorType;
        varying vec3 vStrandMeta;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vColorType = aColorType;
          vStrandMeta = aStrandMeta;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uCyan;
        uniform vec3 uMagenta;
        uniform vec3 uIceBlue;
        uniform vec3 uCoreWhite;
        uniform vec3 uCableDark;
        uniform vec3 uCableRim;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        varying float vColorType;
        varying vec3 vStrandMeta;

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPosition);

          // Specular highlights on dark glossy cables
          vec3 lightDir = normalize(vec3(0.25, 0.45, 0.85));
          float diff = max(dot(N, lightDir), 0.0);
          
          vec3 H = normalize(lightDir + V);
          float spec = pow(max(dot(N, H), 0.0), 30.0);
          float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);

          vec3 cableColor = mix(uCableDark, uCableRim, diff * 0.45 + spec * 0.8 + rim * 0.55);

          // vUv.x is longitudinal along the tube (0.0 to 1.0)
          float tAlong = vUv.x;
          float speed = vStrandMeta.x;
          float offset = vStrandMeta.y;
          float density = vStrandMeta.z;

          // Seamless loop calculation:
          // Pulses travel down into the vortex tunnel (towards tAlong = 1.0)
          float pulseCoord = fract(tAlong * density - uTime * speed + offset);

          // Laser tracer streak profile:
          // Compact, energetic streak with hot bullet head and tapered glowing tail
          float head = smoothstep(0.965, 0.995, pulseCoord) * (1.0 - smoothstep(0.995, 1.0, pulseCoord) * 0.9);
          float tail = smoothstep(0.74, 0.99, pulseCoord) * pow(pulseCoord, 4.0);
          float aura = smoothstep(0.60, 0.98, pulseCoord) * pow(pulseCoord, 6.0);

          float streakIntensity = head * 14.0 + tail * 4.5 + aura * 1.8;

          // Tiny sharp luminous bead dots on strands
          float beadCoord = fract(tAlong * 8.0 - uTime * (speed * 0.5) + offset * 4.0);
          float bead = smoothstep(0.975, 0.992, beadCoord) * (1.0 - smoothstep(0.992, 1.0, beadCoord)) * 4.5;

          // Color selection
          vec3 beamColor;
          if (vColorType < 0.5) {
            beamColor = uCyan;
          } else if (vColorType < 1.5) {
            beamColor = uMagenta;
          } else {
            beamColor = uIceBlue;
          }

          // Hot white-core laser head
          vec3 emissiveLaser = mix(beamColor, uCoreWhite, head * 0.85);

          // Combine cable surface with vibrant laser streak
          vec3 finalColor = cableColor + emissiveLaser * streakIntensity + beamColor * bead;

          // Ambient colored bleed onto the cable body
          finalColor += beamColor * aura * 0.8;

          // Dark central void mask: smooth fade to black starting at t = 0.82
          float voidMask = 1.0 - smoothstep(0.80, 0.95, tAlong);
          // Entrance fade at near edge
          float entranceMask = smoothstep(0.015, 0.07, tAlong);

          finalColor *= voidMask * entranceMask;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
    });
  }, []);

  if (shaderMaterial) {
    shaderMaterial.uniforms.uTime.value = u;
  }

  // Floating ambient neon dust motes matching reference
  const particleGeo = useMemo(() => {
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color('#00F0FF');
    const magenta = new THREE.Color('#FF007F');

    for (let i = 0; i < count; i++) {
      const t = seeded(i * 11 + 1);
      const angle = seeded(i * 11 + 2) * Math.PI * 2;
      const r = (1.6 + seeded(i * 11 + 3) * 13.0) * (1.0 - t * 0.65);
      positions[i * 3 + 0] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
      positions[i * 3 + 2] = -t * TUNNEL_LENGTH;

      const isCyan = seeded(i * 11 + 4) > 0.42;
      const c = isCyan ? cyan : magenta;
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  // 100% mathematical seamless loop camera choreography:
  // Elegant camera breathing & hypnotic swirl
  const camAngle = u * Math.PI * 2;
  const camX = Math.sin(camAngle) * 0.22;
  const camY = Math.cos(camAngle) * 0.22;
  const camZ = 1.85 + Math.sin(camAngle * 2) * 0.12;

  // Hypnotic tunnel revolution: 1 full rotation in 10s = 100% seamless loop
  const tunnelRoll = camAngle;

  return (
    <div style={{ width, height, background: '#020306', overflow: 'hidden' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [camX, camY, camZ], fov: 56, near: 0.1, far: 200 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <ambientLight intensity={0.5} color="#1E293B" />
        <directionalLight position={[0, 0, 6]} intensity={2.2} color="#E2E8F0" />
        <pointLight position={[0, 0, -3]} intensity={16} distance={30} color="#00F0FF" />
        <pointLight position={[0, 0, -20]} intensity={11} distance={42} color="#FF007F" />

        <group rotation={[0, 0, tunnelRoll]}>
          <mesh geometry={mergedGeometry} material={shaderMaterial} />
        </group>

        {/* Ambient floating sparkles */}
        <points geometry={particleGeo}>
          <pointsMaterial
            size={0.12}
            vertexColors
            transparent
            opacity={0.88}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </ThreeCanvas>
    </div>
  );
};

import React, { useMemo, useRef } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';

const TunnelScene: React.FC<{ u: number }> = ({ u }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const dustRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#2563EB') }, // Royal Blue
      uColor2: { value: new THREE.Color('#D946EF') }, // Magenta Laser
      uColor3: { value: new THREE.Color('#93C5FD') }, // Ice Blue
      uBgColor: { value: new THREE.Color('#09090B') }, // Carbon Black
    }),
    []
  );

  if (shaderRef.current) shaderRef.current.uniforms.uTime.value = u;
  if (dustRef.current) dustRef.current.uniforms.uTime.value = u;

  // Tunnel Geometry
  const geo = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(8, 8, 300, 96, 150, true);
    geometry.rotateX(Math.PI / 2); // align with Z axis
    return geometry;
  }, []);

  // Dust Geometry
  const dustGeo = useMemo(() => {
    const pts = new THREE.BufferGeometry();
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3); // to store random seeds
    for (let i = 0; i < count; i++) {
      // distribute points in a cylinder around Z axis
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 7.5; // keep inside radius 8
      const z = Math.random() * -300; 
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = z;
      
      randoms[i * 3 + 0] = Math.random();
      randoms[i * 3 + 1] = Math.random();
      randoms[i * 3 + 2] = Math.random();
    }
    pts.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pts.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
    return pts;
  }, []);

  // Shared curve math for both shaders
  const curveChunk = `
    float PI2 = 6.28318530718;
    float loopDist = 100.0;
    float freq1 = PI2 / loopDist;
    float freq2 = (PI2 * 2.0) / loopDist;
    
    vec2 getCurveOffset(float z, float t) {
      float virtualZ = z + t * loopDist;
      float cx = sin(virtualZ * freq1) * 6.0 + sin(virtualZ * freq2) * 3.0;
      float cy = cos(virtualZ * freq1) * 5.0 + sin(virtualZ * freq2 * 0.5) * 4.0;
      return vec2(cx, cy);
    }
  `;

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPos;
    uniform float uTime;
    
    ${curveChunk}

    void main() {
      vUv = uv;
      vec3 pos = position;

      vec2 curve = getCurveOffset(pos.z, uTime);
      vec2 camCurve = getCurveOffset(0.0, uTime);
      
      pos.x += curve.x - camCurve.x;
      pos.y += curve.y - camCurve.y;

      float twist = (curve.x - camCurve.x) * 0.1;
      float x = pos.x;
      float y = pos.y;
      pos.x = x * cos(twist) - y * sin(twist);
      pos.y = x * sin(twist) + y * cos(twist);

      vPos = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vPos;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uBgColor;

    float hash(float n) { return fract(sin(n) * 1e4); }

    void main() {
      float vOffset = vUv.y * 3.0 - uTime;
      
      float strandHash = hash(floor(vUv.x * 600.0)); 
      float strandActive = step(0.3, strandHash); 
      
      float strandBrightness = hash(floor(vUv.x * 600.0) + 12.34);
      
      float pulseSpeed = 4.0 + hash(floor(vUv.x * 600.0) * 1.1) * 8.0; 
      float pulseOffset = hash(floor(vUv.x * 600.0) * 2.2) * 100.0;
      
      float pulse = fract(vOffset * 4.0 + uTime * pulseSpeed + pulseOffset);
      
      float pulseIntensity = smoothstep(0.95, 1.0, pulse) * smoothstep(1.0, 0.99, pulse) * 25.0;
      pulseIntensity += smoothstep(0.5, 1.0, pulse) * 2.0;

      vec3 finalColor = uBgColor * (0.1 + strandBrightness * 0.2) * strandActive;
      
      float colorPick = hash(floor(vUv.x * 600.0) * 3.3);
      vec3 pulseColor;
      if(colorPick < 0.33) pulseColor = uColor1;
      else if(colorPick < 0.66) pulseColor = uColor2;
      else pulseColor = mix(uColor1, uColor2, 0.5);
      
      finalColor += pulseColor * pulseIntensity * strandActive * strandBrightness;
      
      float dist = -vPos.z;
      float fogFactor = smoothstep(60.0, 220.0, dist);
      finalColor = mix(finalColor, vec3(0.0), fogFactor);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  const dustVertexShader = `
    attribute vec3 aRandom;
    uniform float uTime;
    varying vec3 vColor;
    varying float vAlpha;
    uniform vec3 uColor3; // Ice Blue for dust
    
    ${curveChunk}

    void main() {
      vec3 pos = position;
      
      // Animate dust flowing towards the camera (positive Z)
      // Make it loop perfectly over loopDist (100)
      float moveZ = pos.z + uTime * loopDist * 1.5; // moves slightly faster than camera
      float z = mod(moveZ, 300.0) - 300.0;
      
      pos.z = z;

      // Follow the same curve as the tunnel
      vec2 curve = getCurveOffset(pos.z, uTime);
      vec2 camCurve = getCurveOffset(0.0, uTime);
      
      pos.x += curve.x - camCurve.x;
      pos.y += curve.y - camCurve.y;
      
      // Wobble
      pos.x += sin(uTime * 10.0 * aRandom.x + aRandom.y * PI2) * 0.5;
      pos.y += cos(uTime * 10.0 * aRandom.z + aRandom.x * PI2) * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = (12.0 * aRandom.x + 4.0) * (50.0 / -mvPosition.z);
      
      vColor = uColor3;
      
      // Fade out near and far
      float dist = -pos.z;
      vAlpha = smoothstep(300.0, 200.0, dist) * smoothstep(0.0, 20.0, dist) * 0.8;
    }
  `;

  const dustFragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      // Soft circle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float len = length(coord);
      if(len > 0.5) discard;
      
      float alpha = (0.5 - len) * 2.0 * vAlpha;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  return (
    <group>
      <mesh geometry={geo} position={[0, 0, -150]}>
        <shaderMaterial
          ref={shaderRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.BackSide}
          transparent={true}
          depthWrite={false}
        />
      </mesh>
      
      <points geometry={dustGeo} position={[0, 0, 0]}>
        <shaderMaterial
          ref={dustRef}
          vertexShader={dustVertexShader}
          fragmentShader={dustFragmentShader}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

export const FiberOpticStream: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({ width = 3840, height = 2160, totalFrames = 600 }) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) % 1.0;

  return (
    <div style={{ width, height, background: '#000' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 300 }}
        gl={{ antialias: true, alpha: true }}
      >
        <TunnelScene u={u} />
      </ThreeCanvas>
    </div>
  );
};

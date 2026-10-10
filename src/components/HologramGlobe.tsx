import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const R = 30;

function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function hash(x: number, y: number, z: number) {
    let n = x * 137.0 + y * 289.0 + z * 341.0;
    n = Math.sin(n) * 43758.5453;
    return n - Math.floor(n);
}

function noise(x: number, y: number, z: number) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    
    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);
    const uz = fz * fz * (3.0 - 2.0 * fz);
    
    const n000 = hash(ix, iy, iz);
    const n100 = hash(ix+1, iy, iz);
    const n010 = hash(ix, iy+1, iz);
    const n110 = hash(ix+1, iy+1, iz);
    const n001 = hash(ix, iy, iz+1);
    const n101 = hash(ix+1, iy, iz+1);
    const n011 = hash(ix, iy+1, iz+1);
    const n111 = hash(ix+1, iy+1, iz+1);
    
    const mix00 = n000 * (1 - ux) + n100 * ux;
    const mix10 = n010 * (1 - ux) + n110 * ux;
    const mix01 = n001 * (1 - ux) + n101 * ux;
    const mix11 = n011 * (1 - ux) + n111 * ux;
    
    const mix0 = mix00 * (1 - uy) + mix10 * uy;
    const mix1 = mix01 * (1 - uy) + mix11 * uy;
    
    return mix0 * (1 - uz) + mix1 * uz;
}

function fbm(x: number, y: number, z: number) {
    let value = 0.0;
    let amplitude = 0.5;
    let frequency = 1.0;
    for (let i = 0; i < 4; i++) {
        value += amplitude * noise(x * frequency, y * frequency, z * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

const Globe = ({ u }: { u: number }) => {
  const rnd = useMemo(() => mulberry32(123456), []);
  const uTimeUniform = useMemo(() => new THREE.Uniform(0), []);
  uTimeUniform.value = u;
  
  const { continentGeo, cities, connectionsGeo } = useMemo(() => {
     const baseIco = new THREE.IcosahedronGeometry(R, 30).toNonIndexed();
     const pos = baseIco.attributes.position.array;
     
     const keptPositions: number[] = [];
     const centerPoints: THREE.Vector3[] = [];
     
     for(let i=0; i<pos.length; i+=9) {
        const v1 = new THREE.Vector3(pos[i], pos[i+1], pos[i+2]);
        const v2 = new THREE.Vector3(pos[i+3], pos[i+4], pos[i+5]);
        const v3 = new THREE.Vector3(pos[i+6], pos[i+7], pos[i+8]);
        
        const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
        
        const lat = Math.asin(center.y / R);
        const lon = Math.atan2(center.z, center.x);
        
        const nx = Math.cos(lat) * Math.cos(lon * 1.5);
        const ny = Math.sin(lat * 1.2);
        const nz = Math.cos(lat) * Math.sin(lon * 1.5);
        
        const nval = fbm(nx * 2.2, ny * 2.2, nz * 2.2) + fbm(nx * 5.0, ny * 5.0, nz * 5.0) * 0.3;
        
        if (nval > 0.45) {
           keptPositions.push(
             v1.x, v1.y, v1.z,
             v2.x, v2.y, v2.z,
             v3.x, v3.y, v3.z
           );
           centerPoints.push(center);
        }
     }
     
     const cGeo = new THREE.BufferGeometry();
     cGeo.setAttribute('position', new THREE.Float32BufferAttribute(keptPositions, 3));
     cGeo.computeVertexNormals();
     
     const validCities: THREE.Vector3[] = [];
     for(let i=0; i<150; i++) {
        const idx = Math.floor(rnd() * centerPoints.length);
        if (centerPoints[idx]) validCities.push(centerPoints[idx]);
     }
     
     const connsPositions = [];
     const connsUvs = [];
     
     for(let i=0; i<80; i++) {
        const c1 = validCities[Math.floor(rnd() * validCities.length)];
        const c2 = validCities[Math.floor(rnd() * validCities.length)];
        if (!c1 || !c2 || c1 === c2) continue;
        
        const dist = c1.distanceTo(c2);
        if (dist < R * 0.4) continue;
        
        const mid = new THREE.Vector3().addVectors(c1, c2).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(R + dist * 0.25); 
        
        const curve = new THREE.QuadraticBezierCurve3(c1, mid, c2);
        const points = curve.getPoints(50);
        
        for(let p=0; p<points.length-1; p++) {
           connsPositions.push(points[p].x, points[p].y, points[p].z);
           connsPositions.push(points[p+1].x, points[p+1].y, points[p+1].z);
           connsUvs.push(p/50, (p+1)/50);
        }
     }
     
     const connGeo = new THREE.BufferGeometry();
     connGeo.setAttribute('position', new THREE.Float32BufferAttribute(connsPositions, 3));
     connGeo.setAttribute('aProgress', new THREE.Float32BufferAttribute(connsUvs, 1));
     
     return { continentGeo: cGeo, cities: validCities, connectionsGeo: connGeo };
  }, [rnd]);
  
  const connMat = useMemo(() => {
      const mat = new THREE.LineBasicMaterial({ color: '#2DD4BF', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
      mat.onBeforeCompile = (shader) => {
         shader.uniforms.uTime = uTimeUniform;
         shader.vertexShader = `
            attribute float aProgress;
            varying float vProgress;
            ` + shader.vertexShader.replace('void main() {', 'void main() { vProgress = aProgress;');
         shader.fragmentShader = `
            uniform float uTime;
            varying float vProgress;
            ` + shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            float pulse = fract(vProgress * 2.0 - uTime * 3.0);
            float glow = smoothstep(0.8, 1.0, pulse) * smoothstep(1.0, 0.95, pulse);
            diffuseColor.rgb += vec3(0.5, 1.0, 0.8) * glow * 10.0;
            diffuseColor.a *= (0.1 + glow);
            `
            );
      };
      return mat;
  }, [uTimeUniform]);

  const citiesMesh = useMemo(() => {
     const geo = new THREE.SphereGeometry(0.3, 8, 8);
     const mat = new THREE.MeshBasicMaterial({ color: '#A3E635' });
     const im = new THREE.InstancedMesh(geo, mat, cities.length);
     const dummy = new THREE.Object3D();
     cities.forEach((p, i) => {
         dummy.position.copy(p);
         dummy.updateMatrix();
         im.setMatrixAt(i, dummy.matrix);
     });
     return im;
  }, [cities]);

  return (
    <group rotation={[0, u * Math.PI * 2, 0]}>
      <mesh geometry={continentGeo}>
         <meshStandardMaterial color="#1E3A8A" roughness={0.7} metalness={0.2} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={continentGeo}>
         <meshBasicMaterial color="#60A5FA" wireframe transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      
      <primitive object={citiesMesh} />
      <lineSegments geometry={connectionsGeo} material={connMat} />
      
      <mesh>
         <sphereGeometry args={[R - 0.2, 64, 64]} />
         <meshBasicMaterial color="#041235" transparent opacity={0.9} />
      </mesh>
      
      <mesh>
         <sphereGeometry args={[R + 1.0, 64, 64]} />
         <meshBasicMaterial color="#3B82F6" transparent opacity={0.15} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      
      <mesh>
         <icosahedronGeometry args={[R + 1.5, 4]} />
         <meshBasicMaterial color="#22D3EE" wireframe transparent opacity={0.08} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

const SpaceBackground = () => {
   const rnd = useMemo(() => mulberry32(888), []);
   const starsGeo = useMemo(() => {
      const pos = [];
      for(let i=0; i<3000; i++) {
         const x = (rnd() - 0.5) * 400;
         const y = (rnd() - 0.5) * 400;
         const z = (rnd() - 0.5) * 400;
         if (x*x + y*y + z*z > R*R*4) {
            pos.push(x, y, z);
         }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      return geo;
   }, [rnd]);
   
   return (
      <points geometry={starsGeo}>
         <pointsMaterial color="#94A3B8" size={0.5} transparent opacity={0.6} />
      </points>
   );
};

const TargetCamera = () => {
  useThree(({ camera }) => {
    camera.position.set(0, 5, 80);
    camera.lookAt(15, 0, 0);
  });
  return null;
};

export const HologramGlobe: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({ width = 3840, height = 2160, totalFrames = 600 }) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) % 1.0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 45 }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 20, 50]} intensity={2.0} />
        
        <TargetCamera />
        <SpaceBackground />
        <Globe u={u} />
        
        <fog attach="fog" args={['#020617', 50, 200]} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

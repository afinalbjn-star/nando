import React, { useMemo, useState, useEffect } from 'react';
import { AbsoluteFill, useCurrentFrame, staticFile } from 'remotion';
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

const Globe = ({ u, mapData }: { u: number, mapData: ImageData }) => {
  const rnd = useMemo(() => mulberry32(8888), []);
  const uTimeUniform = useMemo(() => new THREE.Uniform(0), []);
  uTimeUniform.value = u;
  
  const { continentGeo, cities, connectionsGeo, hubCity } = useMemo(() => {
     // High detail for crisp Earth continents
     const baseIco = new THREE.IcosahedronGeometry(R, 45).toNonIndexed();
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
        
        let v = 0.5 - lat / Math.PI;
        let u_tex = (lon + Math.PI) / (2 * Math.PI);
        // Align texture offset to put Americas/Europe in good viewing position initially
        u_tex = (u_tex + 0.25) % 1.0; 
        
        const px = Math.floor(u_tex * mapData.width);
        const py = Math.floor(v * mapData.height);
        const idx = (py * mapData.width + px) * 4;
        
        const r = mapData.data[idx];
        const g = mapData.data[idx+1];
        const b = mapData.data[idx+2];
        
        const isOcean = b > r * 1.1 && b > 30; 
        const isLand = !isOcean && (r + g + b > 50); 
        
        if (isLand) {
           const normal = center.clone().normalize();
           const extrude = 0.5;
           v1.add(normal.clone().multiplyScalar(extrude));
           v2.add(normal.clone().multiplyScalar(extrude));
           v3.add(normal.clone().multiplyScalar(extrude));

           keptPositions.push(
             v1.x, v1.y, v1.z,
             v2.x, v2.y, v2.z,
             v3.x, v3.y, v3.z
           );
           centerPoints.push(center.add(normal.multiplyScalar(extrude)));
        }
     }
     
     const cGeo = new THREE.BufferGeometry();
     cGeo.setAttribute('position', new THREE.Float32BufferAttribute(keptPositions, 3));
     cGeo.computeVertexNormals();
     
     const validCities: THREE.Vector3[] = [];
     for(let i=0; i<400; i++) {
        const idx = Math.floor(rnd() * centerPoints.length);
        if (centerPoints[idx]) validCities.push(centerPoints[idx]);
     }
     
     // Find the best hub: highest Y and front-facing (positive Z)
     let hub = validCities[0];
     let bestScore = -Infinity;
     for (const c of validCities) {
        const score = c.y * 1.5 + c.z;
        if (score > bestScore) {
           bestScore = score;
           hub = c;
        }
     }
     
     const connsPositions = [];
     const connsUvs = [];
     
     for(let i=0; i<150; i++) {
        const c1 = validCities[Math.floor(rnd() * validCities.length)];
        const c2 = hub;
        if (!c1 || c1 === c2) continue;
        
        const dist = c1.distanceTo(c2);
        if (dist < R * 0.2) continue; 
        
        const mid = new THREE.Vector3().addVectors(c1, c2).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(R + dist * 0.4); 
        
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
     
     return { continentGeo: cGeo, cities: validCities, connectionsGeo: connGeo, hubCity: hub };
  }, [mapData, rnd]);
  
  const connMat = useMemo(() => {
      const mat = new THREE.LineBasicMaterial({ color: '#2DD4BF', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
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
            float pulse = fract(vProgress * 1.0 - uTime * 3.0);
            float glow = smoothstep(0.7, 1.0, pulse) * smoothstep(1.0, 0.9, pulse);
            diffuseColor.rgb += vec3(0.5, 1.0, 0.8) * glow * 8.0;
            diffuseColor.a *= (0.1 + glow * 2.0);
            `
            );
      };
      return mat;
  }, [uTimeUniform]);

  const citiesMesh = useMemo(() => {
     if (!cities) return null;
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

  if (!continentGeo) return null;

  return (
    <group rotation={[0, u * Math.PI * 2, 0]}>
      {/* Continents Solid Base */}
      <mesh geometry={continentGeo}>
         <meshStandardMaterial color="#0A1A4A" roughness={0.5} metalness={0.8} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Continents Low-Poly Wireframe */}
      <mesh geometry={continentGeo}>
         <meshBasicMaterial color="#38BDF8" wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* City Dots */}
      {citiesMesh && <primitive object={citiesMesh} />}
      
      {/* Central Server Hub Glowing Beacon */}
      <mesh position={hubCity}>
         <sphereGeometry args={[0.8, 16, 16]} />
         <meshBasicMaterial color="#FDE047" />
      </mesh>
      <mesh position={hubCity}>
         <sphereGeometry args={[2.5, 16, 16]} />
         <meshBasicMaterial color="#FDE047" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* Parabolic Connection Arcs */}
      <lineSegments geometry={connectionsGeo} material={connMat} />
      
      {/* Inner Ocean Core */}
      <mesh>
         <sphereGeometry args={[R - 0.5, 64, 64]} />
         <meshBasicMaterial color="#020617" transparent opacity={0.95} />
      </mesh>
      
      {/* Outer Atmosphere Glow */}
      <mesh>
         <sphereGeometry args={[R + 1.0, 64, 64]} />
         <meshBasicMaterial color="#1D4ED8" transparent opacity={0.15} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      
      {/* Lat/Lon Wireframe Grid */}
      <mesh>
         <sphereGeometry args={[R + 1.2, 32, 32]} />
         <meshBasicMaterial color="#22D3EE" wireframe transparent opacity={0.06} blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* Decorative Outer Rings */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
         <ringGeometry args={[R + 4, R + 4.1, 64]} />
         <meshBasicMaterial color="#00FFFF" transparent opacity={0.15} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI/3, Math.PI/4, 0]}>
         <ringGeometry args={[R + 7, R + 7.1, 64]} />
         <meshBasicMaterial color="#38BDF8" transparent opacity={0.08} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
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
    camera.position.set(0, 0, 95);
    // Pointing camera right (X=25) shifts the scene left, creating 50% empty space on the right
    camera.lookAt(28, 0, 0);
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
  
  const [mapData, setMapData] = useState<ImageData | null>(null);

  useEffect(() => {
     const img = new Image();
     img.crossOrigin = "anonymous";
     img.src = staticFile("earth.jpg"); // Uses the downloaded map in public/
     img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
           ctx.drawImage(img, 0, 0);
           setMapData(ctx.getImageData(0, 0, img.width, img.height));
        }
     };
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {mapData ? (
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ fov: 45 }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[20, 20, 50]} intensity={2.5} />
          
          <TargetCamera />
          <SpaceBackground />
          <Globe u={u} mapData={mapData} />
          
          <fog attach="fog" args={['#020617', 60, 200]} />
        </ThreeCanvas>
      ) : (
        <div style={{ color: 'white', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'monospace', fontSize: 24 }}>
           INITIALIZING GLOBAL NETWORK...
        </div>
      )}
    </AbsoluteFill>
  );
};

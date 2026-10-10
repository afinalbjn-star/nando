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

const Globe = ({ u, mapData, earthTex }: { u: number, mapData: ImageData, earthTex: THREE.Texture }) => {
  const rnd = useMemo(() => mulberry32(1111), []);
  const uTimeUniform = useMemo(() => new THREE.Uniform(0), []);
  uTimeUniform.value = u;
  
  const { cities, connectionsGeo, hubCity } = useMemo(() => {
     const validCities: THREE.Vector3[] = [];
     
     for (let latDeg = -80; latDeg <= 80; latDeg += 3) {
        for (let lonDeg = -180; lonDeg <= 180; lonDeg += 3) {
           const lat = latDeg * Math.PI / 180;
           const lon = lonDeg * Math.PI / 180;
           
           let v = 0.5 - lat / Math.PI;
           let u_tex = (lon + Math.PI) / (2 * Math.PI);
           
           const px = Math.floor(u_tex * mapData.width);
           const py = Math.floor(v * mapData.height);
           const idx = (py * mapData.width + px) * 4;
           
           const r = mapData.data[idx];
           const g = mapData.data[idx+1];
           const b = mapData.data[idx+2];
           
           const isOcean = b > r * 1.1 && b > 30; 
           const isLand = !isOcean && (r + g + b > 50); 
           
           if (isLand && rnd() > 0.7) { 
               // Map to spherical coords
               // The three.js default UV mapping for Icosahedron aligns prime meridian to +Z (if unrotated)
               // Let's match the standard: x = sin(theta)*sin(phi), y = cos(phi), z = cos(theta)*sin(phi)
               const phi = Math.PI / 2 - lat;
               const theta = lon + Math.PI / 2; // Offset by 90deg to align with UV seam
               const x = R * Math.sin(phi) * Math.sin(theta);
               const y = R * Math.cos(phi);
               const z = R * Math.sin(phi) * Math.cos(theta);
               validCities.push(new THREE.Vector3(x, y, z));
           }
        }
     }
     
     // Set Hub City to approximate New York
     const hubLat = 40.7 * Math.PI / 180;
     const hubLon = -74.0 * Math.PI / 180;
     const hPhi = Math.PI / 2 - hubLat;
     const hTheta = hubLon + Math.PI / 2;
     const hub = new THREE.Vector3(
        R * Math.sin(hPhi) * Math.sin(hTheta),
        R * Math.cos(hPhi),
        R * Math.sin(hPhi) * Math.cos(hTheta)
     );
     
     const connsPositions = [];
     const connsUvs = [];
     
     for(let i=0; i<100; i++) {
        const c1 = validCities[Math.floor(rnd() * validCities.length)];
        const c2 = hub;
        if (!c1 || c1 === c2) continue;
        
        const dist = c1.distanceTo(c2);
        if (dist < R * 0.2) continue; 
        
        const mid = new THREE.Vector3().addVectors(c1, c2).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(R + dist * 0.35); 
        
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
     
     return { cities: validCities, connectionsGeo: connGeo, hubCity: hub };
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
            float pulse = fract(vProgress * 1.5 - uTime * 4.0);
            float glow = smoothstep(0.6, 1.0, pulse) * smoothstep(1.0, 0.9, pulse);
            diffuseColor.rgb += vec3(0.5, 1.0, 0.9) * glow * 10.0;
            diffuseColor.a *= (0.1 + glow * 1.5);
            `
            );
      };
      return mat;
  }, [uTimeUniform]);

  const citiesMesh = useMemo(() => {
     if (!cities) return null;
     const geo = new THREE.SphereGeometry(0.2, 8, 8);
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

  const continentMaterial = useMemo(() => {
     return new THREE.ShaderMaterial({
        uniforms: {
           tEarth: { value: earthTex },
           uColor: { value: new THREE.Color("#0A2540") }, 
           uGlow: { value: new THREE.Color("#38BDF8") }
        },
        vertexShader: `
           varying vec2 vUv;
           varying vec3 vNormal;
           void main() {
              vUv = uv;
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
           }
        `,
        fragmentShader: `
           uniform sampler2D tEarth;
           uniform vec3 uColor;
           uniform vec3 uGlow;
           varying vec2 vUv;
           varying vec3 vNormal;
           void main() {
              // The texture's prime meridian might be offset by 0.25 (90deg) compared to the geometry
              vec2 uv = vec2(fract(vUv.x + 0.25), vUv.y);
              vec4 tex = texture2D(tEarth, uv);
              float r = tex.r;
              float g = tex.g;
              float b = tex.b;
              
              bool isOcean = (b > r * 1.1) && (b > 0.1);
              bool isLand = !isOcean && (r + g + b > 0.15);
              
              if (!isLand) discard;
              
              float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
              vec3 finalColor = uColor + uGlow * pow(rim, 3.0) * 0.8;
              
              gl_FragColor = vec4(finalColor, 0.9);
           }
        `,
        transparent: true,
        side: THREE.DoubleSide
     });
  }, [earthTex]);

  const wireframeMaterial = useMemo(() => {
     return new THREE.ShaderMaterial({
        uniforms: {
           tEarth: { value: earthTex },
           uColor: { value: new THREE.Color("#38BDF8") }
        },
        vertexShader: `
           varying vec2 vUv;
           void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
           }
        `,
        fragmentShader: `
           uniform sampler2D tEarth;
           uniform vec3 uColor;
           varying vec2 vUv;
           void main() {
              vec2 uv = vec2(fract(vUv.x + 0.25), vUv.y);
              vec4 tex = texture2D(tEarth, uv);
              bool isOcean = (tex.b > tex.r * 1.1) && (tex.b > 0.1);
              bool isLand = !isOcean && (tex.r + tex.g + tex.b > 0.15);
              if (!isLand) discard;
              gl_FragColor = vec4(uColor, 0.4);
           }
        `,
        transparent: true,
        wireframe: true,
        blending: THREE.AdditiveBlending
     });
  }, [earthTex]);

  // Adjust initial rotation so the Americas are facing the camera
  return (
    <group rotation={[0, u * Math.PI * 2 + Math.PI/1.5, 0]}>
      {/* Continents Solid Base */}
      <mesh material={continentMaterial}>
         <icosahedronGeometry args={[R, 20]} /> 
      </mesh>
      
      {/* Continents Low-Poly Wireframe */}
      <mesh material={wireframeMaterial}>
         <icosahedronGeometry args={[R, 20]} />
      </mesh>
      
      {citiesMesh && <primitive object={citiesMesh} />}
      
      <mesh position={hubCity}>
         <sphereGeometry args={[0.8, 16, 16]} />
         <meshBasicMaterial color="#FDE047" />
      </mesh>
      <mesh position={hubCity}>
         <sphereGeometry args={[2.5, 16, 16]} />
         <meshBasicMaterial color="#FDE047" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>
      
      <lineSegments geometry={connectionsGeo} material={connMat} />
      
      <mesh>
         <sphereGeometry args={[R - 0.5, 64, 64]} />
         <meshBasicMaterial color="#020617" transparent opacity={0.8} />
      </mesh>
      
      <mesh>
         <sphereGeometry args={[R + 1.0, 64, 64]} />
         <meshBasicMaterial color="#1D4ED8" transparent opacity={0.15} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      
      <mesh>
         <sphereGeometry args={[R + 0.1, 24, 24]} />
         <meshBasicMaterial color="#22D3EE" wireframe transparent opacity={0.03} blending={THREE.AdditiveBlending} />
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
    camera.lookAt(28, 0, 0); // Globe moves to the left (50% negative space on right)
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
  const [earthTex, setEarthTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
     const img = new Image();
     img.crossOrigin = "anonymous";
     img.src = staticFile("earth.jpg");
     img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
           ctx.drawImage(img, 0, 0);
           setMapData(ctx.getImageData(0, 0, img.width, img.height));
           
           const tex = new THREE.Texture(img);
           tex.needsUpdate = true;
           setEarthTex(tex);
        }
     };
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {mapData && earthTex ? (
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ fov: 45 }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[20, 20, 50]} intensity={2.5} />
          
          <TargetCamera />
          <SpaceBackground />
          <Globe u={u} mapData={mapData} earthTex={earthTex} />
          
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

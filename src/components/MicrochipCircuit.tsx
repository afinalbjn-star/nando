import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const TILE_SIZE = 80;

interface BoxData {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
  id?: number;
}

const Traces = ({ data, uTimeUniform }: { data: BoxData[], uTimeUniform: THREE.IUniform }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ 
      color: '#FFB800', 
      roughness: 0.4, 
      metalness: 0.4, 
      vertexColors: true 
    });
    mat.defines = { USE_UV: '' };
    
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTimeUniform;
      shader.fragmentShader = `uniform float uTime;\n` + shader.fragmentShader;
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          diffuseColor.rgb = vec3(1.0, 0.72, 0.0);
        #endif
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          float traceId = vColor.r;
          float p = fract(vUv.x * 2.0 - uTime * 2.0 + traceId * 23.7);
          float glow = smoothstep(0.7, 0.95, p) * smoothstep(1.0, 0.95, p);
          totalEmissiveRadiance += vec3(1.0, 0.5, 0.05) * glow * 15.0;
        #endif
        `
      );
    };
    
    const im = new THREE.InstancedMesh(geo, mat, data.length);
    im.castShadow = true;
    im.receiveShadow = true;
    
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    data.forEach((t, i) => {
      dummy.position.set(...t.pos);
      dummy.rotation.set(...t.rot);
      dummy.scale.set(...t.scale);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      col.setRGB((t.id || 0) / 400, 0, 0);
      im.setColorAt(i, col);
    });
    return im;
  }, [data, uTimeUniform]);
  
  return <primitive object={mesh} />;
};

const SMDs = ({ data }: { data: BoxData[] }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: '#71717A', roughness: 0.5, metalness: 0.8 });
    const im = new THREE.InstancedMesh(geo, mat, data.length);
    im.castShadow = true;
    im.receiveShadow = true;
    const dummy = new THREE.Object3D();
    data.forEach((t, i) => {
      dummy.position.set(...t.pos);
      dummy.rotation.set(...t.rot);
      dummy.scale.set(...t.scale);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    return im;
  }, [data]);
  return <primitive object={mesh} />;
};

const LEDs = ({ data, uTimeUniform }: { data: BoxData[], uTimeUniform: THREE.IUniform }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ 
      color: '#60A5FA', 
      emissive: '#3B82F6', 
      emissiveIntensity: 8, 
      toneMapped: false, 
      vertexColors: true 
    });
    mat.defines = { USE_UV: '' };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTimeUniform;
      shader.fragmentShader = `uniform float uTime;\n` + shader.fragmentShader;
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          diffuseColor.rgb = vec3(0.37, 0.64, 0.97);
        #endif
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          float blink = step(0.8, fract(uTime * 4.0 + vColor.r * 17.0));
          totalEmissiveRadiance *= blink;
        #endif
        `
      );
    };
    
    const im = new THREE.InstancedMesh(geo, mat, data.length);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    data.forEach((t, i) => {
      dummy.position.set(...t.pos);
      dummy.rotation.set(...t.rot);
      dummy.scale.set(...t.scale);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      col.setRGB((t.id || 0) / 400, 0, 0);
      im.setColorAt(i, col);
    });
    return im;
  }, [data, uTimeUniform]);
  
  return <primitive object={mesh} />;
};

const CPUs = ({ offsets }: { offsets: [number, number, number][] }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    
    const matBase = new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.9 });
    const imBase = new THREE.InstancedMesh(geo, matBase, offsets.length * 2);
    imBase.castShadow = true;
    imBase.receiveShadow = true;
    
    const matTop = new THREE.MeshStandardMaterial({ color: '#A1A1AA', roughness: 0.3, metalness: 0.9 });
    const imTop = new THREE.InstancedMesh(geo, matTop, offsets.length * 2);
    imTop.castShadow = true;
    imTop.receiveShadow = true;

    const matPin = new THREE.MeshStandardMaterial({ color: '#D4D4D8', roughness: 0.3, metalness: 0.9 });
    const imPin = new THREE.InstancedMesh(geo, matPin, offsets.length * 2 * 60);
    imPin.castShadow = true;

    const dummy = new THREE.Object3D();
    let cpuIdx = 0;
    let pinIdx = 0;
    
    offsets.forEach((offset) => {
      const positions = [[20, 20], [-20, -20]];
      
      positions.forEach(([cx, cz]) => {
        // Base
        dummy.position.set(cx + offset[0], 1, cz + offset[2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(24, 2, 24);
        dummy.updateMatrix();
        imBase.setMatrixAt(cpuIdx, dummy.matrix);
        
        // Top
        dummy.position.set(cx + offset[0], 2.1, cz + offset[2]);
        dummy.scale.set(18, 0.5, 18);
        dummy.updateMatrix();
        imTop.setMatrixAt(cpuIdx, dummy.matrix);
        cpuIdx++;
        
        // Pins (Left & Right)
        for(let p=0; p<15; p++) {
           let z = cz - 10 + p * 1.43;
           dummy.position.set(cx - 12.5 + offset[0], 0.5, z + offset[2]);
           dummy.scale.set(1.5, 0.2, 0.6);
           dummy.updateMatrix();
           imPin.setMatrixAt(pinIdx++, dummy.matrix);
           
           dummy.position.set(cx + 12.5 + offset[0], 0.5, z + offset[2]);
           dummy.scale.set(1.5, 0.2, 0.6);
           dummy.updateMatrix();
           imPin.setMatrixAt(pinIdx++, dummy.matrix);
        }
        
        // Pins (Top & Bottom)
        for(let p=0; p<15; p++) {
           let x = cx - 10 + p * 1.43;
           dummy.position.set(x + offset[0], 0.5, cz - 12.5 + offset[2]);
           dummy.scale.set(0.6, 0.2, 1.5);
           dummy.updateMatrix();
           imPin.setMatrixAt(pinIdx++, dummy.matrix);
           
           dummy.position.set(x + offset[0], 0.5, cz + 12.5 + offset[2]);
           dummy.scale.set(0.6, 0.2, 1.5);
           dummy.updateMatrix();
           imPin.setMatrixAt(pinIdx++, dummy.matrix);
        }
      });
    });
    
    const group = new THREE.Group();
    group.add(imBase);
    group.add(imTop);
    group.add(imPin);
    return group;
  }, [offsets]);
  
  return <primitive object={mesh} />;
};

const TargetCamera = () => {
  useThree(({ camera }) => {
    camera.lookAt(10, 0, 10);
  });
  return null;
};

export const MicrochipProcessorCircuit: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({ width = 3840, height = 2160, totalFrames = 600 }) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) % 1.0;
  
  const uTimeUniform = useMemo(() => new THREE.Uniform(0), []);
  uTimeUniform.value = u;
  
  const groupOffset = [-u * TILE_SIZE, 0, -u * TILE_SIZE] as [number, number, number];
  
  const { globalTraces, globalSmds, globalLeds, tileOffsets } = useMemo(() => {
    const traceData: BoxData[] = [];
    const smdData: BoxData[] = [];
    const ledData: BoxData[] = [];
    
    let seed = 9999;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    
    class PathBuilder {
      x: number;
      z: number;
      id: number;
      constructor(x: number, z: number, id: number) { this.x = x; this.z = z; this.id = id; }
      go(len: number, angleDeg: number) {
        if (len <= 0) return this;
        const angle = angleDeg * Math.PI / 180;
        const dx = Math.cos(angle) * len;
        const dz = Math.sin(angle) * len;
        traceData.push({ 
           pos: [this.x + dx/2, 0.1, this.z + dz/2], 
           rot: [0, -angle, 0], 
           scale: [len + 0.4, 0.15, 0.4], 
           id: this.id 
        });
        this.x += dx;
        this.z += dz;
        return this;
      }
    }

    // Generate highly structured parallel buses!
    for (let b = 0; b < 60; b++) {
      let startX = Math.floor(rnd() * 40) * 2 - 40;
      let startZ = Math.floor(rnd() * 40) * 2 - 40;
      let numLines = 3 + Math.floor(rnd() * 7); 
      
      let dirs: {angle: number, len: number}[] = [];
      let currentDir = Math.floor(rnd() * 4) * 90; 
      
      for(let s=0; s<4; s++) {
         let len = 10 + Math.floor(rnd() * 25);
         dirs.push({ angle: currentDir, len });
         currentDir += (rnd() < 0.5 ? 45 : -45);
      }
      
      let perpAngle = (dirs[0].angle + 90) * Math.PI / 180;
      
      for (let l = 0; l < numLines; l++) {
         let px = startX + Math.cos(perpAngle) * l * 1.0; // 1.0 spacing
         let pz = startZ + Math.sin(perpAngle) * l * 1.0;
         let pb = new PathBuilder(px, pz, (b * 10) + l);
         
         for(let d of dirs) {
            pb.go(d.len, d.angle);
         }
         
         if (rnd() < 0.25) {
            smdData.push({ pos: [pb.x, 0.2, pb.z], rot: [0, -dirs[dirs.length-1].angle * Math.PI/180, 0], scale: [1.2, 0.4, 0.8] });
         }
         if (rnd() < 0.05) {
            ledData.push({ pos: [pb.x, 0.25, pb.z], rot: [0,0,0], scale: [0.6, 0.6, 0.6], id: (b * 10) + l });
         }
      }
    }
    
    const offsets: [number, number, number][] = [];
    for(let x=-2; x<=2; x++) {
      for(let z=-2; z<=2; z++) {
        offsets.push([x * TILE_SIZE, 0, z * TILE_SIZE]);
      }
    }
    
    const gTraces: BoxData[] = [];
    const gSmds: BoxData[] = [];
    const gLeds: BoxData[] = [];
    
    offsets.forEach(off => {
      traceData.forEach(t => gTraces.push({ pos: [t.pos[0]+off[0], t.pos[1], t.pos[2]+off[2]], rot: t.rot, scale: t.scale, id: t.id }));
      smdData.forEach(t => gSmds.push({ pos: [t.pos[0]+off[0], t.pos[1], t.pos[2]+off[2]], rot: t.rot, scale: t.scale }));
      ledData.forEach(t => gLeds.push({ pos: [t.pos[0]+off[0], t.pos[1], t.pos[2]+off[2]], rot: t.rot, scale: t.scale, id: t.id }));
    });
    
    return { globalTraces: gTraces, globalSmds: gSmds, globalLeds: gLeds, tileOffsets: offsets };
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: '#090D16' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [-35, 45, 30], fov: 40 }}
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[60, 80, 20]} 
          intensity={1.8} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-40, 20, -40]} intensity={0.3} />

        <TargetCamera />

        {/* Static Base Board */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color="#0A0A0C" roughness={0.8} />
        </mesh>

        {/* Sliding Circuit Components */}
        <group position={groupOffset}>
          <Traces data={globalTraces} uTimeUniform={uTimeUniform} />
          <SMDs data={globalSmds} />
          <LEDs data={globalLeds} uTimeUniform={uTimeUniform} />
          <CPUs offsets={tileOffsets} />
        </group>
        
        {/* Depth of Field Fog */}
        <fog attach="fog" args={['#090D16', 60, 150]} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

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
      color: '#FFAA00', 
      roughness: 0.5, 
      metalness: 0.2,
      vertexColors: true
    });
    
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTimeUniform;
      shader.fragmentShader = `uniform float uTime;\n` + shader.fragmentShader;
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          diffuseColor.rgb = vec3(1.0, 0.75, 0.1); // Bright Gold!
        #endif
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          float traceId = vColor.r;
          float p = fract(vUv.x * 3.0 - uTime * 2.0 + traceId * 23.7);
          float glow = smoothstep(0.7, 0.95, p) * smoothstep(1.0, 0.95, p);
          totalEmissiveRadiance += vec3(1.0, 0.5, 0.05) * glow * 20.0;
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
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTimeUniform;
      shader.fragmentShader = `uniform float uTime;\n` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          diffuseColor.rgb = vec3(0.37, 0.64, 0.97); // Restore Blue!
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
    const imBase = new THREE.InstancedMesh(geo, matBase, offsets.length);
    imBase.castShadow = true;
    imBase.receiveShadow = true;
    
    const matTop = new THREE.MeshStandardMaterial({ color: '#A1A1AA', roughness: 0.3, metalness: 0.9 });
    const imTop = new THREE.InstancedMesh(geo, matTop, offsets.length);
    imTop.castShadow = true;
    imTop.receiveShadow = true;

    const dummy = new THREE.Object3D();
    offsets.forEach((offset, i) => {
      dummy.position.set(20 + offset[0], 1, 20 + offset[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(28, 2, 28);
      dummy.updateMatrix();
      imBase.setMatrixAt(i, dummy.matrix);
      
      dummy.position.set(20 + offset[0], 2.1, 20 + offset[2]);
      dummy.scale.set(20, 0.5, 20);
      dummy.updateMatrix();
      imTop.setMatrixAt(i, dummy.matrix);
    });
    
    const group = new THREE.Group();
    group.add(imBase);
    group.add(imTop);
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
    
    let seed = 12345;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    
    const gridSize = 40;
    const step = TILE_SIZE / gridSize;
    
    for(let i=0; i<600; i++) {
      const x = Math.floor(rnd() * gridSize) * step - TILE_SIZE/2;
      const z = Math.floor(rnd() * gridSize) * step - TILE_SIZE/2;
      const len = (4 + Math.floor(rnd() * 12)) * step;
      const type = Math.floor(rnd() * 3);
      
      if (type === 0) {
        traceData.push({ pos: [x + len/2, 0.1, z], rot: [0,0,0], scale: [len, 0.2, 0.6], id: i });
        if (rnd() < 0.2) smdData.push({ pos: [x + len, 0.3, z], rot: [0,0,0], scale: [1.2, 0.6, 1.2] });
      } else if (type === 1) {
        traceData.push({ pos: [x, 0.1, z + len/2], rot: [0,0,0], scale: [0.6, 0.2, len], id: i });
        if (rnd() < 0.2) smdData.push({ pos: [x, 0.3, z + len], rot: [0,0,0], scale: [1.2, 0.6, 1.2] });
      } else {
        const dLen = len * 1.414;
        const dir = rnd() < 0.5 ? 1 : -1;
        traceData.push({ pos: [x + len/2, 0.1, z + (len/2)*dir], rot: [0, dir * Math.PI/4, 0], scale: [dLen, 0.2, 0.6], id: i });
      }
      if (rnd() < 0.05) ledData.push({ pos: [x, 0.5, z], rot: [0,0,0], scale: [1.2, 1.2, 1.2], id: i });
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
        <ambientLight intensity={0.5} />
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

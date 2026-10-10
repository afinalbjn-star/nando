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
      color: '#B45309', 
      roughness: 0.5, 
      metalness: 0.8, 
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
          // Dark, realistic copper base
          diffuseColor.rgb = vec3(0.4, 0.22, 0.03);
        #endif
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          float traceId = vColor.r;
          float p = fract(vUv.x * 1.5 - uTime * 2.0 + traceId * 23.7);
          float glow = smoothstep(0.8, 0.95, p) * smoothstep(1.0, 0.95, p);
          // Bright electric gold pulse
          totalEmissiveRadiance += vec3(1.0, 0.7, 0.1) * glow * 12.0;
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
          diffuseColor.rgb = vec3(0.1, 0.4, 0.8);
        #endif
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
          float blink = step(0.9, fract(uTime * 4.0 + vColor.r * 17.0));
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

const createAITexture = () => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.clearRect(0, 0, 512, 512);
  
  ctx.font = 'bold 220px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const grad = ctx.createLinearGradient(0, 100, 0, 412);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(1, '#A0A0A0');
  
  ctx.fillStyle = grad;
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 15;
  ctx.fillText('AI', 256, 256 + 15); // visual centering tweak
  
  ctx.strokeStyle = grad;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.roundRect(40, 40, 432, 432, 40);
  ctx.stroke();
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
};

const AILogos = ({ offsets }: { offsets: [number, number, number][] }) => {
  const tex = useMemo(() => createAITexture(), []);
  
  const mesh = useMemo(() => {
    if (!tex) return null;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({ 
      map: tex, 
      transparent: true, 
      emissive: '#FFFFFF', 
      emissiveMap: tex,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    });
    
    const im = new THREE.InstancedMesh(geo, mat, offsets.length * 4);
    const dummy = new THREE.Object3D();
    let idx = 0;
    
    offsets.forEach((offset) => {
      const positions = [
        [20, 20, 24], [-20, -20, 24],
        [-25, 15, 12], [15, -25, 12]
      ];
      
      positions.forEach(([cx, cz, size]) => {
        dummy.position.set(cx + offset[0], 1.16, cz + offset[2]);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(size * 0.5, size * 0.5, 1); 
        dummy.updateMatrix();
        im.setMatrixAt(idx++, dummy.matrix);
      });
    });
    return im;
  }, [offsets, tex]);
  
  if (!mesh) return null;
  return <primitive object={mesh} />;
};

const CPUs = ({ offsets }: { offsets: [number, number, number][] }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    
    const matBase = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.9 });
    const imBase = new THREE.InstancedMesh(geo, matBase, offsets.length * 4);
    imBase.castShadow = true;
    imBase.receiveShadow = true;
    
    const matTop = new THREE.MeshStandardMaterial({ color: '#444444', roughness: 0.4, metalness: 0.6 });
    const imTop = new THREE.InstancedMesh(geo, matTop, offsets.length * 4);
    imTop.castShadow = true;
    imTop.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let cpuIdx = 0;
    
    offsets.forEach((offset) => {
      const positions = [
        [20, 20, 24], [-20, -20, 24],
        [-25, 15, 12], [15, -25, 12]
      ];
      
      positions.forEach(([cx, cz, size]) => {
        dummy.position.set(cx + offset[0], 0.5, cz + offset[2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(size, 1.0, size);
        dummy.updateMatrix();
        imBase.setMatrixAt(cpuIdx, dummy.matrix);
        
        dummy.position.set(cx + offset[0], 1.05, cz + offset[2]);
        dummy.scale.set(size - 4, 0.2, size - 4);
        dummy.updateMatrix();
        imTop.setMatrixAt(cpuIdx, dummy.matrix);
        cpuIdx++;
      });
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
    
    let seed = 4242;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    
    const GRID_RES = 100;
    const STEP = TILE_SIZE / GRID_RES;
    const grid = new Array(GRID_RES * GRID_RES).fill(0);
    
    const getGrid = (x: number, z: number) => grid[((z % GRID_RES + GRID_RES) % GRID_RES) * GRID_RES + ((x % GRID_RES + GRID_RES) % GRID_RES)];
    const setGrid = (x: number, z: number, val: number) => { grid[((z % GRID_RES + GRID_RES) % GRID_RES) * GRID_RES + ((x % GRID_RES + GRID_RES) % GRID_RES)] = val; };
    
    const blockArea = (x: number, z: number, w: number, h: number) => {
       const gx = Math.floor((x + 40) / STEP);
       const gz = Math.floor((z + 40) / STEP);
       const gw = Math.floor(w / STEP);
       const gh = Math.floor(h / STEP);
       for(let i=-1; i<=gw; i++) {
         for(let j=-1; j<=gh; j++) {
           setGrid(gx + i, gz + j, 1);
         }
       }
    };
    
    blockArea(20 - 12, 20 - 12, 24, 24);
    blockArea(-20 - 12, -20 - 12, 24, 24);
    blockArea(-25 - 6, 15 - 6, 12, 12);
    blockArea(15 - 6, -25 - 6, 12, 12);

    for(let i=0; i<150; i++) {
       let gx = Math.floor(rnd() * GRID_RES);
       let gz = Math.floor(rnd() * GRID_RES);
       if (getGrid(gx, gz) === 0) {
          setGrid(gx, gz, 1);
          smdData.push({
             pos: [gx * STEP - 40 + STEP/2, 0.2, gz * STEP - 40 + STEP/2],
             rot: [0, 0, 0],
             scale: [STEP*1.2, 0.4, STEP*1.2]
          });
       }
    }
    
    for(let i=0; i<80; i++) {
       let gx = Math.floor(rnd() * GRID_RES);
       let gz = Math.floor(rnd() * GRID_RES);
       if (getGrid(gx, gz) === 0) {
          setGrid(gx, gz, 1);
          ledData.push({
             pos: [gx * STEP - 40 + STEP/2, 0.15, gz * STEP - 40 + STEP/2],
             rot: [0, 0, 0],
             scale: [STEP*0.8, 0.3, STEP*0.8],
             id: i
          });
       }
    }

    const dirs = [[1,0], [0,1], [-1,0], [0,-1]];
    
    const outputSegment = (gx: number, gz: number, dir: number, len: number, traceId: number) => {
        if (len <= 1) return;
        let centerGx = gx + dirs[dir][0] * (len - 1) / 2;
        let centerGz = gz + dirs[dir][1] * (len - 1) / 2;
        let posX = centerGx * STEP - 40 + STEP/2;
        let posZ = centerGz * STEP - 40 + STEP/2;
        let rotY = (dir === 1 || dir === 3) ? Math.PI / 2 : 0;
        let physLen = len * STEP + STEP * 0.15;
        traceData.push({ pos: [posX, 0.1, posZ], rot: [0, rotY, 0], scale: [physLen, 0.1, STEP * 0.35], id: traceId });
    };

    for (let attempt = 0; attempt < 4000; attempt++) {
       let cx = Math.floor(rnd() * GRID_RES);
       let cz = Math.floor(rnd() * GRID_RES);
       if (getGrid(cx, cz) !== 0) continue;
       
       let currentDir = Math.floor(rnd() * 4);
       let segLen = 0;
       let startX = cx;
       let startZ = cz;
       let id = attempt;
       
       setGrid(cx, cz, 1);
       segLen++;
       
       let pathTurns = 0;
       while (pathTurns < 12) {
           let rawNx = cx + dirs[currentDir][0];
           let rawNz = cz + dirs[currentDir][1];
           let wrapped = (rawNx < 0 || rawNx >= GRID_RES || rawNz < 0 || rawNz >= GRID_RES);
           
           let nx = (rawNx % GRID_RES + GRID_RES) % GRID_RES;
           let nz = (rawNz % GRID_RES + GRID_RES) % GRID_RES;
           
           if (getGrid(nx, nz) === 0) {
               if (wrapped) {
                   outputSegment(startX, startZ, currentDir, segLen, id);
                   segLen = 0;
                   startX = nx;
                   startZ = nz;
               }
               setGrid(nx, nz, 1);
               cx = nx;
               cz = nz;
               segLen++;
           } else {
               outputSegment(startX, startZ, currentDir, segLen, id);
               
               let leftDir = (currentDir + 3) % 4;
               let rightDir = (currentDir + 1) % 4;
               
               let leftFree = getGrid((cx + dirs[leftDir][0] % GRID_RES + GRID_RES) % GRID_RES, (cz + dirs[leftDir][1] % GRID_RES + GRID_RES) % GRID_RES) === 0;
               let rightFree = getGrid((cx + dirs[rightDir][0] % GRID_RES + GRID_RES) % GRID_RES, (cz + dirs[rightDir][1] % GRID_RES + GRID_RES) % GRID_RES) === 0;
               
               if (leftFree && rightFree) {
                   currentDir = rnd() < 0.5 ? leftDir : rightDir;
               } else if (leftFree) {
                   currentDir = leftDir;
               } else if (rightFree) {
                   currentDir = rightDir;
               } else {
                   break;
               }
               
               segLen = 1;
               startX = cx; 
               startZ = cz;
               pathTurns++;
           }
       }
       outputSegment(startX, startZ, currentDir, segLen, id);
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
    <AbsoluteFill style={{ backgroundColor: '#050508' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [-35, 45, 30], fov: 40 }}
        shadows
      >
        <ambientLight intensity={0.2} />
        <directionalLight 
          position={[60, 80, 20]} 
          intensity={2.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
          shadow-bias={-0.001}
        />
        <directionalLight position={[-40, 20, -40]} intensity={0.5} />

        <TargetCamera />

        {/* Static Base Board */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color="#050508" roughness={0.9} metalness={0.1} />
        </mesh>

        <group position={groupOffset}>
          <Traces data={globalTraces} uTimeUniform={uTimeUniform} />
          <SMDs data={globalSmds} />
          <LEDs data={globalLeds} uTimeUniform={uTimeUniform} />
          <CPUs offsets={tileOffsets} />
          <AILogos offsets={tileOffsets} />
        </group>
        
        <fog attach="fog" args={['#050508', 60, 140]} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

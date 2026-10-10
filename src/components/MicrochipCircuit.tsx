import React, { useMemo, useRef, useEffect } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const TILE_SIZE = 80;

function createCircuitTexture(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  ctx.lineWidth = 6;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  const paths = [];
  const numPaths = 150;
  const grid = 32;
  const step = size / grid;

  // Deterministic random
  let seed = 98765;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < numPaths; i++) {
    let x = Math.floor(random() * grid) * step;
    let y = Math.floor(random() * grid) * step;
    
    const path = [{x, y, segLen: 0}];
    let totalLen = 0;
    const segments = 5 + Math.floor(random() * 10);
    let dir = Math.floor(random() * 4);
    
    for (let j = 0; j < segments; j++) {
      const isDiag = random() < 0.3;
      let nx = x, ny = y;
      const dist = (2 + Math.floor(random() * 4)) * step;
      
      if (isDiag) {
         const dx = random() < 0.5 ? 1 : -1;
         const dy = random() < 0.5 ? 1 : -1;
         nx += dx * dist;
         ny += dy * dist;
      } else {
         if (dir === 0) ny -= dist;
         if (dir === 1) nx += dist;
         if (dir === 2) ny += dist;
         if (dir === 3) nx -= dist;
      }
      
      const segLen = Math.hypot(nx - x, ny - y);
      totalLen += segLen;
      path.push({x: nx, y: ny, segLen});
      
      x = nx; y = ny;
      dir = (dir + (random() < 0.5 ? 1 : -1) + 4) % 4;
    }
    
    paths.push({ id: random(), nodes: path, totalLen: Math.max(1, totalLen) });
  }

  // Draw 9 times for seamless wrapping
  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      ctx.save();
      ctx.translate(ox * size, oy * size);
      
      for (const p of paths) {
        let curDist = 0;
        for (let j = 0; j < p.nodes.length - 1; j++) {
          const n1 = p.nodes[j];
          const n2 = p.nodes[j+1];
          
          if (n1.x === n2.x && n1.y === n2.y) continue;

          const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
          const r1 = Math.floor((curDist / p.totalLen) * 255);
          const g1 = Math.floor(p.id * 255);
          
          curDist += n2.segLen;
          const r2 = Math.floor((curDist / p.totalLen) * 255);
          
          grad.addColorStop(0, \`rgb(\${r1}, \${g1}, 255)\`);
          grad.addColorStop(1, \`rgb(\${r2}, \${g1}, 255)\`);
          
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const Board = ({ size, uTimeUniform }: { size: number, uTimeUniform: THREE.IUniform }) => {
  const flowTexture = useMemo(() => createCircuitTexture(1024), []);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = uTimeUniform;
        shader.uniforms.tFlow = { value: flowTexture };
        
        shader.fragmentShader = \`
          uniform float uTime;
          uniform sampler2D tFlow;
          \${shader.fragmentShader}
        \`;
        
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          \`
          #include <color_fragment>
          vec2 uv = vUv * 5.0; // 5x5 grid repeat
          vec4 flowTex = texture2D(tFlow, uv);
          float isTrace = flowTex.b;
          vec3 gold = vec3(0.5, 0.35, 0.05); // dark gold traces
          diffuseColor.rgb = mix(diffuseColor.rgb, gold, isTrace);
          \`
        );
        
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          \`
          #include <emissivemap_fragment>
          vec2 uvE = vUv * 5.0;
          vec4 flowTexE = texture2D(tFlow, uvE);
          float isTraceE = flowTexE.b;
          float dist = flowTexE.r;
          float id = flowTexE.g;
          
          // Animate the pulses! uTime * 2.0 = 2 cycles per 10s (perfect integer for loop)
          float p = fract(dist * 6.0 - uTime * 2.0 + id * 23.7);
          float glow = smoothstep(0.7, 0.95, p) * smoothstep(1.0, 0.95, p);
          
          vec3 pulseColor = vec3(1.0, 0.65, 0.1) * 3.5; 
          totalEmissiveRadiance += pulseColor * glow * isTraceE;
          \`
        );
        
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_begin>',
          \`
          #include <normal_fragment_begin>
          float eps = 0.002;
          vec2 uvN = vUv * 5.0;
          float tr = texture2D(tFlow, uvN).b;
          float tx = texture2D(tFlow, uvN + vec2(eps, 0.0)).b;
          float ty = texture2D(tFlow, uvN + vec2(0.0, eps)).b;
          // fake bump map for traces
          vec3 traceNormal = normalize(vec3((tr - tx) * 8.0, (tr - ty) * 8.0, 1.0));
          normal = normalize(normal + traceNormal);
          \`
        );
      };
      materialRef.current.needsUpdate = true;
    }
  }, [flowTexture, uTimeUniform]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size * 5, size * 5]} />
      <meshStandardMaterial ref={materialRef} color="#101014" roughness={0.7} metalness={0.3} />
    </mesh>
  );
};

const Tile = ({ offset }: { offset: [number, number, number] }) => {
  return (
    <group position={offset}>
      {/* Main CPU */}
      <group position={[20, 0, 20]}>
        <mesh castShadow receiveShadow position={[0, 1, 0]}>
          <boxGeometry args={[22, 2, 22]} />
          <meshStandardMaterial color="#18181B" roughness={0.9} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 2.1, 0]}>
          <boxGeometry args={[16, 0.5, 16]} />
          <meshStandardMaterial color="#71717A" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* IC 1 */}
      <mesh castShadow receiveShadow position={[-20, 0.75, 10]}>
        <boxGeometry args={[8, 1.5, 12]} />
        <meshStandardMaterial color="#09090B" roughness={0.85} />
      </mesh>
      {/* IC 2 */}
      <mesh castShadow receiveShadow position={[-10, 0.75, -25]}>
        <boxGeometry args={[14, 1.5, 6]} />
        <meshStandardMaterial color="#09090B" roughness={0.85} />
      </mesh>
      {/* IC 3 */}
      <mesh castShadow receiveShadow position={[15, 0.6, -15]}>
        <boxGeometry args={[6, 1.2, 6]} />
        <meshStandardMaterial color="#09090B" roughness={0.85} />
      </mesh>

      {/* Capacitors */}
      <mesh castShadow receiveShadow position={[0, 0.5, 5]}>
        <boxGeometry args={[2, 1, 3]} />
        <meshStandardMaterial color="#D4D4D8" metalness={0.9} roughness={0.4} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.5, 9]}>
        <boxGeometry args={[2, 1, 3]} />
        <meshStandardMaterial color="#D4D4D8" metalness={0.9} roughness={0.4} />
      </mesh>
      <mesh castShadow receiveShadow position={[4, 0.5, 7]}>
        <boxGeometry args={[2, 1, 3]} />
        <meshStandardMaterial color="#D4D4D8" metalness={0.9} roughness={0.4} />
      </mesh>
      <mesh castShadow receiveShadow position={[-30, 1, -10]}>
        <boxGeometry args={[3, 2, 3]} />
        <meshStandardMaterial color="#71717A" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* LEDs */}
      <mesh position={[-5, 0.5, 15]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#60A5FA" emissive="#3B82F6" emissiveIntensity={6} toneMapped={false} />
      </mesh>
      <mesh position={[30, 0.5, -5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#60A5FA" emissive="#3B82F6" emissiveIntensity={6} toneMapped={false} />
      </mesh>
      <mesh position={[-25, 0.5, -20]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#60A5FA" emissive="#3B82F6" emissiveIntensity={6} toneMapped={false} />
      </mesh>
    </group>
  );
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
  
  // Smooth diagonal flight: Shift the entire world opposite to flight direction
  const groupOffset = [-u * TILE_SIZE, 0, -u * TILE_SIZE] as [number, number, number];
  
  const tiles = useMemo(() => {
    const arr: [number, number, number][] = [];
    for(let x = -2; x <= 2; x++) {
      for(let z = -2; z <= 2; z++) {
        arr.push([x * TILE_SIZE, 0, z * TILE_SIZE]);
      }
    }
    return arr;
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: '#090D16' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [-30, 40, 30], fov: 45 }}
        shadows
      >
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[60, 80, 20]} 
          intensity={1.8} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
          shadow-camera-left={-150}
          shadow-camera-right={150}
          shadow-camera-top={150}
          shadow-camera-bottom={-150}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-40, 20, -40]} intensity={0.4} />

        <TargetCamera />

        <group position={groupOffset}>
          <Board size={TILE_SIZE} uTimeUniform={uTimeUniform} />
          {tiles.map((pos, i) => (
            <Tile key={i} offset={pos} />
          ))}
        </group>
        
        {/* Deep fog to blend edges smoothly and give macro depth */}
        <fog attach="fog" args={['#090D16', 70, 140]} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

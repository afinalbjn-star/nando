import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';

const TAU = Math.PI * 2;
const HEX_R = 0.62;

// ---------- Shield outline ----------
const makeShieldShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, 4.0);
  s.quadraticCurveTo(1.8, 3.2, 3.2, 3.4);
  s.lineTo(3.2, 0.6);
  s.bezierCurveTo(3.2, -1.8, 1.6, -3.2, 0, -4.2);
  s.bezierCurveTo(-1.6, -3.2, -3.2, -1.8, -3.2, 0.6);
  s.lineTo(-3.2, 3.4);
  s.quadraticCurveTo(-1.8, 3.2, 0, 4.0);
  return s;
};

// Bulged (convex) surface height + normal
const bulgeZ = (x: number, y: number) =>
  0.85 * Math.max(0, 1 - (x / 3.5) * (x / 3.5)) * (1 - 0.22 * (y / 4.3) * (y / 4.3));
const bulgeNormal = (x: number, y: number) => {
  const e = 0.01;
  const dzdx = (bulgeZ(x + e, y) - bulgeZ(x - e, y)) / (2 * e);
  const dzdy = (bulgeZ(x, y + e) - bulgeZ(x, y - e)) / (2 * e);
  return new THREE.Vector3(-dzdx, -dzdy, 1).normalize();
};

const pointInPoly = (px: number, py: number, poly: THREE.Vector2[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

interface HexData {
  centers: THREE.Vector2[];
  segs: { a: THREE.Vector2; b: THREE.Vector2 }[];
}

const buildHexGrid = (): HexData => {
  const poly = makeShieldShape().getPoints(60);
  const centers: THREE.Vector2[] = [];
  const dx = Math.sqrt(3) * HEX_R;
  const dy = 1.5 * HEX_R;
  for (let row = -8; row <= 8; row++) {
    for (let col = -8; col <= 8; col++) {
      const cx = col * dx + (Math.abs(row) % 2 === 1 ? dx / 2 : 0);
      const cy = row * dy;
      if (!pointInPoly(cx, cy, poly)) continue;
      let minD = Infinity;
      for (const p of poly) minD = Math.min(minD, Math.hypot(p.x - cx, p.y - cy));
      if (minD < 0.5) continue;
      centers.push(new THREE.Vector2(cx, cy));
    }
  }
  const segs: { a: THREE.Vector2; b: THREE.Vector2 }[] = [];
  const rr = HEX_R * 0.97;
  centers.forEach((c) => {
    for (let k = 0; k < 6; k++) {
      const a1 = Math.PI / 6 + (k * Math.PI) / 3;
      const a2 = Math.PI / 6 + ((k + 1) * Math.PI) / 3;
      segs.push({
        a: new THREE.Vector2(c.x + Math.cos(a1) * rr, c.y + Math.sin(a1) * rr),
        b: new THREE.Vector2(c.x + Math.cos(a2) * rr, c.y + Math.sin(a2) * rr),
      });
    }
  });
  return { centers, segs };
};

// ---------- Canvas textures ----------
const makeLockTexture = () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 440;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 512, 440);
  g.fillStyle = '#1E3A8A';
  g.font = 'bold 74px "Courier New", monospace';
  g.textBaseline = 'middle';
  const rows = ['0101001', '100  10', '010  001', '1001011'];
  rows.forEach((r, i) => {
    const y = 60 + i * 105;
    for (let k = 0; k < r.length; k++) {
      if (r[k] === ' ') continue;
      g.fillText(r[k], 38 + k * 60, y);
    }
  });
  // keyhole
  g.fillStyle = '#0B1B4D';
  g.beginPath();
  g.arc(256, 190, 42, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(228, 215);
  g.lineTo(284, 215);
  g.lineTo(300, 340);
  g.lineTo(212, 340);
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
};

const makeBinaryTexture = (seed: number) => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 512, 64);
  g.fillStyle = '#67E8F9';
  g.font = 'bold 40px "Courier New", monospace';
  g.textBaseline = 'middle';
  let s = '';
  for (let i = 0; i < 20; i++) s += Math.sin(seed * 7.13 + i * 12.9898) > 0 ? '1' : '0';
  g.fillText(s, 8, 34);
  const t = new THREE.CanvasTexture(c);
  return t;
};

// ---------- Scene ----------
const ShieldScene: React.FC<{ u: number }> = ({ u }) => {
  const hex = useMemo(buildHexGrid, []);
  const plateRef = useRef<THREE.InstancedMesh>(null);
  const edgeRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const ringARef = useRef<THREE.InstancedMesh>(null);
  const ringBRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const shieldShape = useMemo(makeShieldShape, []);
  const backGeo = useMemo(
    () => new THREE.ExtrudeGeometry(shieldShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3, curveSegments: 40 }),
    [shieldShape]
  );
  const outlineGeo = useMemo(() => {
    const pts = shieldShape.getPoints(120).map((p) => new THREE.Vector3(p.x, p.y, bulgeZ(p.x, p.y) * 0.4 + 0.2));
    pts.pop();
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 360, 0.055, 8, true);
  }, [shieldShape]);

  const plateGeo = useMemo(() => {
    const s = new THREE.Shape();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + (k * Math.PI) / 3;
      const px = Math.cos(a) * HEX_R * 0.9;
      const py = Math.sin(a) * HEX_R * 0.9;
      if (k === 0) s.moveTo(px, py);
      else s.lineTo(px, py);
    }
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  }, []);
  const edgeGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const glowGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const dashGeo = useMemo(() => new THREE.BoxGeometry(0.34, 0.05, 0.05), []);

  const lockTex = useMemo(makeLockTexture, []);
  const binTex = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8].map(makeBinaryTexture), []);
  const binData = useMemo(
    () =>
      binTex.map((tex, i) => ({
        tex,
        x: (i % 2 === 0 ? -1 : 1) * (4.7 + (i % 4) * 0.5),
        y0: -3.5 + (i * 0.9) % 5,
        phase: (i * 0.137) % 1,
        speed: 1 + (i % 2),
        flip: i % 2 === 0,
      })),
    [binTex]
  );
  const binRefs = useRef<(THREE.Mesh | null)[]>([]);

  // static: ring dashes, plates
  useLayoutEffect(() => {
    const build = (ref: React.RefObject<THREE.InstancedMesh | null>, count: number, r: number) => {
      if (!ref.current) return;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        dummy.rotation.set(0, 0, a + Math.PI / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
      }
      ref.current.instanceMatrix.needsUpdate = true;
    };
    build(ringARef, 72, 2.75);
    build(ringBRef, 48, 2.2);

    if (plateRef.current) {
      const zAxis = new THREE.Vector3(0, 0, 1);
      hex.centers.forEach((c, i) => {
        const n = bulgeNormal(c.x, c.y);
        dummy.position.set(c.x, c.y, bulgeZ(c.x, c.y) + 0.12);
        dummy.quaternion.setFromUnitVectors(zAxis, n);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        plateRef.current!.setMatrixAt(i, dummy.matrix);
      });
      plateRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [hex, dummy]);

  const dim = useMemo(() => new THREE.Color('#0A5E86'), []);
  const bright = useMemo(() => new THREE.Color('#9BFCFF'), []);

  useLayoutEffect(() => {
    if (!edgeRef.current || !glowRef.current) return;
    const ph = u * TAU;
    hex.segs.forEach((s, i) => {
      const p1 = new THREE.Vector3(s.a.x, s.a.y, bulgeZ(s.a.x, s.a.y) + 0.24);
      const p2 = new THREE.Vector3(s.b.x, s.b.y, bulgeZ(s.b.x, s.b.y) + 0.24);
      const mx = (s.a.x + s.b.x) / 2;
      const my = (s.a.y + s.b.y) / 2;
      dummy.position.copy(p1).lerp(p2, 0.5);
      dummy.rotation.set(0, 0, 0);
      dummy.lookAt(p2.clone().sub(p1).add(dummy.position));
      dummy.scale.set(1, 1, p1.distanceTo(p2) * 1.04);
      dummy.updateMatrix();
      edgeRef.current!.setMatrixAt(i, dummy.matrix);
      glowRef.current!.setMatrixAt(i, dummy.matrix);

      // radial defense pulse travelling center -> edge (2 cycles per loop => seamless)
      const d = Math.hypot(mx, my * 0.8);
      const wave = Math.pow((Math.sin(d * 1.7 - ph * 2) + 1) / 2, 3);
      const b = 0.22 + 0.78 * wave;
      color.copy(dim).lerp(bright, b);
      edgeRef.current!.setColorAt(i, color);
      color.multiplyScalar(0.45 + 0.9 * wave);
      glowRef.current!.setColorAt(i, color);
    });
    edgeRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
    if (edgeRef.current.instanceColor) edgeRef.current.instanceColor.needsUpdate = true;
    if (glowRef.current.instanceColor) glowRef.current.instanceColor.needsUpdate = true;

    binData.forEach((b, i) => {
      const m = binRefs.current[i];
      if (!m) return;
      const t = (b.phase + u * b.speed) % 1;
      m.position.set(b.x, b.y0 + t * 2.2, -0.5);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * t) * 0.75;
    });
  }, [u, hex, binData, dummy, color, dim, bright]);

  const ph = u * TAU;
  const swing = Math.sin(ph) * 0.24;
  const tilt = Math.cos(ph) * 0.05;
  const lift = Math.sin(ph) * 0.12;
  const lockPulse = 1 + 0.025 * Math.sin(ph * 2);

  return (
    <group position={[0, lift, 0]} rotation={[tilt, swing, 0]}>
      {/* Backing glass shield */}
      <mesh geometry={backGeo} position={[0, 0, -0.4]}>
        <meshStandardMaterial color="#1D4ED8" transparent opacity={0.55} metalness={0.4} roughness={0.2} emissive="#1E3A8A" emissiveIntensity={0.5} depthWrite={false} />
      </mesh>

      {/* Glass hex plates */}
      <instancedMesh ref={plateRef} args={[plateGeo, undefined, hex.centers.length]} frustumCulled={false}>
        <meshStandardMaterial color="#3B82F6" transparent opacity={0.5} metalness={0.5} roughness={0.15} emissive="#1D4ED8" emissiveIntensity={0.45} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* Neon hex edges + glow halo */}
      <instancedMesh ref={edgeRef} args={[edgeGeo, undefined, hex.segs.length]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glowRef} args={[glowGeo, undefined, hex.segs.length]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>

      {/* Neon shield outline */}
      <mesh geometry={outlineGeo}>
        <meshBasicMaterial color="#67E8F9" toneMapped={false} />
      </mesh>

      {/* Rotating dashed rings around the lock */}
      <group position={[0, 0.2, 1.05]} rotation={[0, 0, u * TAU]}>
        <instancedMesh ref={ringARef} args={[dashGeo, undefined, 72]} frustumCulled={false}>
          <meshBasicMaterial color="#22D3EE" toneMapped={false} />
        </instancedMesh>
      </group>
      <group position={[0, 0.2, 1.05]} rotation={[0, 0, -u * TAU * 2]}>
        <instancedMesh ref={ringBRef} args={[dashGeo, undefined, 48]} frustumCulled={false}>
          <meshBasicMaterial color="#A5F3FC" toneMapped={false} />
        </instancedMesh>
      </group>

      {/* Padlock */}
      <group position={[0, -0.1, 1.35]} scale={[lockPulse, lockPulse, lockPulse]}>
        {/* shackle */}
        <mesh position={[0, 0.95, 0.15]}>
          <torusGeometry args={[0.72, 0.17, 20, 48, Math.PI]} />
          <meshStandardMaterial color="#F8FAFC" metalness={0.7} roughness={0.2} emissive="#BAE6FD" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[-0.72, 0.8, 0.15]}>
          <cylinderGeometry args={[0.17, 0.17, 0.3, 20]} />
          <meshStandardMaterial color="#F8FAFC" metalness={0.7} roughness={0.2} emissive="#BAE6FD" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0.72, 0.8, 0.15]}>
          <cylinderGeometry args={[0.17, 0.17, 0.3, 20]} />
          <meshStandardMaterial color="#F8FAFC" metalness={0.7} roughness={0.2} emissive="#BAE6FD" emissiveIntensity={0.35} />
        </mesh>
        {/* body */}
        <mesh position={[0, 0, 0.15]}>
          <boxGeometry args={[2.2, 1.9, 0.5]} />
          <meshStandardMaterial color="#F1F5F9" metalness={0.55} roughness={0.25} emissive="#BAE6FD" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.42]}>
          <planeGeometry args={[2.0, 1.72]} />
          <meshBasicMaterial map={lockTex} transparent toneMapped={false} />
        </mesh>
      </group>

      {/* Floating binary streams */}
      {binData.map((b, i) => (
        <mesh key={i} ref={(el) => { binRefs.current[i] = el; }} rotation={[0, 0, 0]} scale={[b.flip ? -1 : 1, 1, 1]}>
          <planeGeometry args={[2.6, 0.32]} />
          <meshBasicMaterial map={b.tex} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

export const CyberShield: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({ width = 3840, height = 2160, totalFrames = 600 }) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) % 1.0;

  return (
    <div style={{ width, height, background: 'transparent' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 17], fov: 40, near: 1, far: 80 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.9} color="#BFDBFE" />
        <directionalLight position={[8, 10, 14]} intensity={2.4} color="#FFFFFF" />
        <directionalLight position={[-10, -6, 8]} intensity={1.2} color="#38BDF8" />
        <pointLight position={[0, 0, 8]} intensity={18} distance={30} color="#22D3EE" />
        <ShieldScene u={u} />
      </ThreeCanvas>
    </div>
  );
};

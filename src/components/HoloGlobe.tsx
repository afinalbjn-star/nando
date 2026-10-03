import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useCurrentFrame } from 'remotion';
import { AMERICA_LAND } from './landData';

export type HoloGlobeScheme = 'teal' | 'violet' | 'amber';

interface HoloGlobeProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: HoloGlobeScheme;
}

interface SchemeDef {
  bg: [number, number, number];
  a: [number, number, number];
  b: [number, number, number];
}

const SCHEMES: Record<HoloGlobeScheme, SchemeDef> = {
  teal: { bg: [0.016, 0.055, 0.078], a: [0.18, 0.95, 0.86], b: [0.35, 0.85, 1.0] },
  violet: { bg: [0.05, 0.03, 0.1], a: [0.7, 0.45, 1.0], b: [0.95, 0.55, 1.0] },
  amber: { bg: [0.07, 0.04, 0.02], a: [1.0, 0.72, 0.3], b: [1.0, 0.9, 0.6] },
};

const MASK_W = 1024;
const MASK_H = 512;

function buildLandMask(w: number, h: number): Uint8Array {
  const data = new Uint8Array(w * h);
  const xs: number[] = [];
  for (let row = 0; row < h; row++) {
    const lat = 90 - (180 * (row + 0.5)) / h;
    xs.length = 0;
    for (let r = 0; r < AMERICA_LAND.length; r++) {
      const ring = AMERICA_LAND[r];
      const n = ring.length;
      for (let i = 0; i < n; i++) {
        const cur = ring[i];
        const nxt = ring[(i + 1) % n];
        if (cur[1] > lat !== nxt[1] > lat) {
          const t = (lat - cur[1]) / (nxt[1] - cur[1]);
          xs.push(cur[0] + t * (nxt[0] - cur[0]));
        }
      }
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    const base = row * w;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      let i0 = Math.ceil(((xs[k] + 180) / 360) * w - 0.5);
      const i1 = Math.floor(((xs[k + 1] + 180) / 360) * w - 0.5);
      if (i1 < 0 || i0 > w - 1) continue;
      if (i0 < 0) i0 = 0;
      for (let x = i0; x <= i1; x++) data[base + x] = 255;
    }
  }
  return data;
}

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform float uT;
uniform float uU;
uniform float uLon0;
uniform float uTilt;
uniform sampler2D uLand;
uniform vec3 uBg;
uniform vec3 uA;
uniform vec3 uB;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float R = 0.78;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec3 rotX(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 rotY(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}

vec3 llv(float lonDeg, float latDeg) {
  float la = radians(latDeg);
  float lo = radians(lonDeg) - uLon0;
  return vec3(cos(la) * cos(lo), sin(la), cos(la) * sin(lo));
}

float arcMask(vec3 p, vec3 a, vec3 b, float w) {
  vec3 n = cross(a, b);
  float nl = length(n);
  if (nl < 0.02) return 0.0;
  n /= nl;
  float d = abs(dot(p, n));
  float between = smoothstep(0.0, 0.2, dot(p, a)) * smoothstep(0.0, 0.2, dot(p, b));
  float ang = atan(dot(p, cross(n, a)), dot(p, a));
  float pulse = pow(max(0.0, sin(ang * 2.0 - uT * 2.0)), 22.0);
  return smoothstep(w, 0.0, d) * between * (0.55 + 1.25 * pulse);
}

vec3 ringPt(float r, float tl, float az, float a) {
  vec3 p = vec3(cos(a) * r, 0.0, sin(a) * r);
  p = rotX(p, tl);
  return rotY(p, az);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.58, 3.05);
  vec3 rd = normalize(vec3((uv + vec2(0.0, -0.3)) * 1.3, -1.7));

  vec3 col = uBg * (0.3 + 0.7 * smoothstep(1.15, 0.0, length(uv)));
  col += uA * 0.11 * exp(-3.0 * length(uv));

  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    float sp = 1.0 + floor(hash11(fi * 7.3 + 3.0) * 2.0);
    vec2 c = (vec2(hash11(fi * 1.7 + 11.0), hash11(fi * 3.1 + 5.0)) - 0.5) * vec2(1.7, 1.0);
    c.x += 0.07 * sin(uT * sp + fi);
    c.y += 0.055 * cos(uT * sp + fi * 1.3);
    float rad = 0.010 + 0.05 * hash11(fi * 11.0 + 2.0);
    float tw = 0.5 + 0.5 * sin(uT * 2.0 + fi * 2.1);
    col += uA * smoothstep(rad, rad * 0.2, length(uv - c)) * (0.05 + 0.09 * tw);
  }

  vec3 roG = rotX(ro, -uTilt);
  vec3 rdG = rotX(rd, -uTilt);

  float bq = dot(roG, rdG);
  float cq = dot(roG, roG) - R * R;
  float dq = bq * bq - cq;
  float ts = -1.0;
  vec3 nG = vec3(0.0);
  vec3 gW = vec3(0.0);
  if (dq > 0.0) {
    float t0 = -bq - sqrt(dq);
    if (t0 > 0.0) {
      ts = t0;
      vec3 gG = roG + rdG * t0;
      nG = normalize(gG);
      gW = rotX(gG, uTilt);
    }
  }

  float back = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float r = 1.02 + fi * 0.3;
    float tl = 0.24 + fi * 0.055;
    float az = 0.06 * fi;
    vec3 lo = rotX(rotY(ro, -az), -tl);
    vec3 ld = rotX(rotY(rd, -az), -tl);
    if (abs(ld.y) < 0.02) continue;
    float tp = -lo.y / ld.y;
    if (tp <= 0.0) continue;
    vec3 hp = lo + ld * tp;
    float rr = length(hp.xz);
    float dr = abs(rr - r);
    float w = clamp(fwidth(rr), 0.0, 0.09) * 0.9 + 0.0035;
    float line = 1.0 - smoothstep(0.0, w, dr);
    float onRing = 1.0 - smoothstep(0.0, 0.1, dr);
    float nodes = 9.0 + fi * 2.0;
    float period = TAU / nodes;
    float rel = atan(hp.z, hp.x) - uT * (1.0 + fi);
    float ki = floor(rel / period);
    float dd = rel - ki * period;
    dd = min(dd, period - dd);
    float seed = hash11(ki * 1.7 + fi * 31.0);
    float pulse = 0.45 + 0.55 * sin(uT * 2.0 + seed * TAU);
    float node = smoothstep(mix(0.02, 0.045, seed), 0.0, dd) * onRing * (0.4 + 0.6 * pulse);
    float amt = line * 0.42 + node * 1.3;
    if (ts > 0.0 && tp < ts) back += amt;
    else col += mix(uA, uB, 0.3) * amt;
  }

  for (int c = 0; c < 3; c++) {
    float fc = float(c);
    vec3 A = ringPt(1.32, 0.295, 0.28, uT * 2.0 + fc * 2.094);
    vec3 C = ringPt(1.92, 0.405, 0.84, -uT * 4.0 + fc * 2.094);
    vec3 M = (A + C) * 0.5 + vec3(0.0, 0.42, 0.0);
    float front = 0.0;
    float rear = 0.0;
    for (int i = 0; i <= 16; i++) {
      float f = float(i) / 16.0;
      vec3 pt = mix(mix(A, M, f), mix(M, C, f), f);
      float tp = dot(pt - ro, rd);
      if (tp <= 0.0) continue;
      float s = smoothstep(0.006, 0.0, length(ro + rd * tp - pt));
      if (ts > 0.0 && tp < ts) rear = max(rear, s);
      else front = max(front, s);
    }
    col += uB * front * 0.22;
    back += rear * 0.22;
  }

  if (ts > 0.0) {
    vec3 nW = normalize(gW);
    float facing = clamp(dot(nW, -rd), 0.0, 1.0);
    float solid = smoothstep(0.015, 0.3, facing);

    vec3 lp = rotY(nG, -uT);
    float lat = asin(clamp(lp.y, -1.0, 1.0));
    float lonRaw = atan(lp.z, lp.x);
    float lon = lonRaw + uLon0;
    float land = texture(uLand, vec2(lon / TAU + 0.5, 0.5 - lat / PI)).r;

    vec2 g = vec2(lon, lat) * 100.0;
    float dotm = smoothstep(0.34, 0.16, length(fract(g) - 0.5));

    float step15 = PI / 12.0;
    float mlon = abs(fract(lon / step15 + 0.5) - 0.5) * step15;
    float mlat = abs(fract(lat / step15 + 0.5) - 0.5) * step15;
    float seam = 1.0 - smoothstep(0.0, 0.05, abs(abs(lonRaw) - PI));
    float polar = smoothstep(1.5, 1.3, abs(lat));
    float grat = (smoothstep(fwidth(lon) * 1.4 + 1e-5, 0.0, mlon)
               + smoothstep(fwidth(lat) * 1.4 + 1e-5, 0.0, mlat)) * (1.0 - seam) * polar;

    float arcs = 0.0;
    arcs += arcMask(lp, llv(-74.0, 40.7), llv(-0.1, 51.5), 0.006);
    arcs += arcMask(lp, llv(-0.1, 51.5), llv(139.7, 35.7), 0.006);
    arcs += arcMask(lp, llv(-46.6, -23.5), llv(151.2, -33.9), 0.006);
    arcs += arcMask(lp, llv(-99.1, 19.4), llv(-3.7, 40.4), 0.006);
    arcs += arcMask(lp, llv(77.2, 28.6), llv(103.8, 1.3), 0.006);

    float fres = pow(1.0 - facing, 2.6);
    float below = smoothstep(-0.15, -0.85, gW.y);
    float mask = (1.0 - 0.7 * below);

    vec3 inner = vec3(0.0);
    inner += uA * 0.032 * grat * solid;
    inner += mix(uA, vec3(1.0), 0.45) * land * dotm * solid * polar * 2.3;
    inner += uB * arcs * solid * polar * 0.7;
    inner += mix(uA, uB, 0.5) * fres * 1.05;
    col += inner * mask;
  }

  col += mix(uA, uB, 0.4) * back * 0.5;

  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float sp = 1.0 + floor(hash11(fi * 5.1 + 21.0) * 2.0);
    vec2 c = (vec2(hash11(fi * 9.7 + 31.0), hash11(fi * 2.3 + 17.0)) - 0.5) * vec2(1.7, 1.0);
    c.x += 0.08 * sin(uT * sp + fi * 0.7);
    c.y += 0.06 * cos(uT * sp + fi * 1.9);
    float rad = 0.014 + 0.062 * hash11(fi * 13.0 + 6.0);
    float tw = 0.5 + 0.5 * sin(uT * 2.0 + fi * 1.3);
    col += mix(uA, vec3(1.0), 0.25) * smoothstep(rad, rad * 0.2, length(uv - c)) * (0.06 + 0.11 * tw);
  }

  col *= 1.0 - 0.5 * pow(length(uv * vec2(0.82, 1.0)), 2.4);
  float gr = hash21(gl_FragCoord.xy + vec2(mod(floor(uU * 24.0), 24.0) * 37.0, 0.0));
  col += (gr - 0.5) * 0.02;

  outColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile failed: ${log ?? 'unknown'}`);
  }
  return sh;
}

const HoloGlobe: React.FC<HoloGlobeProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'teal',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mask = useMemo(() => buildLandMask(MASK_W, MASK_H), []);
  const [err, setErr] = useState<string | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: true, preserveDrawingBuffer: true,
    });
    if (!gl) {
      setErr('WebGL2 tidak tersedia di browser ini');
      return;
    }

    let prog: WebGLProgram;
    try {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) {
        setErr('Shader tidak berhasil dibuat');
        return;
      }
      const p = gl.createProgram();
      if (!p) {
        setErr('Program tidak berhasil dibuat');
        return;
      }
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        setErr(`Link gagal: ${gl.getProgramInfoLog(p) ?? 'unknown'}`);
        return;
      }
      prog = p;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return;
    }
    setErr(null);

    gl.useProgram(prog);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, MASK_W, MASK_H, 0, gl.RED, gl.UNSIGNED_BYTE, mask);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const def = SCHEMES[scheme];
    gl.uniform1i(u('uLand'), 0);
    gl.uniform1f(u('uLon0'), (-170 * Math.PI) / 180);
    gl.uniform1f(u('uTilt'), 0.18);
    gl.uniform3f(u('uBg'), def.bg[0], def.bg[1], def.bg[2]);
    gl.uniform3f(u('uA'), def.a[0], def.a[1], def.a[2]);
    gl.uniform3f(u('uB'), def.b[0], def.b[1], def.b[2]);
    gl.viewport(0, 0, canvas.width, canvas.height);

    return () => {
      gl.deleteTexture(tex);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
    };
  }, [mask, scheme]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) return;
    const prog = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    if (!prog) return;
    gl.useProgram(prog);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl.uniform1f(u('uU'), frame / totalFrames);
    gl.uniform1f(u('uT'), (frame / totalFrames) * Math.PI * 2 * speed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }, [frame, totalFrames, speed]);

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: '#040b10' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
      {err !== null ? (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 60, color: '#ff8080', background: '#120406',
            fontFamily: 'monospace', fontSize: 26, textAlign: 'center', whiteSpace: 'pre-wrap',
          }}
        >
          {`HoloGlobe gagal:\n${err}`}
        </div>
      ) : null}
    </div>
  );
};

export { HoloGlobe };

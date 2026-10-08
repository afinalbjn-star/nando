import React, { useRef, useEffect } from 'react';
import { useCurrentFrame } from 'remotion';

export type VelvetScheme = 'crimson' | 'midnight' | 'forest' | 'royal';

interface VelvetCheckProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: VelvetScheme;
}

interface VelvetPal {
  dark: [number, number, number];
  light: [number, number, number];
  bg: string;
}

const SCHEMES: Record<VelvetScheme, VelvetPal> = {
  crimson: {
    dark: [115, 12, 20],      // Deep premium crimson (mirip referensi)
    light: [238, 225, 195],   // Warm silk cream (mirip referensi)
    bg: '#4a0810',
  },
  midnight: {
    dark: [15, 20, 60],
    light: [220, 230, 245],
    bg: '#080a20',
  },
  forest: {
    dark: [12, 55, 30],
    light: [215, 235, 210],
    bg: '#082512',
  },
  royal: {
    dark: [50, 10, 80],
    light: [230, 215, 245],
    bg: '#200530',
  },
};

const PI2 = Math.PI * 2;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const VelvetCheck: React.FC<VelvetCheckProps> = ({
  width = 1920,
  height = 1080,
  totalFrames = 240,
  speed = 1,
  scheme = 'crimson',
}) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Waktu dari 0 ke 2PI untuk seamless loop
  const t = (frame / totalFrames) * PI2 * speed;
  const p = SCHEMES[scheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolusi render (0.6 adalah sweet spot untuk performa & ketajaman di Canvas)
    const S = 0.6; 
    const iw = Math.floor(width * S);
    const ih = Math.floor(height * S);
    const aspect = iw / ih;

    const imgData = ctx.createImageData(iw, ih);
    const data = imgData.data;

    for (let py = 0; py < ih; py++) {
      for (let px = 0; px < iw; px++) {
        // Kordinat normalisasi tengah (-0.5 ke 0.5)
        const nx = (px / iw - 0.5) * aspect;
        const ny = (py / ih - 0.5);

        // --- 1. FABRIC FOLDS (Gelombang Lipatan Kain Besar & Organik) ---
        // Menggunakan kombinasi sin & cos lambat untuk kesan lipatan mulus
        const f1 = Math.sin(nx * 2.5 + ny * 1.2 + t);
        const f2 = Math.cos(nx * -1.8 + ny * 2.5 - t * 0.8);
        const f3 = Math.sin(nx * 1.5 - ny * 1.8 + t * 1.2);

        // Ketinggian kain (Height map) : -1 (lembah) sampai 1 (puncak)
        const h = (f1 * 0.5 + f2 * 0.35 + f3 * 0.15);

        // --- 2. UV DISTORTION (Tarikan Tekstur) ---
        // Tekstur ikut tertarik mengikuti ketinggian lipatan
        const warpX = f1 * 0.28 + f3 * 0.12;
        const warpY = f2 * 0.28 - f3 * 0.10;

        // --- 3. CHECKERBOARD GRID ---
        // Putar grid sedikit (slant) agar elegan
        const ang = 0.20; 
        const rx = nx * Math.cos(ang) - ny * Math.sin(ang);
        const ry = nx * Math.sin(ang) + ny * Math.cos(ang);

        // Skala besar kotak
        const gridScale = 3.2;
        const u = (rx + warpX) * gridScale;
        const v = (ry + warpY) * gridScale;

        // --- 4. ANTI-ALIASED CHECKER PATTERN ---
        // Menghasilkan kotak tanpa pinggiran bergerigi / kaku
        const wave = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
        const blend = smoothstep(-0.04, 0.04, wave);

        // --- 5. COLOR MIXING ---
        const r_base = p.dark[0] + (p.light[0] - p.dark[0]) * blend;
        const g_base = p.dark[1] + (p.light[1] - p.dark[1]) * blend;
        const b_base = p.dark[2] + (p.light[2] - p.dark[2]) * blend;

        // --- 6. LIGHTING & SHADING ---
        // Bayangan lembut yang mengikuti kedalaman lipatan kain (bukan kotak)
        const diffuse = 0.35 + 0.65 * smoothstep(-0.8, 0.8, h);
        
        let r = r_base * diffuse;
        let g = g_base * diffuse;
        let b = b_base * diffuse;

        // --- 7. SILK SPECULAR HIGHLIGHTS ---
        // Kilauan halus pada puncak kain yang terkena cahaya
        const specFocus = smoothstep(0.3, 1.0, h + f1 * 0.2);
        const spec = Math.pow(specFocus, 2.5) * 0.25;

        // Tambah pantulan (kilap putih hangat)
        r += 255 * spec;
        g += 240 * spec;
        b += 225 * spec;

        // Tulis pixel
        const idx = (py * iw + px) * 4;
        data[idx] = Math.min(255, Math.max(0, r));
        data[idx+1] = Math.min(255, Math.max(0, g));
        data[idx+2] = Math.min(255, Math.max(0, b));
        data[idx+3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    
    // Scale up dengan smoothing bawaan Canvas untuk hasil halus
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, iw, ih, 0, 0, width, height);

  }, [frame, width, height, totalFrames, speed, t, p]);

  return (
    <div style={{ width, height, overflow: 'hidden', background: p.bg }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export { VelvetCheck };

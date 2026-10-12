import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

const TOTAL_FRAMES = 720; // 12 Detik @ 60 FPS = 720 Frames (Loop Sempurna)

interface SpookyBackgroundProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  transparentSky?: boolean; // Dukungan Alpha Channel jika diinginkan
}

export const SpookyBackgroundLoop: React.FC<SpookyBackgroundProps> = ({
  width = 3840,
  height = 2160,
  totalFrames = TOTAL_FRAMES,
  transparentSky = false,
}) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) % 1.0; // 0.0 -> 1.0 Siklus periodik sempurna

  // 1. Organic Candle Flicker untuk 3 Labu (Harmonic integer cycles)
  const flicker1 = useMemo(() => {
    return (
      0.82 +
      0.18 *
        (Math.sin(u * Math.PI * 2 * 18) * 0.45 +
          Math.sin(u * Math.PI * 2 * 31) * 0.35 +
          Math.sin(u * Math.PI * 2 * 53) * 0.2)
    );
  }, [u]);

  const flicker2 = useMemo(() => {
    return (
      0.8 +
      0.2 *
        (Math.sin(u * Math.PI * 2 * 22 + 1.2) * 0.4 +
          Math.sin(u * Math.PI * 2 * 37 + 0.8) * 0.35 +
          Math.sin(u * Math.PI * 2 * 59 + 2.1) * 0.25)
    );
  }, [u]);

  const flicker3 = useMemo(() => {
    return (
      0.84 +
      0.16 *
        (Math.sin(u * Math.PI * 2 * 15 + 2.5) * 0.5 +
          Math.sin(u * Math.PI * 2 * 27 + 1.7) * 0.3 +
          Math.sin(u * Math.PI * 2 * 49 + 0.4) * 0.2)
    );
  }, [u]);

  // 2. Angin Malam Mengayunkan Ranting Pohon (Detik 04 – 08 aktif lebih kencang, harmonik integer = 3)
  const treeSwayLeft = Math.sin(u * Math.PI * 2 * 3) * 2.2;
  const treeSwayRight = Math.cos(u * Math.PI * 2 * 3) * 2.0;

  // 3. Pergeseran Awan Tipis Menutupi Sebagian Bulan
  const cloudOffset1 = (u * 600) % 600;
  const cloudOffset2 = (u * 450) % 450;

  // 4. Kawanan Kelelawar Melintas Cepat di Depan Bulan (Detik 04 – 08)
  // Masuk di u = 0.32, keluar di u = 0.68. Di luar rentang ini koordinat berada di luar layar (100% seamless).
  const bats = useMemo(() => {
    const list = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const stagger = i * 0.02;
      const progressBat = (u - 0.3 + stagger);
      // Koordinat X melintas dari kanan (3600) ke kiri (1400) melintasi bulan (posisi bulan di ~2600)
      const x = 3800 - progressBat * 6500;
      const y = 550 + Math.sin(progressBat * Math.PI * 3 + i) * 160 + (i % 5) * 60;
      const scale = 0.55 + (i % 4) * 0.18;
      const wingPhase = (u * 720 * 0.45 + i * 1.5) % (Math.PI * 2);
      const wingFlap = Math.sin(wingPhase) * 32; // Kepakan sayap derajat
      const isVisible = u >= 0.28 && u <= 0.72;
      list.push({ x, y, scale, wingFlap, isVisible, id: i });
    }
    return list;
  }, [u]);

  // 5. Kabut Tanah Bergulung Halus (Rolling Ground Fog)
  const fogScroll = u * Math.PI * 2 * 2; // 2 siklus penuh dalam 12 detik

  return (
    <AbsoluteFill
      style={{
        backgroundColor: transparentSky ? 'transparent' : '#0D0B18',
        overflow: 'hidden',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 3840 2160"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          {/* Palet Langit Malam Gothic */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#080612" />
            <stop offset="45%" stopColor="#0D0B18" />
            <stop offset="75%" stopColor="#1B112C" />
            <stop offset="100%" stopColor="#2A153D" />
          </linearGradient>

          {/* Cahaya Pendaran Bulan Purnama (#F5F5ED) */}
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#F5F5ED" stopOpacity="0.65" />
            <stop offset="65%" stopColor="#C4B5FD" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1B112C" stopOpacity="0" />
          </radialGradient>

          {/* Bulan Purnama Tekstur */}
          <radialGradient id="moonBody" cx="42%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#F5F5ED" />
            <stop offset="90%" stopColor="#E2E2D6" />
            <stop offset="100%" stopColor="#C8C8BA" />
          </radialGradient>

          {/* Api Labu Neon Oranye (#FF7A00) */}
          <radialGradient id="pumpkinFire1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF275" stopOpacity="1" />
            <stop offset="40%" stopColor="#FF7A00" stopOpacity="0.95" />
            <stop offset="80%" stopColor="#FF4500" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
          </radialGradient>

          {/* Filter Blur Ethereal untuk Kabut & Cahaya Bulan */}
          <filter id="blurHalo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="45" />
          </filter>
          <filter id="blurFog" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="35" />
          </filter>
          <filter id="glowFlicker" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ============================================================== */}
        {/* LAYER 1: LANGIT MALAM GOTHIC                                  */}
        {/* ============================================================== */}
        {!transparentSky && (
          <rect width="3840" height="2160" fill="url(#skyGrad)" />
        )}

        {/* Bintang-Bintang Dingin Berpendar Halus */}
        <g opacity="0.65">
          {[
            [350, 220, 2.5],
            [680, 150, 3],
            [1120, 280, 2],
            [1450, 180, 3.2],
            [1820, 240, 2.2],
            [3100, 160, 2.5],
            [3420, 230, 3],
            [3650, 320, 2.2],
            [520, 420, 2],
            [920, 480, 2.4],
            [1620, 420, 2.8],
          ].map(([sx, sy, sr], i) => (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={sr}
              fill="#E0E7FF"
              opacity={0.5 + 0.5 * Math.sin(u * Math.PI * 2 * (2 + (i % 3)) + i)}
            />
          ))}
        </g>

        {/* ============================================================== */}
        {/* LAYER 2: BULAN PURNAMA RAKSASA (#F5F5ED) DENGAN PENDARAN      */}
        {/* ============================================================== */}
        <g id="MoonGroup">
          {/* Pendaran Luar Luas */}
          <circle cx="2650" cy="720" r="820" fill="url(#moonGlow)" filter="url(#blurHalo)" opacity="0.8" />
          <circle cx="2650" cy="720" r="540" fill="url(#moonGlow)" filter="url(#blurHalo)" opacity="0.9" />

          {/* Badan Bulan Purnama */}
          <circle cx="2650" cy="720" r="340" fill="url(#moonBody)" />

          {/* Kawah-Kawah Permukaan Bulan */}
          <g fill="#B8B8A6" opacity="0.32">
            <ellipse cx="2580" cy="640" rx="65" ry="48" />
            <ellipse cx="2720" cy="620" rx="45" ry="38" />
            <ellipse cx="2620" cy="750" rx="80" ry="60" />
            <ellipse cx="2770" cy="770" rx="55" ry="42" />
            <ellipse cx="2540" cy="810" rx="40" ry="32" />
            <ellipse cx="2690" cy="850" rx="50" ry="35" />
          </g>

          {/* Awan Tipis Bergeser Menutupi Sebagian Bulan (Detik 00 – 04 & Loop) */}
          <g opacity="0.45" filter="url(#blurFog)">
            <ellipse
              cx={2480 + Math.sin(u * Math.PI * 2) * 120}
              cy="670"
              rx="420"
              ry="75"
              fill="#1B112C"
            />
            <ellipse
              cx={2750 - Math.sin(u * Math.PI * 2) * 90}
              cy="760"
              rx="380"
              ry="65"
              fill="#26133B"
            />
          </g>
        </g>

        {/* ============================================================== */}
        {/* LAYER 3: KAWANAN KELELAWAR MELINTAS BULAN (Detik 04 – 08)       */}
        {/* ============================================================== */}
        <g id="BatSwarm">
          {bats.map(
            (b) =>
              b.isVisible && (
                <g
                  key={b.id}
                  transform={`translate(${b.x}, ${b.y}) scale(${b.scale})`}
                  fill="#07050E"
                >
                  {/* Badan Kelelawar */}
                  <ellipse cx="0" cy="0" rx="14" ry="7" />
                  <circle cx="12" cy="-2" r="5" />
                  {/* Sayap Kiri Berayun */}
                  <path
                    d={`M -2 -2 Q -22 ${-38 - b.wingFlap} -46 ${-22 - b.wingFlap} Q -30 ${-6 - b.wingFlap * 0.4} -12 4 Z`}
                  />
                  {/* Sayap Kanan Berayun */}
                  <path
                    d={`M 4 -2 Q 24 ${-38 - b.wingFlap} 48 ${-22 - b.wingFlap} Q 32 ${-6 - b.wingFlap * 0.4} 14 4 Z`}
                  />
                </g>
              )
          )}
        </g>

        {/* ============================================================== */}
        {/* LAYER 4: BUKIT KASTIL GOTHIC DI KEJAUHAN (SILHOUETTE)         */}
        {/* ============================================================== */}
        <g id="DistantCastle" fill="#100B1F">
          {/* Bukit Tebing Karang Kejauhan */}
          <path d="M 1800 1650 Q 2200 1200 2700 1280 Q 3100 1350 3840 1520 L 3840 2160 L 1800 2160 Z" />

          {/* Menara & Kastil Spire di Atas Bukit */}
          <g transform="translate(2580, 1020) scale(0.85)">
            {/* Dinding Utama Kastil */}
            <rect x="0" y="160" width="220" height="150" />
            <rect x="50" y="90" width="120" height="180" />
            {/* Menara Utama Tinggi (Keep) */}
            <rect x="90" y="10" width="45" height="180" />
            <polygon points="90,10 112,-60 135,10" />
            {/* Menara Samping Kiri */}
            <rect x="-15" y="100" width="35" height="120" />
            <polygon points="-15,100 2.5,40 20,100" />
            {/* Menara Samping Kanan */}
            <rect x="200" y="110" width="35" height="110" />
            <polygon points="200,110 217.5,50 235,110" />
            {/* Jendela Menyala Redup di Kastil */}
            <rect x="105" y="60" width="14" height="26" rx="4" fill="#FDE047" opacity="0.65" />
            <rect x="25" y="180" width="12" height="20" rx="3" fill="#FDE047" opacity="0.45" />
            <rect x="180" y="180" width="12" height="20" rx="3" fill="#FDE047" opacity="0.45" />
          </g>
        </g>

        {/* ============================================================== */}
        {/* LAYER 5: KABUT TENGAH BERGULUNG HALUS (MIST LAYER 1)          */}
        {/* ============================================================== */}
        <g filter="url(#blurFog)" opacity="0.38" fill="#3B1C5A">
          <path
            d={`M -200 1650 Q ${700 + Math.sin(fogScroll) * 120} ${1580 + Math.cos(fogScroll) * 35} 1600 1620 Q ${2500 + Math.cos(fogScroll) * 120} ${1560 + Math.sin(fogScroll) * 35} 4100 1660 L 4100 2160 L -200 2160 Z`}
          />
        </g>

        {/* ============================================================== */}
        {/* LAYER 6: BUKIT KUBURAN TUA & NISAN (GRAVEYARD SILHOUETTE)       */}
        {/* ============================================================== */}
        <g id="GraveyardHills" fill="#090613">
          {/* Kontur Tanah Kuburan (Low Angle, Tengah Agak Melengkung Rendah untuk Copy Space) */}
          <path d="M 0 1780 Q 900 1620 1920 1740 Q 2900 1680 3840 1810 L 3840 2160 L 0 2160 Z" />
          <path d="M 0 1860 Q 1100 1740 2100 1820 Q 3100 1780 3840 1920 L 3840 2160 L 0 2160 Z" fill="#05030A" />

          {/* Nisan-Nisan Salib & Kuburan Tua Berjajar Miring */}
          {/* Nisan 1 (Kiri Tengah) */}
          <g transform="translate(620, 1630) rotate(-6)">
            <rect x="0" y="20" width="48" height="90" rx="10" />
            <line x1="8" y1="50" x2="40" y2="50" stroke="#040207" strokeWidth="6" />
          </g>
          {/* Nisan Salib Celtic (Kiri) */}
          <g transform="translate(850, 1590) rotate(4)">
            <rect x="18" y="0" width="18" height="120" />
            <rect x="0" y="32" width="54" height="16" />
            <circle cx="27" cy="40" r="24" fill="none" stroke="#090613" strokeWidth="8" />
          </g>
          {/* Nisan Bulat Kuno (Tengah Kiri) */}
          <g transform="translate(1220, 1670) rotate(-8)">
            <path d="M 0 40 Q 30 0 60 40 L 60 110 L 0 110 Z" />
          </g>

          {/* Nisan di Sisi Kanan Lapang */}
          {/* Nisan Salib Miring (Kanan Tengah) */}
          <g transform="translate(2680, 1690) rotate(9)">
            <rect x="16" y="0" width="16" height="110" />
            <rect x="0" y="28" width="48" height="14" />
          </g>
          {/* Nisan Lengkung Klasik (Kanan) */}
          <g transform="translate(3020, 1710) rotate(-5)">
            <rect x="0" y="15" width="55" height="95" rx="14" />
          </g>
          {/* Nisan Salib Besar Berlumut (Kanan Jauh) */}
          <g transform="translate(3320, 1680) rotate(3)">
            <rect x="22" y="0" width="22" height="140" />
            <rect x="0" y="38" width="66" height="20" />
          </g>
        </g>

        {/* ============================================================== */}
        {/* LAYER 7: RANTING POHON KERING BERGOYANG ANGIN (LEFT & RIGHT)   */}
        {/* ============================================================== */}
        {/* Pohon Tua Kiri Raksasa Mengurung Bingkai Atas */}
        <g
          id="SpookyTreeLeft"
          fill="#05030A"
          transform={`translate(0, 700) rotate(${treeSwayLeft}, 100, 1400)`}
        >
          {/* Batang Utama Melengkung Menyeramkan */}
          <path d="M -80 1460 Q 220 900 180 320 Q 150 120 40 -80 L -120 -80 L -120 1460 Z" />
          {/* Cabang Atas Mengarah ke Tengah */}
          <path d="M 170 340 Q 380 200 680 120 Q 950 80 1240 130 Q 1020 180 720 220 Q 420 280 170 360 Z" />
          <path d="M 680 120 Q 820 -60 1060 -120 Q 940 -40 760 140 Z" />
          <path d="M 380 260 Q 560 380 820 440 Q 640 460 360 320 Z" />
          {/* Cabang Bawah Mengarah ke Kiri Bawah */}
          <path d="M 190 620 Q 440 560 760 620 Q 520 680 180 710 Z" />
          <path d="M 440 580 Q 620 480 880 460 Q 680 540 450 630 Z" />
        </g>

        {/* Pohon Tua Kanan Merambati Bulan */}
        <g
          id="SpookyTreeRight"
          fill="#05030A"
          transform={`translate(3840, 800) scale(-1, 1) rotate(${treeSwayRight}, 100, 1300)`}
        >
          <path d="M -80 1360 Q 240 850 190 350 Q 160 140 60 -60 L -100 -60 L -100 1360 Z" />
          <path d="M 180 370 Q 420 240 780 160 Q 1060 120 1320 160 Q 1080 220 740 260 Q 420 320 180 390 Z" />
          <path d="M 780 160 Q 940 -40 1220 -80 Q 1040 -10 820 180 Z" />
          <path d="M 460 270 Q 660 410 940 460 Q 720 490 420 340 Z" />
          <path d="M 210 650 Q 480 610 820 660 Q 560 730 200 740 Z" />
        </g>

        {/* ============================================================== */}
        {/* LAYER 8: KABUT TANAH BERGULUNG DEPAN (ROLLING FOG LAYER 2)     */}
        {/* ============================================================== */}
        <g filter="url(#blurFog)" opacity="0.48" fill="#4C2575">
          <path
            d={`M -200 1920 Q ${800 - Math.sin(fogScroll) * 160} ${1820 + Math.sin(fogScroll) * 45} 1850 1880 Q ${2900 + Math.sin(fogScroll) * 160} ${1830 - Math.cos(fogScroll) * 45} 4100 1910 L 4100 2160 L -200 2160 Z`}
          />
        </g>

        {/* ============================================================== */}
        {/* LAYER 9: 3 LABU JACK-O'-LANTERN DENGAN CAHAYA BERKEDIP ALAMI   */}
        {/* ============================================================== */}

        {/* ----------------- LABU 1 (KIRI DEPAN, SEDANG) ----------------- */}
        <g transform="translate(480, 1780) rotate(4)">
          {/* Pendaran Cahaya Api Oranye ke Tanah sekeliling */}
          <circle
            cx="130"
            cy="110"
            r={160 * flicker1}
            fill="url(#pumpkinFire1)"
            filter="url(#blurHalo)"
            opacity={0.85 * flicker1}
          />

          {/* Badan Labu Oranye Gelap Tua Bertekstur */}
          <g fill="#07030C">
            {/* Gagang Labu Bengkok */}
            <path d="M 120 15 Q 140 -25 170 -35 Q 155 -15 138 18 Z" fill="#040208" />
            {/* Rusuk Labu */}
            <ellipse cx="60" cy="100" rx="65" ry="85" />
            <ellipse cx="200" cy="100" rx="65" ry="85" />
            <ellipse cx="90" cy="100" rx="60" ry="92" />
            <ellipse cx="170" cy="100" rx="60" ry="92" />
            <ellipse cx="130" cy="100" rx="60" ry="96" />
          </g>

          {/* Ukiran Mata & Mulut Menyeramkan Menyala Oranye Neon (#FF7A00) */}
          <g
            filter="url(#glowFlicker)"
            fill="#FF7A00"
            opacity={0.92 * flicker1}
          >
            {/* Mata Kiri Jahat */}
            <polygon points="75,65 110,80 82,90" />
            {/* Mata Kanan Jahat */}
            <polygon points="175,65 140,80 168,90" />
            {/* Hidung Segitiga */}
            <polygon points="125,92 135,92 130,80" />
            {/* Mulut Gerigi Iblis Tersenyum */}
            <path d="M 68 118 L 88 128 L 98 120 L 115 132 L 130 120 L 145 132 L 162 120 L 172 128 L 192 118 Q 130 175 68 118 Z" />
          </g>
          {/* Inti Api Kuning Terang di Dalam Ukiran */}
          <g fill="#FFF080" opacity={0.88 * flicker1}>
            <polygon points="80,72 102,80 86,86" />
            <polygon points="170,72 148,80 164,86" />
            <path d="M 80 122 L 98 123 L 115 128 L 130 123 L 145 128 L 162 123 L 180 122 Q 130 160 80 122 Z" />
          </g>
        </g>

        {/* ----------------- LABU 2 (KIRI MENDUKUNG, KECIL) ---------------- */}
        <g transform="translate(320, 1850) rotate(-8) scale(0.72)">
          <circle
            cx="120"
            cy="100"
            r={140 * flicker2}
            fill="url(#pumpkinFire1)"
            filter="url(#blurHalo)"
            opacity={0.78 * flicker2}
          />
          <g fill="#06020A">
            <path d="M 115 20 Q 95 -15 80 -25 Q 100 -5 125 22 Z" fill="#030105" />
            <ellipse cx="60" cy="100" rx="55" ry="75" />
            <ellipse cx="180" cy="100" rx="55" ry="75" />
            <ellipse cx="90" cy="100" rx="50" ry="82" />
            <ellipse cx="150" cy="100" rx="50" ry="82" />
            <ellipse cx="120" cy="100" rx="50" ry="85" />
          </g>
          <g
            filter="url(#glowFlicker)"
            fill="#FF7A00"
            opacity={0.9 * flicker2}
          >
            <polygon points="75,70 105,82 82,90" />
            <polygon points="165,70 135,82 158,90" />
            <polygon points="116,92 124,92 120,82" />
            <path d="M 72 120 L 92 128 L 102 122 L 120 132 L 138 122 L 148 128 L 168 120 Q 120 168 72 120 Z" />
          </g>
          <g fill="#FFF080" opacity={0.82 * flicker2}>
            <polygon points="80,74 100,82 85,87" />
            <polygon points="160,74 140,82 155,87" />
            <path d="M 82 124 L 120 128 L 158 124 Q 120 155 82 124 Z" />
          </g>
        </g>

        {/* ----------------- LABU 3 (KANAN DEPAN, BESAR MENCOLOK) --------- */}
        <g transform="translate(3050, 1740) rotate(-6) scale(1.15)">
          <circle
            cx="140"
            cy="110"
            r={190 * flicker3}
            fill="url(#pumpkinFire1)"
            filter="url(#blurHalo)"
            opacity={0.9 * flicker3}
          />
          <g fill="#07030C">
            {/* Gagang Labu Kasar */}
            <path d="M 130 10 Q 155 -35 185 -45 Q 168 -20 148 15 Z" fill="#030105" />
            <ellipse cx="65" cy="105" rx="72" ry="94" />
            <ellipse cx="215" cy="105" rx="72" ry="94" />
            <ellipse cx="100" cy="105" rx="66" ry="102" />
            <ellipse cx="180" cy="105" rx="66" ry="102" />
            <ellipse cx="140" cy="105" rx="66" ry="106" />
          </g>
          {/* Muka Ukiran Labu Utama: Sangat Tajam & Menyala */}
          <g
            filter="url(#glowFlicker)"
            fill="#FF7A00"
            opacity={0.95 * flicker3}
          >
            {/* Mata Kiri Miring Menyeramkan */}
            <polygon points="75,65 118,82 82,92" />
            {/* Mata Kanan Miring Menyeramkan */}
            <polygon points="205,65 162,82 198,92" />
            {/* Hidung Taring */}
            <polygon points="132,94 148,94 140,78" />
            {/* Mulut Lebar Bergerigi Jahat */}
            <path d="M 65 125 L 90 136 L 105 126 L 125 140 L 140 126 L 155 140 L 175 126 L 190 136 L 215 125 Q 140 190 65 125 Z" />
          </g>
          <g fill="#FFF080" opacity={0.88 * flicker3}>
            <polygon points="82,72 110,82 88,88" />
            <polygon points="198,72 170,82 192,88" />
            <path d="M 80 130 L 105 130 L 125 134 L 140 130 L 155 134 L 175 130 L 200 130 Q 140 172 80 130 Z" />
          </g>
        </g>

        {/* ============================================================== */}
        {/* LAYER 10: KABUT DEPAN PENUTUP BAWAH (ROLLING FOREGROUND FOG)   */}
        {/* ============================================================== */}
        <g filter="url(#blurFog)" opacity="0.45" fill="#2B1445">
          <path
            d={`M -200 2020 Q ${900 + Math.cos(fogScroll) * 180} ${1950 + Math.sin(fogScroll) * 40} 1950 2000 Q ${3000 - Math.cos(fogScroll) * 180} ${1960 + Math.cos(fogScroll) * 40} 4100 2010 L 4100 2160 L -200 2160 Z`}
          />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

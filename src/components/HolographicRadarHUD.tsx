import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export const HolographicRadarHUD: React.FC<{
  width?: number;
  height?: number;
  totalFrames?: number;
}> = ({ width = 3840, height = 2160, totalFrames = 600 }) => {
  const frame = useCurrentFrame();
  const u = (frame / totalFrames) % 1.0;
  
  const cx = width / 2;
  const cy = height / 2;
  const R = 850; 
  
  const degreeNumbers = useMemo(() => {
     const elements = [];
     for (let i = 0; i < 360; i += 10) {
        let angle = i * Math.PI / 180 - Math.PI / 2; 
        let x = cx + (R + 70) * Math.cos(angle);
        let y = cy + (R + 70) * Math.sin(angle);
        elements.push(
           <text key={i} x={x} y={y} fill="#00FFFF" fontSize={26} fontFamily="monospace" textAnchor="middle" alignmentBaseline="middle" 
             style={{ opacity: 0.9, filter: 'drop-shadow(0 0 8px #00FFFF)' }}>
             {i}
           </text>
        );
        let tx1 = cx + (R + 20) * Math.cos(angle);
        let ty1 = cy + (R + 20) * Math.sin(angle);
        let tx2 = cx + (R + 40) * Math.cos(angle);
        let ty2 = cy + (R + 40) * Math.sin(angle);
        elements.push(<line key={`t${i}`} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#00FFFF" strokeWidth={3} opacity={0.8} />);
     }
     
     for (let i = 0; i < 360; i += 2) {
        if (i % 10 === 0) continue;
        let angle = i * Math.PI / 180 - Math.PI / 2;
        let tx1 = cx + (R + 20) * Math.cos(angle);
        let ty1 = cy + (R + 20) * Math.sin(angle);
        let tx2 = cx + (R + 30) * Math.cos(angle);
        let ty2 = cy + (R + 30) * Math.sin(angle);
        elements.push(<line key={`mt${i}`} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#00FFFF" strokeWidth={1} opacity={0.4} />);
     }
     return elements;
  }, [cx, cy, R]);
  
  const polarGrid = useMemo(() => {
     const elements = [];
     for(let i=0; i<360; i+=30) {
        let angle = i * Math.PI / 180;
        let x = cx + R * Math.cos(angle);
        let y = cy + R * Math.sin(angle);
        elements.push(<line key={`r${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="#00FFFF" strokeWidth={1} strokeDasharray="10, 10" opacity={0.2} />);
     }
     for(let r=100; r<=R; r+=150) {
        elements.push(<circle key={`c${r}`} cx={cx} cy={cy} r={r} fill="none" stroke="#00FFFF" strokeWidth={1} opacity={0.25} />);
     }
     elements.push(<circle key="t1" cx={cx} cy={cy} r={R} fill="none" stroke="#00FFFF" strokeWidth={5} opacity={0.8} style={{ filter: 'drop-shadow(0 0 15px #00FFFF)' }} />);
     elements.push(<circle key="t2" cx={cx} cy={cy} r={R-30} fill="none" stroke="#00FFFF" strokeWidth={2} opacity={0.4} />);
     elements.push(<circle key="t3" cx={cx} cy={cy} r={R-120} fill="none" stroke="#00FFFF" strokeWidth={8} opacity={0.7} style={{ filter: 'drop-shadow(0 0 20px #00FFFF)' }} />);
     elements.push(<circle key="t4" cx={cx} cy={cy} r={R-135} fill="none" stroke="#00FFFF" strokeWidth={1} opacity={0.3} />);
     return elements;
  }, [cx, cy, R]);

  const sweepAngle = u * 360 * 2; 

  const targetsData = [
     { angle: 30, r: 600, label: 'T-18', id: 1 },
     { angle: 85, r: 420, label: 'T-09', id: 2 },
     { angle: 155, r: 700, label: 'T-23', id: 3 },
     { angle: 215, r: 500, label: 'T-03', id: 4 },
     { angle: 310, r: 350, label: 'T-08', id: 5 }
  ];

  const targets = targetsData.map(t => {
     let angleRad = t.angle * Math.PI / 180 - Math.PI / 2;
     let tx = cx + t.r * Math.cos(angleRad);
     let ty = cy + t.r * Math.sin(angleRad);
     
     let diff = (sweepAngle - t.angle) % 360;
     if (diff < 0) diff += 360;
     
     let glow = 0;
     if (diff < 90) {
        glow = 1.0 - (diff / 90);
     }
     
     let opacity = 0.3 + 0.7 * glow;
     let scale = 1.0 + 0.2 * glow;
     
     return (
       <g key={t.id} opacity={opacity} style={{ filter: glow > 0.1 ? 'drop-shadow(0 0 12px #FFD700)' : 'none', transform: `scale(${scale})`, transformOrigin: `${tx}px ${ty}px` }}>
         <circle cx={tx} cy={ty} r={24} fill="none" stroke="#FFD700" strokeWidth={3} />
         <circle cx={tx} cy={ty} r={6} fill="#FFD700" />
         <line x1={tx-35} y1={ty} x2={tx+35} y2={ty} stroke="#FFD700" strokeWidth={3} />
         <line x1={tx} y1={ty-35} x2={tx} y2={ty+35} stroke="#FFD700" strokeWidth={3} />
         <text x={tx + 30} y={ty - 20} fill="#FFD700" fontSize={24} fontFamily="monospace" fontWeight="bold">{t.label}</text>
       </g>
     )
  });

  const waveformPath = useMemo(() => {
     let points = [];
     let steps = 400;
     for(let i=0; i<=steps; i++) {
        let a = 120 + (i/steps)*120; 
        let rad = a * Math.PI / 180 - Math.PI / 2; 
        
        let phase1 = i * 0.15 + u * Math.PI * 8; 
        let phase2 = i * 0.05 - u * Math.PI * 4; 
        let phase3 = i * 0.3 + u * Math.PI * 16; 
        
        let n = Math.sin(phase1) * 20 + Math.sin(phase2) * 30 + Math.sin(phase3) * 10;
        
        let edge = Math.sin((i/steps) * Math.PI); 
        let offset = n * edge;
        
        let rWave = R - 60 + offset;
        let px = cx + rWave * Math.cos(rad);
        let py = cy + rWave * Math.sin(rad);
        points.push(`${i===0 ? 'M' : 'L'} ${px} ${py}`);
     }
     return points.join(' ');
  }, [u, cx, cy, R]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617', overflow: 'hidden' }}>
      
      {/* Background Grid */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundSize: '100px 100px',
        backgroundImage: 'linear-gradient(to right, rgba(0, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 255, 255, 0.05) 1px, transparent 1px)',
      }} />

      <svg width={width} height={height} style={{ position: 'absolute' }}>
        {polarGrid}
        {degreeNumbers}
        
        {/* Waveform */}
        <path d={waveformPath} fill="none" stroke="#00FFFF" strokeWidth={2} opacity={0.7} style={{ filter: 'drop-shadow(0 0 10px #00FFFF)' }} />
        
        {/* Decorative elements */}
        <circle cx={cx} cy={cy} r={R + 120} fill="none" stroke="#00FFFF" strokeWidth={1} strokeDasharray="5, 25" opacity={0.5} />
        
        {targets}
        
        {/* Center Crosshair */}
        <g style={{ filter: 'drop-shadow(0 0 12px #FFD700)' }}>
          <line x1={cx - 60} y1={cy} x2={cx - 20} y2={cy} stroke="#FFD700" strokeWidth={4} />
          <line x1={cx + 20} y1={cy} x2={cx + 60} y2={cy} stroke="#FFD700" strokeWidth={4} />
          <line x1={cx} y1={cy - 60} x2={cx} y2={cy - 20} stroke="#FFD700" strokeWidth={4} />
          <line x1={cx} y1={cy + 20} x2={cx} y2={cy + 60} stroke="#FFD700" strokeWidth={4} />
          <circle cx={cx} cy={cy} r={8} fill="#FFD700" />
          <circle cx={cx} cy={cy} r={120} fill="none" stroke="#FFD700" strokeWidth={1} strokeDasharray="10, 15" opacity={0.4} />
        </g>
      </svg>

      {/* Rotating Radar Sweep */}
      <div style={{
           position: 'absolute',
           left: cx - R,
           top: cy - R,
           width: R * 2,
           height: R * 2,
           borderRadius: '50%',
           background: `conic-gradient(from 270deg, rgba(0, 255, 255, 0) 0deg, rgba(0, 255, 255, 0.1) 40deg, rgba(0, 255, 255, 0.4) 80deg, rgba(0, 255, 255, 0.9) 89deg, rgba(0, 255, 255, 1) 90deg, rgba(0, 255, 255, 0) 90.5deg)`,
           transform: `rotate(${sweepAngle}deg)`,
           transformOrigin: '50% 50%',
           mixBlendMode: 'screen',
           pointerEvents: 'none'
      }} />

      {/* HUD Texts */}
      <div style={{ position: 'absolute', top: 100, left: 100, color: '#00FFFF', fontFamily: 'monospace', fontSize: 32, textShadow: '0 0 10px #00FFFF', opacity: 0.8 }}>
        <div>SYS_RADAR_ALPHA_v1.0</div>
        <div>STATUS: NOMINAL</div>
        <div style={{ marginTop: 20 }}>TGT_DETECT: 5</div>
        <div>FREQ_BAND: X-BAND</div>
      </div>
      
      <div style={{ position: 'absolute', bottom: 100, right: 100, color: '#00FFFF', fontFamily: 'monospace', fontSize: 32, textAlign: 'right', textShadow: '0 0 10px #00FFFF', opacity: 0.8 }}>
        <div>COORD_LAT: 47.6062 N</div>
        <div>COORD_LON: 122.3321 W</div>
        <div style={{ marginTop: 20 }}>SWEEP_RATE: 0.2 HZ</div>
        <div>RANGE_MAX: 50.0 NM</div>
      </div>
      
    </AbsoluteFill>
  );
};

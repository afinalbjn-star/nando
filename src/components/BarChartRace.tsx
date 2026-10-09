import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const ITEMS = [
  { id: 'Indigo', color: '#4F46E5', icon: '🚀' },
  { id: 'Teal', color: '#0D9488', icon: '⚡' },
  { id: 'Amber', color: '#D97706', icon: '🔥' },
  { id: 'Slate', color: '#0F172A', icon: '🛡️' },
  { id: 'Rose', color: '#E11D48', icon: '💎' },
  { id: 'Emerald', color: '#10B981', icon: '🍀' },
];

// 11 data points for 10 transitions
const DATA: Record<string, number[]> = {
  'Indigo':  [100, 120, 200, 300, 450, 500, 600, 750, 800, 900, 1000],
  'Teal':    [ 80, 130, 250, 280, 320, 480, 650, 680, 850, 950,  980],
  'Amber':   [120, 140, 160, 350, 400, 550, 580, 600, 700, 850, 1050],
  'Slate':   [ 60,  90, 180, 200, 250, 300, 400, 500, 650, 700,  800],
  'Rose':    [ 50, 100, 150, 250, 500, 520, 540, 700, 750, 880,  920],
  'Emerald': [ 90, 110, 130, 150, 200, 350, 450, 550, 780, 820,  850],
};

const getRankFor = (id: string, k: number) => {
  const myVal = DATA[id][k];
  let rank = 0;
  for (const item of ITEMS) {
    if (item.id === id) continue;
    const theirVal = DATA[item.id][k];
    if (theirVal > myVal) {
      rank++;
    } else if (theirVal === myVal && ITEMS.indexOf(item) < ITEMS.indexOf(ITEMS.find(i => i.id === id)!)) {
      rank++; // Stable sorting tie-breaker
    }
  }
  return rank;
};

export const BarChartRace: React.FC = () => {
  const frame = useCurrentFrame();
  const INTERVAL = 30; // 30 frames per data step
  
  // Cap k at 9 so k+1 (target) is max 10
  const k = Math.min(Math.floor(frame / INTERVAL), 9);
  const progress = (frame - k * INTERVAL) / INTERVAL;

  // Emulate Remotion Spring mechanically inside a pure math function
  // (Standard easeOutElastic formula)
  const easeSpring = (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };

  const easeValue = Easing.inOut(Easing.cubic);

  const currentValues = ITEMS.map(item => {
    return {
      id: item.id,
      val: interpolate(progress, [0, 1], [DATA[item.id][k], DATA[item.id][k + 1]], { easing: easeValue })
    };
  });

  const maxVal = Math.max(...currentValues.map(v => v.val));

  return (
    <AbsoluteFill style={{ backgroundColor: '#F8FAFC', padding: '100px 120px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '80px' }}>
        <div>
          <h1 style={{ fontSize: '72px', color: '#0F172A', margin: 0, fontWeight: 900, letterSpacing: '-2px' }}>
            Dynamic Bar Chart Race
          </h1>
          <p style={{ fontSize: '28px', color: '#64748B', margin: '10px 0 0 0', fontWeight: 500 }}>
            Top Metrics Simulation
          </p>
        </div>
        <h2 style={{ fontSize: '48px', color: '#64748B', margin: 0, fontWeight: 600 }}>
          Frame {frame}
        </h2>
      </div>
      
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {ITEMS.map(item => {
          const rankStart = getRankFor(item.id, k);
          const rankEnd = getRankFor(item.id, k + 1);
          
          // Animate Y position with spring physics
          const currentRank = interpolate(progress, [0, 1], [rankStart, rankEnd], { easing: easeSpring });
          const val = currentValues.find(v => v.id === item.id)!.val;
          // Scale bar width to max 80% of screen to fit value text
          const widthPct = (val / maxVal) * 80;

          return (
            <div key={item.id} style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%',
              transform: `translateY(${currentRank * 130}px)`,
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                width: `${Math.max(10, widthPct)}%`, // At least 10% to fit icon + label
                height: '100px',
                backgroundColor: item.color,
                borderRadius: '0 50px 50px 0',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '30px',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '36px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              }}>
                <span style={{ marginRight: '24px', fontSize: '48px' }}>{item.icon}</span>
                <span style={{ letterSpacing: '1px' }}>{item.id}</span>
              </div>
              <div style={{
                marginLeft: '40px',
                fontSize: '56px',
                fontWeight: 800,
                color: '#0F172A',
                fontVariantNumeric: 'tabular-nums' // Keeps numbers from shifting
              }}>
                {Math.round(val).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

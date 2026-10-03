import React from 'react';
import { useCurrentFrame } from 'remotion';

export type AnalyticsBoardScheme = 'blue' | 'indigo' | 'teal';

interface AnalyticsBoardProps {
  width?: number;
  height?: number;
  totalFrames?: number;
  speed?: number;
  scheme?: AnalyticsBoardScheme;
}

interface Pal {
  bg: string;
  panel: string;
  soft: string;
  grid: string;
  gridSoft: string;
  barA: string;
  barB: string;
  line: string;
  ring: string;
  track: string;
  globe: string;
  ink: string;
  muted: string;
  positive: string;
  negative: string;
}

const PALETTES: Record<AnalyticsBoardScheme, Pal> = {
  blue: {
    bg: '#f5f8fd', panel: '#ffffff', soft: '#e4edfb', grid: '#dae5f6', gridSoft: '#edf3fb',
    barA: '#2f6fe4', barB: '#86b6f7', line: '#1b4fc4', ring: '#2f6fe4', track: '#e6eef9',
    globe: '#a9c9f2', ink: '#16305e', muted: '#7d90b0', positive: '#17a673', negative: '#cf5f5a',
  },
  indigo: {
    bg: '#f6f6fd', panel: '#ffffff', soft: '#e7e6fb', grid: '#dcdaf7', gridSoft: '#efedfb',
    barA: '#5b4bd6', barB: '#9b93f2', line: '#3f31ad', ring: '#5b4bd6', track: '#eae8fa',
    globe: '#b0abf0', ink: '#241f5c', muted: '#7b76ab', positive: '#17a673', negative: '#cf5f5a',
  },
  teal: {
    bg: '#f3faf9', panel: '#ffffff', soft: '#dcf0ee', grid: '#d5eae8', gridSoft: '#edf7f6',
    barA: '#10938a', barB: '#6fd0c6', line: '#0b6b64', ring: '#10938a', track: '#e2f2f0',
    globe: '#9fdad4', ink: '#0d3b38', muted: '#6d9490', positive: '#17a673', negative: '#cf5f5a',
  },
};

const FONT = 'Inter, "Segoe UI", Helvetica, Arial, sans-serif';

const VB_W = 1600;
const VB_H = 900;

// Left column: KPI strip above the main chart card.
const CARD_X = 72;
const CARD_Y = 176;
const CARD_W = 908;
const CARD_H = 638;

const PLOT_X = 130;
const PLOT_Y = 250;
const PLOT_W = 800;
const PLOT_H = 502;
const BASE_Y = PLOT_Y + PLOT_H;

const BARS = 15;
const BAR_W = 34;
const BAR_STEP = 52;
const BAR_X0 = PLOT_X + (PLOT_W - (BARS * BAR_STEP - (BAR_STEP - BAR_W))) / 2;
const BAR_CX = (i: number) => BAR_X0 + i * BAR_STEP + BAR_W / 2;

// Right column: globe, donut trio, ranked bars.
const GLOBE_CX = 1269;
const GLOBE_CY = 268;
const GLOBE_R = 140;
const DONUT_Y = 606;
const DONUT_CX = [1100, 1269, 1438];
const DONUT_R = 52;
const SRC_X = 1010;
const SRC_BAR_X = 1178;
const SRC_BAR_W = 262;

const GRID_STEP = 60;
const DASH = 26;
const DASH_GAP = 74;
const DASH_PERIOD = DASH + DASH_GAP;

// Growth trend, one vertex per bar so the line reads as a combo chart.
const LINE_F = [
  0.14, 0.2, 0.17, 0.3, 0.26, 0.24, 0.38,
  0.46, 0.42, 0.56, 0.52, 0.64, 0.7, 0.78, 0.86,
];

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M'];

const KPIS = [
  { label: 'Conversion', base: 45, delta: 12.4, up: true },
  { label: 'Engagement', base: 71, delta: 8.1, up: true },
  { label: 'Revenue', base: 58, delta: -3.2, up: false },
];

const DONUTS = [
  { base: 13, label: 'Direct' },
  { base: 24, label: 'Referral' },
  { base: 42, label: 'Organic' },
];

const SOURCES = [
  { label: 'Search', base: 48 },
  { label: 'Social', base: 31 },
  { label: 'Email', base: 21 },
];

const AnalyticsBoard: React.FC<AnalyticsBoardProps> = ({
  width = 1920, height = 1080, totalFrames = 300, speed = 1, scheme = 'blue',
}) => {
  const frame = useCurrentFrame();
  const u = frame / totalFrames;
  const p = PALETTES[scheme];

  const osc = (k: number, phase = 0) => Math.sin(Math.PI * 2 * (k * u * speed + phase));
  const cyc = (k: number, phase = 0) => 0.5 + 0.5 * osc(k, phase);

  // Every figure counts on its own phase, driven only by integer-cycle
  // oscillations so the loop point returns to the exact starting value.
  const kpiVals = KPIS.map((k, i) =>
    Math.round(k.base + 3.2 * osc(1, i * 0.3) + 1.1 * osc(2, i * 0.45)));
  const kpiDeltas = KPIS.map((k, i) => {
    const d = k.delta + 1.5 * osc(1, i * 0.25 + 0.4) + 0.6 * osc(2, i * 0.5);
    return `${k.up ? '+' : '−'}${Math.abs(d).toFixed(1)}%`;
  });
  const donutVals = DONUTS.map((d, i) =>
    Math.round(d.base + 2.6 * osc(1, i * 0.35) + 0.9 * osc(2, i * 0.5)));
  const srcVals = SOURCES.map((s, i) =>
    Math.round(s.base + 2.4 * osc(1, i * 0.28 + 0.15) + 0.8 * osc(2, i * 0.45)));

  const linePts: [number, number][] = LINE_F.map((f, i) => [
    BAR_CX(i),
    BASE_Y - f * PLOT_H + 2.6 * osc(1, i / BARS),
  ]);
  const lineD = linePts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' ');
  const areaD = `${lineD} L${BAR_CX(BARS - 1).toFixed(2)} ${BASE_Y} L${BAR_CX(0).toFixed(2)} ${BASE_Y} Z`;
  const last = linePts[linePts.length - 1];

  // Seamless scrolling: the per-loop travel must be a whole number of pattern
  // periods, otherwise the loop point lands on a different phase of the tile.
  const gridCells = Math.max(1, Math.round(totalFrames / GRID_STEP));
  const gridShift = u * GRID_STEP * gridCells * speed;
  const dashCells = Math.max(1, Math.round(totalFrames / DASH_PERIOD));
  const dashShift = u * DASH_PERIOD * dashCells * speed;

  const gridLines: number[] = [];
  for (let i = -60; i <= 60; i++) gridLines.push(i * GRID_STEP);

  const halftone: { cx: number; cy: number }[] = [];
  for (let r = 0; r < 26; r++) {
    for (let c = 0; c < 26; c++) halftone.push({ cx: -160 + c * 13, cy: -160 + r * 13 });
  }

  const glowPulse = 0.72 + 0.28 * cyc(1, 0.2);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="ab-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={p.barA} />
          <stop offset="1" stopColor={p.barB} />
        </linearGradient>
        <linearGradient id="ab-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.line} stopOpacity="0.16" />
          <stop offset="1" stopColor={p.line} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ab-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.soft} stopOpacity="0.95" />
          <stop offset="1" stopColor={p.soft} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ab-gridfade" cx="0.5" cy="0.52" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <mask id="ab-gridmask">
          <rect width={VB_W} height={VB_H} fill="url(#ab-gridfade)" />
        </mask>
        <clipPath id="ab-plot">
          <rect x={PLOT_X} y={PLOT_Y} width={PLOT_W} height={PLOT_H} />
        </clipPath>
        <clipPath id="ab-dotclip">
          <circle cx={54} cy={54} r={168} />
        </clipPath>
      </defs>

      <rect width={VB_W} height={VB_H} fill={p.bg} />

      <g mask="url(#ab-gridmask)" opacity={0.55}>
        <g transform="translate(800 450) rotate(-17) scale(1 0.62) translate(-800 -450)">
          <g transform={`translate(${gridShift} ${gridShift})`}>
            {gridLines.map((o, i) => (
              <line key={`v${i}`} x1={o} y1={-4000} x2={o} y2={4000} stroke={p.grid} strokeWidth={1.2} />
            ))}
            {gridLines.map((o, i) => (
              <line key={`h${i}`} x1={-4000} y1={o} x2={4000} y2={o} stroke={p.grid} strokeWidth={1.2} />
            ))}
          </g>
        </g>
      </g>

      <g clipPath="url(#ab-dotclip)" fill={p.grid} opacity={0.34}>
        {halftone.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={2.1} />
        ))}
      </g>

      <text
        x={SRC_X} y={84} fontFamily={FONT} fontSize={13} fontWeight={600}
        letterSpacing={1.6} fill={p.muted}
      >
        GLOBAL REACH
      </text>

      <circle
        cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R + 74}
        fill="url(#ab-glow)" opacity={glowPulse}
      />

      <g fill="none" stroke={p.grid} strokeWidth={1.4}>
        <ellipse
          cx={GLOBE_CX} cy={GLOBE_CY} rx={GLOBE_R + 52} ry={GLOBE_R + 52}
          opacity={0.55 + 0.2 * cyc(1, 0.1)}
        />
        <ellipse
          cx={GLOBE_CX} cy={GLOBE_CY} rx={GLOBE_R + 82} ry={(GLOBE_R + 82) * 0.34}
          opacity={0.4}
        />
      </g>

      <g transform={`translate(${osc(1, 0.25) * 6} ${osc(1, 0.7) * 4})`}>
        <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} fill={p.panel} opacity={0.75} />
        <g fill="none" stroke={p.globe} strokeWidth={1.9}>
          <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} />
          {[-58, -34, -12, 12, 34, 58].map((deg) => {
            const la = (deg * Math.PI) / 180;
            const rx = GLOBE_R * Math.cos(la);
            return (
              <ellipse
                key={deg}
                cx={GLOBE_CX} cy={GLOBE_CY - GLOBE_R * Math.sin(la)}
                rx={rx} ry={Math.max(0.6, rx * 0.22)}
              />
            );
          })}
        </g>
        <g fill="none" stroke={p.globe} strokeWidth={1.7} opacity={0.7}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = Math.PI * 2 * u * speed + (i * Math.PI) / 4;
            return (
              <ellipse
                key={i}
                cx={GLOBE_CX + GLOBE_R * Math.sin(a) * 0.42}
                cy={GLOBE_CY}
                rx={Math.max(GLOBE_R * 0.16, Math.abs(GLOBE_R * Math.cos(a)))}
                ry={GLOBE_R}
              />
            );
          })}
        </g>
        {[
          [-46, -40, 0.15],
          [26, -6, 0.55],
          [-4, 52, 0.85],
        ].map(([dx, dy, ph], i) => (
          <g key={i}>
            <circle
              cx={GLOBE_CX + (dx as number)} cy={GLOBE_CY + (dy as number)}
              r={4.2 + 0.9 * cyc(1, ph as number)}
              fill={p.barA} opacity={0.9}
            />
            <circle
              cx={GLOBE_CX + (dx as number)} cy={GLOBE_CY + (dy as number)}
              r={9 + 3 * cyc(1, (ph as number) + 0.5)}
              fill="none" stroke={p.barA} strokeWidth={1} opacity={0.28}
            />
          </g>
        ))}
      </g>

      {KPIS.map((k, i) => {
        const x = CARD_X + i * 302;
        const c = k.up ? p.positive : p.negative;
        return (
          <g key={k.label} transform={`translate(0 ${osc(1, i * 0.22) * 5})`}>
            <text
              x={x} y={86} fontFamily={FONT} fontSize={12} fontWeight={600}
              letterSpacing={1.5} fill={p.muted}
            >
              {k.label.toUpperCase()}
            </text>
            <text
              x={x} y={142} fontFamily={FONT} fontSize={44} fontWeight={700}
              fill={p.ink} letterSpacing={-1}
            >
              {`${kpiVals[i]}%`}
            </text>
            <g opacity={0.55 + 0.45 * cyc(1, i * 0.22 + 0.3)}>
              <rect x={x + 104} y={112} width={78} height={26} rx={13} fill={c} opacity={0.14} />
              <text
                x={x + 143} y={130} textAnchor="middle" fontFamily={FONT}
                fontSize={13} fontWeight={700} fill={c}
              >
                {kpiDeltas[i]}
              </text>
            </g>
          </g>
        );
      })}

      <rect
        x={CARD_X} y={CARD_Y} width={CARD_W} height={CARD_H} rx={18}
        fill={p.panel} stroke={p.grid} strokeWidth={1.2}
      />
      <text
        x={PLOT_X} y={CARD_Y + 38} fontFamily={FONT} fontSize={13}
        fontWeight={600} letterSpacing={1.6} fill={p.muted}
      >
        MONTHLY PERFORMANCE
      </text>

      {[0, 1, 2, 3, 4].map((k) => {
        const y = BASE_Y - (PLOT_H / 4) * k;
        return (
          <g key={k}>
            {k > 0 && (
              <line
                x1={PLOT_X} y1={y} x2={PLOT_X + PLOT_W} y2={y}
                stroke={p.gridSoft} strokeWidth={1.2}
              />
            )}
            <text
              x={PLOT_X - 12} y={y + 4} textAnchor="end" fontFamily={FONT}
              fontSize={11} fontWeight={500} fill={p.muted} opacity={0.85}
            >
              {`${k * 25}`}
            </text>
          </g>
        );
      })}

      <g clipPath="url(#ab-plot)">
        <path d={areaD} fill="url(#ab-area)" />
        {Array.from({ length: BARS }).map((_, i) => {
          const x = (i + 0.5) / BARS;
          const prof = Math.pow(Math.sin(Math.PI * Math.pow(x, 0.82)), 1.15);
          const wave = cyc(1, i / BARS - 0.18);
          const h = 10 + prof * 370 * (0.74 + 0.26 * wave);
          return (
            <g key={i}>
              <rect
                x={BAR_X0 + i * BAR_STEP} y={BASE_Y - h} width={BAR_W} height={h} rx={5}
                fill="url(#ab-bar)" opacity={0.92}
              />
              <rect
                x={BAR_X0 + i * BAR_STEP} y={BASE_Y - h} width={BAR_W}
                height={Math.min(6, h)} rx={3} fill="#ffffff" opacity={0.26}
              />
            </g>
          );
        })}

        <path
          d={lineD} fill="none" stroke={p.line} strokeWidth={3}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d={lineD} fill="none" stroke="#ffffff" strokeWidth={1.6}
          strokeLinecap="round" strokeOpacity={0.55}
          strokeDasharray={`${DASH} ${DASH_GAP}`} strokeDashoffset={-dashShift}
        />
        {linePts
          .filter((_, i) => i % 3 === 0 || i === BARS - 1)
          .map((q, k) => (
            <circle
              key={k} cx={q[0]} cy={q[1]}
              r={3.2 + 0.7 * cyc(1, k / 6)}
              fill={p.panel} stroke={p.line} strokeWidth={2}
            />
          ))}
        <circle cx={last[0]} cy={last[1]} r={6} fill={p.line} stroke={p.panel} strokeWidth={2.4} />
      </g>

      <line
        x1={PLOT_X} y1={BASE_Y} x2={PLOT_X + PLOT_W} y2={BASE_Y}
        stroke={p.grid} strokeWidth={1.6}
      />
      {MONTHS.map((m, i) => (
        <text
          key={i} x={BAR_CX(i)} y={BASE_Y + 26} textAnchor="middle"
          fontFamily={FONT} fontSize={11} fontWeight={600} fill={p.muted} opacity={0.9}
        >
          {m}
        </text>
      ))}

      <text
        x={SRC_X} y={528} fontFamily={FONT} fontSize={13} fontWeight={600}
        letterSpacing={1.6} fill={p.muted}
      >
        CHANNEL MIX
      </text>

      {DONUTS.map((d, i) => {
        const cx = DONUT_CX[i];
        const pct = donutVals[i];
        const C = 2 * Math.PI * DONUT_R;
        const sway = -90 + 13 * osc(1, i * 0.28);
        return (
          <g key={d.label}>
            <circle cx={cx} cy={DONUT_Y} r={DONUT_R + 16} fill={p.soft} opacity={0.5 * glowPulse} />
            <g transform={`rotate(${sway} ${cx} ${DONUT_Y})`}>
              <circle
                cx={cx} cy={DONUT_Y} r={DONUT_R} fill="none"
                stroke={p.track} strokeWidth={13}
              />
              <circle
                cx={cx} cy={DONUT_Y} r={DONUT_R} fill="none" stroke={p.ring}
                strokeWidth={13} strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * C} ${C}`}
              />
            </g>
            <text
              x={cx} y={DONUT_Y + 8} textAnchor="middle" fontFamily={FONT}
              fontSize={26} fontWeight={700} fill={p.ink}
            >
              {`${pct}%`}
            </text>
            <text
              x={cx} y={DONUT_Y + 84} textAnchor="middle" fontFamily={FONT}
              fontSize={11} fontWeight={600} letterSpacing={1.3} fill={p.muted}
            >
              {d.label.toUpperCase()}
            </text>
          </g>
        );
      })}

      <text
        x={SRC_X} y={742} fontFamily={FONT} fontSize={13} fontWeight={600}
        letterSpacing={1.6} fill={p.muted}
      >
        TOP SOURCES
      </text>

      {SOURCES.map((s, i) => {
        const y = 772 + i * 34;
        const pct = srcVals[i];
        const w = SRC_BAR_W * (pct / 100) * (0.88 + 0.12 * cyc(1, i * 0.3));
        return (
          <g key={s.label}>
            <text
              x={SRC_X} y={y + 5} fontFamily={FONT} fontSize={13}
              fontWeight={600} fill={p.ink} opacity={0.8}
            >
              {s.label}
            </text>
            <rect
              x={SRC_BAR_X} y={y - 5} width={SRC_BAR_W} height={10} rx={5}
              fill={p.track}
            />
            <rect
              x={SRC_BAR_X} y={y - 5} width={w} height={10} rx={5} fill={p.barA} opacity={0.85}
            />
            <text
              x={SRC_BAR_X + SRC_BAR_W + 46} y={y + 5} textAnchor="end"
              fontFamily={FONT} fontSize={13} fontWeight={700} fill={p.ink} opacity={0.75}
            >
              {`${pct}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export { AnalyticsBoard };

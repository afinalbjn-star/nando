import { staticFile } from 'remotion';

export interface ArtPath {
  d: string;
  fill: string;
  path: Path2D;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface KurirArt {
  paths: ArtPath[];
  viewBox: { w: number; h: number };
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

// Measured from kurir.svg with a full path-data parser (bezier + arc aware).
// Naive number-pair scanning misses control points and overshoots, so this is fixed.
const ART_BBOX = { x0: 392, y0: 77.5, x1: 1041.5, y1: 708.4 };

let cache: KurirArt | null = null;
let pending: Promise<KurirArt> | null = null;

const approxBBox = (d: string) => {
  const nums = d.match(/-?\d*\.?\d+(?:e-?\d+)?/g);
  if (!nums) return { x0: 0, y0: 0, x1: 0, y1: 0 };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 0, y1: 0 };
  return { x0, y0, x1, y1 };
};

const parse = (text: string): KurirArt => {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  const styleText = Array.from(doc.querySelectorAll('style'))
    .map((s) => s.textContent || '')
    .join('\n');
  const fills = new Map<string, string>();
  const rule = /\.st(\d+)\s*\{[^}]*fill:\s*([^;}]+)/g;
  let m = rule.exec(styleText);
  while (m) {
    fills.set(m[1], m[2].trim());
    m = rule.exec(styleText);
  }

  const vbAttr = svg ? svg.getAttribute('viewBox') : null;
  const vbParts = (vbAttr || '0 0 1408 768').split(/[\s,]+/).map(parseFloat);
  const viewBox = { w: vbParts[2] || 1408, h: vbParts[3] || 768 };

  const paths: ArtPath[] = [];
  const nodes = doc.querySelectorAll('path');
  nodes.forEach((node) => {
    const d = node.getAttribute('d');
    if (!d) return;
    const cls = (node.getAttribute('class') || '').trim();
    const key = cls.startsWith('st') ? cls.slice(2) : '';
    const fill = fills.get(key) || node.getAttribute('fill') || '#000000';
    const bb = approxBBox(d);
    paths.push({ d, fill, path: new Path2D(d), ...bb });
  });

  return {
    paths,
    viewBox,
    bbox: ART_BBOX,
  };
};

export const loadKurirArt = (): Promise<KurirArt> => {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = fetch(staticFile('kurir.svg'))
    .then((res) => {
      if (!res.ok) throw new Error(`kurir.svg ${res.status}`);
      return res.text();
    })
    .then((text) => {
      const art = parse(text);
      cache = art;
      return art;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
};

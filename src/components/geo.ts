export type LonLat = [number, number];

function unwrapLon(ring: LonLat[]): LonLat[] {
  const out: LonLat[] = [[ring[0][0], ring[0][1]]];
  for (let i = 1; i < ring.length; i++) {
    let lon = ring[i][0];
    const prev = out[i - 1][0];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push([lon, ring[i][1]]);
  }
  return out;
}

function normalizeLon(lon: number) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function lonSpan(poly: LonLat[]) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of poly) {
    if (p[0] < lo) lo = p[0];
    if (p[0] > hi) hi = p[0];
  }
  return { lo, hi };
}

function cutAndSeal(poly: LonLat[], limit: number): LonLat[][] {
  const n = poly.length;
  const pieces: LonLat[][] = [];
  let cur: LonLat[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    cur.push(a);
    if ((a[0] - limit) * (b[0] - limit) < 0) {
      const tt = (limit - a[0]) / (b[0] - a[0]);
      const x: LonLat = [limit, a[1] + (b[1] - a[1]) * tt];
      cur.push(x);
      if (cur.length >= 3) pieces.push(cur);
      cur = [x];
    }
  }
  if (cur.length >= 3) pieces.push(cur);
  return pieces;
}

export function splitAntimeridian(rings: LonLat[][]): LonLat[][] {
  const out: LonLat[][] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const poly = unwrapLon(ring);
    const { lo, hi } = lonSpan(poly);
    if (hi - lo > 180) continue;
    const shift = Math.round((lo + hi) / 2 / 360) * 360;
    let pending: LonLat[][] = [poly.map((p) => [p[0] - shift, p[1]] as LonLat)];
    for (let guard = 0; guard < 4 && pending.length > 0; guard++) {
      const next: LonLat[][] = [];
      for (const part of pending) {
        const span = lonSpan(part);
        if (span.lo < -180) {
          for (const piece of cutAndSeal(part, -180)) next.push(piece);
        } else if (span.hi > 180) {
          for (const piece of cutAndSeal(part, 180)) next.push(piece);
        } else {
          next.push(part);
        }
      }
      pending = next.map((part) => part.map((p) => [normalizeLon(p[0]), p[1]] as LonLat));
    }
    for (const part of pending) {
      if (part.length >= 3) out.push(part);
    }
  }
  return out;
}

export function pointInRing(pt: LonLat, ring: LonLat[]): boolean {
  let inside = false;
  const x = pt[0];
  const y = pt[1];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInRings(pt: LonLat, rings: LonLat[][]): boolean {
  for (const ring of rings) {
    if (pointInRing(pt, ring)) return true;
  }
  return false;
}

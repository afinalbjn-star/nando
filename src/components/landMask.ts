import worldLand from './worldLand.json';

/* Land mask from Natural Earth 110m land polygons.
   The repo's own geo data could not do this job: landData.ts holds only a
   coastline sample list (it covers 9% of the globe and has no points in the
   Sahara, the Pacific or the mid-Atlantic), and the closed rings in
   AMERICA_LAND bled across the antimeridian, losing Australia and filling the
   Indian Ocean. This GeoJSON measures 0.289 land fraction against Earth's
   actual 0.29. */

type Ring = [number, number][];

const POLYS: Ring[] = (() => {
  const out: Ring[] = [];
  const fc = worldLand as unknown as {
    features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } | null }[];
  };
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') out.push(g.coordinates[0] as Ring);
    else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates as number[][][][]) out.push(poly[0] as Ring);
    }
  }
  return out;
})();

const pointInRing = (lon: number, lat: number, ring: Ring): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

/* Bounding boxes are checked before the even-odd scan. There are 127 polygons
   and thousands of samples per frame, so skipping the ~95% of polygons that
   cannot possibly contain the point is what keeps this affordable. */
const BOXED: { box: [number, number, number, number]; ring: Ring }[] = POLYS.map((ring) => {
  let lo = Infinity;
  let hi = -Infinity;
  let la = Infinity;
  let lb = -Infinity;
  for (const p of ring) {
    if (p[0] < lo) lo = p[0];
    if (p[0] > hi) hi = p[0];
    if (p[1] < la) la = p[1];
    if (p[1] > lb) lb = p[1];
  }
  return { box: [lo, la, hi, lb] as [number, number, number, number], ring };
});

export const isLand = (lon: number, lat: number): boolean => {
  for (const { box, ring } of BOXED) {
    if (lon < box[0] || lon > box[2] || lat < box[1] || lat > box[3]) continue;
    if (pointInRing(lon, lat, ring)) return true;
  }
  return false;
};

/* Land sample points for the stipple. Built once at module load, because the
   per-frame path only projects them. Every position is a deterministic function
   of its index: a Math.random() seed would give different dots on the two
   passes Remotion makes of each frame and the render would not be reproducible.
   Jitter breaks up the lattice without a random source. */
export const LAND_SAMPLES: [number, number][] = (() => {
  const out: [number, number][] = [];
  const jitter = (i: number) => {
    const s = Math.sin(i * 12.9898) * 43758.5453;
    return (s - Math.floor(s) - 0.5) * 0.86;
  };
  let n = 0;
  for (let lat = -58; lat <= 83; lat += 0.5) {
    /* An equal-degree grid puts the SAME number of samples per degree of
       longitude at every latitude, but the area of a degree band shrinks as
       cos(lat) toward the poles. At 60 deg that is 2x the crowding, and the
       stipple saturated into a solid white sheet over northern Europe and
       Russia. Widening the longitude step by 1/cos(lat) restores an even
       density on the sphere. */
    const c = Math.cos((lat * Math.PI) / 180);
    const step = 1 / Math.max(0.25, c);
    /* Keep one point in every `keep`; the divisor grows with latitude because
       that is where the surface is smallest and can spare the fewest dots. */
    const keep = Math.max(2, Math.round(3 / c));
    for (let lon = -180; lon < 180; lon += step) {
      if (lat < -56) continue;
      if (!isLand(lon, lat)) continue;
      n++;
      if (n % keep !== 0) continue;
      out.push([lon + jitter(n) * step, lat + jitter(n * 7) * 0.5]);
    }
  }
  return out;
})();
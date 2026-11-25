// Deterministic topographic contour lines for the hero illustration. Pure: the same options
// always give the same paths. Rings are one irregular closed shape (a sum of sine harmonics
// from a seeded generator) scaled to different radii, so the lines nest and never cross.

export interface ContourOptions {
  seed: number;
  width: number;
  height: number;
  /** Number of contour lines. */
  levels: number;
  /** Points per line before smoothing. Default 48. */
  points?: number;
}

/** Small seeded generator (mulberry32). Returns numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number): number => Math.round(n * 10) / 10;

/** Closed Catmull-Rom spline through the points, as cubic Bezier path data. */
function closedSpline(pts: ReadonlyArray<readonly [number, number]>): string {
  const n = pts.length;
  let d = `M${round(pts[0][0])} ${round(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2[0])} ${round(p2[1])}`;
  }
  return `${d}Z`;
}

/** One path (SVG `d` attribute) per contour line, outermost first. */
export function contourPaths(options: ContourOptions): string[] {
  const { seed, width, height, levels } = options;
  const points = options.points ?? 48;
  if (!(width > 0) || !(height > 0)) throw new Error("contourPaths: width and height must be positive");
  if (!Number.isFinite(seed)) throw new Error("contourPaths: seed must be a finite number");
  if (!Number.isInteger(points) || points < 4) throw new Error("contourPaths: points must be an integer of at least 4");
  if (!Number.isInteger(levels) || levels < 0) throw new Error("contourPaths: levels must be a non-negative integer");
  if (levels === 0) return [];

  const rand = seededRandom(seed);
  const harmonics = [2, 3, 5].map((k, i) => ({
    k,
    amplitude: (0.16 / (i + 1)) * (0.7 + rand() * 0.6),
    phase: rand() * Math.PI * 2,
  }));
  const cx = width * 0.55;
  const cy = height * 0.5;
  const outer = Math.hypot(width, height) * 0.55;
  const paths: string[] = [];
  for (let level = 0; level < levels; level++) {
    const scale = 1 - level / levels;
    const radius = outer * scale * (0.35 + 0.65 * scale);
    // The summit drifts slowly so the spacing between lines varies, like a real slope.
    const ox = cx - (1 - scale) * width * 0.08;
    const oy = cy + (1 - scale) * height * 0.06;
    const pts: Array<[number, number]> = [];
    for (let p = 0; p < points; p++) {
      const theta = (p / points) * Math.PI * 2;
      let r = 1;
      for (const h of harmonics) r += h.amplitude * Math.sin(h.k * theta + h.phase + level * 0.04);
      pts.push([ox + Math.cos(theta) * radius * r * 1.15, oy + Math.sin(theta) * radius * r * 0.85]);
    }
    paths.push(closedSpline(pts));
  }
  return paths;
}

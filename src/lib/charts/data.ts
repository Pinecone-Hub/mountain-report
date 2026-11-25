// Reads the processed data file (data/glacier-mass-change.csv, made by npm run data) into
// series, and derives what the figures need. The values stay as in the dataset; only the
// cumulative sums and the 95% intervals are computed here.

export interface Point {
  year: number;
  areaKm2: number;
  mwe: number;
  mweSigma: number;
  gt: number;
  gtSigma: number;
}

export type Measure = "gt" | "mwe";

/** 95% interval half-width from a 1-sigma uncertainty (normal distribution). */
export const Z95 = 1.96;

export function parseProcessedCsv(text: string): Map<string, Point[]> {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const expected = ["series", "year", "area_km2", "mwe", "mwe_sigma", "gt", "gt_sigma"];
  if (header.join(",") !== expected.join(",")) throw new Error(`processed data: unexpected header "${lines[0]}"`);
  const out = new Map<string, Point[]>();
  for (const line of lines.slice(1)) {
    const [series, ...cells] = line.split(",");
    const [year, areaKm2, mwe, mweSigma, gt, gtSigma] = cells.map(Number);
    if ([year, areaKm2, mwe, mweSigma, gt, gtSigma].some((v) => !Number.isFinite(v))) throw new Error(`processed data: bad line "${line}"`);
    const list = out.get(series) ?? [];
    list.push({ year, areaKm2, mwe, mweSigma, gt, gtSigma });
    out.set(series, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.year - b.year);
  return out;
}

export function value(point: Point, measure: Measure): number {
  return measure === "gt" ? point.gt : point.mwe;
}

export function sigma(point: Point, measure: Measure): number {
  return measure === "gt" ? point.gtSigma : point.mweSigma;
}

/** Running sum of the annual values; the first point is the first year's value (as in the WGMS global file). */
export function cumulative(points: Point[], measure: Measure): Array<{ year: number; value: number }> {
  let sum = 0;
  return points.map((p) => {
    sum += value(p, measure);
    return { year: p.year, value: Number(sum.toFixed(6)) };
  });
}

/** Looks a series up; throws with the known ids when it does not exist. */
export function seriesOf(data: Map<string, Point[]>, id: string): Point[] {
  const points = data.get(id);
  if (!points) throw new Error(`data series "${id}" not found (known: ${[...data.keys()].join(", ")})`);
  return points;
}

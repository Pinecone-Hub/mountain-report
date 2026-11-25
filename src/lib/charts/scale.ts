// Linear scales and "nice" ticks for the SVG charts.

export type Scale = (value: number) => number;

export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * k;
}

/** A round step (1, 2 or 5 times a power of ten) giving about `count` intervals. */
export function niceStep(span: number, count: number): number {
  if (!(span > 0)) return 1;
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/** Domain widened to whole steps, and the ticks inside it. Zero is always a tick when in range. */
export function niceDomain(min: number, max: number, count: number): { domain: [number, number]; ticks: number[]; step: number } {
  const lo = Math.min(min, 0);
  const hi = Math.max(max, 0);
  const step = niceStep(hi - lo, count);
  const d0 = Math.floor(lo / step) * step;
  const d1 = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = d0; v <= d1 + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return { domain: [d0, d1], ticks, step };
}

/** Years to label on a time axis: multiples of `step` inside [first, last]. */
export function yearTicks(first: number, last: number, step: number): number[] {
  const out: number[] = [];
  for (let y = Math.ceil(first / step) * step; y <= last; y += step) out.push(y);
  return out;
}

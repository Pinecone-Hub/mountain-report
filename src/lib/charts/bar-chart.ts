// Annual bar chart with 95% uncertainty whiskers (Figure type "bars"). Pure: returns SVG markup.
// The inline version carries data attributes for the interactive layer (see
// src/components/figures/Figure.astro): data-plot-left / data-band / data-count on the
// <svg>, data-i and data-readout on each bar, and a hidden hover band.

import { formatNumber, n, xml } from "./format";
import { INK, frame, svgRoot, valueAxis, yearAxis, type ChartSize, type Standalone } from "./frame";
import { linearScale, niceDomain, yearTicks } from "./scale";

export interface BarPoint {
  year: number;
  value: number;
  /** Half-width of the 95% interval. */
  interval: number;
}

export interface BarChartInput {
  lang: string;
  size: ChartSize;
  points: BarPoint[];
  colour: string;
  axisLabel: string;
  ariaLabel: string;
  /** Text for each bar, shown by the interactive layer. */
  readout?: (point: BarPoint) => string;
  standalone?: Standalone;
  className?: string;
}

const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

/** Bar outline: square at the baseline, rounded at the data end. */
export function barPath(x: number, width: number, baseline: number, end: number): string {
  const h = Math.abs(end - baseline);
  const r = Math.min(RADIUS, width / 2, h);
  if (h === 0) return "";
  const dir = end > baseline ? 1 : -1; // 1 = bar goes down (negative value)
  const yc = end - dir * r;
  return `M${n(x)},${n(baseline)}V${n(yc)}Q${n(x)},${n(end)} ${n(x + r)},${n(end)}H${n(x + width - r)}Q${n(x + width)},${n(end)} ${n(x + width)},${n(yc)}V${n(baseline)}Z`;
}

export function renderBarChart(input: BarChartInput): string {
  const f = frame(input.size, { standalone: Boolean(input.standalone) });
  const pts = input.points;
  if (pts.length === 0) throw new Error("bar chart: no data");
  const lo = Math.min(...pts.map((p) => p.value - p.interval));
  const hi = Math.max(...pts.map((p) => p.value + p.interval));
  const { domain, ticks, step } = niceDomain(lo, hi, 6);
  const y = linearScale(domain, [f.bottom, f.top]);
  const band = (f.right - f.left) / pts.length;
  const barWidth = Math.max(1, Math.min(MAX_BAR, band - GAP));
  const first = pts[0].year;
  const xOf = (year: number) => f.left + (year - first) * band + band / 2;
  const decimals = step >= 1 ? 0 : 1;

  let body = valueAxis(f, ticks, y, (v) => formatNumber(input.lang, v, decimals), input.axisLabel);
  if (!input.standalone) {
    body += `<rect data-role="hover" x="${f.left}" y="${f.top}" width="${n(band)}" height="${f.bottom - f.top}" fill="${INK.hover}" visibility="hidden"/>`;
  }
  const y0 = y(0);
  let bars = "";
  let whiskers = "";
  const cap = Math.min(6, barWidth);
  pts.forEach((p, i) => {
    const cx = xOf(p.year);
    const d = barPath(cx - barWidth / 2, barWidth, y0, y(p.value));
    const readout = input.readout && !input.standalone ? ` data-i="${i}" data-readout="${xml(input.readout(p))}"` : "";
    bars += `<path d="${d || `M${n(cx)},${n(y0)}`}" fill="${input.colour}"${readout}/>`;
    const a = y(p.value + p.interval);
    const b = y(p.value - p.interval);
    whiskers += `<path d="M${n(cx)},${n(a)}V${n(b)}M${n(cx - cap / 2)},${n(a)}H${n(cx + cap / 2)}M${n(cx - cap / 2)},${n(b)}H${n(cx + cap / 2)}"/>`;
  });
  body += `<g data-role="bars">${bars}</g>`;
  body += `<g fill="none" stroke="${INK.muted}" stroke-width="1">${whiskers}</g>`;
  // Redraw the zero line over the bars so the baseline stays visible.
  body += `<line x1="${f.left}" x2="${f.right}" y1="${n(y0)}" y2="${n(y0)}" stroke="${INK.axis}" stroke-width="1" shape-rendering="crispEdges"/>`;
  const last = pts[pts.length - 1].year;
  body += yearAxis(f, yearTicks(first, last, input.size === "wide" ? 5 : 10), xOf);

  return svgRoot(f, body, {
    ariaLabel: input.ariaLabel,
    standalone: input.standalone,
    className: input.className,
    attrs: input.standalone ? {} : { "data-plot-left": n(f.left), "data-band": n(band), "data-count": String(pts.length) },
  });
}

// Cumulative line chart for several series (Figure type "cumulative-lines"). Pure: returns SVG.
// Identity is never colour alone: a legend above the plot, and on the wide size direct end
// labels (name and last value) with leader lines when labels had to move apart.

import { formatNumber, n, xml } from "./format";
import { INK, frame, svgRoot, textWidth, valueAxis, yearAxis, type ChartSize, type Standalone } from "./frame";
import { linearScale, niceDomain, yearTicks } from "./scale";

export interface LineSeries {
  id: string;
  name: string;
  colour: string;
  points: Array<{ year: number; value: number }>;
}

export interface LineChartInput {
  lang: string;
  size: ChartSize;
  series: LineSeries[];
  axisLabel: string;
  ariaLabel: string;
  decimals: number;
  standalone?: Standalone;
  className?: string;
}

/** Spreads label positions so no two are closer than `gap`, keeping them inside [min, max]. */
export function spreadLabels(wanted: number[], gap: number, min: number, max: number): number[] {
  const order = wanted.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const placed = order.map((o) => o.y);
  for (let k = 0; k < placed.length; k++) {
    placed[k] = Math.max(placed[k], min, k > 0 ? placed[k - 1] + gap : min);
  }
  for (let k = placed.length - 1; k >= 0; k--) {
    placed[k] = Math.min(placed[k], max, k < placed.length - 1 ? placed[k + 1] - gap : max);
  }
  const out = new Array<number>(wanted.length);
  order.forEach((o, k) => (out[o.i] = placed[k]));
  return out;
}

/** Legend items laid out in rows that fit the width. */
function legendLayout(series: LineSeries[], width: number, font: number): Array<{ s: LineSeries; x: number; row: number }> {
  const items: Array<{ s: LineSeries; x: number; row: number }> = [];
  let x = 0;
  let row = 0;
  for (const s of series) {
    const w = 22 + textWidth(s.name, font) + 18;
    if (x > 0 && x + w > width) {
      row++;
      x = 0;
    }
    items.push({ s, x, row });
    x += w;
  }
  return items;
}

export function renderLineChart(input: LineChartInput): string {
  const wide = input.size === "wide";
  const font = wide ? 14 : 13;
  const width = wide ? 720 : 360;
  const legend = legendLayout(input.series, width, font);
  const rows = Math.max(...legend.map((l) => l.row)) + 1;
  const endLabel = (s: LineSeries) => `${s.name} ${formatNumber(input.lang, s.points[s.points.length - 1].value, input.decimals)}`;
  const extraRight = wide ? Math.max(...input.series.map((s) => textWidth(endLabel(s), font))) + 22 : 0;
  const f = frame(input.size, { extraRight, legendRows: rows, standalone: Boolean(input.standalone) });

  const all = input.series.flatMap((s) => s.points);
  if (all.length === 0) throw new Error("line chart: no data");
  const first = Math.min(...all.map((p) => p.year));
  const last = Math.max(...all.map((p) => p.year));
  const { domain, ticks, step } = niceDomain(Math.min(...all.map((p) => p.value)), Math.max(...all.map((p) => p.value)), wide ? 6 : 5);
  const y = linearScale(domain, [f.bottom, f.top]);
  const x = linearScale([first, last], [f.left, f.right]);
  const tickDecimals = step >= 1 ? 0 : 1;

  const legendTop = (input.standalone ? 40 : 0) + font;
  let body = "";
  for (const item of legend) {
    const ly = legendTop + item.row * (font + 12);
    body += `<line x1="${n(item.x)}" x2="${n(item.x + 16)}" y1="${n(ly - font * 0.35)}" y2="${n(ly - font * 0.35)}" stroke="${item.s.colour}" stroke-width="3" stroke-linecap="round"/>`;
    body += `<text x="${n(item.x + 22)}" y="${n(ly)}" fill="${INK.text}">${xml(item.s.name)}</text>`;
  }
  body += valueAxis(f, ticks, y, (v) => formatNumber(input.lang, v, tickDecimals), input.axisLabel);

  for (const s of input.series) {
    const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${n(x(p.year))},${n(y(p.value))}`).join("");
    body += `<path d="${d}" fill="none" stroke="${s.colour}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  const ends = input.series.map((s) => s.points[s.points.length - 1]);
  input.series.forEach((s, i) => {
    body += `<circle cx="${n(x(ends[i].year))}" cy="${n(y(ends[i].value))}" r="4" fill="${s.colour}" stroke="${INK.surface}" stroke-width="2"/>`;
  });

  if (wide) {
    const wanted = ends.map((p) => y(p.value));
    const placed = spreadLabels(wanted, font + 4, f.top, f.bottom);
    const lx = f.right + 14;
    input.series.forEach((s, i) => {
      const ex = x(ends[i].year);
      if (Math.abs(placed[i] - wanted[i]) > 1) {
        body += `<path d="M${n(ex + 6)},${n(wanted[i])}L${n(lx - 3)},${n(placed[i])}" fill="none" stroke="${INK.axis}" stroke-width="1"/>`;
      }
      body += `<text x="${n(lx)}" y="${n(placed[i])}" dy="0.35em" fill="${INK.text}">${xml(endLabel(s))}</text>`;
    });
  }
  body += yearAxis(f, yearTicks(first, last, wide ? 5 : 10), x);

  return svgRoot(f, body, { ariaLabel: input.ariaLabel, standalone: input.standalone, className: input.className });
}

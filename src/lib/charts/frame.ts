// Shared layout for the SVG charts: two sizes (a wide one, also used for the downloadable file,
// and a narrow one for small screens), the colours, and the outer <svg> element.

import { n, xml } from "./format";

export type ChartSize = "wide" | "narrow";

export interface Frame {
  width: number;
  height: number;
  /** Plot area. */
  left: number;
  top: number;
  right: number;
  bottom: number;
  font: number;
}

/** Neutral chart ink (same values as the site tokens --text, --text-muted, --border-strong). */
export const INK = {
  text: "#1a1a1a",
  muted: "#4a4f55",
  axis: "#6b7280",
  grid: "#e3e7eb",
  hover: "#eef1f4",
  surface: "#ffffff",
};

/** Categorical series colours, assigned in this fixed order (validated: adjacent-pair CVD ΔE ≥ 9). */
export const SERIES_COLOURS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

export const STANDALONE_FONT = "'Noto Sans', 'Noto Sans Variable', Arial, sans-serif";

export interface Standalone {
  title: string;
  /** One line under the plot, such as the source. */
  source: string;
}

const HEADER = 40;
const FOOTER = 32;

/** The frame for a chart; `extraRight` leaves room for end labels, `legendRows` for a legend above the plot. */
export function frame(size: ChartSize, options: { extraRight?: number; legendRows?: number; standalone?: boolean } = {}): Frame {
  const wide = size === "wide";
  const font = wide ? 14 : 13;
  const legend = (options.legendRows ?? 0) * (font + 12);
  const header = options.standalone ? HEADER : 0;
  const footer = options.standalone ? FOOTER : 0;
  const width = wide ? 720 : 360;
  const plotHeight = wide ? 300 : 260;
  const top = header + legend + font + 14; // axis label line above the plot
  const left = wide ? 60 : 48;
  const right = width - (wide ? 16 : 10) - (options.extraRight ?? 0);
  const bottom = top + plotHeight;
  const height = bottom + font + 18 + footer;
  return { width, height, left, top, right, bottom, font };
}

/** The outer <svg>. Inline: role img with an accessible name. Standalone: XML namespace, <title>, white background. */
export function svgRoot(
  f: Frame,
  body: string,
  options: { ariaLabel: string; standalone?: Standalone; className?: string; attrs?: Record<string, string> },
): string {
  const attrs = Object.entries(options.attrs ?? {})
    .map(([k, v]) => ` ${k}="${xml(v)}"`)
    .join("");
  const viewBox = `0 0 ${f.width} ${f.height}`;
  if (options.standalone) {
    const s = options.standalone;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${f.width}" height="${f.height}" font-family="${xml(STANDALONE_FONT)}" font-size="${f.font}">` +
      `<title>${xml(options.ariaLabel)}</title>` +
      `<rect width="${f.width}" height="${f.height}" fill="${INK.surface}"/>` +
      `<text x="0" y="22" font-size="${f.font + 3}" font-weight="600" fill="${INK.text}">${xml(s.title)}</text>` +
      body +
      `<text x="0" y="${n(f.height - 8)}" font-size="${f.font - 2}" fill="${INK.muted}">${xml(s.source)}</text>` +
      `</svg>`
    );
  }
  const cls = options.className ? ` class="${xml(options.className)}"` : "";
  return `<svg viewBox="${viewBox}"${cls} role="img" aria-label="${xml(options.ariaLabel)}" focusable="false" font-size="${f.font}"${attrs}>${body}</svg>`;
}

/** Horizontal gridlines with value labels, the zero line, and the axis label above the plot. */
export function valueAxis(f: Frame, ticks: number[], y: (v: number) => number, label: (v: number) => string, axisLabel: string): string {
  let out = `<text x="0" y="${n(f.top - 12)}" fill="${INK.muted}">${xml(axisLabel)}</text>`;
  for (const t of ticks) {
    const ty = y(t);
    const colour = t === 0 ? INK.axis : INK.grid;
    out += `<line x1="${f.left}" x2="${f.right}" y1="${n(ty)}" y2="${n(ty)}" stroke="${colour}" stroke-width="1" shape-rendering="crispEdges"/>`;
    out += `<text x="${f.left - 8}" y="${n(ty)}" dy="0.35em" text-anchor="end" fill="${INK.muted}">${xml(label(t))}</text>`;
  }
  return out;
}

/** Year labels under the plot, with short tick marks. */
export function yearAxis(f: Frame, years: number[], x: (year: number) => number): string {
  let out = "";
  for (const year of years) {
    const tx = x(year);
    out += `<line x1="${n(tx)}" x2="${n(tx)}" y1="${f.bottom}" y2="${f.bottom + 5}" stroke="${INK.axis}" stroke-width="1" shape-rendering="crispEdges"/>`;
    out += `<text x="${n(tx)}" y="${f.bottom + 8 + f.font}" text-anchor="middle" fill="${INK.muted}">${year}</text>`;
  }
  return out;
}

/** Rough text width for layout (Noto Sans averages about 0.55 em per character). */
export function textWidth(text: string, font: number): number {
  return text.length * font * 0.55;
}

// Data figures: builds everything a figure needs from its metadata (src/content/figures/<lang>/)
// and the processed data (data/glacier-mass-change.csv): the inline SVGs (wide and narrow), the
// downloadable SVG, the CSV, the data table and the values of the interactive layer. Pure.

import { t, tf, type TranslationKey } from "../i18n/index";
import { renderBarChart, type BarPoint } from "./charts/bar-chart";
import { Z95, cumulative, seriesOf, type Measure, type Point } from "./charts/data";
import { formatNumber } from "./charts/format";
import { SERIES_COLOURS } from "./charts/frame";
import { renderLineChart } from "./charts/line-chart";

export interface FigureData {
  id: string;
  chapter: string;
  number: string;
  section?: string;
  chartType: "bars" | "cumulative-lines";
  measure: Measure;
  series: string[];
  source: string[];
  title: string;
  caption: string;
  alt: string;
  longDescription: string;
  replacementPng?: string;
  replacementSvg?: string;
  replacementCsv?: string;
}

export interface BuiltFigure {
  /** Element id of the <figure> in its chapter: "figure-1-1". */
  anchor: string;
  /** "Figure 1.1" */
  label: string;
  svgWide: string;
  svgNarrow: string;
  /** The downloadable SVG (wide, with title and source line). */
  svgFile: string;
  csv: string;
  table: { columns: string[]; rows: string[][] };
  /** Values for the keyboard and pointer layer (bar charts only). */
  slider?: { years: number[]; texts: string[] };
}

export interface FigureContext {
  lang: string;
  data: Map<string, Point[]>;
  /** Bar colour: the report accent. */
  accent: string;
  /** Source line for the downloadable SVG, such as "World Glacier Monitoring Service (WGMS) (2026), https://doi.org/...". */
  sourceShort: string;
  /** Short identifiers of the sources for the CSV source column, such as "doi:10.5904/...". */
  sourceIds: string[];
}

/** Folder of the generated figure files, below the base. */
export const FIGURE_FILES_DIR = "downloads/figures";

export function figureFiles(id: string, lang: string): { svg: string; png: string; csv: string } {
  return { svg: `${id}-${lang}.svg`, png: `${id}-${lang}.png`, csv: `${id}.csv` };
}

export function figureAnchor(number: string): string {
  return `figure-${number.replace(/\./g, "-")}`;
}

function seriesName(lang: string, id: string): string {
  return t(lang, `series.${id}` as TranslationKey);
}

/** Decimal places used for display, per measure. */
const DECIMALS: Record<Measure, number> = { gt: 1, mwe: 2 };

/** CSV number: as in the dataset (up to three decimals), with an ASCII minus. */
function csvNumber(value: number): string {
  return String(Number(value.toFixed(3)));
}


/** Throws unless the years run without gaps (bar positions and the slider index assume it). */
export function assertConsecutive(years: number[], label: string): void {
  years.forEach((y, i) => {
    if (i > 0 && y !== years[i - 1] + 1) throw new Error(`${label}: years must be consecutive, ${years[i - 1]} is followed by ${y}`);
  });
}

export function buildFigure(figure: FigureData, ctx: FigureContext): BuiltFigure {
  const { lang } = ctx;
  const label = tf(lang, "figure.label", { number: figure.number });
  const anchor = figureAnchor(figure.number);
  const standalone = { title: `${label}. ${figure.title}`, source: tf(lang, "figure.standalone.source", { source: ctx.sourceShort }) };
  // Plain CSV (no comment lines, which many tools read as the header): the last column names the source.
  const sourceId = ctx.sourceIds.join(" ");

  if (figure.chartType === "bars") {
    if (figure.series.length !== 1) throw new Error(`figure ${figure.id}: a bar chart takes exactly one series`);
    const id = figure.series[0];
    const m = figure.measure;
    const points = seriesOf(ctx.data, id);
    assertConsecutive(points.map((p) => p.year), `figure ${figure.id}`);
    const bars: BarPoint[] = points.map((p) => ({ year: p.year, value: m === "gt" ? p.gt : p.mwe, interval: Z95 * (m === "gt" ? p.gtSigma : p.mweSigma) }));
    const d = DECIMALS[m];
    const fmt = (v: number) => formatNumber(lang, v, d);
    const readout = (p: BarPoint) => tf(lang, `measure.${m}.readout` as TranslationKey, { year: p.year, value: fmt(p.value), interval: fmt(p.interval) });
    const common = { lang, points: bars, colour: ctx.accent, axisLabel: t(lang, `measure.${m}.axis` as TranslationKey), ariaLabel: figure.alt };
    const unit = m === "gt" ? "gt" : "mwe";
    const csv =
      [`year,series,mass_change_${unit},uncertainty_1sigma_${unit},uncertainty_95_${unit},source`, ...points.map((p, i) => [p.year, id, csvNumber(bars[i].value), csvNumber(m === "gt" ? p.gtSigma : p.mweSigma), csvNumber(bars[i].interval), sourceId].join(","))].join("\n") +
      "\n";
    return {
      anchor,
      label,
      svgWide: renderBarChart({ ...common, size: "wide", readout, className: "chart-wide" }),
      svgNarrow: renderBarChart({ ...common, size: "narrow", readout, className: "chart-narrow" }),
      svgFile: renderBarChart({ ...common, size: "wide", standalone }),
      csv,
      table: {
        columns: [t(lang, "figure.table.year"), t(lang, `measure.${m}.value` as TranslationKey), t(lang, `measure.${m}.interval` as TranslationKey)],
        rows: bars.map((b) => [String(b.year), fmt(b.value), fmt(b.interval)]),
      },
      slider: { years: bars.map((b) => b.year), texts: bars.map(readout) },
    };
  }

  // cumulative-lines
  if (figure.series.length > SERIES_COLOURS.length) throw new Error(`figure ${figure.id}: at most ${SERIES_COLOURS.length} series`);
  const m = figure.measure;
  const d = DECIMALS[m];
  const lines = figure.series.map((id, i) => ({ id, name: seriesName(lang, id), colour: SERIES_COLOURS[i], points: cumulative(seriesOf(ctx.data, id), m) }));
  const years = lines[0].points.map((p) => p.year);
  assertConsecutive(years, `figure ${figure.id}`);
  for (const l of lines) {
    if (l.points.map((p) => p.year).join() !== years.join()) throw new Error(`figure ${figure.id}: series "${l.id}" covers other years`);
  }
  const common = { lang, series: lines, axisLabel: t(lang, `measure.${m}.axis` as TranslationKey), ariaLabel: figure.alt, decimals: 1 };
  const annual = figure.series.map((id) => seriesOf(ctx.data, id));
  const csv =
    [
      ["year", ...figure.series.flatMap((id) => [`${id}_${m}`, `${id}_cumulative_${m}`]), "source"].join(","),
      ...years.map((year, i) => [year, ...figure.series.flatMap((_, k) => [csvNumber(m === "gt" ? annual[k][i].gt : annual[k][i].mwe), csvNumber(lines[k].points[i].value)]), sourceId].join(",")),
    ].join("\n") +
    "\n";
  return {
    anchor,
    label,
    svgWide: renderLineChart({ ...common, size: "wide", className: "chart-wide" }),
    svgNarrow: renderLineChart({ ...common, size: "narrow", className: "chart-narrow" }),
    svgFile: renderLineChart({ ...common, size: "wide", standalone }),
    csv,
    table: {
      columns: [t(lang, "figure.table.year"), ...lines.map((l) => tf(lang, `measure.${m}.column` as TranslationKey, { series: l.name }))],
      rows: years.map((year, i) => [String(year), ...lines.map((l) => formatNumber(lang, l.points[i].value, d))]),
    },
  };
}

/** File size for a download link: "84 KB", "1.2 MB" (1 KB = 1,024 bytes). */
export function formatSize(lang: string, bytes: number): string {
  if (bytes < 1024 * 1024) return tf(lang, "file.size.kb", { size: formatNumber(lang, Math.max(1, Math.round(bytes / 1024)), 0) });
  return tf(lang, "file.size.mb", { size: formatNumber(lang, bytes / (1024 * 1024), 1) });
}

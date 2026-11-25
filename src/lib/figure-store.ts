// Build-time access to the figures: metadata from the content collection, the processed data,
// the references and the files on disk. Used by the chapter pages, the Figures page and the
// endpoints that write the figure files. Not unit-tested (needs astro:content).

import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { getCollection } from "astro:content";
import csvText from "../../data/glacier-mass-change.csv?raw";
import referencesData from "../data/references.json";
import { report } from "../config/report";
import { parseProcessedCsv } from "./charts/data";
import { FIGURE_FILES_DIR, buildFigure, figureFiles, type BuiltFigure, type FigureData } from "./figures";
import { withBase } from "./paths";
import { parseReferences } from "./references";
import { BASE } from "./urls";

const data = parseProcessedCsv(csvText);
const references = parseReferences(referencesData);

function sources(figure: FigureData): { short: string; ids: string[] } {
  const refs = figure.source.map((key) => {
    const ref = references.get(key);
    if (!ref) throw new Error(`figure ${figure.id}: unknown source "${key}"`);
    return ref;
  });
  const short = refs.map((r) => `${r.authors} (${r.year})${r.doi ? `, https://doi.org/${r.doi}` : r.url ? `, ${r.url}` : ""}`).join("; ");
  const ids = refs.map((r) => (r.doi ? `doi:${r.doi}` : (r.url ?? r.key)));
  return { short, ids };
}

/** The figures of a language, in number order. */
export async function figuresFor(lang: string): Promise<FigureData[]> {
  const entries = await getCollection("figures", (e) => e.id.startsWith(`${lang}/`));
  const key = (n: string) => n.split(".").map((p) => p.padStart(4, "0")).join(".");
  return entries.map((e) => e.data as FigureData).sort((a, b) => key(a.number).localeCompare(key(b.number)));
}

const cache = new Map<string, BuiltFigure>();

export function built(figure: FigureData, lang: string): BuiltFigure {
  const cacheKey = `${lang}/${figure.id}`;
  let out = cache.get(cacheKey);
  if (!out) {
    const s = sources(figure);
    out = buildFigure(figure, { lang, data, accent: report.accentColour, sourceShort: s.short, sourceIds: s.ids });
    cache.set(cacheKey, out);
  }
  return out;
}

export interface Download {
  format: "png" | "svg" | "csv";
  href: string;
  bytes: number;
}

function publicFile(path: string): number | undefined {
  const file = join(process.cwd(), "public", path);
  return existsSync(file) ? statSync(file).size : undefined;
}

/** Download links: a replacement file from the CMS when set, otherwise the generated file. */
export function downloadsFor(figure: FigureData, lang: string): Download[] {
  const files = figureFiles(figure.id, lang);
  const b = built(figure, lang);
  const out: Download[] = [];
  const pick = (format: Download["format"], replacement: string | undefined, generated: string, bytes: number | undefined) => {
    if (replacement) {
      const size = publicFile(replacement);
      if (size === undefined) throw new Error(`figure ${figure.id}: replacement file public/${replacement} not found`);
      out.push({ format, href: withBase(BASE, replacement), bytes: size });
    } else if (bytes !== undefined) {
      out.push({ format, href: withBase(BASE, `${FIGURE_FILES_DIR}/${generated}`), bytes });
    }
  };
  pick("png", figure.replacementPng, files.png, publicFile(`${FIGURE_FILES_DIR}/${files.png}`));
  pick("svg", figure.replacementSvg, files.svg, Buffer.byteLength(b.svgFile));
  pick("csv", figure.replacementCsv, files.csv, Buffer.byteLength(b.csv));
  return out;
}

/** URL of the figure image used on the Figures page and in the lightbox. */
export function imageHref(figure: FigureData, lang: string): string {
  return figure.replacementSvg ? withBase(BASE, figure.replacementSvg) : withBase(BASE, `${FIGURE_FILES_DIR}/${figureFiles(figure.id, lang).svg}`);
}

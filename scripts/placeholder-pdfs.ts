// Writes the placeholder PDFs for the Downloads demo: the full report and one per chapter, for
// every language with the full scope, titles from report.config.json and the placeholder lines
// from src/i18n/<lang>.json (pdf.placeholder.*). Each page says it is a placeholder, not the
// report. Usage: node --experimental-strip-types scripts/placeholder-pdfs.ts
// Node built-ins only. Output: public/media/downloads/<id>-<lang>.pdf and <chapter-id>-<lang>.pdf.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPdf } from "./pdf-lib.ts";

interface Config {
  id: string;
  title: Record<string, string>;
  chapters: Array<{ id: string; number: number; title: Record<string, string> }>;
  languages: Array<{ code: string; scope: string; default?: boolean }>;
}

const ROOT = process.cwd();
const config = JSON.parse(readFileSync(join(ROOT, "report.config.json"), "utf8")) as Config;
const outDir = join(ROOT, "public", "media", "downloads");
mkdirSync(outDir, { recursive: true });

function strings(lang: string): Record<string, string> {
  return JSON.parse(readFileSync(join(ROOT, "src", "i18n", `${lang}.json`), "utf8")) as Record<string, string>;
}

function write(lang: string, name: string, heading: string, subject: string): void {
  const s = strings(lang);
  const key = (k: string): string => {
    const value = s[`pdf.placeholder.${k}`];
    if (value === undefined) throw new Error(`src/i18n/${lang}.json has no key pdf.placeholder.${k}`);
    return value;
  };
  const pdf = buildPdf([
    { text: key("title"), size: 22 },
    { text: heading, size: 16 },
    { text: subject, size: 13 },
    { text: key("line1"), size: 12 },
    { text: key("line2"), size: 12 },
  ]);
  writeFileSync(join(outDir, name), pdf);
  process.stdout.write(`${name} (${pdf.length} bytes)\n`);
}

for (const language of config.languages.filter((l) => l.scope === "full")) {
  const lang = language.code;
  const s = strings(lang);
  write(lang, `${config.id}-${lang}.pdf`, s["pdf.placeholder.fullReport"], config.title[lang]);
  for (const chapter of config.chapters) {
    write(lang, `${chapter.id}-${lang}.pdf`, s["pdf.placeholder.chapter"].replace("{number}", String(chapter.number)), chapter.title[lang]);
  }
}

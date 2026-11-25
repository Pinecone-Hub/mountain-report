// Writes the placeholder PDFs for the Downloads demo: the full report and one per chapter, in the
// default language, titles from report.config.json. Each page says it is a placeholder, not the
// report. Usage: node --experimental-strip-types scripts/placeholder-pdfs.ts
// Node built-ins only. Output: public/media/downloads/<id>-en.pdf and <chapter-id>-en.pdf.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPdf } from "./pdf-lib.ts";

interface Config {
  id: string;
  title: Record<string, string>;
  chapters: Array<{ id: string; number: number; title: Record<string, string> }>;
  languages: Array<{ code: string; default?: boolean }>;
}

const ROOT = process.cwd();
const config = JSON.parse(readFileSync(join(ROOT, "report.config.json"), "utf8")) as Config;
const lang = (config.languages.find((l) => l.default) ?? config.languages[0]).code;
const outDir = join(ROOT, "public", "media", "downloads");
mkdirSync(outDir, { recursive: true });

function write(name: string, heading: string, subject: string): void {
  const pdf = buildPdf([
    { text: "PLACEHOLDER FILE", size: 22 },
    { text: heading, size: 16 },
    { text: subject, size: 13 },
    { text: "This file is a placeholder for the demonstration.", size: 12 },
    { text: "It is not the report and contains no report content.", size: 12 },
  ]);
  writeFileSync(join(outDir, name), pdf);
  process.stdout.write(`${name} (${pdf.length} bytes)\n`);
}

write(`${config.id}-${lang}.pdf`, "Full report", config.title[lang]);
for (const chapter of config.chapters) {
  write(`${chapter.id}-${lang}.pdf`, `Chapter ${chapter.number}`, chapter.title[lang]);
}

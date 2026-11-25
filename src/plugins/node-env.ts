// Builds the plugin environment from the project files. Node only (used by astro.config.mjs).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { report } from "../config/report";
import { t, tf, type TranslationKey } from "../i18n/index";
import { parseReferences } from "../lib/references";
import { collectSections, glossaryEntryText, type PluginEnv } from "./support";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const CONTENT = join(SRC, "content");

function readIfExists(file: string): string | undefined {
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
}

export function createNodeEnv(): PluginEnv {
  const base = `${report.basePath.replace(/\/+$/, "")}/`;
  const defaultLang = report.languages.find((l) => l.default)?.code ?? "en";
  const references = parseReferences(JSON.parse(readFileSync(join(SRC, "data", "references.json"), "utf8")));
  const sectionCache = new Map<string, Set<string>>();
  const glossaryCache = new Map<string, string | undefined>();

  /** Sections of one language: its summary and chapter files. Falls back to the default language. */
  function sections(lang: string): ReadonlySet<string> {
    const cached = sectionCache.get(lang);
    if (cached) return cached;
    const own = join(CONTENT, lang);
    const dir = existsSync(own) ? lang : defaultLang;
    const found = new Set<string>();
    const summary = readIfExists(join(CONTENT, dir, "summary.md"));
    if (summary) for (const token of collectSections(summary)) found.add(token);
    const chapters = join(CONTENT, dir, "chapters");
    if (existsSync(chapters)) {
      for (const name of readdirSync(chapters).filter((n) => n.endsWith(".md"))) {
        for (const token of collectSections(readFileSync(join(chapters, name), "utf8"))) found.add(token);
      }
    }
    sectionCache.set(lang, found);
    return found;
  }

  return {
    base,
    chapters: report.chapters.map((c) => ({ id: c.id, number: c.number })),
    t: (lang, key) => t(lang, key as TranslationKey),
    tf: (lang, key, values) => tf(lang, key as TranslationKey, values),
    sections,
    references,
    glossaryEntry(lang, heading) {
      const cacheKey = `${lang}:${heading}`;
      if (!glossaryCache.has(cacheKey)) {
        const markdown = readIfExists(join(CONTENT, lang, "glossary.md"));
        glossaryCache.set(cacheKey, markdown === undefined ? undefined : glossaryEntryText(markdown, heading));
      }
      return glossaryCache.get(cacheKey);
    },
    formatDate(lang, isoDate) {
      const date = new Date(`${isoDate}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return isoDate;
      return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
    },
  };
}

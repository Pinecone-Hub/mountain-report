// Shared fixtures for the plugin tests (not a test file itself).

import { markdownToHtml, type HastPluginList, type MarkdownToHtmlResult } from "satteri";
import { t, tf, type TranslationKey } from "../i18n/index";
import { parseReferences } from "../lib/references";
import type { PluginEnv } from "./support";

export const GLOSSARY: Record<string, string> = {
  Likelihood: "The IPCC terms for the assessed probability of an outcome.",
  Confidence: "IPCC reports state their confidence in a finding.",
  Evidence: "An IPCC summary term that describes the available evidence.",
};

export function testEnv(overrides: Partial<PluginEnv> = {}): PluginEnv {
  return {
    base: "/mr/",
    chapters: [
      { id: "chapter-1", number: 1 },
      { id: "chapter-2", number: 2 },
    ],
    t: (lang, key) => t(lang, key as TranslationKey),
    tf: (lang, key, values) => tf(lang, key as TranslationKey, values),
    sections: () => new Set(["1.1", "1.2", "1.3", "2.1", "A", "A.1", "B"]),
    references: parseReferences([
      { key: "a2025", type: "article", authors: "Alpha, A.", year: 2025, title: "First", container: "Journal", doi: "10.1/a" },
      { key: "b2024", type: "report", authors: "Beta", year: 2024, title: "Second", url: "https://doi.org/10.2/b-page", accessed: "2026-11-25" },
    ]),
    glossaryEntry: (_lang, heading) => GLOSSARY[heading],
    formatDate: (_lang, iso) => `on ${iso}`,
    ...overrides,
  };
}

export const CHAPTER_1 = "file:///project/src/content/en/chapters/chapter-1.md";
export const SUMMARY = "file:///project/src/content/en/summary.md";
export const GLOSSARY_FILE = "file:///project/src/content/en/glossary.md";

/** Renders Markdown through the real Sätteri pipeline with the given plugins. */
export function render(markdown: string, plugins: HastPluginList, file: string = CHAPTER_1): string {
  // Without async plugins the result is synchronous.
  return (markdownToHtml(markdown, { hastPlugins: plugins, fileURL: new URL(file) }) as MarkdownToHtmlResult).html;
}

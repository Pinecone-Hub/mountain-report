import type { ChapterConfig } from "./validate";
import type { TranslationKey } from "../i18n/index";

/** Fixed pages every report has (route = slug). The Home page is the language root. */
export const FIXED_PAGES = [
  { slug: "summary", titleKey: "page.summary" },
  { slug: "figures", titleKey: "page.figures" },
  { slug: "downloads", titleKey: "page.downloads" },
  { slug: "faq", titleKey: "page.faq" },
  { slug: "glossary", titleKey: "page.glossary" },
  { slug: "about", titleKey: "page.about" },
  { slug: "accessibility", titleKey: "page.accessibility" },
  { slug: "search", titleKey: "page.search" },
] as const satisfies ReadonlyArray<{ slug: string; titleKey: TranslationKey }>;

export type FixedSlug = (typeof FIXED_PAGES)[number]["slug"];

/** Every route below a language root, in order: fixed pages first, then the chapters. */
export function allPageSlugs(chapters: readonly Pick<ChapterConfig, "id">[]): string[] {
  return [...FIXED_PAGES.map((p) => p.slug), ...chapters.map((c) => c.id)];
}

/** Chapter title in a language. Throws when the language has none (the validator prevents this). */
export function chapterTitle(chapter: Pick<ChapterConfig, "id" | "title">, lang: string): string {
  const value = chapter.title[lang];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Chapter "${chapter.id}" has no title for language "${lang}"`);
  }
  return value;
}

export function fixedPage(slug: string): (typeof FIXED_PAGES)[number] | undefined {
  return FIXED_PAGES.find((p) => p.slug === slug);
}

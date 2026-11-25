import { chapterTitle } from "../config/pages";
import { report, reportTitle } from "../config/report";
import { t, tf } from "../i18n/index";

/** Display title of a report page ("summary" or a chapter id) in a language: "Chapter 1: Glacier retreat". */
export function reportPageTitle(lang: string, slug: string): string {
  if (slug === "summary") return t(lang, "page.summary");
  const chapter = report.chapters.find((c) => c.id === slug);
  if (!chapter) throw new Error(`No report page "${slug}"`);
  return tf(lang, "chapter.heading", { number: chapter.number, title: chapterTitle(chapter, lang) });
}

export { reportTitle };

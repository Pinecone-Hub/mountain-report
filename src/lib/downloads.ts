// Pure helpers for the Downloads page: grouping the entries, the file format from the file name
// and the date text. No file access (the file size is read at build time by the page).

export type DownloadKind = "full-report" | "chapter" | "other";
export type FileFormat = "pdf" | "png" | "svg" | "csv" | "other";

export interface Grouped<T> {
  full: T[];
  chapters: T[];
  other: T[];
}

interface Groupable {
  kind: DownloadKind;
  chapter?: string;
  title: string;
  date: string;
}

/**
 * Groups entries as Full report (newest first), Chapters (in chapter order, then title) and
 * Other files (by title). Throws when a chapter entry has no chapter, or one that is not in the
 * chapter list, so a wrong CMS entry fails the build instead of disappearing.
 */
export function groupDownloads<T extends Groupable>(items: readonly T[], chapterIds: readonly string[]): Grouped<T> {
  const full = items.filter((i) => i.kind === "full-report").sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  const other = items.filter((i) => i.kind === "other").sort((a, b) => a.title.localeCompare(b.title));
  const order = (item: T): number => {
    const index = item.chapter === undefined ? -1 : chapterIds.indexOf(item.chapter);
    if (index < 0) throw new Error(`download "${item.title}": kind "chapter" needs a chapter id from the report configuration (got ${item.chapter === undefined ? "none" : `"${item.chapter}"`})`);
    return index;
  };
  const chapters = items
    .filter((i) => i.kind === "chapter")
    .map((i) => ({ i, o: order(i) }))
    .sort((a, b) => a.o - b.o || a.i.title.localeCompare(b.i.title))
    .map(({ i }) => i);
  return { full, chapters, other };
}

/** The format from the file name extension. Unknown or missing extensions give "other". */
export function fileFormat(path: string): FileFormat {
  const match = /\.([A-Za-z0-9]+)$/.exec(path);
  const ext = match ? match[1].toLowerCase() : "";
  return ext === "pdf" || ext === "png" || ext === "svg" || ext === "csv" ? ext : "other";
}

/** "2026-11-25" as a long date in the language ("25 November 2026"). Throws on a malformed date. */
export function formatIsoDate(lang: string, iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`date "${iso}" is not in the form YYYY-MM-DD`);
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new Error(`date "${iso}" is not a real date`);
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang, { dateStyle: "long", timeZone: "UTC" }).format(date);
}

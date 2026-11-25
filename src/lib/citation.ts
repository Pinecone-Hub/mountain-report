// "How to cite" text and BibTeX for a page or the whole report. Pure: the wording comes from
// templates passed in (translation strings), the facts from report.config.json.

export interface CitationFacts {
  /** Author names as they appear in a reference, e.g. "Butuc, D.". */
  authors: readonly string[];
  publisher: string;
  year: number;
  /** Id of the report (report.config.json "id"); used for the BibTeX key. */
  reportId: string;
  reportTitle: string;
}

export interface CitationTarget {
  /** Route slug of the page ("summary", "chapter-1"), or "" for the whole report. */
  slug: string;
  /** Page title ("Chapter 1: Glacier retreat"); ignored for the whole report. */
  title: string;
  url: string;
}

export interface CitationTemplates {
  /** Placeholders: {authors} {year} {title} {report} {publisher} {url}. */
  part: string;
  whole: string;
}

export interface Citation {
  text: string;
  bibtex: string;
}

/** Absolute URL of a page: site + base path + language + slug ("" for the language root). */
export function absoluteUrl(site: string, basePath: string, lang: string, slug = ""): string {
  const base = `/${basePath.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
  return `${site.replace(/\/+$/, "")}${base}${lang}/${slug === "" ? "" : `${slug}/`}`;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in values)) throw new Error(`Missing value "${name}" in citation template`);
    return String(values[name]);
  });
}

/** Escapes the characters that break a BibTeX value in braces. */
export function bibtexEscape(value: string): string {
  return value.replace(/[{}]/g, "").replace(/([&%$#_])/g, "\\$1");
}

export function buildCitation(facts: CitationFacts, target: CitationTarget, templates: CitationTemplates): Citation {
  if (facts.authors.length === 0) throw new Error("citation: at least one author is required");
  const whole = target.slug === "";
  const text = fill(whole ? templates.whole : templates.part, {
    authors: facts.authors.join("; "),
    year: facts.year,
    title: whole ? facts.reportTitle : target.title,
    report: facts.reportTitle,
    publisher: facts.publisher,
    url: target.url,
  });
  const key = `${facts.reportId}${facts.year}${whole ? "" : `-${target.slug}`}`;
  const fields: Array<[string, string]> = [
    ["author", facts.authors.join(" and ")],
    ["title", whole ? facts.reportTitle : target.title],
  ];
  if (!whole) fields.push(["booktitle", facts.reportTitle]);
  fields.push(["publisher", facts.publisher], ["year", String(facts.year)], ["url", target.url]);
  const body = fields.map(([name, value]) => `  ${name} = {${bibtexEscape(value)}}`).join(",\n");
  return { text, bibtex: `@${whole ? "book" : "incollection"}{${key},\n${body}\n}` };
}

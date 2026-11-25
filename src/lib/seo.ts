// Pure helpers for the search-engine and link-preview metadata of every page: canonical URLs,
// Open Graph locales and the JSON-LD (schema.org) documents. No Astro, no import.meta.env.

export const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";
const SCHEMA_CONTEXT = "https://schema.org";

export interface ReportInfo {
  /** URL of the report home in the page language. */
  url: string;
  name: string;
  /** BCP 47 code of the page language. */
  inLanguage: string;
  authors: ReadonlyArray<{ name: string; affiliation: string }>;
  publisher: string;
  year: number;
}

export interface BreadcrumbItem {
  name: string;
  /** Absolute URL. */
  url: string;
}

/** Absolute URL of a path on the site. Throws on an empty site. */
export function absoluteUrl(site: string, path: string): string {
  if (site.trim() === "") throw new Error("site must not be empty");
  return new URL(path, site.endsWith("/") ? site : `${site}/`).href;
}

/** Serialises a JSON-LD document for an inline <script>: "<", ">", "&" and the line separators are escaped so the text can never close the script element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

function people(authors: ReportInfo["authors"]) {
  return authors.map((a) => ({
    "@type": "Person",
    name: a.name,
    ...(a.affiliation.trim() === "" ? {} : { affiliation: { "@type": "Organization", name: a.affiliation } }),
  }));
}

/** The whole report (schema.org Report), for the Home page. */
export function reportJsonLd(info: ReportInfo): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Report",
    "@id": `${info.url}#report`,
    name: info.name,
    url: info.url,
    inLanguage: info.inLanguage,
    license: LICENCE_URL,
    copyrightYear: info.year,
    author: people(info.authors),
    publisher: { "@type": "Organization", name: info.publisher },
  };
}

export interface ArticleInfo {
  /** Canonical URL of the page. */
  url: string;
  headline: string;
  description: string;
  inLanguage: string;
  report: ReportInfo;
}

/** A chapter or the Summary (schema.org ScholarlyArticle), part of the Report. */
export function articleJsonLd(info: ArticleInfo): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "ScholarlyArticle",
    headline: info.headline,
    description: info.description,
    url: info.url,
    inLanguage: info.inLanguage,
    license: LICENCE_URL,
    author: people(info.report.authors),
    publisher: { "@type": "Organization", name: info.report.publisher },
    isPartOf: { "@type": "Report", "@id": `${info.report.url}#report`, name: info.report.name, url: info.report.url },
  };
}

/** schema.org BreadcrumbList. Returns undefined for an empty trail (the Home page has none). */
export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]): Record<string, unknown> | undefined {
  if (items.length === 0) return undefined;
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })),
  };
}

/** The other languages of a page for og:locale:alternate (never the page's own). */
export function otherLocales(current: string, codes: readonly string[], localeOf: (code: string) => string): string[] {
  const own = localeOf(current);
  return codes.filter((code) => code !== current).map(localeOf).filter((locale) => locale !== own);
}

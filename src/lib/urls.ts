import { report } from "../config/report";
import { resolvePageLink, type PageLink } from "./page-links";
import { withBase } from "./paths";

/** The configured base, e.g. "/mountain-report/". Comes from astro.config.mjs. */
export const BASE: string = import.meta.env.BASE_URL;

/** URL of a page under the base: pageUrl("fr", "about", "sources") is "<base>fr/about/#sources". */
export function pageUrl(lang: string, slug = "", hash = ""): string {
  const path = slug === "" ? `${lang}/` : `${lang}/${slug}/`;
  return withBase(BASE, path) + (hash === "" ? "" : `#${hash}`);
}

/**
 * Link to a page as seen from a page in `lang`. A summary-scope language has the Summary only:
 * links to any other page go to the default-language page and carry hreflang. Use as
 * `<a {...pageLink(lang, "about")}>`.
 */
export function pageLink(lang: string, slug = "", hash = ""): PageLink {
  return resolvePageLink({ base: BASE, languages: report.languages }, lang, slug, hash);
}

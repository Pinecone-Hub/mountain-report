import { withBase } from "./paths";

/** The configured base, e.g. "/mountain-report/". Comes from astro.config.mjs. */
export const BASE: string = import.meta.env.BASE_URL;

/** URL of a page under the base: pageUrl("fr", "about", "sources") is "<base>fr/about/#sources". */
export function pageUrl(lang: string, slug = "", hash = ""): string {
  const path = slug === "" ? `${lang}/` : `${lang}/${slug}/`;
  return withBase(BASE, path) + (hash === "" ? "" : `#${hash}`);
}

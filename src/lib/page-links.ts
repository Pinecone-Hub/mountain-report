// Cross-language link resolution. A summary-scope language (such as Arabic) has the Summary page
// only; every other page link from it goes to the default-language page, marked with hreflang.
// Pure: no Astro, no import.meta.env, so the content plugins (which run in Node) can use it.

import { withBase } from "./paths";

export interface LinkLanguage {
  code: string;
  scope: "full" | "summary";
  default?: boolean;
}

export interface PageLinkContext {
  /** Site base, e.g. "/mountain-report/". */
  base: string;
  languages: readonly LinkLanguage[];
}

export interface PageLink {
  href: string;
  /** Set only when the page does not exist in the requested language and the link goes to the default one. */
  hreflang?: string;
}

/** Route of the one page every summary-scope language has. */
export const SUMMARY_SLUG = "summary";

/** True when the language has this page (slug "" is the language home). */
export function languageHasPage(context: PageLinkContext, lang: string, slug: string): boolean {
  const language = context.languages.find((l) => l.code === lang);
  if (!language) return false;
  return language.scope === "full" || slug === SUMMARY_SLUG;
}

export function defaultLanguageCode(context: PageLinkContext): string {
  const found = context.languages.find((l) => l.default) ?? context.languages[0];
  if (!found) throw new Error("no languages configured");
  return found.code;
}

/** Language whose page a link from `lang` to `slug` ends up on. */
export function targetLanguage(context: PageLinkContext, lang: string, slug: string): string {
  return languageHasPage(context, lang, slug) ? lang : defaultLanguageCode(context);
}

/** URL (and hreflang when the target language differs) of page `slug` as seen from `lang`. */
export function resolvePageLink(context: PageLinkContext, lang: string, slug = "", hash = ""): PageLink {
  const target = targetLanguage(context, lang, slug);
  const path = slug === "" ? `${target}/` : `${target}/${slug}/`;
  const href = withBase(context.base, path) + (hash === "" ? "" : `#${hash}`);
  return target === lang ? { href } : { href, hreflang: target };
}

/** Languages (codes) in which a page exists, default language first order kept as configured. */
export function languagesWithPage(context: PageLinkContext, slug: string): string[] {
  return context.languages.filter((l) => languageHasPage(context, l.code, slug)).map((l) => l.code);
}

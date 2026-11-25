import { describe, expect, it } from "vitest";
import { languageHasPage, languagesWithPage, resolvePageLink, targetLanguage, type PageLinkContext } from "./page-links";

const context: PageLinkContext = {
  base: "/mr",
  languages: [
    { code: "en", scope: "full", default: true },
    { code: "fr", scope: "full" },
    { code: "ar", scope: "summary" },
  ],
};

describe("resolvePageLink", () => {
  it("stays in the language for a full-scope language", () => {
    expect(resolvePageLink(context, "fr", "about", "sources")).toEqual({ href: "/mr/fr/about/#sources" });
    expect(resolvePageLink(context, "fr")).toEqual({ href: "/mr/fr/" });
  });
  it("keeps the Summary in a summary-scope language", () => {
    expect(resolvePageLink(context, "ar", "summary", "a")).toEqual({ href: "/mr/ar/summary/#a" });
  });
  it("falls back to the default language with hreflang for other pages", () => {
    expect(resolvePageLink(context, "ar", "chapter-1", "section-1-2")).toEqual({ href: "/mr/en/chapter-1/#section-1-2", hreflang: "en" });
    expect(resolvePageLink(context, "ar")).toEqual({ href: "/mr/en/", hreflang: "en" });
    expect(resolvePageLink(context, "ar", "about", "sources")).toEqual({ href: "/mr/en/about/#sources", hreflang: "en" });
  });
  it("sends an unknown language to the default language", () => {
    expect(targetLanguage(context, "xx", "summary")).toBe("en");
  });
  it("throws without languages", () => {
    expect(() => resolvePageLink({ base: "/", languages: [] }, "ar", "about")).toThrow();
  });
});

describe("languageHasPage and languagesWithPage", () => {
  it("lists the languages of a page", () => {
    expect(languagesWithPage(context, "summary")).toEqual(["en", "fr", "ar"]);
    expect(languagesWithPage(context, "chapter-1")).toEqual(["en", "fr"]);
    expect(languagesWithPage(context, "")).toEqual(["en", "fr"]);
    expect(languageHasPage(context, "ar", "search")).toBe(false);
  });
});

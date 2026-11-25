import { describe, expect, it } from "vitest";
import { pageLink, pageUrl } from "./urls";

describe("pageUrl", () => {
  it("builds the language home and sub-pages under the base", () => {
    expect(pageUrl("en")).toMatch(/^\/(.*\/)?en\/$/);
    expect(pageUrl("fr", "about")).toMatch(/fr\/about\/$/);
  });
  it("adds a hash after the trailing slash", () => {
    expect(pageUrl("en", "about", "sources")).toMatch(/en\/about\/#sources$/);
  });
});

describe("pageLink (configured languages)", () => {
  it("keeps full languages and sends Arabic non-Summary links to English", () => {
    expect(pageLink("fr", "about")).toEqual({ href: pageUrl("fr", "about") });
    expect(pageLink("ar", "summary")).toEqual({ href: pageUrl("ar", "summary") });
    expect(pageLink("ar", "faq")).toEqual({ href: pageUrl("en", "faq"), hreflang: "en" });
  });
});

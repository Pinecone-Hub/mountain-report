import { describe, expect, it } from "vitest";
import { allPageSlugs, chapterTitle, fixedPage, FIXED_PAGES } from "./pages";

describe("allPageSlugs", () => {
  it("lists fixed pages then chapters", () => {
    const slugs = allPageSlugs([{ id: "chapter-1" }, { id: "chapter-2" }]);
    expect(slugs.slice(0, FIXED_PAGES.length)).toEqual(FIXED_PAGES.map((p) => p.slug));
    expect(slugs.slice(-2)).toEqual(["chapter-1", "chapter-2"]);
  });
  it("works without chapters", () => {
    expect(allPageSlugs([])).toHaveLength(FIXED_PAGES.length);
  });
  it("has no duplicate slugs", () => {
    expect(new Set(allPageSlugs([])).size).toBe(FIXED_PAGES.length);
  });
});

describe("chapterTitle", () => {
  const chapter = { id: "chapter-1", title: { en: "Glacier retreat", fr: "Recul des glaciers" } };
  it("returns the title for a language", () => {
    expect(chapterTitle(chapter, "fr")).toBe("Recul des glaciers");
  });
  it("throws for a missing or blank title", () => {
    expect(() => chapterTitle(chapter, "ar")).toThrow(/no title for language "ar"/);
    expect(() => chapterTitle({ id: "x", title: { en: " " } }, "en")).toThrow(/no title/);
  });
});

describe("fixedPage", () => {
  it("finds known pages only", () => {
    expect(fixedPage("faq")?.titleKey).toBe("page.faq");
    expect(fixedPage("chapter-1")).toBeUndefined();
  });
});

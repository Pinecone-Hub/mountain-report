import { describe, expect, it } from "vitest";
import { collectSections, fileLabel, glossaryEntryText, headingToken, pageFromFile, plainText, routeOf, sectionAnchor, slugify } from "./support";

describe("pageFromFile", () => {
  it("reads language and slug from a content path", () => {
    expect(pageFromFile(new URL("file:///p/src/content/en/chapters/chapter-1.md"))).toEqual({ lang: "en", slug: "chapter-1" });
    expect(pageFromFile(new URL("file:///p/src/content/fr/summary.md"))).toEqual({ lang: "fr", slug: "summary" });
  });

  it("throws for a missing or foreign path", () => {
    expect(() => pageFromFile(undefined)).toThrow(/unknown/);
    expect(() => pageFromFile(new URL("file:///p/docs/readme.md"))).toThrow(/not a content file/);
  });
});

describe("fileLabel and routeOf", () => {
  it("shortens a path from src/", () => {
    expect(fileLabel(new URL("file:///p/src/content/en/faq.md"))).toBe("src/content/en/faq.md");
    expect(fileLabel(undefined)).toBe("(unknown file)");
  });

  it("maps home to the language root", () => {
    expect(routeOf("home")).toBe("");
    expect(routeOf("faq")).toBe("faq");
  });
});

describe("headingToken and sectionAnchor", () => {
  it("finds numbered and lettered headings", () => {
    expect(headingToken("1.2 Title")).toBe("1.2");
    expect(headingToken("1.3.1 Title")).toBe("1.3.1");
    expect(headingToken("A. Glacier retreat")).toBe("A");
    expect(headingToken("A.1")).toBe("A.1");
    expect(headingToken("A.2 Something")).toBe("A.2");
  });

  it("ignores plain headings", () => {
    expect(headingToken("Cascading event")).toBeUndefined();
    expect(headingToken("A glacier")).toBeUndefined();
    expect(headingToken("")).toBeUndefined();
  });

  it("builds anchors", () => {
    expect(sectionAnchor("1.2")).toBe("section-1-2");
    expect(sectionAnchor("A")).toBe("a");
    expect(sectionAnchor("A.1")).toBe("a-1");
  });
});

describe("collectSections", () => {
  it("collects numbered headings and skips front matter and code", () => {
    const md = "---\ntitle: x\n---\n\n## 1.1 One\n\n### 1.1.1 Deep\n\n```\n## 9.9 not a heading\n```\n\n## Plain\n";
    expect([...collectSections(md)]).toEqual(["1.1", "1.1.1"]);
  });

  it("returns nothing for empty input", () => {
    expect(collectSections("").size).toBe(0);
  });
});

describe("slugify", () => {
  it("makes lower-case hyphenated slugs", () => {
    expect(slugify("Glacial lake outburst flood (GLOF)")).toBe("glacial-lake-outburst-flood-glof");
    expect(slugify("Éléments probants")).toBe("éléments-probants");
    expect(slugify("!!!")).toBe("section");
  });
});

describe("glossaryEntryText", () => {
  const md = "---\ntitle: G\n---\n\n## Confidence\n\nFive levels, *very low* to *very high* [@x]. See [the page](https://e.org) {1.2}.\n\nSecond paragraph.\n\n## Evidence\n\nOther.\n";

  it("returns the plain text of an entry", () => {
    expect(glossaryEntryText(md, "Confidence")).toBe("Five levels, very low to very high. See the page. Second paragraph.");
    expect(glossaryEntryText(md, "evidence")).toBe("Other.");
  });

  it("returns undefined for a missing heading or an empty entry", () => {
    expect(glossaryEntryText(md, "Agreement")).toBeUndefined();
    expect(glossaryEntryText("## Empty\n\n## Next\n", "Empty")).toBeUndefined();
    expect(glossaryEntryText("", "Confidence")).toBeUndefined();
  });
});

describe("plainText", () => {
  it("strips markers and citations", () => {
    expect(plainText("a *b* **c** [@k1; @k2] .")).toBe("a b c.");
  });
});

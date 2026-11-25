import { describe, expect, it } from "vitest";
import { formatReference, parseReferences, type Reference } from "./references";

const article: Reference = {
  key: "a",
  type: "article",
  authors: "Smith, J. and Jones, K.",
  year: 2025,
  title: "Glaciers",
  container: "Journal of Ice",
  volume: "17",
  issue: "5",
  pages: "1-10",
  doi: "10.1/abc",
};

describe("formatReference", () => {
  it("formats an article with volume, issue, pages and a DOI link", () => {
    expect(formatReference(article)).toEqual({
      text: "Smith, J. and Jones, K. (2025). Glaciers. Journal of Ice 17(5), 1-10.",
      link: { href: "https://doi.org/10.1/abc", label: "https://doi.org/10.1/abc" },
    });
  });

  it("keeps a title that already ends with punctuation", () => {
    expect(formatReference({ ...article, title: "Why?" }).text).toContain("Why? Journal");
  });

  it("adds the publisher and omits missing parts", () => {
    const result = formatReference({ key: "b", type: "report", authors: "WMO", year: 2026, title: "State", publisher: "WMO, Geneva", doi: "10.2/x" });
    expect(result.text).toBe("WMO (2026). State. WMO, Geneva.");
  });

  it("uses the URL and the accessed text when there is no DOI", () => {
    const result = formatReference(
      { key: "c", type: "report", authors: "ICIMOD", year: 2025, title: "Press", url: "https://example.org/p", accessed: "2026-11-25" },
      { accessed: (d) => `Accessed ${d}` },
    );
    expect(result.link).toEqual({ href: "https://example.org/p", label: "https://example.org/p" });
    expect(result.text).toBe("ICIMOD (2025). Press. Accessed 2026-11-25.");
  });

  it("has no link when there is neither DOI nor URL", () => {
    expect(formatReference({ key: "d", type: "x", authors: "A", year: 2000, title: "T" }).link).toBeUndefined();
  });

  it("shows volume without issue and pages without container", () => {
    expect(formatReference({ ...article, issue: undefined }).text).toContain("Journal of Ice 17, 1-10.");
    expect(formatReference({ key: "e", type: "x", authors: "A", year: 2000, title: "T", pages: "5-6" }).text).toBe("A (2000). T. 5-6.");
  });
});

describe("parseReferences", () => {
  it("indexes by key", () => {
    expect(parseReferences([article]).get("a")?.title).toBe("Glaciers");
  });

  it("accepts an empty list", () => {
    expect(parseReferences([]).size).toBe(0);
  });

  it("rejects malformed input", () => {
    expect(() => parseReferences({})).toThrow(/array/);
    expect(() => parseReferences([null])).toThrow(/object/);
    expect(() => parseReferences([{ key: "x" }])).toThrow(/"type"/);
    expect(() => parseReferences([{ ...article, doi: 5 }])).toThrow(/"doi"/);
  });

  it("rejects duplicate keys", () => {
    expect(() => parseReferences([article, article])).toThrow(/duplicate/);
  });
});

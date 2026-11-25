import { describe, expect, it } from "vitest";
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd, otherLocales, reportJsonLd, serializeJsonLd, type ReportInfo } from "./seo";

const info: ReportInfo = {
  url: "https://example.org/r/en/",
  name: "A report",
  inLanguage: "en",
  authors: [{ name: "Ada Lovelace", affiliation: "Lab" }, { name: "No Affiliation", affiliation: "" }],
  publisher: "Lab",
  year: 2026,
};

describe("absoluteUrl", () => {
  it("joins site and path, with or without trailing slash on the site", () => {
    expect(absoluteUrl("https://example.org", "/r/en/")).toBe("https://example.org/r/en/");
    expect(absoluteUrl("https://example.org/", "/r/en/about/")).toBe("https://example.org/r/en/about/");
  });
  it("throws on an empty site", () => {
    expect(() => absoluteUrl("", "/r/")).toThrow();
  });
});

describe("serializeJsonLd", () => {
  it("escapes characters that could close the script element", () => {
    const text = serializeJsonLd({ a: "</script><script>alert(1)</script> & <!--" });
    expect(text).not.toMatch(/[<>&]/);
    expect(JSON.parse(text)).toEqual({ a: "</script><script>alert(1)</script> & <!--" });
  });
  it("escapes the line separators and keeps non-Latin text", () => {
    const text = serializeJsonLd({ a: "x\u2028y", b: "مرحبا" });
    expect(text).toContain("\\u2028");
    expect(JSON.parse(text)).toEqual({ a: "x\u2028y", b: "مرحبا" });
  });
});

describe("reportJsonLd", () => {
  const doc = reportJsonLd(info) as Record<string, any>;
  it("describes the whole report", () => {
    expect(doc["@type"]).toBe("Report");
    expect(doc["@context"]).toBe("https://schema.org");
    expect(doc.name).toBe("A report");
    expect(doc.inLanguage).toBe("en");
    expect(doc.url).toBe(info.url);
    expect(doc.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(doc.publisher).toEqual({ "@type": "Organization", name: "Lab" });
  });
  it("lists authors, with the affiliation only when there is one", () => {
    expect(doc.author[0]).toEqual({ "@type": "Person", name: "Ada Lovelace", affiliation: { "@type": "Organization", name: "Lab" } });
    expect(doc.author[1]).toEqual({ "@type": "Person", name: "No Affiliation" });
  });
  it("copes with no authors", () => {
    expect((reportJsonLd({ ...info, authors: [] }) as Record<string, any>).author).toEqual([]);
  });
});

describe("articleJsonLd", () => {
  const doc = articleJsonLd({ url: "https://example.org/r/en/summary/", headline: "Summary", description: "D", inLanguage: "ar", report: info }) as Record<string, any>;
  it("is a ScholarlyArticle that is part of the report", () => {
    expect(doc["@type"]).toBe("ScholarlyArticle");
    expect(doc.headline).toBe("Summary");
    expect(doc.inLanguage).toBe("ar");
    expect(doc.isPartOf).toEqual({ "@type": "Report", "@id": "https://example.org/r/en/#report", name: "A report", url: info.url });
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the items from 1", () => {
    const doc = breadcrumbJsonLd([{ name: "Home", url: "https://example.org/r/en/" }, { name: "About", url: "https://example.org/r/en/about/" }]) as Record<string, any>;
    expect(doc["@type"]).toBe("BreadcrumbList");
    expect(doc.itemListElement.map((i: any) => [i.position, i.name, i.item])).toEqual([
      [1, "Home", "https://example.org/r/en/"],
      [2, "About", "https://example.org/r/en/about/"],
    ]);
  });
  it("returns nothing for an empty trail", () => {
    expect(breadcrumbJsonLd([])).toBeUndefined();
  });
});

describe("otherLocales", () => {
  const locale = (code: string) => ({ en: "en_GB", fr: "fr_FR", ar: "ar_AR" })[code] as string;
  it("lists the other languages only", () => {
    expect(otherLocales("en", ["en", "fr", "ar"], locale)).toEqual(["fr_FR", "ar_AR"]);
    expect(otherLocales("fr", ["en", "fr"], locale)).toEqual(["en_GB"]);
  });
  it("is empty for a page in one language", () => {
    expect(otherLocales("en", ["en"], locale)).toEqual([]);
  });
});

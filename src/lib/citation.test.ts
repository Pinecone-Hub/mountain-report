import { describe, expect, it } from "vitest";
import { absoluteUrl, bibtexEscape, buildCitation } from "./citation";

const facts = { authors: ["Butuc, D."], publisher: "Pinecone Hub", year: 2026, reportId: "rep", reportTitle: "Risks & Change" };
const templates = {
  part: "{authors} ({year}). {title}. In: {report}. {publisher}. {url}",
  whole: "{authors} ({year}). {title}. {publisher}. {url}",
};

describe("absoluteUrl", () => {
  it("joins site, base, language and page", () => {
    expect(absoluteUrl("https://x.org", "/rep", "en", "chapter-1")).toBe("https://x.org/rep/en/chapter-1/");
    expect(absoluteUrl("https://x.org/", "/rep/", "fr")).toBe("https://x.org/rep/fr/");
  });
});

describe("buildCitation", () => {
  it("cites a chapter", () => {
    const c = buildCitation(facts, { slug: "chapter-1", title: "Chapter 1: Ice", url: "https://x.org/rep/en/chapter-1/" }, templates);
    expect(c.text).toBe("Butuc, D. (2026). Chapter 1: Ice. In: Risks & Change. Pinecone Hub. https://x.org/rep/en/chapter-1/");
    expect(c.bibtex).toBe(
      "@incollection{rep2026-chapter-1,\n  author = {Butuc, D.},\n  title = {Chapter 1: Ice},\n  booktitle = {Risks \\& Change},\n  publisher = {Pinecone Hub},\n  year = {2026},\n  url = {https://x.org/rep/en/chapter-1/}\n}",
    );
  });

  it("cites the whole report and several authors", () => {
    const c = buildCitation({ ...facts, authors: ["A, B.", "C, D."] }, { slug: "", title: "ignored", url: "u" }, templates);
    expect(c.text).toBe("A, B.; C, D. (2026). Risks & Change. Pinecone Hub. u");
    expect(c.bibtex.startsWith("@book{rep2026,")).toBe(true);
    expect(c.bibtex).toContain("author = {A, B. and C, D.}");
    expect(c.bibtex).not.toContain("booktitle");
  });

  it("rejects no authors and a template with an unknown placeholder", () => {
    expect(() => buildCitation({ ...facts, authors: [] }, { slug: "", title: "", url: "" }, templates)).toThrow(/author/);
    expect(() => buildCitation(facts, { slug: "", title: "", url: "" }, { part: "{nope}", whole: "{nope}" })).toThrow(/nope/);
  });
});

describe("bibtexEscape", () => {
  it("escapes special characters and drops braces", () => {
    expect(bibtexEscape("a_b {c} 50%")).toBe("a\\_b c 50\\%");
  });
});

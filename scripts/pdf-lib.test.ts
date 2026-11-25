import { describe, expect, it } from "vitest";
import { buildPdf, pdfEscape } from "./pdf-lib";

describe("pdfEscape", () => {
  it("escapes parentheses and backslashes", () => {
    expect(pdfEscape("a (b) \\ c")).toBe("a \\(b\\) \\\\ c");
  });
  it("replaces non-ASCII and control characters", () => {
    expect(pdfEscape("é\n")).toBe("??");
  });
});

describe("buildPdf", () => {
  const pdf = buildPdf([{ text: "Title (draft)", size: 20 }, { text: "Line two", size: 12 }]).toString("latin1");

  it("has the PDF structure", () => {
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("/BaseFont /Helvetica");
    expect(pdf).toContain("(Title \\(draft\\)) Tj");
  });

  it("writes correct cross-reference offsets", () => {
    const xref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const entries = [...pdf.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(5);
    entries.forEach((offset, i) => expect(pdf.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });

  it("states the stream length correctly", () => {
    const m = /\/Length (\d+) >>\nstream\n([\s\S]*)\nendstream/.exec(pdf);
    expect(Number(m?.[1])).toBe(m?.[2].length);
  });

  it("is small and rejects an empty page", () => {
    expect(pdf.length).toBeLessThan(5 * 1024);
    expect(() => buildPdf([])).toThrow(/at least one line/);
  });
});

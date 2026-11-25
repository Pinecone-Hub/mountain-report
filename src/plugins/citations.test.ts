import { describe, expect, it } from "vitest";
import { citationsPlugin, CitationRegistry, occurrenceLetter, parseCitationGroup, splitCitations } from "./citations";
import { render, testEnv } from "./test-env";

describe("parseCitationGroup", () => {
  it("reads one or several keys", () => {
    expect(parseCitationGroup("@a2025")).toEqual(["a2025"]);
    expect(parseCitationGroup("@a2025; @b2024")).toEqual(["a2025", "b2024"]);
    expect(parseCitationGroup("@egu26-19777")).toEqual(["egu26-19777"]);
  });

  it("rejects malformed groups", () => {
    expect(() => parseCitationGroup("@a, @b")).toThrow(/malformed citation/);
    expect(() => parseCitationGroup("@a;")).toThrow(/malformed citation/);
    expect(() => parseCitationGroup("@")).toThrow(/malformed citation/);
    expect(() => parseCitationGroup("")).toThrow(/malformed citation/);
  });
});

describe("splitCitations", () => {
  it("splits text around groups", () => {
    expect(splitCitations("x [@a] y [@b; @c].")).toEqual([
      { kind: "text", value: "x " },
      { kind: "cite", keys: ["a"] },
      { kind: "text", value: " y " },
      { kind: "cite", keys: ["b", "c"] },
      { kind: "text", value: "." },
    ]);
  });

  it("handles empty text and text without citations", () => {
    expect(splitCitations("")).toEqual([]);
    expect(splitCitations("[not a citation]")).toEqual([{ kind: "text", value: "[not a citation]" }]);
  });

  it("rejects an unclosed citation", () => {
    expect(() => splitCitations("broken [@a")).toThrow(/without a closing bracket/);
  });
});

describe("CitationRegistry", () => {
  it("numbers by first citation and reuses numbers", () => {
    const r = new CitationRegistry();
    expect(r.cite("b")).toEqual({ number: 1, occurrence: 1 });
    expect(r.cite("a")).toEqual({ number: 2, occurrence: 1 });
    expect(r.cite("b")).toEqual({ number: 1, occurrence: 2 });
    expect(r.entries().map((e) => [e.key, e.number, e.occurrences])).toEqual([
      ["b", 1, 2],
      ["a", 2, 1],
    ]);
  });
});

describe("citationsPlugin", () => {
  const plugins = () => [citationsPlugin(testEnv())];

  it("renders numbered markers that link to the reference list", () => {
    const html = render("One [@b2024]. Two [@a2025; @b2024].", plugins());
    expect(html).toContain('<a href="#ref-1" id="cite-1-1" class="cite-link" aria-label="Reference 1">1</a>');
    expect(html).toContain('<a href="#ref-2" id="cite-2-1" class="cite-link" aria-label="Reference 2">2</a>, <a href="#ref-1" id="cite-1-2"');
  });

  it("appends a References list with formatted entries and back-links to every citation", () => {
    const html = render("One [@b2024]. Two [@a2025; @b2024].", plugins());
    expect(html).toContain('<h2 id="references">References</h2>');
    expect(html).toContain('<li id="ref-1">');
    expect(html).toContain("Beta (2024). Second. Accessed on 2026-11-25.");
    expect(html).toContain('href="https://doi.org/10.2/b-page"');
    expect(html).toContain("Alpha, A. (2025). First. Journal.");
    expect(html).toContain('href="https://doi.org/10.1/a"');
    // Cited twice: the arrow once, then superscript letters, each with the full label.
    expect(html).toContain('<a href="#cite-1-1" aria-label="Back to citation 1, occurrence 1"><sup>a</sup></a>');
    expect(html).toContain('<a href="#cite-1-2" aria-label="Back to citation 1, occurrence 2"><sup>b</sup></a>');
    // Cited once: just the arrow, with the text presentation selector.
    expect(html).toContain('<a href="#cite-2-1" aria-label="Back to citation 2, occurrence 1">↩︎</a>');
  });

  it("uses the page language for labels", () => {
    const html = render("Un [@a2025].", plugins(), "file:///p/src/content/fr/summary.md");
    expect(html).toContain('aria-label="Référence 1"');
    expect(html).toContain("<h2 id=\"references\">Références</h2>");
  });

  it("adds nothing for a page without citations", () => {
    expect(render("No citations.", plugins())).toBe("<p>No citations.</p>\n");
    expect(render("", plugins())).toBe("");
  });

  it("leaves code alone", () => {
    expect(render("Use `[@zzz]`.", plugins())).toContain("<code>[@zzz]</code>");
  });

  it("fails on an unknown reference key and names the file", () => {
    expect(() => render("Bad [@nokey].", plugins())).toThrow(/chapter-1\.md: unknown reference key "nokey"/);
  });

  it("fails on malformed citations", () => {
    expect(() => render("Bad [@a2025, @b2024].", plugins())).toThrow(/malformed citation/);
  });

  it("keeps separate numbering for separate pages", () => {
    const env = testEnv();
    const first = render("[@b2024]", [citationsPlugin(env)]);
    const second = render("[@a2025]", [citationsPlugin(env)]);
    expect(first).toContain('aria-label="Reference 1"');
    expect(second).toContain('aria-label="Reference 1"');
  });
});

describe("occurrenceLetter", () => {
  it("counts a to z, then aa, ab", () => {
    expect(occurrenceLetter(1)).toBe("a");
    expect(occurrenceLetter(3)).toBe("c");
    expect(occurrenceLetter(26)).toBe("z");
    expect(occurrenceLetter(27)).toBe("aa");
    expect(occurrenceLetter(52)).toBe("az");
    expect(occurrenceLetter(53)).toBe("ba");
  });

  it("copes with out-of-range input", () => {
    expect(occurrenceLetter(0)).toBe("a");
    expect(occurrenceLetter(-4)).toBe("a");
  });
});

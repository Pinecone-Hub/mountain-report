import { describe, expect, it } from "vitest";
import { crossRefsPlugin, resolveXref, splitCrossRefs } from "./crossrefs";
import { CHAPTER_1, SUMMARY, render, testEnv } from "./test-env";

describe("splitCrossRefs", () => {
  it("returns text without braces unchanged", () => {
    expect(splitCrossRefs("plain text")).toEqual([{ kind: "text", value: "plain text" }]);
    expect(splitCrossRefs("")).toEqual([]);
  });

  it("splits one and several references", () => {
    expect(splitCrossRefs("see {1.2}.")).toEqual([
      { kind: "text", value: "see " },
      { kind: "text", value: "{" },
      { kind: "ref", token: "1.2" },
      { kind: "text", value: "}" },
      { kind: "text", value: "." },
    ]);
    const refs = splitCrossRefs("{1.3, 2.1}").filter((s) => s.kind === "ref");
    expect(refs).toEqual([
      { kind: "ref", token: "1.3" },
      { kind: "ref", token: "2.1" },
    ]);
  });

  it("handles two groups joined by text and summary tokens", () => {
    const refs = splitCrossRefs("{3.2.1} and {A.1}").filter((s) => s.kind === "ref");
    expect(refs.map((r) => (r as { token: string }).token)).toEqual(["3.2.1", "A.1"]);
  });

  it("rejects malformed braces", () => {
    expect(() => splitCrossRefs("{}")).toThrow(/malformed/);
    expect(() => splitCrossRefs("{1.2,}")).toThrow(/malformed/);
    expect(() => splitCrossRefs("{1..2}")).toThrow(/malformed/);
    expect(() => splitCrossRefs("{abc}")).toThrow(/malformed/);
    expect(() => splitCrossRefs("open { only")).toThrow(/unmatched/);
    expect(() => splitCrossRefs("close } only")).toThrow(/unmatched/);
  });
});

describe("resolveXref", () => {
  const env = testEnv();

  it("links to another page with base, language, chapter and anchor", () => {
    expect(resolveXref("1.2", { lang: "en", slug: "summary" }, env)).toEqual({ href: "/mr/en/chapter-1/#section-1-2", labelKey: "xref.section" });
    expect(resolveXref("2.1", { lang: "fr", slug: "summary" }, env).href).toBe("/mr/fr/chapter-2/#section-2-1");
  });

  it("uses a hash for a section on the same page", () => {
    expect(resolveXref("1.2", { lang: "en", slug: "chapter-1" }, env).href).toBe("#section-1-2");
  });

  it("links summary headlines", () => {
    expect(resolveXref("A.1", { lang: "en", slug: "home" }, env)).toEqual({ href: "/mr/en/summary/#a-1", labelKey: "xref.summary" });
  });

  it("throws for an unknown section and for a missing chapter", () => {
    expect(() => resolveXref("1.9", { lang: "en", slug: "summary" }, env)).toThrow(/unknown section "1.9"/);
    expect(() => resolveXref("7.1", { lang: "en", slug: "summary" }, env)).toThrow(/no chapter 7/);
    expect(() => resolveXref("Z", { lang: "en", slug: "summary" }, env)).toThrow(/unknown section "Z"/);
  });
});

describe("crossRefsPlugin", () => {
  const plugins = () => [crossRefsPlugin(testEnv())];

  it("renders visible braces with a link per number and an accessible name", () => {
    const html = render("Text {1.3, 2.1}.", plugins(), SUMMARY);
    expect(html).toContain("{");
    expect(html).toContain('<a href="/mr/en/chapter-1/#section-1-3" class="xref" aria-label="Section 1.3">1.3</a>');
    expect(html).toContain('<a href="/mr/en/chapter-2/#section-2-1" class="xref" aria-label="Section 2.1">2.1</a>');
    expect(html).toContain("}.");
  });

  it("uses a same-page hash inside a chapter", () => {
    expect(render("See {1.2}.", plugins(), CHAPTER_1)).toContain('href="#section-1-2"');
  });

  it("leaves code alone and ignores text without braces", () => {
    expect(render("Use `{x}` here.", plugins())).toContain("<code>{x}</code>");
    expect(render("No refs.", plugins())).toBe("<p>No refs.</p>\n");
  });

  it("names the file and value in a build error", () => {
    expect(() => render("See {1.9}.", plugins(), CHAPTER_1)).toThrow(/src\/content\/chapters\/en\/chapter-1\.md: unknown section "1\.9"/);
    expect(() => render("See {5.1}.", plugins(), CHAPTER_1)).toThrow(/no chapter 5/);
    expect(() => render("See {1.2.", plugins(), CHAPTER_1)).toThrow(/chapter-1\.md: malformed/);
  });
});

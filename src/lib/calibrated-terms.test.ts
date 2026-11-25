import { describe, expect, it } from "vitest";
import { classifyTerm, glossaryCategory, hasTermList, normaliseTerm } from "./calibrated-terms";

describe("classifyTerm", () => {
  it("recognises each category", () => {
    expect(classifyTerm("very likely", "en")).toBe("likelihood");
    expect(classifyTerm("about as likely as not", "en")).toBe("likelihood");
    expect(classifyTerm("high confidence", "en")).toBe("confidence");
    expect(classifyTerm("robust evidence", "en")).toBe("evidence");
    expect(classifyTerm("low agreement", "en")).toBe("agreement");
    expect(classifyTerm("medium evidence, high agreement", "en")).toBe("evidence-agreement");
  });

  it("ignores case and extra space", () => {
    expect(classifyTerm("  Very   Likely ", "en")).toBe("likelihood");
  });

  it("rejects text that is not exactly a term", () => {
    expect(classifyTerm("very likely cause", "en")).toBeUndefined();
    expect(classifyTerm("confidence", "en")).toBeUndefined();
    expect(classifyTerm("high confidence, high agreement", "en")).toBeUndefined();
    expect(classifyTerm("", "en")).toBeUndefined();
  });

  it("has no terms for a language without a list", () => {
    expect(hasTermList("fr")).toBe(false);
    expect(classifyTerm("very likely", "fr")).toBeUndefined();
  });
});

describe("glossaryCategory and normaliseTerm", () => {
  it("maps agreement and combinations to Evidence", () => {
    expect(glossaryCategory("agreement")).toBe("evidence");
    expect(glossaryCategory("evidence-agreement")).toBe("evidence");
    expect(glossaryCategory("likelihood")).toBe("likelihood");
    expect(glossaryCategory("confidence")).toBe("confidence");
  });

  it("normalises", () => {
    expect(normaliseTerm(" A  B ")).toBe("a b");
  });
});

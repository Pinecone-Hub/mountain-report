import { describe, expect, it } from "vitest";
import { calibratedWordPattern, classifyTerm, glossaryCategory, hasTermList, normaliseTerm } from "./calibrated-terms";

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
    expect(hasTermList("de")).toBe(false);
    expect(classifyTerm("very likely", "de")).toBeUndefined();
    expect(calibratedWordPattern("de")).toBeUndefined();
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

describe("French terms", () => {
  it("recognises each category", () => {
    expect(classifyTerm("très probable", "fr")).toBe("likelihood");
    expect(classifyTerm("à peu près aussi probable qu'improbable", "fr")).toBe("likelihood");
    expect(classifyTerm("exceptionnellement improbable", "fr")).toBe("likelihood");
    expect(classifyTerm("degré de confiance élevé", "fr")).toBe("confidence");
    expect(classifyTerm("éléments probants robustes", "fr")).toBe("evidence");
    expect(classifyTerm("degré de cohérence moyen", "fr")).toBe("agreement");
    expect(classifyTerm("éléments probants moyens, degré de cohérence élevé", "fr")).toBe("evidence-agreement");
  });

  it("accepts both apostrophes, case and no-break spaces", () => {
    expect(classifyTerm("plus probable qu\u2019improbable", "fr")).toBe("likelihood");
    expect(classifyTerm("Plus probable qu'improbable", "fr")).toBe("likelihood");
    expect(classifyTerm("degré\u00a0de confiance  très élevé", "fr")).toBe("confidence");
  });

  it("rejects English terms, bare qualifiers and other combinations", () => {
    expect(classifyTerm("very likely", "fr")).toBeUndefined();
    expect(classifyTerm("faible", "fr")).toBeUndefined();
    expect(classifyTerm("limités", "fr")).toBeUndefined();
    expect(classifyTerm("degré de confiance élevé, degré de cohérence élevé", "fr")).toBeUndefined();
    expect(classifyTerm("high confidence", "fr")).toBeUndefined();
  });

  it("has a near-miss word pattern", () => {
    expect(calibratedWordPattern("fr")?.test("très probablement")).toBe(true);
    expect(calibratedWordPattern("fr")?.test("glacier")).toBe(false);
  });
});

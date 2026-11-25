import { describe, expect, it } from "vitest";
import { contrastRatio, meetsContrast, parseHex, relativeLuminance } from "./contrast";

describe("parseHex", () => {
  it("parses long and short forms, any case", () => {
    expect(parseHex("#005A8C")).toEqual([0, 90, 140]);
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
  });
  it("rejects malformed input", () => {
    for (const bad of ["", "fff", "#ffff", "#GGGGGG", "red", "#12345"]) expect(parseHex(bad)).toBeNull();
    expect(parseHex(undefined as unknown as string)).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
  it("is symmetric", () => {
    expect(contrastRatio("#005A8C", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#005A8C"), 8);
  });
  it("matches known values", () => {
    // #767676 on white is the classic 4.54:1 boundary grey.
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThan(4.5);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5);
  });
  it("throws on invalid colours", () => {
    expect(() => contrastRatio("nope", "#fff")).toThrow(/Invalid hex colour/);
    expect(() => relativeLuminance("")).toThrow();
  });
});

describe("meetsContrast", () => {
  it("applies the threshold", () => {
    expect(meetsContrast("#005A8C", "#ffffff", 4.5)).toBe(true);
    expect(meetsContrast("#00aa8c", "#ffffff", 4.5)).toBe(false);
    expect(meetsContrast("#00aa8c", "#ffffff", 2.5)).toBe(true);
  });
  it("never passes for invalid colours", () => {
    expect(meetsContrast("bad", "#ffffff", 1)).toBe(false);
  });
});

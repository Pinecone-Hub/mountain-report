import { describe, expect, it } from "vitest";
import { pickActiveIndex } from "./toc";

describe("pickActiveIndex", () => {
  it("returns -1 for no headings", () => {
    expect(pickActiveIndex([], 100)).toBe(-1);
  });
  it("selects the first heading before any is reached", () => {
    expect(pickActiveIndex([400, 900, 1500], 100)).toBe(0);
  });
  it("selects the last heading above the threshold", () => {
    expect(pickActiveIndex([-800, -200, 90, 600], 100)).toBe(2);
    expect(pickActiveIndex([-800, -200, -50], 100)).toBe(2);
  });
  it("ignores non-finite positions", () => {
    expect(pickActiveIndex([10, Number.NaN, Number.POSITIVE_INFINITY], 100)).toBe(0);
  });
});

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
  it("lets the last heading win at the bottom of the page", () => {
    expect(pickActiveIndex([-900, -300, 200, 500], 100, { atBottom: true })).toBe(3);
  });
  it("lets the heading named by the hash win at the bottom while it is on screen", () => {
    expect(pickActiveIndex([-900, -300, 200, 500], 100, { atBottom: true, preferred: 2, viewportHeight: 800 })).toBe(2);
    expect(pickActiveIndex([-900, -300, 200, 500], 100, { atBottom: true, preferred: 1, viewportHeight: 800 })).toBe(3);
    expect(pickActiveIndex([-900, -300, 200, 500], 100, { atBottom: true, preferred: 9, viewportHeight: 800 })).toBe(3);
  });
  it("ignores the bottom rule elsewhere", () => {
    expect(pickActiveIndex([-900, -300, 200, 500], 100, { atBottom: false })).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { contourPaths, seededRandom } from "./contours";

const base = { seed: 7, width: 800, height: 400, levels: 12 };

describe("seededRandom", () => {
  it("is deterministic and within [0, 1)", () => {
    const a = seededRandom(1);
    const b = seededRandom(1);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("contourPaths", () => {
  it("returns one closed path per level", () => {
    const paths = contourPaths(base);
    expect(paths).toHaveLength(12);
    for (const d of paths) {
      expect(d.startsWith("M")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
  it("is deterministic for the same options", () => {
    expect(contourPaths(base)).toEqual(contourPaths({ ...base }));
  });
  it("changes with the seed", () => {
    expect(contourPaths(base)).not.toEqual(contourPaths({ ...base, seed: 8 }));
  });
  it("returns nothing for zero levels", () => {
    expect(contourPaths({ ...base, levels: 0 })).toEqual([]);
  });
  it("rejects malformed options", () => {
    expect(() => contourPaths({ ...base, width: 0 })).toThrow(/positive/);
    expect(() => contourPaths({ ...base, height: -1 })).toThrow(/positive/);
    expect(() => contourPaths({ ...base, seed: Number.NaN })).toThrow(/seed/);
    expect(() => contourPaths({ ...base, points: 2 })).toThrow(/points/);
    expect(() => contourPaths({ ...base, levels: 1.5 })).toThrow(/levels/);
    expect(() => contourPaths({ ...base, levels: -1 })).toThrow(/levels/);
  });
  it("uses smaller shapes for inner levels", () => {
    const extent = (d: string) => {
      const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      return Math.max(...nums) - Math.min(...nums);
    };
    const paths = contourPaths(base);
    expect(extent(paths[paths.length - 1])).toBeLessThan(extent(paths[0]));
  });
});

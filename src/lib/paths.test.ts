import { describe, expect, it } from "vitest";
import { normaliseBase, withBase } from "./paths";

describe("normaliseBase", () => {
  it("adds or keeps exactly one trailing slash", () => {
    expect(normaliseBase("/mountain-report")).toBe("/mountain-report/");
    expect(normaliseBase("/mountain-report/")).toBe("/mountain-report/");
  });
  it("handles an empty or root base", () => {
    expect(normaliseBase("")).toBe("/");
    expect(normaliseBase("/")).toBe("/");
  });
});

describe("withBase", () => {
  it("prefixes the base and never doubles slashes", () => {
    expect(withBase("/mountain-report/", "en/")).toBe("/mountain-report/en/");
    expect(withBase("/mountain-report", "/en/")).toBe("/mountain-report/en/");
  });
  it("returns the base itself for an empty path", () => {
    expect(withBase("/mountain-report")).toBe("/mountain-report/");
  });
});

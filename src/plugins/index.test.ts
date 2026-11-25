import { describe, expect, it } from "vitest";
import { contentPlugins } from "./index";
import { testEnv } from "./test-env";

describe("contentPlugins", () => {
  const names = contentPlugins(testEnv()).map((p) => (typeof p === "object" && p !== null && "name" in p ? p.name : "?"));

  it("runs the plugins in the documented order", () => {
    expect(names).toEqual([
      "mountain-report-heading-ids",
      "mountain-report-figure-placeholder",
      "mountain-report-crossrefs",
      "mountain-report-calibrated",
      "mountain-report-notes",
      "mountain-report-structure",
      "mountain-report-citations",
    ]);
  });

  it("puts the citations last so the References list ends the page, after the structure plugin", () => {
    expect(names.indexOf("mountain-report-structure")).toBeLessThan(names.indexOf("mountain-report-citations"));
    expect(names.indexOf("mountain-report-heading-ids")).toBe(0);
  });
});

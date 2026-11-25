import { describe, expect, it } from "vitest";
import { parseWgmsCsv, processedCsv, selectPeriod } from "./wgms-lib.ts";

const sample = "year,area_km2,mwe,mwe_sigma,gt,gt_sigma\n1975,10,0.1,0.2,1.5,0.3\n1976,10,-0.2,0.2,-2.0,0.3\n1977,9.5,-0.3,0.2,-2.9,0.3\n";

describe("WGMS processing", () => {
  it("keeps the values as written", () => {
    const rows = parseWgmsCsv(sample, "s.csv");
    expect(rows[1]).toEqual({ year: "1976", area_km2: "10", mwe: "-0.2", mwe_sigma: "0.2", gt: "-2.0", gt_sigma: "0.3" });
  });

  it("selects the period in year order and fails on a gap", () => {
    const rows = parseWgmsCsv(sample, "s.csv");
    expect(selectPeriod(rows, 1976, 1977, "s").map((r) => r.year)).toEqual(["1976", "1977"]);
    expect(() => selectPeriod(rows, 1976, 1978, "s")).toThrow(/1978 is missing/);
  });

  it("fails on a missing column or a non-numeric value", () => {
    expect(() => parseWgmsCsv("year,mwe\n1976,1\n", "s")).toThrow(/area_km2/);
    expect(() => parseWgmsCsv(sample.replace("-0.2", "n/a"), "s")).toThrow(/not a number/);
  });

  it("writes one row per series and year", () => {
    const rows = selectPeriod(parseWgmsCsv(sample, "s"), 1976, 1977, "s");
    expect(processedCsv([{ id: "global", rows }])).toBe(
      "series,year,area_km2,mwe,mwe_sigma,gt,gt_sigma\nglobal,1976,10,-0.2,0.2,-2.0,0.3\nglobal,1977,9.5,-0.3,0.2,-2.9,0.3\n",
    );
  });
});

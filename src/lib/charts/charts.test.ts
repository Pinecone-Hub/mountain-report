import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { barPath, renderBarChart } from "./bar-chart";
import { cumulative, parseProcessedCsv, seriesOf } from "./data";
import { formatNumber } from "./format";
import { renderLineChart, spreadLabels } from "./line-chart";
import { niceDomain, niceStep, yearTicks } from "./scale";

const processed = readFileSync(new URL("../../../data/glacier-mass-change.csv", import.meta.url), "utf8");
// The original WGMS files are kept locally only (not in the repository).
const rawGlobalUrl = new URL("../../../data/raw/wgms-amce-2026-02-10/global.csv", import.meta.url);
const rawGlobal = existsSync(rawGlobalUrl) ? readFileSync(rawGlobalUrl, "utf8") : undefined;

describe("format", () => {
  it("uses the minus sign and locale grouping", () => {
    expect(formatNumber("en", -9583.132, 1)).toBe("−9,583.1");
    expect(formatNumber("en", 2.47, 2, { sign: true })).toBe("+2.47");
    expect(formatNumber("en", -0.001, 1)).toBe("0.0");
    expect(formatNumber("fr", -1234.5, 1)).toMatch(/^−1\s1234,5$|^−1[  ]234,5$/);
  });
});

describe("scale", () => {
  it("picks round steps and keeps zero", () => {
    expect(niceStep(900, 6)).toBe(200);
    const { domain, ticks } = niceDomain(-689, 221, 6);
    expect(domain).toEqual([-800, 400]);
    expect(ticks).toContain(0);
    expect(yearTicks(1976, 2025, 5)).toEqual([1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025]);
  });
});

describe("data", () => {
  const data = parseProcessedCsv(processed);
  it("has every series for 1976 to 2025", () => {
    for (const id of ["global", "CEU", "ASC", "ASW", "ASE", "SA1", "SA2"]) {
      const s = seriesOf(data, id);
      expect(s.length).toBe(50);
      expect(s[0].year).toBe(1976);
      expect(s[49].year).toBe(2025);
    }
    expect(() => seriesOf(data, "XXX")).toThrow(/not found/);
  });

  it("reaches the dataset's cumulative global total for 2025", () => {
    expect(cumulative(seriesOf(data, "global"), "gt")[49].value).toBeCloseTo(-9583.132, 3);
  });

  it.skipIf(rawGlobal === undefined)("reproduces the dataset's own cumulative global series (original file present)", () => {
    const ours = cumulative(seriesOf(data, "global"), "gt");
    const lines = rawGlobal!.trim().split("\n");
    const header = lines[0].split(",");
    const col = header.indexOf("gt_cumsum");
    const theirs = new Map(lines.slice(1).map((l) => [Number(l.split(",")[0]), Number(l.split(",")[col])]));
    for (const p of ours) expect(p.value).toBeCloseTo(theirs.get(p.year)!, 2);
    expect(ours[49].value).toBeCloseTo(-9583.132, 3);
  });
});

describe("bar chart", () => {
  it("draws a square baseline and a rounded data end", () => {
    const d = barPath(10, 10, 100, 150);
    expect(d.startsWith("M10,100V146Q10,150")).toBe(true);
    expect(barPath(10, 10, 100, 100)).toBe("");
  });

  it("renders one bar per year with readouts, inline and standalone", () => {
    const points = seriesOf(parseProcessedCsv(processed), "global").map((p) => ({ year: p.year, value: p.gt, interval: p.gtSigma * 1.96 }));
    const inline = renderBarChart({ lang: "en", size: "wide", points, colour: "#005A8C", axisLabel: "Gt", ariaLabel: "A & B", readout: (p) => `${p.year}` });
    expect(inline.match(/data-i="/g)?.length).toBe(50);
    expect(inline).toContain('role="img"');
    expect(inline).toContain('aria-label="A &amp; B"');
    expect(inline).not.toContain("xmlns");
    expect(inline).not.toMatch(/\bid="/);
    const file = renderBarChart({ lang: "en", size: "wide", points, colour: "#005A8C", axisLabel: "Gt", ariaLabel: "A", standalone: { title: "T", source: "S" } });
    expect(file).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(file).toContain("<title>A</title>");
    expect(file).not.toContain("data-readout");
  });
});

describe("line chart", () => {
  it("spreads close labels apart and keeps them in range", () => {
    expect(spreadLabels([100, 102, 300], 18, 0, 400)).toEqual([100, 118, 300]);
    const out = spreadLabels([395, 398], 18, 0, 400);
    expect(out[1] - out[0]).toBeGreaterThanOrEqual(18);
    expect(Math.max(...out)).toBeLessThanOrEqual(400);
  });

  it("renders a legend and end labels on the wide size only", () => {
    const series = [
      { id: "a", name: "Alpha", colour: "#2a78d6", points: [{ year: 2000, value: 0 }, { year: 2001, value: -1 }] },
      { id: "b", name: "Beta", colour: "#eb6834", points: [{ year: 2000, value: 0 }, { year: 2001, value: -1.1 }] },
    ];
    const wide = renderLineChart({ lang: "en", size: "wide", series, axisLabel: "m", ariaLabel: "x", decimals: 1 });
    expect(wide).toContain(">Alpha −1.0<");
    const narrow = renderLineChart({ lang: "en", size: "narrow", series, axisLabel: "m", ariaLabel: "x", decimals: 1 });
    expect(narrow).not.toContain("Alpha −");
    expect(narrow).toContain(">Alpha<");
  });
});

describe("figures", async () => {
  const { assertConsecutive, buildFigure, figureAnchor, figureFiles, formatSize } = await import("../figures");
  const data = parseProcessedCsv(processed);
  const ctx = { lang: "en", data, accent: "#005A8C", sourceShort: "S", sourceIds: ["doi:10.5904/x"] };
  const base = { chapter: "chapter-1", section: "1.2", source: ["k"], title: "T", caption: "C", alt: "A", longDescription: "L" };

  it("names files and anchors", () => {
    expect(figureAnchor("1.2")).toBe("figure-1-2");
    expect(figureFiles("fig-1-1", "fr")).toEqual({ svg: "fig-1-1-fr.svg", png: "fig-1-1-fr.png", csv: "fig-1-1.csv" });
    expect(formatSize("en", 500)).toBe("1 KB");
    expect(formatSize("en", 3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("builds a bar figure: table, slider, plain CSV with a source column", () => {
    const b = buildFigure({ ...base, id: "fig-1-1", number: "1.1", chartType: "bars", measure: "gt", series: ["global"] }, ctx);
    expect(b.table.rows[47]).toEqual(["2023", "−555.5", "133.3"]);
    expect(b.slider?.years.length).toBe(50);
    const lines = b.csv.trim().split("\n");
    expect(lines[0]).toBe("year,series,mass_change_gt,uncertainty_1sigma_gt,uncertainty_95_gt,source");
    expect(lines[48]).toBe("2023,global,-555.494,68.007,133.294,doi:10.5904/x");
    expect(() => buildFigure({ ...base, id: "x", number: "1.1", chartType: "bars", measure: "gt", series: ["global", "CEU"] }, ctx)).toThrow(/exactly one/);
  });

  it("builds a cumulative figure from the annual values", () => {
    const b = buildFigure({ ...base, id: "fig-1-2", number: "1.2", chartType: "cumulative-lines", measure: "mwe", series: ["CEU", "ASC"] }, ctx);
    expect(b.table.columns).toEqual(["Hydrological year", "Central Europe (m w.e.)", "Central Asia (m w.e.)"]);
    expect(b.table.rows[49]).toEqual(["2025", "−29.18", "−11.54"]);
    expect(b.csv.split("\n")[0]).toBe("year,CEU_mwe,CEU_cumulative_mwe,ASC_mwe,ASC_cumulative_mwe,source");
    expect(b.slider).toBeUndefined();
  });

  it("rejects gaps in the years", () => {
    expect(() => assertConsecutive([2000, 2001, 2003], "f")).toThrow(/2001 is followed by 2003/);
  });
});

describe("edge cases", () => {
  it("rejects a bad processed file and handles an empty span", () => {
    expect(() => parseProcessedCsv("a,b\n")).toThrow(/unexpected header/);
    expect(() => parseProcessedCsv("series,year,area_km2,mwe,mwe_sigma,gt,gt_sigma\nx,1976,a,1,1,1,1\n")).toThrow(/bad line/);
    expect(niceStep(0, 5)).toBe(1);
  });
});

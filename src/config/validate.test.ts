import { describe, expect, it } from "vitest";
import raw from "../../report.config.json";
import { validateReportConfig } from "./validate";

const known = ["en", "fr", "ar"];
const clone = () => structuredClone(raw) as Record<string, any>;

describe("validateReportConfig", () => {
  it("accepts the shipped configuration", () => {
    const cfg = validateReportConfig(raw, known);
    expect(cfg.basePath).toBe("/mountain-report");
    expect(cfg.languages).toHaveLength(3);
    expect(cfg.chapters.map((c) => c.id)).toEqual(["chapter-1", "chapter-2", "chapter-3"]);
  });

  it("accepts an empty chapter list and lower-case colours", () => {
    const c = clone();
    c.chapters = [];
    c.accentColour = "#00aa8c";
    expect(() => validateReportConfig(c, known)).not.toThrow();
  });

  it("rejects input that is not an object", () => {
    expect(() => validateReportConfig(null, known)).toThrow(/JSON object/);
    expect(() => validateReportConfig([], known)).toThrow(/JSON object/);
    expect(() => validateReportConfig("x", known)).toThrow(/JSON object/);
  });

  it("lists every missing field", () => {
    expect(() => validateReportConfig({}, known)).toThrow(/"id".*\n.*"site"|"id"/s);
    try {
      validateReportConfig({}, known);
    } catch (e) {
      const msg = (e as Error).message;
      for (const f of ['"id"', '"site"', '"basePath"', '"accentColour"', '"languages"', '"chapters"']) expect(msg).toContain(f);
    }
  });

  it.each(["mountain-report", "/mountain-report/", "/", ""])("rejects basePath %j", (basePath) => {
    const c = clone();
    c.basePath = basePath;
    expect(() => validateReportConfig(c, known)).toThrow(/basePath/);
  });

  it.each(["#FFF", "005A8C", "#005A8", "#GGGGGG", "red", 5])("rejects accentColour %j", (colour) => {
    const c = clone();
    c.accentColour = colour;
    expect(() => validateReportConfig(c, known)).toThrow(/accentColour/);
  });

  it("rejects a language without a translation file", () => {
    expect(() => validateReportConfig(raw, ["en", "fr"])).toThrow(/language "ar" has no translation file/);
  });

  it("rejects duplicate language codes, bad dir and bad scope", () => {
    const c = clone();
    c.languages.push({ code: "fr", dir: "up", scope: "half" });
    const msg = (() => {
      try {
        validateReportConfig(c, known);
      } catch (e) {
        return (e as Error).message;
      }
      return "";
    })();
    expect(msg).toContain('duplicate language code "fr"');
    expect(msg).toContain('"dir"');
    expect(msg).toContain('"scope"');
  });

  it("requires exactly one default language, with full scope", () => {
    const none = clone();
    delete none.languages[0].default;
    expect(() => validateReportConfig(none, known)).toThrow(/exactly one language/);
    const two = clone();
    two.languages[1].default = true;
    expect(() => validateReportConfig(two, known)).toThrow(/exactly one language/);
    const summaryDefault = clone();
    summaryDefault.languages[0].default = false;
    summaryDefault.languages[2].default = true;
    expect(() => validateReportConfig(summaryDefault, known)).toThrow(/default language must have scope/);
  });

  it("requires titles for full languages only", () => {
    const c = clone();
    delete c.title.fr;
    expect(() => validateReportConfig(c, known)).toThrow(/title\.fr is missing/);
    delete c.shortTitle.en;
    expect(() => validateReportConfig(c, known)).toThrow(/shortTitle\.en is missing/);
    const ok = clone();
    expect(ok.title.ar).toBeUndefined();
    expect(() => validateReportConfig(ok, known)).not.toThrow();
  });

  it("rejects duplicate chapter ids and bad chapter numbers", () => {
    const dup = clone();
    dup.chapters.push({ id: "chapter-1", number: 4 });
    expect(() => validateReportConfig(dup, known)).toThrow(/duplicate chapter id "chapter-1"/);
    const bad = clone();
    bad.chapters[0].number = 0;
    expect(() => validateReportConfig(bad, known)).toThrow(/positive integer/);
    const frac = clone();
    frac.chapters[0].number = 1.5;
    expect(() => validateReportConfig(frac, known)).toThrow(/positive integer/);
  });

  it("rejects an invalid or slash-terminated site", () => {
    const c = clone();
    c.site = "not a url";
    expect(() => validateReportConfig(c, known)).toThrow(/"site"/);
    c.site = "https://pinecone.lu/";
    expect(() => validateReportConfig(c, known)).toThrow(/must not end/);
  });
});

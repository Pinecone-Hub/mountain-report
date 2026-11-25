import { describe, expect, it } from "vitest";
import { defaultLanguage, fullLanguages, languageConfig, report, reportTitle } from "./report";

describe("languageConfig", () => {
  it("returns the configuration of a known language", () => {
    expect(languageConfig("fr")).toMatchObject({ code: "fr", dir: "ltr", scope: "full" });
    expect(languageConfig("ar")).toMatchObject({ code: "ar", dir: "rtl", scope: "summary" });
  });

  it("throws on an unknown or empty language", () => {
    expect(() => languageConfig("xx")).toThrow(/Unknown language "xx"/);
    expect(() => languageConfig("")).toThrow(/Unknown language/);
  });
});

describe("reportTitle", () => {
  it("returns the localised title", () => {
    expect(reportTitle("en")).toBe(report.title.en);
    expect(reportTitle("fr")).toBe(report.title.fr);
  });

  it("throws when the language has no title", () => {
    expect(() => reportTitle("ar")).toThrow(/no title for language "ar"/);
    expect(() => reportTitle("xx")).toThrow(/no title/);
  });
});

describe("derived language lists", () => {
  it("exposes the default and the full-scope languages", () => {
    expect(defaultLanguage.code).toBe("en");
    expect(fullLanguages.map((l) => l.code)).toEqual(["en", "fr"]);
  });
});

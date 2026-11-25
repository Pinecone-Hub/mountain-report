import { describe, expect, it } from "vitest";
import { languageCodes, t, tf } from "./index";

describe("t", () => {
  it("returns the English and French strings", () => {
    expect(t("en", "site.underConstruction")).toBe("Site under construction.");
    expect(t("fr", "site.underConstruction")).toBe("Site en construction.");
  });

  it("throws on a key missing for the language", () => {
    expect(() => t("ar", "site.underConstruction")).toThrow(/Missing translation key/);
  });

  it("throws on an unknown language", () => {
    expect(() => t("xx", "site.underConstruction")).toThrow(/Missing translation key/);
  });
});

describe("languageCodes", () => {
  it("lists the languages with a translation file", () => {
    expect(languageCodes).toEqual(["en", "fr", "ar"]);
  });
});

describe("tf", () => {
  it("fills placeholders", () => {
    expect(tf("en", "chapter.label", { number: 2 })).toBe("Chapter 2");
    expect(tf("fr", "chapter.label", { number: "3" })).toBe("Chapitre 3");
  });

  it("throws when a value is missing", () => {
    expect(() => tf("en", "chapter.label", {})).toThrow(/Missing value "number"/);
  });

  it("throws on a missing key", () => {
    expect(() => tf("ar", "chapter.label", { number: 1 })).toThrow(/Missing translation key/);
  });
});

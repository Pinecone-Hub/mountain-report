import { describe, expect, it } from "vitest";
import { reportPageTitle } from "./page-titles";

describe("reportPageTitle", () => {
  it("gives the Summary title", () => {
    expect(reportPageTitle("en", "summary")).toBe("Summary");
  });

  it("gives chapter titles with the chapter pattern, in the page language", () => {
    expect(reportPageTitle("en", "chapter-1")).toBe("Chapter 1: Glacier retreat");
    expect(reportPageTitle("fr", "chapter-2")).toBe("Chapitre 2 : Aléas");
  });

  it("throws for an unknown page", () => {
    expect(() => reportPageTitle("en", "chapter-99")).toThrow(/No report page/);
    expect(() => reportPageTitle("en", "")).toThrow(/No report page/);
  });
});

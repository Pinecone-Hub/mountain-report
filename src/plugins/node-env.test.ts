import { describe, expect, it } from "vitest";
import { createNodeEnv } from "./node-env";

describe("createNodeEnv", () => {
  const env = createNodeEnv();

  it("takes the base and chapters from report.config.json", () => {
    expect(env.base).toBe("/mountain-report/");
    expect(env.chapters.map((c) => c.number)).toEqual([1, 2, 3]);
  });

  it("reads the sections of a language that has content", () => {
    const sections = env.sections("en");
    expect(sections.has("1.2")).toBe(true);
    expect(sections.has("A.1")).toBe(true);
    expect(sections.has("9.9")).toBe(false);
  });

  it("falls back to the default language for a language without content folder", () => {
    expect([...env.sections("fr")].sort()).toEqual([...env.sections("en")].sort());
    expect([...env.sections("xx")].sort()).toEqual([...env.sections("en")].sort());
  });

  it("knows the references", () => {
    expect(env.references.get("zemp2026")?.type).toBe("article");
    expect(env.references.has("nokey")).toBe(false);
  });

  it("looks up glossary entries as plain text", () => {
    const entry = env.glossaryEntry("en", "Likelihood");
    expect(entry).toContain("probability");
    expect(entry).not.toMatch(/[*@[\]]/);
    expect(env.glossaryEntry("en", "No such term")).toBeUndefined();
  });

  it("has no glossary for a language without content", () => {
    expect(env.glossaryEntry("fr", "Likelihood")).toBeUndefined();
  });

  it("formats dates in the page language", () => {
    expect(env.formatDate("en", "2026-11-25")).toBe("25 November 2026");
    expect(env.formatDate("fr", "2026-11-25")).toBe("25 novembre 2026");
  });

  it("returns an invalid date unchanged", () => {
    expect(env.formatDate("en", "not a date")).toBe("not a date");
    expect(env.formatDate("en", "")).toBe("");
  });

  it("translates through the i18n files", () => {
    expect(env.t("en", "references.title")).toBe("References");
    expect(env.tf("fr", "cite.label", { number: 2 })).toBe("Référence 2");
    expect(() => env.t("en", "no.such.key")).toThrow(/Missing translation key/);
  });
});

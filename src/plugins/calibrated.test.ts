import { describe, expect, it } from "vitest";
import { calibratedPlugin, tooltipFor } from "./calibrated";
import { GLOSSARY_FILE, render, testEnv } from "./test-env";

describe("tooltipFor", () => {
  it("builds the label and text from the glossary entry", () => {
    expect(tooltipFor("confidence", "en", testEnv())).toEqual({
      anchor: "confidence",
      label: "IPCC calibrated language: confidence",
      text: "IPCC reports state their confidence in a finding.",
    });
  });

  it("throws when the glossary has no entry", () => {
    expect(() => tooltipFor("evidence", "en", testEnv({ glossaryEntry: () => undefined }))).toThrow(/no entry "Evidence"/);
  });
});

describe("calibratedPlugin", () => {
  const plugins = () => [calibratedPlugin(testEnv())];

  it("turns a listed term into a glossary link with a described tooltip", () => {
    const html = render("It is *very likely* so.", plugins());
    expect(html).toContain('<a href="/mr/en/glossary/#likelihood" class="calibrated-term" aria-describedby="calibrated-tip-1"><em>very likely</em></a>');
    expect(html).toContain('role="tooltip" id="calibrated-tip-1"');
    expect(html).toContain("IPCC calibrated language: likelihood");
    expect(html).toContain("The IPCC terms for the assessed probability of an outcome.");
  });

  it("maps confidence, evidence and agreement combinations to glossary anchors", () => {
    expect(render("*high confidence*", plugins())).toContain("/glossary/#confidence");
    expect(render("*robust evidence*", plugins())).toContain("/glossary/#evidence");
    expect(render("*high agreement*", plugins())).toContain("/glossary/#evidence");
    expect(render("*medium evidence, high agreement*", plugins())).toContain("/glossary/#evidence");
  });

  it("gives every tooltip on a page its own id", () => {
    const html = render("*likely* and *unlikely*", plugins());
    expect(html).toContain('id="calibrated-tip-1"');
    expect(html).toContain('id="calibrated-tip-2"');
  });

  it("leaves other italics plain", () => {
    expect(render("A *glacier* word.", plugins())).toBe("<p>A <em>glacier</em> word.</p>\n");
    expect(render("*very likely cause*", plugins())).not.toContain("calibrated");
    expect(render("*confidence*", plugins())).not.toContain("calibrated");
  });

  it("does nothing on the glossary page", () => {
    expect(render("*very likely*", plugins(), GLOSSARY_FILE)).toBe("<p><em>very likely</em></p>\n");
  });

  it("does nothing for a language without a term list", () => {
    expect(render("*very likely*", plugins(), "file:///p/src/content/pages/fr/summary.md")).not.toContain("calibrated");
  });

  it("handles empty input and fails clearly when the glossary entry is missing", () => {
    expect(render("", plugins())).toBe("");
    expect(() => render("*likely*", [calibratedPlugin(testEnv({ glossaryEntry: () => undefined }))])).toThrow(/chapter-1\.md: calibrated term/);
  });
});

describe("calibrated terms in a summary-scope language", () => {
  const ARABIC_SUMMARY = "file:///project/src/content/pages/ar/summary.md";

  it("leaves italics plain when the language has no term list (no error)", () => {
    const html = render("This is *very likely* true.", [calibratedPlugin(testEnv())], ARABIC_SUMMARY);
    expect(html).toContain("<em>very likely</em>");
    expect(html).not.toContain("calibrated-term");
  });
});

import { describe, expect, it } from "vitest";
import { figureDescription, figurePlaceholderPlugin } from "./figure-placeholder";
import { render, testEnv } from "./test-env";

describe("figureDescription", () => {
  it("returns the text after the marker", () => {
    expect(figureDescription("TODO_FIGURE: Annual mass change.")).toBe("Annual mass change.");
    expect(figureDescription("TODO_FIGURE:")).toBe("");
  });

  it("ignores other text", () => {
    expect(figureDescription("A normal paragraph.")).toBeUndefined();
    expect(figureDescription("See TODO_FIGURE: later")).toBeUndefined();
    expect(figureDescription("")).toBeUndefined();
  });
});

describe("figurePlaceholderPlugin", () => {
  const plugins = () => [figurePlaceholderPlugin(testEnv())];

  it("renders only the label, without the marker or the description", () => {
    const html = render("Before.\n\nTODO_FIGURE: Annual mass change.\n\nAfter.", plugins());
    expect(html).toContain('<div class="figure-placeholder"><p class="figure-placeholder-label">Figure in preparation</p></div>');
    expect(html).not.toContain("Annual mass change");
    expect(html).not.toContain("TODO_FIGURE");
    expect(html).toContain("<p>Before.</p>");
  });

  it("uses the page language", () => {
    expect(render("TODO_FIGURE: Texte.", plugins(), "file:///p/src/content/fr/summary.md")).toContain("Figure en préparation");
  });

  it("leaves ordinary paragraphs and empty input alone", () => {
    expect(render("Plain.", plugins())).toBe("<p>Plain.</p>\n");
    expect(render("", plugins())).toBe("");
  });
});

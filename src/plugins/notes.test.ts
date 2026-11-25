import { describe, expect, it } from "vitest";
import { citationsPlugin } from "./citations";
import { notesPlugin } from "./notes";
import { render, testEnv } from "./test-env";

const MD = "Sentence one.[^p] Sentence two.[^q] Again.[^p2]\n\n[^p]: First note [@a2025].\n\n[^q]: Second note.\n\n[^p2]: Third.\n";

describe("notesPlugin", () => {
  const plugins = () => [notesPlugin(testEnv())];

  it("renders a visible Notes heading in the page language", () => {
    const en = render(MD, plugins());
    expect(en).toContain('<h2 class="notes-title" id="notes">Notes</h2>');
    expect(en).not.toContain("sr-only");
    const fr = render(MD, plugins(), "file:///p/src/content/pages/fr/summary.md");
    expect(fr).toContain('<h2 class="notes-title" id="notes">Notes</h2>');
  });

  it("labels note markers and back-links from the translation files", () => {
    const en = render(MD, plugins());
    expect(en).toContain('aria-label="Note 1"');
    expect(en).toContain('aria-label="Note 2"');
    expect(en).toContain('aria-label="Back to note 1, occurrence 1"');
    expect(en).toContain('aria-label="Back to note 2, occurrence 1"');
    const fr = render(MD, plugins(), "file:///p/src/content/pages/fr/summary.md");
    expect(fr).toContain('aria-label="Retour à la note 1, occurrence 1"');
    expect(fr).not.toContain("Back to");
  });

  it("works with citations inside notes, and keeps Notes and References separate", () => {
    const html = render(MD, [notesPlugin(testEnv()), citationsPlugin(testEnv())]);
    expect(html).toContain('<a href="#ref-1" id="cite-1-1"');
    expect(html.indexOf('id="notes"')).toBeLessThan(html.indexOf('id="references"'));
    expect(html).toContain("Alpha, A. (2025). First. Journal.");
  });

  it("does nothing for a page without notes", () => {
    expect(render("Plain.", plugins())).toBe("<p>Plain.</p>\n");
    expect(render("", plugins())).toBe("");
  });

  it("shows the arrow alone for one reference and letters for several", () => {
    const single = render(MD, plugins());
    expect(single).toContain('aria-label="Back to note 2, occurrence 1" class="data-footnote-backref">↩︎</a>');
    const html = render("A.[^n] B.[^n]\n\n[^n]: Shared note.\n", plugins());
    expect(html).toContain('aria-label="Back to note 1, occurrence 1" class="data-footnote-backref">↩︎<sup>a</sup></a>');
    expect(html).toContain('aria-label="Back to note 1, occurrence 2" class="data-footnote-backref">↩︎<sup>b</sup></a>');
  });
});

import { describe, expect, it } from "vitest";
import { headingIdsPlugin, IdAllocator } from "./heading-ids";
import { render } from "./test-env";

describe("IdAllocator", () => {
  it("builds ids from section numbers and letters", () => {
    const a = new IdAllocator();
    expect(a.next("1.2 Title")).toBe("section-1-2");
    expect(a.next("1.3.1 Deep")).toBe("section-1-3-1");
    expect(a.next("A. Glacier retreat")).toBe("a");
    expect(a.next("A.1")).toBe("a-1");
  });

  it("slugs unnumbered headings and keeps ids unique", () => {
    const a = new IdAllocator();
    expect(a.next("Likelihood")).toBe("likelihood");
    expect(a.next("Likelihood")).toBe("likelihood-2");
    expect(a.next("Likelihood")).toBe("likelihood-3");
  });

  it("never takes the reserved ids", () => {
    const a = new IdAllocator();
    expect(a.next("References")).toBe("references-2");
    expect(a.next("Notes")).toBe("notes-2");
  });

  it("respects ids that are already claimed", () => {
    const a = new IdAllocator([]);
    a.claim("x");
    expect(a.next("X")).toBe("x-2");
  });
});

describe("headingIdsPlugin", () => {
  it("sets ids on headings in a page", () => {
    const html = render("## 1.1 One\n\n### 1.1.1 Two\n\n## Same\n\n## Same\n", [headingIdsPlugin()]);
    expect(html).toContain('<h2 id="section-1-1">1.1 One</h2>');
    expect(html).toContain('<h3 id="section-1-1-1">');
    expect(html).toContain('<h2 id="same">');
    expect(html).toContain('<h2 id="same-2">');
  });

  it("starts again for each page", () => {
    const first = render("## Same\n", [headingIdsPlugin()]);
    const second = render("## Same\n", [headingIdsPlugin()]);
    expect(first).toContain('id="same"');
    expect(second).toContain('id="same"');
  });

  it("handles empty input", () => {
    expect(render("", [headingIdsPlugin()])).toBe("");
  });
});

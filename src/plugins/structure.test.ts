import { describe, expect, it } from "vitest";
import { structurePlugin } from "./structure";
import { GLOSSARY_FILE, SUMMARY, render, testEnv } from "./test-env";
import { citationsPlugin } from "./citations";
import { headingIdsPlugin } from "./heading-ids";

const FAQ = "file:///project/src/content/pages/en/faq.md";
const plugins = () => [headingIdsPlugin(), structurePlugin(testEnv())];

describe("structurePlugin on the Summary", () => {
  const md = "## A. One\n\nHeadline A.\n\n### A.1\n\nPoint.\n\n### A.2\n\nPoint two.\n\n## B. Two\n\nHeadline B.\n\n### B.1\n\nOnly one.\n\n## C. Three\n\nNo sub-points.\n";

  it("keeps the headline outside and puts sub-points in an open details", () => {
    const html = render(md, plugins(), SUMMARY);
    expect(html).toContain('<h2 id="a">A. One</h2>\n<p>Headline A.</p>\n<details open class="subpoints"><summary>Supporting statements A.1 to A.2</summary><h3 id="a-1">A.1</h3>');
    expect(html).toContain("<summary>Supporting statement B.1</summary>");
    expect(html.match(/<details/g)).toHaveLength(2);
  });

  it("keeps the References section outside the details", () => {
    const html = render(md.replace("Point two.", "Point two [@a2025]."), [...plugins(), citationsPlugin(testEnv())], SUMMARY);
    expect(html.indexOf("</details>")).toBeLessThan(html.indexOf('<section class="references"'));
  });

  it("handles empty input", () => {
    expect(render("", plugins(), SUMMARY)).toBe("");
  });
});

describe("structurePlugin on the FAQ", () => {
  it("wraps each question in a closed details with the heading inside the summary", () => {
    const html = render("## Why?\n\nBecause.\n\n## How?\n\nLike this.\n", plugins(), FAQ);
    expect(html).toContain('<details class="faq-item"><summary><h2 id="why">Why?</h2>');
    expect(html).toContain("Because.");
    expect(html.match(/<details/g)).toHaveLength(2);
    expect(html).not.toContain("<details open");
  });
});

describe("structurePlugin on the Glossary", () => {
  it("ends every entry with a link back to the index", () => {
    const html = render("## Alpha\n\nA.\n\n## Beta\n\nB.\n", plugins(), GLOSSARY_FILE);
    expect(html.match(/class="back-to-top"/g)).toHaveLength(2);
    expect(html).toContain('<a href="#glossary-index">Back to the index</a>');
  });
});

describe("structurePlugin elsewhere", () => {
  it("leaves other pages alone", () => {
    expect(render("## 1.1 A\n\n### 1.1.1 B\n\nText.\n", plugins())).not.toContain("<details");
  });
});

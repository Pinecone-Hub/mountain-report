import { describe, expect, it } from "vitest";
import { fillTemplate, parseExcerpt, queryFromSearch } from "./search-excerpt";

describe("parseExcerpt", () => {
  it("splits marked and plain text", () => {
    expect(parseExcerpt("Glaciers <mark>retreat</mark> fast, <mark>very</mark> fast.")).toEqual([
      { text: "Glaciers ", mark: false },
      { text: "retreat", mark: true },
      { text: " fast, ", mark: false },
      { text: "very", mark: true },
      { text: " fast.", mark: false },
    ]);
  });
  it("never keeps other tags and decodes entities as text", () => {
    expect(parseExcerpt('a <script>alert(1)</script> &lt;b&gt; &amp; <mark class="x">c</mark>')).toEqual([
      { text: "a alert(1) <b> & ", mark: false },
      { text: "c", mark: true },
    ]);
  });
  it("handles empty input and an unclosed mark", () => {
    expect(parseExcerpt("")).toEqual([]);
    expect(parseExcerpt("x <mark>y")).toEqual([
      { text: "x ", mark: false },
      { text: "y", mark: true },
    ]);
  });
});

describe("queryFromSearch and fillTemplate", () => {
  it("reads and trims q", () => {
    expect(queryFromSearch("?q=%20ice%20")).toBe("ice");
    expect(queryFromSearch("")).toBe("");
    expect(queryFromSearch("?x=1")).toBe("");
  });
  it("fills known placeholders only", () => {
    expect(fillTemplate("{count} for {query} {other}", { count: 2, query: "ice" })).toBe("2 for ice {other}");
  });
});

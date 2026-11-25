import { describe, expect, it } from "vitest";
import { pageUrl } from "./urls";

describe("pageUrl", () => {
  it("builds the language home and sub-pages under the base", () => {
    expect(pageUrl("en")).toMatch(/^\/(.*\/)?en\/$/);
    expect(pageUrl("fr", "about")).toMatch(/fr\/about\/$/);
  });
  it("adds a hash after the trailing slash", () => {
    expect(pageUrl("en", "about", "sources")).toMatch(/en\/about\/#sources$/);
  });
});

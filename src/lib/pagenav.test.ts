import { describe, expect, it } from "vitest";
import { neighbours, pageSequence } from "./pagenav";

describe("pageSequence and neighbours", () => {
  const seq = pageSequence(["chapter-1", "chapter-2", "chapter-3"]);

  it("starts with the summary", () => {
    expect(seq).toEqual(["summary", "chapter-1", "chapter-2", "chapter-3"]);
  });

  it("gives both neighbours in the middle", () => {
    expect(neighbours(seq, "chapter-2")).toEqual({ previous: "chapter-1", next: "chapter-3" });
  });

  it("has no previous for the first and no next for the last page", () => {
    expect(neighbours(seq, "summary")).toEqual({ previous: undefined, next: "chapter-1" });
    expect(neighbours(seq, "chapter-3")).toEqual({ previous: "chapter-2", next: undefined });
  });

  it("handles a page outside the sequence and a report without chapters", () => {
    expect(neighbours(seq, "faq")).toEqual({});
    expect(neighbours(pageSequence([]), "summary")).toEqual({ previous: undefined, next: undefined });
  });
});

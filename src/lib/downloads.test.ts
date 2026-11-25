import { describe, expect, it } from "vitest";
import { fileFormat, formatIsoDate, groupDownloads, type DownloadKind } from "./downloads";

const item = (title: string, kind: DownloadKind, date = "2026-11-25", chapter?: string) => ({ title, kind, date, chapter });
const chapters = ["chapter-1", "chapter-2", "chapter-3"];

describe("groupDownloads", () => {
  it("groups by kind and orders chapters by the chapter list", () => {
    const g = groupDownloads(
      [item("C3", "chapter", undefined, "chapter-3"), item("Extra b", "other"), item("Full", "full-report"), item("C1", "chapter", undefined, "chapter-1"), item("Extra a", "other")],
      chapters,
    );
    expect(g.full.map((i) => i.title)).toEqual(["Full"]);
    expect(g.chapters.map((i) => i.title)).toEqual(["C1", "C3"]);
    expect(g.other.map((i) => i.title)).toEqual(["Extra a", "Extra b"]);
  });

  it("puts the newest full report first", () => {
    const g = groupDownloads([item("Old", "full-report", "2026-01-01"), item("New", "full-report", "2026-06-01")], chapters);
    expect(g.full.map((i) => i.title)).toEqual(["New", "Old"]);
  });

  it("returns empty groups for no entries", () => {
    expect(groupDownloads([], chapters)).toEqual({ full: [], chapters: [], other: [] });
  });

  it("throws on a chapter entry with a missing or unknown chapter", () => {
    expect(() => groupDownloads([item("X", "chapter")], chapters)).toThrow(/chapter id/);
    expect(() => groupDownloads([item("X", "chapter", undefined, "chapter-9")], chapters)).toThrow(/chapter-9/);
  });

  it("ignores a chapter id on entries that are not chapters", () => {
    expect(groupDownloads([item("X", "other", undefined, "chapter-9")], chapters).other).toHaveLength(1);
  });
});

describe("fileFormat", () => {
  it("reads the extension, ignoring case", () => {
    expect(fileFormat("media/downloads/a.PDF")).toBe("pdf");
    expect(fileFormat("a.b.csv")).toBe("csv");
    expect(fileFormat("x.png")).toBe("png");
    expect(fileFormat("x.svg")).toBe("svg");
  });
  it("gives other for unknown or no extension", () => {
    expect(fileFormat("a.zip")).toBe("other");
    expect(fileFormat("noextension")).toBe("other");
    expect(fileFormat("")).toBe("other");
  });
});

describe("formatIsoDate", () => {
  it("formats in the language of the page", () => {
    expect(formatIsoDate("en", "2026-11-25")).toBe("25 November 2026");
    expect(formatIsoDate("fr", "2026-11-25")).toBe("25 novembre 2026");
  });
  it("does not shift the day with the time zone", () => {
    expect(formatIsoDate("en", "2026-01-01")).toBe("1 January 2026");
  });
  it("throws on malformed or impossible dates", () => {
    expect(() => formatIsoDate("en", "25/11/2026")).toThrow(/YYYY-MM-DD/);
    expect(() => formatIsoDate("en", "2026-02-30")).toThrow(/real date/);
  });
});

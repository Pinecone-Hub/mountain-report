import { describe, expect, it } from "vitest";
import { buildRepoTree, isEditableFile, repoFilesScript } from "./repo-files";

describe("buildRepoTree", () => {
  it("nests files by path", () => {
    const tree = buildRepoTree([
      { path: "src/content/chapters/en/chapter-1.md", content: "A" },
      { path: "src/content/chapters/en/chapter-2.md", content: "B" },
      { path: "report.config.json", content: "{}" },
    ]);
    expect(tree).toEqual({
      src: { content: { chapters: { en: { "chapter-1.md": { content: "A" }, "chapter-2.md": { content: "B" } } } } },
      "report.config.json": { content: "{}" },
    });
  });

  it("returns an empty tree for no files", () => {
    expect(buildRepoTree([])).toEqual({});
  });

  it("rejects a path that uses a file as a folder", () => {
    expect(() => buildRepoTree([{ path: "a/b.md", content: "x" }, { path: "a/b.md/c.md", content: "y" }])).toThrow(/is a file/);
  });

  it("throws on a duplicate path and on an empty path", () => {
    expect(() => buildRepoTree([{ path: "a.md", content: "x" }, { path: "a.md", content: "y" }])).toThrow(/duplicate/);
    expect(() => buildRepoTree([{ path: "", content: "x" }])).toThrow(/empty path/);
  });
});

describe("isEditableFile", () => {
  it("accepts Markdown, YAML and JSON only", () => {
    for (const p of ["a.md", "a.yml", "a.yaml", "a.json"]) expect(isEditableFile(p)).toBe(true);
    for (const p of ["a.png", "a.pdf", "src/.DS_Store", "a.md.bak"]) expect(isEditableFile(p)).toBe(false);
  });
});

describe("repoFilesScript", () => {
  it("sets window.repoFiles and escapes script-ending text", () => {
    const text = repoFilesScript(buildRepoTree([{ path: "a.md", content: "</script><b>" }]));
    expect(text.startsWith("window.repoFiles = ")).toBe(true);
    expect(text).not.toContain("</script>");
    const json = text.slice("window.repoFiles = ".length, text.indexOf(";\n"));
    expect(JSON.parse(json)).toEqual({ "a.md": { content: "</script><b>" } });
  });

  it("aliases each collection folder as a top-level key that shares the nested object", () => {
    const tree = buildRepoTree([{ path: "src/content/chapters/en/chapter-1.md", content: "A" }]);
    const run = new Function("window", `${repoFilesScript(tree, ["src/content/chapters"])}; return window;`);
    const win = run({}) as { repoFiles: Record<string, any> };
    expect(Object.keys(win.repoFiles)).toEqual(["src", "src/content/chapters"]);
    expect(win.repoFiles["src/content/chapters"].en["chapter-1.md"].content).toBe("A");
    win.repoFiles["src/content/chapters"].en["chapter-2.md"] = { content: "B" };
    expect(win.repoFiles.src.content.chapters.en["chapter-2.md"].content).toBe("B");
  });

  it("throws on an empty folder path", () => {
    expect(() => repoFilesScript({}, [""])).toThrow(/empty path/);
  });
});

import { describe, expect, it } from "vitest";
import raw from "../../report.config.json";
import { validateReportConfig } from "../config/validate";
import { buildCmsConfig, cmsConfigText } from "./cms-config";

const config = validateReportConfig(raw, ["en", "fr", "ar"]);
type Obj = Record<string, any>;
const build = (backend: "github" | "test-repo", c = config) => buildCmsConfig(c, backend) as Obj;
const collection = (cms: Obj, name: string): Obj => cms.collections.find((c: Obj) => c.name === name);

describe("buildCmsConfig backend", () => {
  it("uses the GitHub backend with the OAuth endpoint under the base path", () => {
    const cms = build("github");
    expect(cms.backend).toEqual({
      name: "github",
      repo: "Pinecone-Hub/mountain-report",
      branch: "main",
      base_url: "https://pinecone.lu",
      auth_endpoint: "mountain-report/api/auth",
    });
  });

  it("uses test-repo for the demo, without repository settings", () => {
    expect(build("test-repo").backend).toEqual({ name: "test-repo" });
  });

  it("follows the report configuration, with no fixed literals", () => {
    const other = { ...config, site: "https://example.org", basePath: "/other-report", cms: { repo: "a/b", branch: "dev" } };
    const cms = build("github", other);
    expect(cms.backend).toMatchObject({ repo: "a/b", branch: "dev", base_url: "https://example.org", auth_endpoint: "other-report/api/auth" });
    expect(cms.site_url).toBe("https://example.org/other-report/");
    expect(cms.public_folder).toBe("/other-report/media/images");
    expect(JSON.stringify(cms)).not.toContain("mountain-report");
  });

  it("drops a path of the site URL from base_url", () => {
    expect(build("github", { ...config, site: "https://example.org/x" }).backend.base_url).toBe("https://example.org");
  });
});

describe("buildCmsConfig global settings", () => {
  const cms = build("github");
  it("sets workflow, site URL and media folders", () => {
    expect(cms.publish_mode).toBe("editorial_workflow");
    expect(cms.site_url).toBe("https://pinecone.lu/mountain-report/");
    expect(cms.media_folder).toBe("public/media/images");
    expect(cms.public_folder).toBe("/mountain-report/media/images");
  });
  it("lists only full-scope languages as locales", () => {
    expect(cms.i18n).toEqual({ structure: "multiple_folders", locales: ["en", "fr"], default_locale: "en" });
  });
  it("has the same collections in both backends", () => {
    expect(build("test-repo").collections).toEqual(cms.collections);
    expect(cms.collections.map((c: Obj) => c.name)).toEqual(["pages", "chapters", "figures", "references", "downloads", "settings"]);
  });
  it("serialises as JSON text that parses back", () => {
    expect(JSON.parse(cmsConfigText(config, "github"))).toEqual(JSON.parse(JSON.stringify(cms)));
  });
});

describe("buildCmsConfig collections", () => {
  const cms = build("github");
  it("pages: a folder collection of existing pages (Decap allows multiple_folders only there)", () => {
    const pages = collection(cms, "pages");
    expect(pages).toMatchObject({ folder: "src/content/pages", extension: "md", create: false, delete: false, i18n: true });
    expect(pages.files).toBeUndefined();
    expect(pages.fields.map((f: Obj) => f.name)).toEqual(["title", "description", "video", "body"]);
    const video = pages.fields[2];
    expect(video).toMatchObject({ widget: "object", required: false, i18n: true });
    expect(video.fields.map((f: Obj) => f.name)).toEqual(["url", "title", "publisher"]);
    expect(video.fields.every((f: Obj) => f.required === false && f.i18n === true)).toBe(true);
    const body = pages.fields[3];
    expect(body.widget).toBe("markdown");
    expect(body.hint).toContain("[@key]");
    expect(body.hint).toContain("{1.2}");
    expect(body.hint).toContain("FIGURE: fig-1-1");
  });

  it("chapters: existing entries only, and does not declare lang or id", () => {
    const chapters = collection(cms, "chapters");
    expect(chapters.folder).toBe("src/content/chapters");
    expect(chapters.create).toBe(false);
    const names = chapters.fields.map((f: Obj) => f.name);
    expect(names).toEqual(["title", "description", "chapter", "body"]);
    expect(chapters.fields[2].i18n).toBe("duplicate");
  });

  it("figures: language independent fields duplicate, text fields translated", () => {
    const figures = collection(cms, "figures");
    expect(figures).toMatchObject({ folder: "src/content/figures", extension: "yml", format: "yml", slug: "{{fields.id}}", i18n: true });
    const byName = Object.fromEntries(figures.fields.map((f: Obj) => [f.name, f]));
    for (const name of ["id", "chapter", "number", "section", "chartType", "measure"]) expect(byName[name].i18n).toBe("duplicate");
    // The list widget accepts only a boolean i18n setting (Decap rejects "duplicate").
    for (const name of ["series", "source"]) expect(byName[name].i18n).toBe(true);
    for (const name of ["title", "caption", "alt", "longDescription"]) expect(byName[name].i18n).toBe(true);
    expect(byName.chapter.options.map((o: Obj) => o.value)).toEqual(["chapter-1", "chapter-2", "chapter-3"]);
    expect(byName.number.widget).toBe("string");
    expect(byName.section.widget).toBe("string");
    expect(byName.alt.hint).toContain("250");
  });

  it("figures: replacement files are optional and stored as media/figures/<file>", () => {
    const figures = collection(cms, "figures");
    const replacements = figures.fields.filter((f: Obj) => f.name.startsWith("replacement"));
    expect(replacements.map((f: Obj) => f.label)).toEqual(["Replacement PNG", "Replacement SVG", "Replacement CSV"]);
    for (const f of replacements) {
      expect(f).toMatchObject({ widget: "file", required: false, i18n: true, media_folder: "/public/media/figures", public_folder: "media/figures" });
      expect(f.hint).toBe("Leave empty to use the file generated from the data.");
    }
  });

  it("references: one list of the reference fields, optional ones not required", () => {
    const file = collection(cms, "references").files[0];
    expect(file).toMatchObject({ file: "src/data/references.json", format: "json" });
    const list = file.fields[0];
    expect(list).toMatchObject({ name: "references", widget: "list" });
    const required = list.fields.filter((f: Obj) => f.required !== false).map((f: Obj) => f.name);
    expect(required).toEqual(["key", "type", "authors", "year", "title"]);
  });

  it("downloads: date only, file under public/media/downloads, no size field", () => {
    const downloads = collection(cms, "downloads");
    expect(downloads).toMatchObject({ folder: "src/content/downloads", extension: "yml", format: "yml" });
    expect(downloads.i18n).toBeUndefined();
    const byName = Object.fromEntries(downloads.fields.map((f: Obj) => [f.name, f]));
    expect(Object.keys(byName)).toEqual(["title", "lang", "date", "kind", "chapter", "file"]);
    expect(byName.lang.options).toEqual(["en", "fr", "ar"]);
    expect(byName.date).toMatchObject({ widget: "datetime", format: "YYYY-MM-DD", time_format: false });
    expect(byName.kind.options).toEqual(["full-report", "chapter", "other"]);
    expect(byName.chapter.required).toBe(false);
    expect(byName.file).toMatchObject({ media_folder: "/public/media/downloads", public_folder: "media/downloads" });
    expect(byName.file.hint).toContain("25 MiB");
  });

  it("settings: edits only the fields it declares", () => {
    const file = collection(cms, "settings").files[0];
    expect(file).toMatchObject({ file: "report.config.json", format: "json" });
    expect(file.fields.map((f: Obj) => f.name)).toEqual(["title", "shortTitle", "accentColour", "citation", "authors"]);
    expect(file.fields[0].fields.map((f: Obj) => f.name)).toEqual(["en", "fr"]);
  });

  it("handles a report with no chapters", () => {
    const cms2 = build("github", { ...config, chapters: [] });
    const figures = collection(cms2, "figures");
    expect(figures.fields.find((f: Obj) => f.name === "chapter").options).toEqual([]);
  });
});

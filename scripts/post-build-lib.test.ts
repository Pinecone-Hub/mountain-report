import { describe, expect, it } from "vitest";
import { headersFile, headersHaveNoindex, htaccessFile, redirectsFile, routesJson, siteDirectory, unusedPagefindFiles } from "./post-build-lib";

describe("post-build lib", () => {
  it("writes the routes file for the Functions path", () => {
    expect(JSON.parse(routesJson("/mr"))).toEqual({ version: 1, include: ["/mr/api/*"], exclude: [] });
    expect(JSON.parse(routesJson("/mr/")).include).toEqual(["/mr/api/*"]);
  });
  it("redirects the base root to the default language", () => {
    expect(redirectsFile("/mr", "en")).toBe("/mr/ /mr/en/ 301\n");
    expect(redirectsFile("mr/", "fr")).toBe("/mr/ /mr/fr/ 301\n");
  });
  it("rejects a missing base or a bad language code", () => {
    expect(() => redirectsFile("/", "en")).toThrow();
    expect(() => redirectsFile("/mr", "e n")).toThrow();
  });
  it("names the Pagefind site directory", () => {
    expect(siteDirectory("/mr")).toBe("dist/mr");
  });
});

describe("unusedPagefindFiles", () => {
  it("lists the interface and highlight files only", () => {
    expect(unusedPagefindFiles(["pagefind.js", "pagefind-worker.js", "pagefind-ui.js", "pagefind-ui.css", "pagefind-component-ui.js", "pagefind-modular-ui.css", "pagefind-highlight.js", "wasm.en.pagefind", "pagefind-entry.json"])).toEqual([
      "pagefind-ui.js",
      "pagefind-ui.css",
      "pagefind-component-ui.js",
      "pagefind-modular-ui.css",
      "pagefind-highlight.js",
    ]);
    expect(unusedPagefindFiles([])).toEqual([]);
  });
});

describe("headersFile and headersHaveNoindex", () => {
  it("writes the noindex rule for every path and recognises it", () => {
    expect(headersFile()).toBe("/*\n  X-Robots-Tag: noindex\n");
    expect(headersHaveNoindex(headersFile())).toBe(true);
  });
  it("accepts comments, other headers, CRLF and other letter case", () => {
    expect(headersHaveNoindex("# c\r\n/*\r\n  X-Frame-Options: DENY\r\n  x-robots-tag: NOINDEX\r\n")).toBe(true);
  });
  it("rejects a missing file, a rule for another path, another value, or an unindented header", () => {
    expect(headersHaveNoindex("")).toBe(false);
    expect(headersHaveNoindex("/en/*\n  X-Robots-Tag: noindex\n")).toBe(false);
    expect(headersHaveNoindex("/*\n  X-Robots-Tag: all\n")).toBe(false);
    expect(headersHaveNoindex("/*\nX-Robots-Tag: noindex\n")).toBe(false);
    expect(headersHaveNoindex("/*\n  X-Robots-Tag: noindex, nofollow\n")).toBe(false);
  });
});

describe("htaccessFile", () => {
  const text = htaccessFile("/mr", "en");
  it("sets the 404 page, index file and charset from the base", () => {
    expect(text).toContain("ErrorDocument 404 /mr/404.html");
    expect(text).toContain("DirectoryIndex index.html");
    expect(text).toContain("AddDefaultCharset UTF-8");
  });
  it("redirects only the exact root", () => {
    expect(text).toContain("RedirectMatch 301 ^/mr/$ /mr/en/");
    expect(htaccessFile("mr/sub/", "fr")).toContain("RedirectMatch 301 ^/mr/sub/$ /mr/sub/fr/");
  });
  it("sets the MIME types", () => {
    for (const line of ["AddType application/wasm .wasm", ".pf_meta .pf_index .pf_fragment .pagefind", "AddType text/csv .csv", "AddType image/svg+xml .svg"]) expect(text).toContain(line);
  });
  it("caches hashed assets for a year and revalidates pages", () => {
    expect(text).toContain("immutable");
    expect(text).toContain("^/mr/_astro/");
    expect(text).toContain('Header set Cache-Control "no-cache"');
  });
  it("guards every module block", () => {
    for (const mod of ["mod_alias.c", "mod_mime.c", "mod_headers.c"]) expect(text).toContain(`<IfModule ${mod}>`);
    expect((text.match(/<IfModule/g) ?? []).length).toBe((text.match(/<\/IfModule>/g) ?? []).length);
  });
  it("has no em-dash and rejects a bad base or language", () => {
    expect(text).not.toContain("\u2014");
    expect(() => htaccessFile("/", "en")).toThrow();
    expect(() => htaccessFile("/a b", "en")).toThrow();
    expect(() => htaccessFile("/a/../b", "en")).toThrow();
    expect(() => htaccessFile("/mr", "e n")).toThrow();
  });
});

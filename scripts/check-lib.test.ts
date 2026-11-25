import { describe, expect, it } from "vitest";
import {
  checkContrastPairs,
  checkDistPath,
  CONTRAST_PAIRS,
  extractStyleBlocks,
  findPhysicalCssProperties,
  findSuspectEmphasis,
  parseCssHexVariables,
  compareTranslations,
  internalTargets,
  isPagefindOutput,
  missingTargets,
  compareWrangler,
  parseWrangler,
  type Dictionary,
  extractCitationKeys,
  findEmDashes,
  findExternalUrls,
  findFiguresWithoutFigcaption,
  findHardcodedText,
  findImgsWithoutAlt,
  findMarker,
  flattenKeys,
  indexReferences,
  isUrlAllowed,
  isAdminPath,
  findOversizedFiles,
  MAX_FILE_BYTES,
  lineAt,
  parseAttrs,
} from "./check-lib";

import { DECAP_URL } from "../src/lib/decap";

const none = new Set<string>();
const site = { isAdmin: false, referenceHosts: none };
const admin = { isAdmin: true, referenceHosts: none };

describe("parseAttrs", () => {
  it("reads double-quoted, single-quoted and unquoted values", () => {
    expect(parseAttrs('src="a.png" alt=\'A b\' width=10')).toEqual({ src: "a.png", alt: "A b", width: "10" });
  });

  it("reads boolean attributes as empty strings", () => {
    expect(parseAttrs("hidden disabled")).toEqual({ hidden: "", disabled: "" });
  });

  it("returns an empty object for an empty string", () => {
    expect(parseAttrs("")).toEqual({});
  });

  it("lower-cases attribute names but keeps values", () => {
    expect(parseAttrs('ALT="X" Data-Id=Y')).toEqual({ alt: "X", "data-id": "Y" });
  });

  it("keeps > and = inside quoted values", () => {
    expect(parseAttrs('title="a > b" data-x="k=v" alt="ok"')).toEqual({ title: "a > b", "data-x": "k=v", alt: "ok" });
  });
});

describe("images and figures", () => {
  it("flags img without alt, accepts empty alt", () => {
    expect(findImgsWithoutAlt('<img src="a.png">')).toEqual([0]);
    expect(findImgsWithoutAlt('<img src="a.png" alt="">')).toEqual([]);
    expect(findImgsWithoutAlt('<img alt="x" src="a.png"><img src="b">')).toEqual([25]);
    expect(findImgsWithoutAlt("")).toEqual([]);
  });

  it("flags figure without figcaption", () => {
    expect(findFiguresWithoutFigcaption("<figure><img alt=''></figure>")).toEqual([0]);
    expect(findFiguresWithoutFigcaption("<figure><img alt=''><figcaption>c</figcaption></figure>")).toEqual([]);
    expect(findFiguresWithoutFigcaption("<p>no figure</p>")).toEqual([]);
  });
});

describe("translations", () => {
  it("flattens nested and flat keys", () => {
    expect(flattenKeys({ a: { b: "x" }, "c.d": "y" })).toEqual(["a.b", "c.d"]);
    expect(flattenKeys({})).toEqual([]);
    expect(flattenKeys(null)).toEqual([]);
  });

  const dict = (code: string, scope: "full" | "summary", data: unknown, isDefault = false): Dictionary => ({ code, scope, data, isDefault });

  it("passes identical full languages and a valid summary language", () => {
    expect(
      compareTranslations([
        dict("en", "full", { a: "1", "summary.t": "x" }, true),
        dict("fr", "full", { a: "1", "summary.t": "y" }),
        dict("ar", "summary", { "summary.t": "z" }),
      ]),
    ).toEqual([]);
    expect(compareTranslations([dict("en", "full", {}, true), dict("fr", "full", {}), dict("ar", "summary", {})])).toEqual([]);
  });

  it("reports parity gaps both ways", () => {
    const problems = compareTranslations([dict("en", "full", { a: "1", b: "2" }, true), dict("fr", "full", { a: "1", c: "3" })]);
    expect(problems).toHaveLength(2);
  });

  it("lets a summary language use any key of the default language, even a subset", () => {
    expect(compareTranslations([dict("en", "full", { a: "1", b: "2" }, true), dict("ar", "summary", { a: "x" })])).toEqual([]);
  });

  it("reports summary keys missing in the default and empty values", () => {
    expect(compareTranslations([dict("en", "full", { a: "1" }, true), dict("ar", "summary", { "summary.zzz": "x" })])).toHaveLength(1);
    expect(compareTranslations([dict("en", "full", { a: "1" }, true), dict("ar", "summary", { a: "" })])).toHaveLength(1);
    expect(compareTranslations([dict("en", "full", { a: "1" }, true), dict("ar", "summary", { a: "  " })])).toHaveLength(1);
  });

  it("needs a default language", () => {
    expect(compareTranslations([dict("en", "full", {})])).toHaveLength(1);
  });
});

describe("findHardcodedText", () => {
  it("accepts expression-only markup", () => {
    const src = '---\nconst x = "Hello";\n---\n<h1>{t("en", "k")}</h1>\n<a href={u} aria-label={t("en", "k")}>{t("en", "j")}</a>';
    expect(findHardcodedText(src)).toEqual([]);
  });

  it("flags literal text nodes and attributes", () => {
    const hits = findHardcodedText('<h1>Title</h1><img alt="A picture" src="x"><input placeholder="Search" title={t()}>');
    expect(hits.map((h) => h.text)).toEqual(["Title", 'alt="A picture"', 'placeholder="Search"']);
  });

  it("ignores script, style, comments, punctuation and entities", () => {
    const src = "<script>const a = 'Hello world';</script><style>p::before{content:'Hi'}</style><!-- note --><p>{a} - &nbsp; | .</p>";
    expect(findHardcodedText(src)).toEqual([]);
  });

  it("handles nested braces and strings in expressions", () => {
    expect(findHardcodedText('<p>{items.map((i) => { return "}" + i; })}</p>')).toEqual([]);
  });

  it("reports the offset of the text", () => {
    const src = "<p>\n  Hello\n</p>";
    expect(findHardcodedText(src)[0].index).toBe(src.indexOf("Hello"));
  });

  it("handles empty input", () => {
    expect(findHardcodedText("")).toEqual([]);
  });
});

describe("external URLs", () => {
  it("finds URLs and trims trailing punctuation", () => {
    expect(findExternalUrls("see https://doi.org/10.1/x, and (http://a.b/c).").map((u) => u.url)).toEqual([
      "https://doi.org/10.1/x",
      "http://a.b/c",
    ]);
    expect(findExternalUrls("none here")).toEqual([]);
  });

  it("allows the fixed allowlist and sub-domains", () => {
    for (const u of ["https://doi.org/10.1/x", "https://creativecommons.org/licenses/by/4.0/", "https://www.youtube-nocookie.com/embed/x", "https://pinecone.lu/mountain-report/"]) {
      expect(isUrlAllowed(u, site)).toBe(true);
    }
  });

  it("allows XML namespaces", () => {
    expect(isUrlAllowed("http://www.w3.org/2000/svg", site)).toBe(true);
    expect(isUrlAllowed("http://www.sitemaps.org/schemas/sitemap/0.9", site)).toBe(true);
    expect(isUrlAllowed("http://www.w3.org/TR/2000/other", site)).toBe(false);
  });

  it("restricts GitHub and the Decap CDN to admin pages", () => {
    expect(isUrlAllowed("https://api.github.com/user", site)).toBe(false);
    expect(isUrlAllowed("https://api.github.com/user", admin)).toBe(true);
    expect(isUrlAllowed(DECAP_URL, site)).toBe(false);
    expect(isUrlAllowed(DECAP_URL, admin)).toBe(true);
  });

  it("allows only the pinned Decap version on unpkg, and only on admin pages", () => {
    expect(isUrlAllowed("https://unpkg.com/decap-cms@3.0.0/dist/decap-cms.js", admin)).toBe(false);
    expect(isUrlAllowed("https://unpkg.com/decap-cms/dist/decap-cms.js", admin)).toBe(false);
    expect(isUrlAllowed("https://unpkg.com/some-other-package@1.0.0/index.js", admin)).toBe(false);
    expect(isUrlAllowed("https://unpkg.com.evil.example/decap-cms@3.18.0/dist/decap-cms.js", admin)).toBe(false);
    expect(isUrlAllowed("https://github.com.evil.example/x", admin)).toBe(false);
  });

  it("does not allow GitHub on public pages", () => {
    expect(isUrlAllowed("https://github.com/Pinecone-Hub/mountain-report/issues", site)).toBe(false);
    expect(isUrlAllowed("https://github.com/Pinecone-Hub/mountain-report/issues", admin)).toBe(true);
  });

  it("allows video page links only (YouTube watch pages, vimeo.com) and the schema.org identifier", () => {
    expect(isUrlAllowed("https://www.youtube.com/watch?v=abc", site)).toBe(true);
    expect(isUrlAllowed("https://vimeo.com/123456", site)).toBe(true);
    expect(isUrlAllowed("https://www.youtube.com/embed/abc", site)).toBe(false);
    expect(isUrlAllowed("https://www.youtube.com/@channel", site)).toBe(false);
    expect(isUrlAllowed("https://vimeo.com/123456/", site)).toBe(true);
    expect(isUrlAllowed("https://vimeo.com/channels/x", site)).toBe(false);
    expect(isUrlAllowed("https://vimeo.com/123/abc", site)).toBe(false);
    expect(isUrlAllowed("https://vimeo.com/", site)).toBe(false);
    expect(isUrlAllowed("https://vimeo.com/user1", site)).toBe(false);
    expect(isUrlAllowed("https://www.vimeo.com/123456", site)).toBe(false);
    expect(isUrlAllowed("http://vimeo.com/123456", site)).toBe(false);
    expect(isUrlAllowed("https://i.ytimg.com/vi/abc/0.jpg", site)).toBe(false);
    expect(isUrlAllowed("https://schema.org", site)).toBe(true);
    expect(isUrlAllowed("https://schema.org/Report", site)).toBe(false);
  });

  it("allows hosts from the references data only", () => {
    const refs = { isAdmin: false, referenceHosts: new Set(["wgms.ch"]) };
    expect(isUrlAllowed("https://wgms.ch/data", refs)).toBe(true);
    expect(isUrlAllowed("https://example.com/", refs)).toBe(false);
  });

  it("rejects look-alike hosts and malformed URLs", () => {
    expect(isUrlAllowed("https://doi.org.evil.example/x", site)).toBe(false);
    expect(isUrlAllowed("https://notdoi.org/x", site)).toBe(false);
    expect(isUrlAllowed("http://", site)).toBe(false);
  });
});

describe("citations and references", () => {
  it("extracts single and multiple keys, ignoring code fences", () => {
    expect(extractCitationKeys("Text [@a1] and [@b-2; @c_3].")).toEqual(["a1", "b-2", "c_3"]);
    expect(extractCitationKeys("```\n[@hidden]\n```")).toEqual([]);
    expect(extractCitationKeys("Write `[@example]` to cite, and [@real].")).toEqual(["real"]);
    expect(extractCitationKeys("")).toEqual([]);
    expect(extractCitationKeys("an email a@b.c and [link](x)")).toEqual([]);
  });

  it("accepts no data at all", () => {
    expect(indexReferences(undefined)).toEqual({ keys: new Set(), problems: [], hosts: new Set() });
    expect(indexReferences([]).problems).toEqual([]);
  });

  it("indexes an array of references and collects hosts", () => {
    const idx = indexReferences([
      { key: "a", doi: "10.1/x" },
      { key: "b", url: "https://wgms.ch/x" },
    ]);
    expect([...idx.keys]).toEqual(["a", "b"]);
    expect(idx.problems).toEqual([]);
    expect(idx.hosts.has("wgms.ch")).toBe(true);
  });

  it("reads the { references: [...] } file root and reports duplicates in it", () => {
    const wrapped = indexReferences({ references: [{ key: "a", doi: "10.1/x" }, { key: "a", doi: "10.1/y" }] });
    expect(wrapped.keys).toEqual(new Set(["a"]));
    expect(wrapped.problems).toHaveLength(1);
  });

  it("indexes an object keyed by reference key", () => {
    const idx = indexReferences({ a: { doi: "10.1/x" } });
    expect([...idx.keys]).toEqual(["a"]);
  });

  it("reports missing doi and url, missing and duplicate keys, bad shape", () => {
    expect(indexReferences([{ key: "a" }]).problems).toHaveLength(1);
    expect(indexReferences([{ doi: "10.1/x" }]).problems).toHaveLength(1);
    expect(indexReferences([{ key: "a", doi: "1" }, { key: "a", doi: "2" }]).problems).toHaveLength(1);
    expect(indexReferences([{ key: "a", doi: "  " }]).problems).toHaveLength(1);
    expect(indexReferences("oops").problems).toHaveLength(1);
    expect(indexReferences([null]).problems.length).toBeGreaterThan(0);
  });
});

describe("characters, markers and lines", () => {
  it("finds em-dashes", () => {
    expect(findEmDashes("a \u2014 b \u2014")).toEqual([2, 6]);
    expect(findEmDashes("a - b")).toEqual([]);
  });

  it("finds markers", () => {
    expect(findMarker("x TODO_SOURCE y TODO_SOURCE", "TODO_SOURCE")).toEqual([2, 16]);
    expect(findMarker("", "TODO_SOURCE")).toEqual([]);
  });

  it("computes line numbers", () => {
    expect(lineAt("a\nb\nc", 4)).toBe(3);
    expect(lineAt("abc", 0)).toBe(1);
  });
});

describe("checkDistPath", () => {
  const base = "/mountain-report";

  it("accepts files under the base and the allowed root files", () => {
    expect(checkDistPath("mountain-report/en/index.html", base)).toEqual([]);
    for (const f of ["_headers", "_redirects", "_routes.json", "404.html"]) expect(checkDistPath(f, base)).toEqual([]);
  });

  it("rejects other root files and Markdown anywhere", () => {
    expect(checkDistPath("index.html", base)).toHaveLength(1);
    expect(checkDistPath("_astro/a.js", base)).toHaveLength(1);
    expect(checkDistPath("mountain-report/notes.md", base)).toHaveLength(1);
    expect(checkDistPath("README.MD", base)).toHaveLength(2);
  });

  it("follows the configured base", () => {
    expect(checkDistPath("other-report/index.html", "/other-report")).toEqual([]);
    expect(checkDistPath("mountain-report/index.html", "/other-report")).toHaveLength(1);
    expect(checkDistPath("mountain-reportx/index.html", base)).toHaveLength(1);
  });
});

describe("wrangler.toml", () => {
  const config = { site: "https://pinecone.lu", basePath: "/mountain-report" };
  const good = `name = "x"
routes = [
  { pattern = "pinecone.lu/mountain-report*", zone_name = "pinecone.lu" }
]

[vars]
PAGES_ORIGIN = "https://mountain-report.pages.dev"
BASE_PATH = "/mountain-report"
`;

  it("parses and accepts a matching file", () => {
    const info = parseWrangler(good);
    expect(info).toEqual({ basePath: "/mountain-report", pagesOrigin: "https://mountain-report.pages.dev", routes: ["pinecone.lu/mountain-report*"] });
    expect(compareWrangler(info, config)).toEqual([]);
  });

  it("accepts single quotes, comments and [[routes]] tables", () => {
    const toml = `# top comment
[[routes]]
pattern = 'pinecone.lu/mountain-report*' # trailing comment
zone_name = "pinecone.lu"

[vars] # vars
PAGES_ORIGIN = 'https://mountain-report.pages.dev' # adjust
BASE_PATH = "/mountain-report" # must match
`;
    const info = parseWrangler(toml);
    expect(info.routes).toEqual(["pinecone.lu/mountain-report*"]);
    expect(compareWrangler(info, config)).toEqual([]);
  });

  it("keeps a # inside a quoted string", () => {
    expect(parseWrangler('[vars]\nBASE_PATH = "/a#b"').basePath).toBe("/a#b");
  });

  it("ignores BASE_PATH outside [vars]", () => {
    expect(parseWrangler('BASE_PATH = "/x"\n[other]\nBASE_PATH = "/y"').basePath).toBeUndefined();
  });

  it("reports a BASE_PATH mismatch or absence", () => {
    expect(compareWrangler(parseWrangler(good.replace('BASE_PATH = "/mountain-report"', 'BASE_PATH = "/other"')), config)).toHaveLength(1);
    expect(compareWrangler(parseWrangler(good.replace('BASE_PATH = "/mountain-report"', "")), config)).toHaveLength(1);
  });

  it("reports route pattern mismatches: wrong base, missing star, wrong host", () => {
    for (const bad of ["pinecone.lu/other*", "pinecone.lu/mountain-report", "example.com/mountain-report*", "pinecone.lu/mountain-report/*"]) {
      const problems = compareWrangler(parseWrangler(good.replace("pinecone.lu/mountain-report*", bad)), config);
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(bad);
    }
  });

  it("reports missing routes", () => {
    const problems = compareWrangler(parseWrangler('[vars]\nPAGES_ORIGIN = "https://a.pages.dev"\nBASE_PATH = "/mountain-report"'), config);
    expect(problems).toEqual(["no route pattern found in worker/wrangler.toml"]);
  });

  it("reports a missing or non-https PAGES_ORIGIN", () => {
    expect(compareWrangler(parseWrangler(good.replace(/PAGES_ORIGIN.*\n/, "")), config)).toHaveLength(1);
    expect(compareWrangler(parseWrangler(good.replace("https://mountain", "http://mountain")), config)).toHaveLength(1);
  });

  it("handles empty input", () => {
    expect(parseWrangler("")).toEqual({ routes: [] });
    expect(compareWrangler(parseWrangler(""), config).length).toBe(3);
  });
});

describe("design token contrast", () => {
  const good = { text: "#1a1a1a", "text-muted": "#4a4f55", bg: "#ffffff", surface: "#f2f4f6", accent: "#005A8C", focus: "#0b5fc4", "border-strong": "#6b7280" };

  it("reads hex variables and ignores comments", () => {
    const vars = parseCssHexVariables(":root { --bg: #fff; /* --text: #000; */ --text: #1A1A1A; --space-1: 0.25rem; }");
    expect(vars).toEqual({ bg: "#fff", text: "#1A1A1A" });
  });

  it("passes the shipped-style palette", () => {
    expect(checkContrastPairs(good)).toEqual([]);
  });

  it("fails a pair below 4.5:1 for text and below 3:1 for the focus colour", () => {
    const text = checkContrastPairs({ ...good, "text-muted": "#999999" });
    expect(text.some((p) => p.includes("--text-muted") && p.includes("needs 4.5:1"))).toBe(true);
    const focus = checkContrastPairs({ ...good, focus: "#cccccc" });
    expect(focus.some((p) => p.includes("--focus") && p.includes("needs 3:1"))).toBe(true);
  });

  it("reports missing and invalid colours instead of passing", () => {
    const { surface: _surface, ...withoutSurface } = good;
    expect(checkContrastPairs(withoutSurface).some((p) => p.includes("no colour for --surface"))).toBe(true);
    expect(checkContrastPairs({ ...good, text: "red" }).some((p) => p.includes("is not a #RGB"))).toBe(true);
    expect(checkContrastPairs({}).length).toBe(CONTRAST_PAIRS.length);
  });
});

describe("findPhysicalCssProperties", () => {
  it.each([
    "margin-left: 1px",
    "margin-right:1px",
    "padding-left: 0",
    "padding-right: 0",
    "border-left: 1px solid red",
    "border-right-width: 2px",
    "left: 0",
    "right:0",
    "text-align: left",
    "text-align:right",
    "float: left",
    "float:right",
  ])("flags %s", (decl) => {
    expect(findPhysicalCssProperties(`a { ${decl}; }`)).toHaveLength(1);
  });

  it.each([
    "margin-inline-start: 1px",
    "padding-inline: 0",
    "border-inline-start: 1px solid red",
    "inset-inline-start: 0",
    "text-align: start",
    "text-align: center",
    "float: inline-start",
    "border-top-left-radius: 2px",
    "overflow-y: auto",
  ])("allows %s", (decl) => {
    expect(findPhysicalCssProperties(`a { ${decl}; }`)).toEqual([]);
  });

  it("ignores comments and reports the position", () => {
    expect(findPhysicalCssProperties("/* margin-left: 0 */ a { color: red; }")).toEqual([]);
    const hits = findPhysicalCssProperties("a {\n  margin-left: 0;\n}");
    expect(hits[0].property).toBe("margin-left");
    expect(hits[0].index).toBe(6);
  });

  it("handles empty input", () => {
    expect(findPhysicalCssProperties("")).toEqual([]);
  });
});

describe("extractStyleBlocks", () => {
  it("finds style blocks with their offsets", () => {
    const src = "<p>x</p>\n<style>\n  a { left: 0; }\n</style>";
    const blocks = extractStyleBlocks(src);
    expect(blocks).toHaveLength(1);
    expect(src.slice(blocks[0].index, blocks[0].index + 5)).toBe("\n  a ");
  });
  it("returns nothing without a style block", () => {
    expect(extractStyleBlocks("<p>x</p>")).toEqual([]);
  });
});

describe("findSuspectEmphasis", () => {
  it("accepts exact terms and unrelated italics", () => {
    expect(findSuspectEmphasis("It is *very likely* and *high confidence*, a *glacier*.", "en")).toEqual([]);
    expect(findSuspectEmphasis("*medium evidence, high agreement*", "en")).toEqual([]);
  });

  it("warns for italics that only look like a term", () => {
    const hits = findSuspectEmphasis("It is *very likley* and *highly likely* or *confidence*.", "en");
    expect(hits.map((h) => h.text)).toEqual(["highly likely", "confidence"]);
  });

  it("ignores bold, code and fences", () => {
    expect(findSuspectEmphasis("**likely** and `*likely stuff*`\n```\n*likely stuff*\n```\n", "en")).toEqual([]);
  });

  it("checks French italics against the French list", () => {
    expect(findSuspectEmphasis("*très probable*, *degré de confiance élevé*, *moraine*", "fr")).toEqual([]);
    expect(findSuspectEmphasis("*très probablement* et *confiance*", "fr").map((h) => h.text)).toEqual(["très probablement", "confiance"]);
  });

  it("skips languages without a term list and empty input", () => {
    expect(findSuspectEmphasis("*very likely*, *likely stuff*", "de")).toEqual([]);
    expect(findSuspectEmphasis("", "en")).toEqual([]);
  });
});

describe("isAdminPath", () => {
  const base = "/mountain-report";
  it.each([
    "src/pages/admin/index.astro",
    "src/pages/admin/config.yml.ts",
    "src/pages/admin-demo/index.astro",
    "src/pages/admin-demo/repo-files.js.ts",
    "dist/mountain-report/admin/index.html",
    "dist/mountain-report/admin/config.yml",
    "dist/mountain-report/admin-demo/index.html",
    "dist/mountain-report/admin-demo/config.yml",
    "dist/mountain-report/admin-demo/repo-files.js",
    "src/lib/decap.ts",
  ])("%s is admin", (path) => {
    expect(isAdminPath(path, base)).toBe(true);
  });

  it.each([
    "src/pages/admin-guide/index.astro",
    "dist/mountain-report/admin-guide/index.html",
    "dist/mountain-report/en/index.html",
    "src/components/Footer.astro",
    "src/lib/cms-config.ts",
    "dist/mountain-report/en/administration/index.html",
  ])("%s is public", (path) => {
    expect(isAdminPath(path, base)).toBe(false);
  });

  it("works for another base path and for a base of /", () => {
    expect(isAdminPath("dist/other/admin/index.html", "/other")).toBe(true);
    expect(isAdminPath("dist/admin/index.html", "/")).toBe(true);
  });
});

describe("findOversizedFiles", () => {
  it("flags files over 25 MiB only", () => {
    expect(MAX_FILE_BYTES).toBe(26214400);
    const files = [
      { path: "dist/a.pdf", bytes: MAX_FILE_BYTES },
      { path: "dist/b.pdf", bytes: MAX_FILE_BYTES + 1 },
      { path: "dist/c.csv", bytes: 0 },
    ];
    const problems = findOversizedFiles(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("dist/b.pdf");
  });

  it("returns nothing for no files and honours a custom limit", () => {
    expect(findOversizedFiles([])).toEqual([]);
    expect(findOversizedFiles([{ path: "x", bytes: 11 }], 10)).toHaveLength(1);
  });
});

describe("internal links", () => {
  const html =
    '<a href="/mr/en/about/#sources">a</a><a href="/mr/en/faq/?x=1">b</a><img src="/mr/x.png"><a href="https://example.org/mr/">e</a>' +
    '<link rel="alternate" href="https://site.test/mr/fr/"><a href="mailto:a@b.c">m</a><a href="#top">t</a><a href="/other/">o</a>' +
    '<a href="/mr/api/auth">api</a><a href="relative/">r</a><a href="//cdn.test/mr/">p</a><a href="/mr">root</a>' +
    '<script>var s = \'<a href="/mr/skipped/">\';</script><!-- <a href="/mr/comment/"> -->';

  it("collects paths under the base without fragments and queries", () => {
    expect(internalTargets(html, "/mr", "https://site.test").sort()).toEqual(["/mr", "/mr/en/about/", "/mr/en/faq/", "/mr/fr/", "/mr/x.png"]);
  });

  it("ignores own-origin URLs when no site is given and handles empty input", () => {
    expect(internalTargets(html, "/mr/").includes("/mr/fr/")).toBe(false);
    expect(internalTargets("", "/mr")).toEqual([]);
  });

  it("finds targets without a file", () => {
    const files = new Set(["/mr/en/about/index.html", "/mr/x.png", "/mr/index.html"]);
    const exists = (p: string) => files.has(p);
    expect(missingTargets(["/mr/en/about/", "/mr/x.png", "/mr", "/mr/en/faq/", "/mr/gone.png", "/mr/%E0%A4%A"], exists)).toEqual(["/mr/en/faq/", "/mr/gone.png", "/mr/%E0%A4%A"]);
  });
});

describe("isPagefindOutput", () => {
  it("matches the Pagefind folder under the base only", () => {
    expect(isPagefindOutput("dist/mr/pagefind/pagefind.js", "/mr")).toBe(true);
    expect(isPagefindOutput("dist/mr/en/pagefind/x.html", "/mr")).toBe(false);
    expect(isPagefindOutput("src/pagefind/x.js", "/mr")).toBe(false);
  });
});

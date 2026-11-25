import { describe, expect, it } from "vitest";
import {
  checkDistPath,
  compareTranslations,
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
  lineAt,
  parseAttrs,
} from "./check-lib";

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

  it("reports summary keys outside summary or missing in the default", () => {
    expect(compareTranslations([dict("en", "full", { a: "1" }, true), dict("ar", "summary", { a: "x" })])).toHaveLength(1);
    expect(compareTranslations([dict("en", "full", { a: "1" }, true), dict("ar", "summary", { "summary.zzz": "x" })])).toHaveLength(1);
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
    expect(isUrlAllowed("https://unpkg.com/decap-cms@3.0.0/dist/decap-cms.js", site)).toBe(false);
    expect(isUrlAllowed("https://unpkg.com/decap-cms@3.0.0/dist/decap-cms.js", admin)).toBe(true);
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

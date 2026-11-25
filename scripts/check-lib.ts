// Pure helpers for scripts/check.ts. No file system access here, so they can be
// unit-tested with plain vitest. Node strip-types friendly: no enums, no
// parameter properties.

import { calibratedWordPattern, classifyTerm } from "../src/lib/calibrated-terms.ts";
import { DECAP_URL } from "../src/lib/decap.ts";
import { CONTRAST_LARGE_OR_UI, CONTRAST_TEXT, contrastRatio } from "../src/lib/contrast.ts";

export type Attrs = Record<string, string>;

export interface TextHit {
  text: string;
  index: number;
  kind: "text" | "attribute";
}

export interface UrlOptions {
  /** True for admin pages, where the Decap CDN and GitHub hosts are allowed. */
  isAdmin: boolean;
  /** Hosts of the official source URLs listed in the references data. */
  referenceHosts: ReadonlySet<string>;
}

const EM_DASH = "\u2014";

// ---------- HTML ----------

export function parseAttrs(tagBody: string): Attrs {
  const attrs: Attrs = {};
  for (const m of tagBody.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

/** Indexes of every <img> without an alt attribute (an empty alt is allowed). */
export function findImgsWithoutAlt(html: string): number[] {
  const out: number[] = [];
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!("alt" in parseAttrs(m[1]))) out.push(m.index ?? 0);
  }
  return out;
}

/** Indexes of every <figure> that has no <figcaption> inside it. */
export function findFiguresWithoutFigcaption(html: string): number[] {
  const out: number[] = [];
  for (const m of html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)) {
    if (!/<figcaption\b/i.test(m[1])) out.push(m.index ?? 0);
  }
  return out;
}

// ---------- translations ----------

/** Flattens nested objects into dot keys. Flat dot-key files come back unchanged. */
export function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix === "" ? [] : [prefix];
  }
  const out: string[] = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = prefix === "" ? k : `${prefix}.${k}`;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) out.push(...flattenKeys(v, key));
    else out.push(key);
  }
  return out;
}

/** Keys whose value is not a non-empty string (flat or nested dictionaries). */
export function emptyValueKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix !== "" && !(typeof value === "string" && value.trim() !== "") ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => emptyValueKeys(v, prefix === "" ? k : `${prefix}.${k}`));
}

export interface Dictionary {
  code: string;
  scope: "full" | "summary";
  isDefault: boolean;
  data: unknown;
}

/**
 * Full-scope languages must have exactly the key set of the default language.
 * Summary-scope languages may hold any key that exists in the default language, with a
 * non-empty value. Keys they lack are not reported here: t() throws at build time for a key a
 * page needs and the language does not have.
 */
export function compareTranslations(dictionaries: readonly Dictionary[]): string[] {
  const problems: string[] = [];
  const reference = dictionaries.find((d) => d.isDefault);
  if (!reference) return ["no default language to compare against"];
  const refKeys = new Set(flattenKeys(reference.data));
  for (const d of dictionaries) {
    if (d === reference) continue;
    const keys = new Set(flattenKeys(d.data));
    if (d.scope === "full") {
      for (const k of refKeys) if (!keys.has(k)) problems.push(`key "${k}" is in ${reference.code} but missing in ${d.code}`);
      for (const k of keys) if (!refKeys.has(k)) problems.push(`key "${k}" is in ${d.code} but missing in ${reference.code}`);
    } else {
      for (const k of keys) {
        if (!refKeys.has(k)) problems.push(`${d.code} key "${k}" does not exist in ${reference.code}`);
      }
      for (const k of emptyValueKeys(d.data)) problems.push(`${d.code} key "${k}" has an empty value`);
    }
  }
  return problems;
}

// ---------- hardcoded text in .astro ----------

function blankRange(chars: string[], from: number, to: number): void {
  for (let i = from; i < to && i < chars.length; i++) if (chars[i] !== "\n") chars[i] = " ";
}

/** Blanks {expressions} (balanced braces, string aware) while keeping offsets. */
function blankExpressions(text: string): string {
  const chars = text.split("");
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "{") {
      i++;
      continue;
    }
    let depth = 0;
    let j = i;
    let quote = "";
    for (; j < text.length; j++) {
      const c = text[j];
      if (quote) {
        if (c === "\\") j++;
        else if (c === quote) quote = "";
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    blankRange(chars, i, j + 1);
    i = j + 1;
  }
  return chars.join("");
}

const VISIBLE_ATTRS = /\b(alt|aria-label|title|placeholder)\s*=\s*("([^"]*)"|'([^']*)')/gi;

function hasLetters(s: string): boolean {
  return /\p{L}/u.test(s.replace(/&#?\w+;/g, " "));
}

/**
 * Finds literal visible text in an .astro file: text nodes outside {expressions}
 * and literal alt / aria-label / title / placeholder attributes. Frontmatter,
 * <script>, <style> and comments are ignored, as are punctuation and whitespace.
 */
export function findHardcodedText(source: string): TextHit[] {
  const chars = source.split("");
  const fm = /^---\r?\n[\s\S]*?\r?\n---/.exec(source);
  if (fm) blankRange(chars, 0, fm[0].length);
  for (const m of source.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi)) {
    blankRange(chars, m.index ?? 0, (m.index ?? 0) + m[0].length);
  }
  const cleaned = blankExpressions(chars.join(""));

  const hits: TextHit[] = [];
  let last = 0;
  const pushText = (from: number, to: number) => {
    const raw = cleaned.slice(from, to);
    if (hasLetters(raw)) hits.push({ text: raw.trim().replace(/\s+/g, " "), index: from + (raw.length - raw.trimStart().length), kind: "text" });
  };
  for (const tag of cleaned.matchAll(/<[^>]*>/g)) {
    const start = tag.index ?? 0;
    pushText(last, start);
    for (const a of tag[0].matchAll(VISIBLE_ATTRS)) {
      const value = a[3] ?? a[4] ?? "";
      if (hasLetters(value)) hits.push({ text: `${a[1]}="${value}"`, index: start + (a.index ?? 0), kind: "attribute" });
    }
    last = start + tag[0].length;
  }
  pushText(last, cleaned.length);
  return hits;
}

// ---------- external URLs ----------

const XML_NAMESPACE_URIS: RegExp[] = [
  /^http:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink|1999\/xhtml)$/,
  /^http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9$/,
  // The JSON-LD vocabulary identifier (a name, not a loaded resource).
  /^https:\/\/schema\.org\/?$/,
  /^http:\/\/www\.google\.com\/schemas\/sitemap-(news|image|video)\/\d+(\.\d+)?$/,
];

const ALWAYS_HOSTS = ["doi.org", "creativecommons.org", "youtube-nocookie.com", "player.vimeo.com", "pinecone.lu"];
// GitHub: admin pages only.
const ADMIN_HOSTS = ["github.com", "api.github.com"];
// The Decap CDN (unpkg): admin pages only, and only the pinned version (src/lib/decap.ts).
const DECAP_PREFIX = DECAP_URL.slice(0, DECAP_URL.indexOf("/dist/") + 1);

const hostMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function findExternalUrls(text: string): Array<{ url: string; index: number }> {
  const out: Array<{ url: string; index: number }> = [];
  for (const m of text.matchAll(/https?:\/\/[^\s"'`<>)\\\]]+/g)) {
    out.push({ url: m[0].replace(/[.,;:]+$/, ""), index: m.index ?? 0 });
  }
  return out;
}

/** Link-only targets: pages the visitor can follow to the original video (never loaded by the site). */
function isVideoPageLink(parsed: URL): boolean {
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (host === "www.youtube.com") return parsed.pathname === "/watch";
  if (host === "vimeo.com") return /^\/\d+\/?$/.test(parsed.pathname);
  return false;
}

export function isUrlAllowed(url: string, options: UrlOptions): boolean {
  if (XML_NAMESPACE_URIS.some((re) => re.test(url))) return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (isVideoPageLink(parsed)) return true;
  if (ALWAYS_HOSTS.some((d) => hostMatches(host, d))) return true;
  if (options.referenceHosts.has(host)) return true;
  if (options.isAdmin && ADMIN_HOSTS.some((d) => hostMatches(host, d))) return true;
  if (options.isAdmin && url.startsWith(DECAP_PREFIX)) return true;
  return false;
}

/** Source files that belong to the admin pages although they are not under admin/ (they hold the Decap CDN URL). */
export const ADMIN_FILES: readonly string[] = ["src/lib/decap.ts"];

/**
 * True for the admin pages: /admin/ and /admin-demo/ (sources and built files, including the
 * generated config.yml and repo-files.js) and the Decap constants. "admin-guide/" is a public page.
 * path is relative to the repository root, with forward slashes; basePath is e.g. "/mountain-report".
 */
export function isAdminPath(path: string, basePath: string): boolean {
  if (ADMIN_FILES.includes(path)) return true;
  const base = basePath.replace(/^\/+|\/+$/g, "");
  let rest = path.replace(/^(src\/pages|dist)\//, "");
  if (base !== "" && rest.startsWith(`${base}/`)) rest = rest.slice(base.length + 1);
  return /(^|\/)admin(-demo)?(\/|\.|$)/.test(rest);
}

/** True for the files Pagefind generates (dist/<base>/pagefind/): third-party code, not scanned for URLs. */
export function isPagefindOutput(path: string, basePath: string): boolean {
  const base = basePath.replace(/^\/+|\/+$/g, "");
  return path.startsWith(`dist/${base}/pagefind/`);
}

// ---------- calibrated language ----------

export interface SuspectEmphasis {
  text: string;
  index: number;
}

/**
 * Italic text that looks like calibrated IPCC language (it contains "confidence", "likely",
 * "evidence" or "agreement") but is not exactly a term on the list, so it gets no tooltip.
 * Languages without a term list, code fences and inline code are skipped.
 */
export function findSuspectEmphasis(markdown: string, lang: string): SuspectEmphasis[] {
  const pattern = calibratedWordPattern(lang);
  if (!pattern) return [];
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  const text = markdown.replace(/```[\s\S]*?```/g, blank).replace(/`[^`\n]*`/g, blank);
  const out: SuspectEmphasis[] = [];
  for (const m of text.matchAll(/(?<![*\w])\*(?!\*)([^*\n]+?)\*(?!\*)/g)) {
    const inner = m[1];
    if (pattern.test(inner) && classifyTerm(inner, lang) === undefined) {
      out.push({ text: inner, index: m.index ?? 0 });
    }
  }
  return out;
}

// ---------- references and citations ----------

/** Citation keys used in a Markdown body: [@key] and [@a; @b]. Code fences are ignored. */
export function extractCitationKeys(markdown: string): string[] {
  // Fenced blocks and inline code are not citations (the content plugins skip them too).
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const keys: string[] = [];
  for (const group of withoutFences.matchAll(/\[(@[^\]]*)\]/g)) {
    for (const k of group[1].matchAll(/@([\w][\w:.\-/]*)/g)) keys.push(k[1].replace(/[.:\-/]+$/, ""));
  }
  return keys;
}

export interface ReferenceIndex {
  keys: Set<string>;
  problems: string[];
  hosts: Set<string>;
}

function collectHosts(value: unknown, hosts: Set<string>): void {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      try {
        hosts.add(new URL(value).hostname.toLowerCase());
      } catch {
        // malformed URL: reported elsewhere (reference needs a usable doi or url)
      }
    }
  } else if (Array.isArray(value)) {
    for (const v of value) collectHosts(v, hosts);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectHosts(v, hosts);
  }
}

/**
 * Reads the references data: an array of objects with "key" (or "id"), or an
 * object keyed by reference key. Every reference needs a "doi" or a "url".
 * Undefined data (no file yet) is valid and empty.
 */
export function indexReferences(data: unknown): ReferenceIndex {
  const index: ReferenceIndex = { keys: new Set(), problems: [], hosts: new Set() };
  if (data === undefined || data === null) return index;
  // The file root is { "references": [...] } (a Decap file collection needs an object at the root).
  const list = typeof data === "object" && !Array.isArray(data) && Array.isArray((data as { references?: unknown }).references) ? (data as { references: unknown[] }).references : data;
  let entries: Array<[string | undefined, unknown]>;
  if (Array.isArray(list)) {
    entries = list.map((item) => {
      const rec = item as Record<string, unknown> | null;
      const k = rec && (rec.key ?? rec.id);
      return [typeof k === "string" ? k : undefined, item];
    });
  } else if (typeof data === "object") {
    entries = Object.entries(data as Record<string, unknown>);
  } else {
    index.problems.push("references data must be an array or an object");
    return index;
  }
  entries.forEach(([key, item], i) => {
    const label = key ?? `#${i}`;
    if (key === undefined || key === "") {
      index.problems.push(`reference ${label} has no "key"`);
    } else if (index.keys.has(key)) {
      index.problems.push(`duplicate reference key "${key}"`);
    } else {
      index.keys.add(key);
    }
    const rec = item !== null && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const hasValue = (f: string) => typeof rec[f] === "string" && (rec[f] as string).trim() !== "";
    if (!hasValue("doi") && !hasValue("url")) index.problems.push(`reference "${label}" has neither "doi" nor "url"`);
    collectHosts(item, index.hosts);
  });
  return index;
}

// ---------- characters and markers ----------

export function findEmDashes(text: string): number[] {
  const out: number[] = [];
  for (let i = text.indexOf(EM_DASH); i >= 0; i = text.indexOf(EM_DASH, i + 1)) out.push(i);
  return out;
}

export function findMarker(text: string, marker: string): number[] {
  const out: number[] = [];
  for (let i = text.indexOf(marker); i >= 0; i = text.indexOf(marker, i + 1)) out.push(i);
  return out;
}

export function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

// ---------- dist layout ----------

export const DIST_ROOT_ALLOWED: ReadonlySet<string> = new Set(["_headers", "_redirects", "_routes.json", "404.html"]);

/** Problems for one path relative to dist/ (posix separators). basePath is e.g. "/mountain-report". */
export function checkDistPath(path: string, basePath: string): string[] {
  const problems: string[] = [];
  const prefix = `${basePath.replace(/^\/+|\/+$/g, "")}/`;
  if (path.toLowerCase().endsWith(".md")) problems.push(`dist/${path}: Markdown files must not be published`);
  if (!path.startsWith(prefix) && !DIST_ROOT_ALLOWED.has(path) && !path.endsWith(".DS_Store")) {
    problems.push(`dist/${path} is outside ${basePath}/`);
  }
  return problems;
}

// ---------- internal links in dist/ ----------

/**
 * Paths (without #fragment and ?query) that the href and src attributes of an HTML page point to
 * under the base path, for example "/mountain-report/en/about/". Absolute URLs on the site's own
 * origin count too (hreflang alternates). External URLs, mailto:, relative URLs, bare fragments
 * and the Functions path (<base>/api/) are skipped. Script, style and comment contents are ignored.
 */
export function internalTargets(html: string, basePath: string, site?: string): string[] {
  const base = `/${basePath.replace(/^\/+|\/+$/g, "")}`;
  const origin = site ? site.replace(/\/+$/, "") : undefined;
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, "");
  const out = new Set<string>();
  for (const tag of clean.matchAll(/<[a-zA-Z][^>]*>/g)) {
    const attrs = parseAttrs(tag[0].slice(1, -1));
    for (const name of ["href", "src"]) {
      let value = attrs[name];
      if (value === undefined) continue;
      value = value.replace(/&amp;/g, "&").trim();
      if (origin && value.startsWith(`${origin}/`)) value = value.slice(origin.length);
      if (!value.startsWith("/") || value.startsWith("//")) continue;
      const path = value.split("#")[0].split("?")[0];
      if (path !== base && !path.startsWith(`${base}/`)) continue;
      if (path.startsWith(`${base}/api/`)) continue;
      out.add(path);
    }
  }
  return [...out];
}

/** The targets that resolve to no file. A path ending in "/" needs its index.html; others the file itself or a folder with index.html. */
export function missingTargets(targets: readonly string[], exists: (distPath: string) => boolean): string[] {
  return targets.filter((target) => {
    let path: string;
    try {
      path = decodeURIComponent(target);
    } catch {
      return true;
    }
    if (path.endsWith("/")) return !exists(`${path}index.html`);
    return !exists(path) && !exists(`${path}/index.html`);
  });
}

// ---------- file size limit ----------

/** Cloudflare Pages serves no file over 25 MiB. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface SizedFile {
  path: string;
  bytes: number;
}

/** Problems for every file larger than the limit (exactly the limit is allowed). */
export function findOversizedFiles(files: readonly SizedFile[], limit: number = MAX_FILE_BYTES): string[] {
  return files.filter((f) => f.bytes > limit).map((f) => `${f.path} is ${f.bytes} bytes, over the limit of ${limit} bytes (25 MiB)`);
}

// ---------- worker/wrangler.toml ----------

export interface WranglerInfo {
  basePath?: string;
  pagesOrigin?: string;
  routes: string[];
}

/** Removes a # comment from a TOML line, ignoring # inside quoted strings. */
function stripTomlComment(line: string): string {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\" && quote === '"') i++;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "#") return line.slice(0, i);
  }
  return line;
}

const TOML_STRING = String.raw`(?:"((?:[^"\\]|\\.)*)"|'([^']*)')`;

/** Reads [vars] BASE_PATH and PAGES_ORIGIN and every route pattern, with plain string parsing. */
export function parseWrangler(toml: string): WranglerInfo {
  const info: WranglerInfo = { routes: [] };
  const lines = toml.split(/\r?\n/).map(stripTomlComment);
  let section = "";
  for (const line of lines) {
    const header = /^\s*\[\[?\s*([^\]]*?)\s*\]\]?\s*$/.exec(line);
    if (header) {
      section = header[1];
      continue;
    }
    if (section === "vars") {
      const m = new RegExp(`^\\s*(BASE_PATH|PAGES_ORIGIN)\\s*=\\s*${TOML_STRING}`).exec(line);
      if (m) {
        const value = m[2] ?? m[3] ?? "";
        if (m[1] === "BASE_PATH") info.basePath = value;
        else info.pagesOrigin = value;
      }
    }
  }
  for (const line of lines) {
    for (const m of line.matchAll(new RegExp(`\\bpattern\\s*=\\s*${TOML_STRING}`, "g"))) {
      info.routes.push(m[1] ?? m[2] ?? "");
    }
  }
  return info;
}

/** Compares wrangler.toml with report.config.json. site is e.g. "https://pinecone.lu". */
export function compareWrangler(info: WranglerInfo, config: { site: string; basePath: string }): string[] {
  const problems: string[] = [];
  if (info.basePath === undefined) problems.push("[vars] BASE_PATH is missing in worker/wrangler.toml");
  else if (info.basePath !== config.basePath) {
    problems.push(`worker/wrangler.toml BASE_PATH "${info.basePath}" differs from basePath "${config.basePath}" in report.config.json`);
  }
  let host = "";
  try {
    host = new URL(config.site).host;
  } catch {
    problems.push(`site "${config.site}" in report.config.json is not a valid URL`);
  }
  const expected = `${host}${config.basePath}*`;
  if (info.routes.length === 0) problems.push("no route pattern found in worker/wrangler.toml");
  for (const route of info.routes) {
    if (route !== expected) problems.push(`route pattern "${route}" must be exactly "${expected}"`);
  }
  if (info.pagesOrigin === undefined || info.pagesOrigin === "") problems.push("[vars] PAGES_ORIGIN is missing in worker/wrangler.toml");
  else if (!/^https:\/\/[^\s/]+/.test(info.pagesOrigin)) problems.push(`PAGES_ORIGIN "${info.pagesOrigin}" must be an https URL`);
  return problems;
}

// ---------- design tokens: contrast ----------

export interface ContrastPair {
  /** CSS variable name without "--", or "accent" (resolved from report.config.json). */
  foreground: string;
  background: string;
  minimum: number;
  /** What the pair is used for, shown in the failure message. */
  use: string;
}

/** Text/background and UI pairs the stylesheets use. Text 4.5:1, focus ring and UI borders 3:1. */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { foreground: "text", background: "bg", minimum: CONTRAST_TEXT, use: "body text" },
  { foreground: "text", background: "surface", minimum: CONTRAST_TEXT, use: "text on surface (banner, TOC, footer, hover)" },
  { foreground: "text-muted", background: "bg", minimum: CONTRAST_TEXT, use: "muted text" },
  { foreground: "text-muted", background: "surface", minimum: CONTRAST_TEXT, use: "muted text on surface" },
  { foreground: "accent", background: "bg", minimum: CONTRAST_TEXT, use: "links and accent text" },
  { foreground: "accent", background: "surface", minimum: CONTRAST_TEXT, use: "links and accent text on surface" },
  { foreground: "bg", background: "accent", minimum: CONTRAST_TEXT, use: "button text" },
  { foreground: "bg", background: "text", minimum: CONTRAST_TEXT, use: "skip link text" },
  { foreground: "focus", background: "bg", minimum: CONTRAST_LARGE_OR_UI, use: "focus indicator" },
  { foreground: "focus", background: "surface", minimum: CONTRAST_LARGE_OR_UI, use: "focus indicator on surface" },
  { foreground: "border-strong", background: "bg", minimum: CONTRAST_LARGE_OR_UI, use: "UI component borders" },
  { foreground: "border-strong", background: "surface", minimum: CONTRAST_LARGE_OR_UI, use: "UI component borders on surface" },
];

/** Reads `--name: #hex;` declarations from CSS. Comments are ignored; later declarations win. */
export function parseCssHexVariables(css: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) vars[m[1]] = m[2];
  return vars;
}

/** One message per pair that is missing a colour, has an invalid colour or is below its minimum. */
export function checkContrastPairs(
  vars: Readonly<Record<string, string>>,
  pairs: readonly ContrastPair[] = CONTRAST_PAIRS,
): string[] {
  const problems: string[] = [];
  for (const pair of pairs) {
    const fg = vars[pair.foreground];
    const bg = vars[pair.background];
    const missing = [fg === undefined ? pair.foreground : "", bg === undefined ? pair.background : ""].filter(Boolean);
    if (missing.length > 0) {
      problems.push(`contrast: no colour for --${missing.join(", --")} (needed for ${pair.use})`);
      continue;
    }
    let ratio: number;
    try {
      ratio = contrastRatio(fg, bg);
    } catch {
      problems.push(`contrast: --${pair.foreground} (${fg}) or --${pair.background} (${bg}) is not a #RGB or #RRGGBB colour`);
      continue;
    }
    if (ratio < pair.minimum) {
      problems.push(`contrast: --${pair.foreground} ${fg} on --${pair.background} ${bg} is ${ratio.toFixed(2)}:1, needs ${pair.minimum}:1 (${pair.use})`);
    }
  }
  return problems;
}

// ---------- CSS: physical properties ----------

export interface CssHit {
  property: string;
  index: number;
}

const PHYSICAL_PROPERTY = new RegExp(
  [
    String.raw`(?<![\w-])(margin-(?:left|right)|padding-(?:left|right)|border-(?:left|right)(?:-[a-z]+)?)\s*:`,
    String.raw`(?<![\w-])(left|right)\s*:`,
    String.raw`(?<![\w-])(text-align\s*:\s*(?:left|right))\b`,
    String.raw`(?<![\w-])(float\s*:\s*(?:left|right))\b`,
  ].join("|"),
  "g",
);

/** Physical CSS properties that have a logical equivalent. Comments are ignored. */
export function findPhysicalCssProperties(css: string): CssHit[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  const hits: CssHit[] = [];
  for (const m of clean.matchAll(PHYSICAL_PROPERTY)) {
    hits.push({ property: (m[1] ?? m[2] ?? m[3] ?? m[4]).replace(/\s+/g, " "), index: m.index ?? 0 });
  }
  return hits;
}

/** Contents of every <style> block of an .astro or HTML file, with the offset of each in the file. */
export function extractStyleBlocks(source: string): Array<{ css: string; index: number }> {
  const blocks: Array<{ css: string; index: number }> = [];
  for (const m of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    blocks.push({ css: m[1], index: (m.index ?? 0) + m[0].indexOf(m[1]) });
  }
  return blocks;
}

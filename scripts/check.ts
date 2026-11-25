// Mechanical checks for the Mountain Report demo.
// Usage: npm run check [-- --pre-release] [-- --root <dir>]
// Exit code 1 when any FAIL is found. Node built-ins only, no dependencies.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import {
  checkDistPath,
  compareTranslations,
  compareWrangler,
  type Dictionary,
  checkContrastPairs,
  extractStyleBlocks,
  findPhysicalCssProperties,
  parseCssHexVariables,
  extractCitationKeys,
  findEmDashes,
  findExternalUrls,
  findFiguresWithoutFigcaption,
  findHardcodedText,
  findImgsWithoutAlt,
  findMarker,
  findSuspectEmphasis,
  indexReferences,
  isUrlAllowed,
  lineAt,
  parseWrangler,
} from "./check-lib.ts";
import { validateReportConfig, type ReportConfig } from "../src/config/validate.ts";

type Level = "FAIL" | "WARN";
interface Finding {
  level: Level;
  rule: string;
  message: string;
  where?: string;
}

const argv = process.argv.slice(2);
const rootArg = argv.indexOf("--root");
const ROOT = rootArg >= 0 && argv[rootArg + 1] ? argv[rootArg + 1] : process.cwd();
const PRE_RELEASE = argv.includes("--pre-release");

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".pdf", ".zip"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".astro"]);

const findings: Finding[] = [];
const report = (level: Level, rule: string, message: string, where?: string) => findings.push({ level, rule, message, where });

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const rel = (file: string) => relative(ROOT, file).split(sep).join("/");
const read = (file: string) => readFileSync(file, "utf8");
const isText = (file: string) => !BINARY_EXT.has(extname(file).toLowerCase());
const isTest = (file: string) => /\.test\.[cm]?[jt]sx?$/.test(file);
const at = (file: string, text: string, index: number) => `${rel(file)}:${lineAt(text, index)}`;

function readJson(file: string, rule: string): unknown {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    report("FAIL", rule, `cannot parse ${rel(file)}: ${(error as Error).message}`, rel(file));
    return undefined;
  }
}

// ---------- inputs ----------

const SRC = join(ROOT, "src");
const PUBLIC = join(ROOT, "public");
const DATA = join(ROOT, "data");
const DOCS = join(ROOT, "docs");
const DIST = join(ROOT, "dist");
const srcFiles = walk(SRC).filter(isText);
const publicFiles = walk(PUBLIC).filter(isText);
const dataFiles = walk(DATA).filter(isText);
const docsFiles = walk(DOCS).filter(isText);
const distExists = existsSync(DIST);
const allDist = walk(DIST);
const distFiles = allDist.filter(isText);
const distHtml = distFiles.filter((f) => f.endsWith(".html"));

if (!existsSync(SRC)) report("FAIL", "layout", "src/ not found", "src");

// ---------- report.config.json ----------

const I18N = join(SRC, "i18n");
const translationCodes = existsSync(I18N)
  ? readdirSync(I18N).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -".json".length))
  : [];
let config: ReportConfig | undefined;
{
  const file = join(ROOT, "report.config.json");
  if (!existsSync(file)) {
    report("FAIL", "config", "report.config.json not found");
  } else {
    try {
      config = validateReportConfig(JSON.parse(read(file)), translationCodes);
    } catch (error) {
      report("FAIL", "config", (error as Error).message.replace(/\n/g, " "), "report.config.json");
    }
  }
}
const BASE_PATH = config?.basePath ?? "/";

// ---------- a. dist layout ----------

if (!distExists) {
  report("WARN", "dist", "dist/ not found: run build first");
} else {
  for (const file of allDist) {
    for (const problem of checkDistPath(relative(DIST, file).split(sep).join("/"), BASE_PATH)) report("FAIL", "dist", problem);
  }
}

// ---------- b. images and figures ----------

for (const file of distHtml) {
  const html = read(file);
  for (const index of findImgsWithoutAlt(html)) report("FAIL", "figures", "<img> without alt attribute", at(file, html, index));
  for (const index of findFiguresWithoutFigcaption(html)) report("FAIL", "figures", "<figure> without <figcaption>", at(file, html, index));
}

// ---------- c. translation parity ----------

if (config) {
  const dictionaries: Dictionary[] = [];
  for (const language of config.languages) {
    const file = join(I18N, `${language.code}.json`);
    if (!existsSync(file)) {
      report("FAIL", "i18n", `src/i18n/${language.code}.json is missing`, "src/i18n");
      continue;
    }
    const data = readJson(file, "i18n");
    if (data !== undefined) dictionaries.push({ code: language.code, scope: language.scope, isDefault: language.default, data });
  }
  if (dictionaries.length === config.languages.length) {
    for (const problem of compareTranslations(dictionaries)) report("FAIL", "i18n", problem, "src/i18n");
  }
}

// ---------- d. hardcoded text in .astro ----------

for (const file of srcFiles.filter((f) => f.endsWith(".astro"))) {
  const text = read(file);
  for (const hit of findHardcodedText(text)) {
    report("FAIL", "text", `hardcoded ${hit.kind === "text" ? "text" : "attribute"} ${JSON.stringify(hit.text)}`, at(file, text, hit.index));
  }
}

// ---------- references data (used by e and g) ----------

const referencesFile = join(SRC, "data", "references.json");
const referencesData = existsSync(referencesFile) ? readJson(referencesFile, "citations") : undefined;
const references = indexReferences(referencesData);
for (const problem of references.problems) report("FAIL", "citations", problem, "src/data/references.json");

// ---------- e. external URLs ----------

const urlFiles = [...srcFiles.filter((f) => !isTest(f)), ...publicFiles, ...distFiles];
for (const file of urlFiles) {
  const path = rel(file);
  const isAdmin = /(^|\/)admin(-demo)?(\/|\.|$)/.test(path.replace(/^(src\/pages|dist)\//, "").replace(new RegExp(`^${BASE_PATH.slice(1)}/`), ""));
  const text = read(file);
  for (const { url, index } of findExternalUrls(text)) {
    if (!isUrlAllowed(url, { isAdmin, referenceHosts: references.hosts })) {
      report("FAIL", "urls", `external URL not on the allowlist: ${url}`, at(file, text, index));
    }
  }
}

// ---------- f. em-dash ----------

for (const file of [...srcFiles, ...publicFiles, ...dataFiles, ...distFiles]) {
  const text = read(file);
  for (const index of findEmDashes(text)) report("FAIL", "emdash", "em-dash (U+2014) found", at(file, text, index));
}

// ---------- g. citations ----------

for (const file of srcFiles.filter((f) => rel(f).startsWith("src/content/") && f.endsWith(".md"))) {
  const text = read(file);
  for (const key of extractCitationKeys(text)) {
    if (!references.keys.has(key)) {
      const index = text.indexOf(`@${key}`);
      report("FAIL", "citations", `unknown reference key "${key}"`, at(file, text, Math.max(0, index)));
    }
  }
}

// ---------- g2. calibrated language: italics that nearly match a term ----------

for (const file of srcFiles.filter((f) => /^src\/content\/[a-z]{2,3}\/.*\.md$/.test(rel(f)))) {
  const lang = rel(file).split("/")[2];
  const text = read(file);
  for (const hit of findSuspectEmphasis(text, lang)) {
    report("WARN", "calibrated", `italic text ${JSON.stringify(hit.text)} looks like calibrated language but is not on the list`, at(file, text, hit.index));
  }
}

// ---------- h. TODO_SOURCE ----------

for (const file of [...srcFiles, ...dataFiles, ...docsFiles]) {
  const text = read(file);
  for (const index of findMarker(text, "TODO_SOURCE")) {
    report(PRE_RELEASE ? "FAIL" : "WARN", "todo", "TODO_SOURCE marker", at(file, text, index));
  }
}

// ---------- i. worker/wrangler.toml matches report.config.json ----------

{
  const file = join(ROOT, "worker", "wrangler.toml");
  if (!existsSync(file)) {
    report("WARN", "worker", "worker/wrangler.toml not found: skipped");
  } else if (config) {
    for (const problem of compareWrangler(parseWrangler(read(file)), config)) report("FAIL", "worker", problem, "worker/wrangler.toml");
  }
}

// ---------- j. CSS: logical properties only ----------

for (const file of srcFiles.filter((f) => /\.(css|astro)$/.test(f))) {
  const text = read(file);
  const blocks = file.endsWith(".css") ? [{ css: text, index: 0 }] : extractStyleBlocks(text);
  for (const block of blocks) {
    for (const hit of findPhysicalCssProperties(block.css)) {
      report("FAIL", "css", `physical property "${hit.property}": use the logical equivalent`, at(file, text, block.index + hit.index));
    }
  }
}

// ---------- k. design tokens: contrast ----------

{
  const file = join(SRC, "styles", "tokens.css");
  if (!existsSync(file)) {
    report("FAIL", "contrast", "src/styles/tokens.css not found", "src/styles");
  } else {
    const vars = parseCssHexVariables(read(file));
    if (config) vars.accent = config.accentColour;
    for (const problem of checkContrastPairs(vars)) report("FAIL", "contrast", problem.replace(/^contrast: /, ""), "src/styles/tokens.css");
  }
}

// ---------- output ----------

for (const f of findings) {
  process.stdout.write(`${f.level} [${f.rule}] ${f.message}${f.where ? ` (${f.where})` : ""}\n`);
}
const fails = findings.filter((f) => f.level === "FAIL").length;
const warns = findings.length - fails;
process.stdout.write(`check: ${fails} FAIL, ${warns} WARN${PRE_RELEASE ? " (pre-release)" : ""}\n`);
process.exit(fails > 0 ? 1 : 0);

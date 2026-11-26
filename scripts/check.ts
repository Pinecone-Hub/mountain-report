// Mechanical checks for the Mountain Report demo.
// Usage: npm run check [-- --pre-release] [-- --root <dir>]
// Exit code 1 when any FAIL is found. Node built-ins only, no dependencies.

import { createHash } from "node:crypto";
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
  isAdminPath,
  isPagefindOutput,
  isUrlAllowed,
  findOversizedFiles,
  lineAt,
  internalTargets,
  missingTargets,
  parseWrangler,
} from "./check-lib.ts";
import { headersHaveNoindex } from "./post-build-lib.ts";
import { validateReportConfig, type ReportConfig } from "../src/config/validate.ts";
import { parseWgmsCsv, processedCsv, selectPeriod } from "./data/wgms-lib.ts";

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
const DIST = join(ROOT, "dist");
const srcFiles = walk(SRC).filter(isText);
const publicFiles = walk(PUBLIC).filter(isText);
const dataFiles = walk(DATA).filter(isText);
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
  // Cloudflare Pages serves no file over 25 MiB (binaries included).
  const sized = allDist.map((file) => ({ path: `dist/${relative(DIST, file).split(sep).join("/")}`, bytes: statSync(file).size }));
  for (const problem of findOversizedFiles(sized)) report("FAIL", "size", problem);
}

// ---------- b. images and figures ----------

for (const file of distHtml) {
  const html = read(file);
  for (const index of findImgsWithoutAlt(html)) report("FAIL", "figures", "<img> without alt attribute", at(file, html, index));
  for (const index of findFiguresWithoutFigcaption(html)) report("FAIL", "figures", "<figure> without <figcaption>", at(file, html, index));
}

// ---------- b2. data and figure files ----------

// The processed data file must match what scripts/data/process-wgms.ts makes from data/raw/.
// The original files are not in the repository: when they are absent (CI, a fresh clone) this
// is a WARN; when present, a wrong SHA-256 or an out-of-date processed file is a FAIL.
const processingFile = join(DATA, "processing.json");
if (existsSync(processingFile)) {
  const settings = readJson(processingFile, "data") as
    | { rawDir: string; output: string; firstYear: number; lastYear: number; series: Array<{ id: string; file: string; sha256: string }> }
    | undefined;
  if (settings) {
    const missing = settings.series.filter(({ file }) => !existsSync(join(ROOT, settings.rawDir, file)));
    if (missing.length > 0) {
      report("WARN", "data", `original data files not present (${missing.length}), ${settings.output} not re-verified: see ${settings.rawDir}/SOURCE.md`, settings.rawDir);
    } else {
      try {
        const expected = processedCsv(
          settings.series.map(({ id, file, sha256 }) => {
            const path = join(settings.rawDir, file);
            const bytes = readFileSync(join(ROOT, path));
            if (createHash("sha256").update(bytes).digest("hex") !== sha256) throw new Error(`${path}: SHA-256 does not match data/processing.json`);
            return { id, rows: selectPeriod(parseWgmsCsv(bytes.toString("utf8"), path), settings.firstYear, settings.lastYear, path) };
          }),
        );
        const outFile = join(ROOT, settings.output);
        if (!existsSync(outFile) || read(outFile) !== expected) report("FAIL", "data", `${settings.output} is out of date: run npm run data`, settings.output);
      } catch (error) {
        report("FAIL", "data", (error as Error).message, "data/processing.json");
      }
    }
  }
}

// Every generated figure SVG needs a PNG made from that exact SVG (npm run figures:png).
if (distExists) {
  const figureDir = join(DIST, BASE_PATH.replace(/^\/+|\/+$/g, ""), "downloads", "figures");
  const manifestFile = join(DATA, "figure-png.json");
  const manifest = (existsSync(manifestFile) ? readJson(manifestFile, "figures") : {}) as Record<string, string>;
  const svgs = existsSync(figureDir) ? readdirSync(figureDir).filter((f) => f.endsWith(".svg")) : [];
  for (const svg of svgs) {
    const png = svg.replace(/\.svg$/, ".png");
    const hash = createHash("sha256").update(readFileSync(join(figureDir, svg))).digest("hex");
    if (!existsSync(join(PUBLIC, "downloads", "figures", png))) {
      report("FAIL", "figures", `no PNG for ${svg}: run npm run figures:png, then build again`, `public/downloads/figures/${png}`);
    } else if (manifest[png] !== hash) {
      report("FAIL", "figures", `${png} is stale (its SVG has changed): run npm run figures:png, then build again`, `public/downloads/figures/${png}`);
    } else if (!existsSync(join(figureDir, png))) {
      report("FAIL", "figures", `${png} is not in dist/: build again after npm run figures:png`, `public/downloads/figures/${png}`);
    }
  }
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
  if (isPagefindOutput(path, BASE_PATH)) continue;
  const isAdmin = isAdminPath(path, BASE_PATH);
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

for (const file of srcFiles.filter((f) => /^src\/content\/(?:pages|chapters)\/[a-z]{2,3}\/.*\.md$/.test(rel(f)))) {
  const lang = rel(file).split("/")[3];
  const text = read(file);
  for (const hit of findSuspectEmphasis(text, lang)) {
    report("WARN", "calibrated", `italic text ${JSON.stringify(hit.text)} looks like calibrated language but is not on the list`, at(file, text, hit.index));
  }
}

// ---------- h. TODO_SOURCE ----------

for (const file of [...srcFiles, ...dataFiles]) {
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

// ---------- l. dist/_routes.json: only the Functions path invokes the Function ----------

if (distExists && config) {
  const routes = join(DIST, "_routes.json");
  const expected = [`${config.basePath}/api/*`];
  if (!existsSync(routes)) {
    report("FAIL", "routes", "dist/_routes.json is missing (the build script writes it)", "dist/_routes.json");
  } else {
    let include: unknown;
    try {
      include = (JSON.parse(read(routes)) as { include?: unknown }).include;
    } catch {
      include = undefined;
    }
    if (!Array.isArray(include) || include.length !== expected.length || include.some((v, i) => v !== expected[i])) {
      report("FAIL", "routes", `dist/_routes.json include must be exactly ${JSON.stringify(expected)}`, "dist/_routes.json");
    }
  }
}

// ---------- l2. dist/_headers (noindex on the pages.dev host) and the Apache .htaccess ----------

if (distExists && config) {
  const headers = join(DIST, "_headers");
  if (!existsSync(headers)) report("FAIL", "headers", "dist/_headers is missing (the build script writes it)", "dist/_headers");
  else if (!headersHaveNoindex(read(headers))) report("FAIL", "headers", 'dist/_headers must set "X-Robots-Tag: noindex" for "/*"', "dist/_headers");

  const folder = config.basePath.replace(/^\/+|\/+$/g, "");
  const htaccess = join(DIST, folder, ".htaccess");
  if (!existsSync(htaccess)) report("FAIL", "htaccess", `dist/${folder}/.htaccess is missing (the build script writes it)`, `dist/${folder}/.htaccess`);
  else if (!read(htaccess).includes(`ErrorDocument 404 /${folder}/404.html`)) report("FAIL", "htaccess", `dist/${folder}/.htaccess must set ErrorDocument 404 /${folder}/404.html`, `dist/${folder}/.htaccess`);
  if (!existsSync(join(DIST, folder, "404.html"))) report("FAIL", "htaccess", `dist/${folder}/404.html is missing (the Apache 404 page)`, `dist/${folder}/404.html`);
}

// ---------- m. dist/_redirects and internal links ----------

if (distExists && config) {
  const redirects = join(DIST, "_redirects");
  const defaultCode = config.languages.find((l) => l.default)?.code ?? "";
  const expected = `${config.basePath}/ ${config.basePath}/${defaultCode}/ 301`;
  if (!existsSync(redirects)) report("FAIL", "redirects", "dist/_redirects is missing (the build script writes it)", "dist/_redirects");
  else if (!read(redirects).split(/\r?\n/).includes(expected)) report("FAIL", "redirects", `dist/_redirects must contain the line "${expected}"`, "dist/_redirects");

  // Every href and src that points under the base must resolve to a file in dist/ (the editor pages are skipped).
  const distPathExists = (distPath: string) => {
    const file = join(DIST, distPath);
    return existsSync(file) && statSync(file).isFile();
  };
  for (const file of distHtml) {
    if (isAdminPath(rel(file), BASE_PATH)) continue;
    for (const target of missingTargets(internalTargets(read(file), config.basePath, config.site), distPathExists)) {
      report("FAIL", "links", `broken internal link ${target}`, rel(file));
    }
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

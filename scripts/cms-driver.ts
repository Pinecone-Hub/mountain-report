// Shared by scripts/cms-normalise.ts and scripts/cms-roundtrip.ts: a static server for dist/, and
// a Playwright driver for the demo editor (/admin-demo/, Decap test-repo backend) that applies
// the "two-save technique" to an entry: change one field, save and publish, set it back and save.
// The second save writes the original data in Decap's own format; the bytes are read from
// window.repoFilesUnpublished["<collection>/<slug>"].diffs.

import { createServer, type Server } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import type { Browser, Locator, Page } from "playwright";

export const ROOT = process.cwd();
export const DIST = join(ROOT, "dist");
const config = JSON.parse(readFileSync(join(ROOT, "report.config.json"), "utf8")) as { basePath: string };
export const BASE = `${config.basePath.replace(/\/+$/, "")}/`;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Serves dist/ on 127.0.0.1 and a random free port. */
export async function startServer(): Promise<{ origin: string; server: Server }> {
  const server = createServer((req, res) => {
    let path: string;
    try {
      path = decodeURIComponent((req.url ?? "/").split("?")[0].split("#")[0]);
    } catch {
      res.writeHead(400).end();
      return;
    }
    let file = resolve(DIST, `.${normalize(`/${path}`)}`);
    if (file !== DIST && !file.startsWith(DIST + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { "content-type": MIME[".txt"] }).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  return { origin: `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`, server };
}

export type Kind = "title" | "accent" | "reference";

export interface Entry {
  collection: string;
  slug: string;
  /** Repository paths the entry owns, relative to ROOT (the default-language file first). */
  paths: string[];
  /** The field the two-save technique changes. */
  kind: Kind;
}

const FOLDER_COLLECTIONS = ["pages", "chapters", "figures"] as const;

function names(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile() && !n.startsWith(".")).sort() : [];
}

/** Every entry of every collection, found from the files in the repository. */
export function listEntries(): Entry[] {
  const entries: Entry[] = [];
  const languages = (JSON.parse(readFileSync(join(ROOT, "report.config.json"), "utf8")) as { languages: Array<{ code: string; scope: string; default?: boolean }> }).languages;
  const full = languages.filter((l) => l.scope === "full");
  const defaultCode = (languages.find((l) => l.default) ?? languages[0]).code;
  for (const collection of FOLDER_COLLECTIONS) {
    const folder = `src/content/${collection}`;
    for (const name of names(join(ROOT, folder, defaultCode))) {
      const slug = name.replace(/\.[^.]+$/, "");
      const others = full.filter((l) => l.code !== defaultCode).map((l) => `${folder}/${l.code}/${name}`).filter((p) => existsSync(join(ROOT, p)));
      entries.push({ collection, slug, paths: [`${folder}/${defaultCode}/${name}`, ...others], kind: "title" });
    }
  }
  for (const name of names(join(ROOT, "src/content/downloads"))) {
    entries.push({ collection: "downloads", slug: name.replace(/\.[^.]+$/, ""), paths: [`src/content/downloads/${name}`], kind: "title" });
  }
  entries.push({ collection: "references", slug: "references", paths: ["src/data/references.json"], kind: "reference" });
  entries.push({ collection: "settings", slug: "report", paths: ["report.config.json"], kind: "accent" });
  return entries;
}

/** JavaScript that adds files to window.repoFiles (nested by path segments; aliases share the objects). */
export function fixtureScript(files: Record<string, string>): string {
  return Object.entries(files)
    .map(([path, content]) => {
      const parts = path.split("/");
      const lines: string[] = [];
      let access = "window.repoFiles";
      for (const part of parts.slice(0, -1)) {
        access += `[${JSON.stringify(part)}]`;
        lines.push(`${access} = ${access} || {};`);
      }
      lines.push(`${access}[${JSON.stringify(parts[parts.length - 1])}] = { content: ${JSON.stringify(content)} };`);
      return lines.join("\n");
    })
    .join("\n");
}

/**
 * The editable repository files as they are on disk now (path to text): the files Decap's
 * collections use. They override window.repoFiles from dist/, so a stale build cannot matter.
 */
export function readRepoFiles(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(join(ROOT, dir)).sort()) {
      const rel = `${dir}/${name}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(md|ya?ml|json)$/i.test(name)) out[rel] = readFileSync(join(ROOT, rel), "utf8");
    }
  };
  for (const folder of ["pages", "chapters", "figures", "downloads"]) walk(`src/content/${folder}`);
  for (const file of ["src/data/references.json", "report.config.json"]) out[file] = readFileSync(join(ROOT, file), "utf8");
  return out;
}

export interface Session {
  page: Page;
  close: () => Promise<void>;
}

/** Opens the demo editor and logs in (test-repo). The repository files on disk, and `extraFiles` (fixtures), replace or add to window.repoFiles. */
export async function openEditor(browser: Browser, origin: string, extraFiles: Record<string, string> = {}): Promise<Session> {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  // Publishing asks for confirmation.
  page.on("dialog", (dialog) => void dialog.accept());
  const extra = fixtureScript({ ...readRepoFiles(), ...extraFiles });
  await page.route("**/admin-demo/repo-files.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\n${extra}\n` });
  });
  await page.goto(`${origin}${BASE}admin-demo/`);
  await page.getByRole("button", { name: /login/i }).click();
  return { page, close: () => context.close() };
}

type Diff = { path: string; content: string };

async function readDiffs(page: Page, entry: Entry): Promise<Diff[]> {
  return page.evaluate(
    ([collection, slug]) => {
      const w = window as unknown as { repoFilesUnpublished?: Record<string, { diffs?: Array<{ path: string; content: string }> }> };
      const diffs = w.repoFilesUnpublished?.[`${collection}/${slug}`]?.diffs ?? [];
      return diffs.map((d) => ({ path: d.path, content: d.content }));
    },
    [entry.collection, entry.slug] as const,
  );
}

async function waitForDiffs(page: Page, entry: Entry): Promise<Diff[]> {
  const deadline = Date.now() + 20000;
  for (;;) {
    const diffs = await readDiffs(page, entry);
    if (diffs.length > 0) return diffs;
    if (Date.now() > deadline) throw new Error(`${entry.collection}/${entry.slug}: no diffs after save`);
    await page.waitForTimeout(100);
  }
}

function entryUrl(origin: string, entry: Entry): string {
  return `${origin}${BASE}admin-demo/#/collections/${entry.collection}/entries/${entry.slug}`;
}

/** Opens the entry (through the collection list, so the editor loads the current baseline) and returns the field's input. */
async function openField(page: Page, origin: string, entry: Entry): Promise<Locator> {
  await page.goto(`${origin}${BASE}admin-demo/#/collections/${entry.collection}`);
  await page.waitForTimeout(300);
  await page.goto(entryUrl(origin, entry));
  if (entry.kind === "reference") {
    // The list items are collapsed; open the first one .
    const item = page.locator('div[class*="SortableListItem"]').first();
    await item.waitFor({ state: "visible", timeout: 20000 });
    await item.locator("button").first().click();
  }
  const input = page.locator(entry.kind === "accent" ? 'input[id^="accentColour-field"]' : 'input[id^="title-field"]').first();
  await input.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(300);
  return input;
}

function changed(kind: Kind, value: string): string {
  return kind === "accent" ? `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}` : `${value} Z`;
}

async function save(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^save$/i.test(x.textContent ?? ""));
    return !!b && !(b as HTMLButtonElement).disabled;
  }, undefined, { timeout: 20000 });
  await page.getByRole("button", { name: /^save$/i }).click();
}

async function publish(page: Page, entry: Entry): Promise<void> {
  await page.getByRole("button", { name: /status/i }).click();
  await page.getByText(/^ready$/i).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.getByText(/publish now/i).click();
  const key = `${entry.collection}/${entry.slug}`;
  await page.waitForFunction((k) => !(window as unknown as { repoFilesUnpublished: Record<string, unknown> }).repoFilesUnpublished[k], key, { timeout: 20000 });
}

/**
 * The two-save technique. Decap keeps Save disabled while the entry equals the PUBLISHED data, so
 * restoring the field right after the first save cannot be saved. The first change is therefore
 * saved and published (the editor's baseline becomes the changed data); then the field is set back
 * and saved. The diffs of that second save hold the original data in Decap's format: path to
 * content, for the default language file and every other language file Decap writes.
 */
export async function twoSave(session: Session, origin: string, entry: Entry): Promise<Map<string, string>> {
  const { page } = session;
  const where = `${entry.collection}/${entry.slug}`;
  let input = await openField(page, origin, entry);
  const original = await input.inputValue();
  await input.fill(changed(entry.kind, original));
  await save(page);
  await waitForDiffs(page, entry);
  await publish(page, entry);
  input = await openField(page, origin, entry);
  if ((await input.inputValue()) !== changed(entry.kind, original)) throw new Error(`${where}: the published change was not loaded`);
  await input.fill(original);
  await save(page);
  const second = await waitForDiffs(page, entry);
  return new Map(second.map((d) => [d.path, d.content]));
}

export async function launch(): Promise<{ browser: Browser; origin: string; server: Server }> {
  const { chromium } = await import("playwright");
  if (!existsSync(join(DIST, BASE.slice(1)))) throw new Error(`dist${BASE} not found, run "npm run build" first`);
  const { origin, server } = await startServer();
  const browser = await chromium.launch();
  return { browser, origin, server };
}

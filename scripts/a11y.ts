// Accessibility tests: serves dist/ with a tiny static server, opens every HTML page in
// Chromium (desktop and mobile viewport) and runs axe-core with the WCAG 2.2 AA tags.
// Also checks that the first Tab press focuses the skip link.
// Usage: npm run test:a11y   (run `npm run build` first). Exit code 1 on any violation.

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const config = JSON.parse(readFileSync(join(ROOT, "report.config.json"), "utf8")) as { basePath: string };
const BASE = `${config.basePath.replace(/\/+$/, "")}/`;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".csv": "text/csv; charset=utf-8",
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Maps a request path to a file in dist/, or undefined. Never leaves dist/. */
function resolveFile(urlPath: string): string | undefined {
  let path: string;
  try {
    path = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return undefined;
  }
  let file = resolve(DIST, `.${normalize(`/${path}`)}`);
  if (file !== DIST && !file.startsWith(DIST + sep)) return undefined;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  return existsSync(file) && statSync(file).isFile() ? file : undefined;
}

const server = createServer((req, res) => {
  const file = resolveFile(req.url ?? "/");
  if (file) {
    res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream" });
    res.end(readFileSync(file));
    return;
  }
  const notFound = join(DIST, "404.html");
  res.writeHead(404, { "content-type": MIME[".html"] });
  res.end(existsSync(notFound) ? readFileSync(notFound) : "Not found");
});

if (!existsSync(join(DIST, BASE.slice(1)))) {
  process.stderr.write(`a11y: dist${BASE} not found, run "npm run build" first\n`);
  process.exit(1);
}

// Every index.html under the base, plus the 404 page (requested at an address that does not exist).
const pages: Array<{ label: string; path: string }> = walk(join(DIST, BASE.slice(1)))
  .filter((f) => f.endsWith(`${sep}index.html`))
  .map((f) => {
    const dir = relative(DIST, f).split(sep).slice(0, -1).join("/");
    return { label: `/${dir}/`, path: `/${dir}/` };
  })
  .sort((a, b) => a.path.localeCompare(b.path));
pages.push({ label: "404", path: `${BASE}this-page-does-not-exist/` });

await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const address = server.address();
const origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

const browser = await chromium.launch();
let failures = 0;
let checked = 0;
try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    // The root page redirects with <meta refresh>; keep it in place so it can be tested.
    await context.route("**/*", async (route) => {
      if (route.request().resourceType() !== "document") return route.continue();
      const response = await route.fetch();
      const body = await response.text();
      return route.fulfill({ response, body: body.replace(/<meta\s+http-equiv="refresh"[^>]*>/i, "") });
    });
    for (const target of pages) {
      const page = await context.newPage();
      const where = `${viewport.name} ${target.label}`;
      try {
        await page.goto(origin + target.path, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        checked++;

        await page.keyboard.press("Tab");
        const first = await page.evaluate(() => {
          const el = document.activeElement as HTMLAnchorElement | null;
          return { href: el?.getAttribute("href") ?? "", visible: !!el && el.getBoundingClientRect().width > 0 };
        });
        if (first.href !== "#main" || !first.visible) {
          failures++;
          process.stdout.write(`FAIL [skip-link] first Tab does not focus the skip link (got href "${first.href}") (${where})\n`);
        }

        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        for (const violation of results.violations) {
          for (const node of violation.nodes) {
            failures++;
            process.stdout.write(`FAIL [${violation.id}] impact=${violation.impact} target=${node.target.join(" ")} page=${where}\n`);
          }
        }
      } catch (error) {
        failures++;
        process.stdout.write(`FAIL [error] ${(error as Error).message.split("\n")[0]} (${where})\n`);
      } finally {
        await page.close();
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

process.stdout.write(`a11y: ${checked} page checks (${pages.length} pages x ${VIEWPORTS.length} viewports), ${failures} violation${failures === 1 ? "" : "s"}\n`);
process.exit(failures > 0 ? 1 : 0);

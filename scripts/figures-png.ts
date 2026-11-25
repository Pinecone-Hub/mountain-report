// Rasterises the generated figure SVGs (dist/<base>/downloads/figures/*.svg) to PNG, at twice
// their size, into public/downloads/figures/. Runs locally with Playwright, because the
// Cloudflare Pages build has no browser. The PNG files are committed.
//
// Usage: npm run build && npm run figures:png && npm run build
//
// data/figure-png.json records the SHA-256 of the SVG each PNG was made from; npm run check
// FAILs when an SVG has changed since its PNG was made (the PNG is stale).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const config = JSON.parse(readFileSync(join(ROOT, "report.config.json"), "utf8")) as { basePath: string };
const DIR = "downloads/figures";
const SRC = join(ROOT, "dist", config.basePath.replace(/^\/+|\/+$/g, ""), DIR);
const OUT = join(ROOT, "public", DIR);
const MANIFEST = join(ROOT, "data", "figure-png.json");
const FONT = join(ROOT, "node_modules/@fontsource-variable/noto-sans/files/noto-sans-latin-wght-normal.woff2");

if (!existsSync(SRC)) {
  process.stderr.write(`${SRC} not found: run npm run build first\n`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
const font = readFileSync(FONT).toString("base64");
const manifest: Record<string, string> = {};
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

for (const name of readdirSync(SRC).filter((f) => f.endsWith(".svg")).sort()) {
  const svg = readFileSync(join(SRC, name), "utf8");
  const size = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
  if (!size) throw new Error(`${name}: no viewBox`);
  const [width, height] = [Math.ceil(Number(size[1])), Math.ceil(Number(size[2]))];
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html><html><head><style>@font-face{font-family:"Noto Sans";font-weight:100 900;src:url(data:font/woff2;base64,${font}) format("woff2")}html,body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const png = name.replace(/\.svg$/, ".png");
  await page.locator("svg").screenshot({ path: join(OUT, png) });
  manifest[png] = createHash("sha256").update(svg).digest("hex");
  process.stdout.write(`wrote public/${DIR}/${png}\n`);
}
await browser.close();
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`wrote data/figure-png.json\n`);

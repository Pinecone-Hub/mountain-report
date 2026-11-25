// Accessibility tests: serves dist/ with a tiny static server, opens every HTML page in
// Chromium (desktop and mobile viewport) and runs axe-core with the WCAG 2.2 AA tags.
// Also checks that the first Tab press focuses the skip link, and keyboard use of calibrated-term
// tooltips (Tab shows, Esc hides) and of citations (link to the reference and back).
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

        // No sideways scrolling at the mobile width (WCAG 1.4.10 reflow).
        if (viewport.width < 600) {
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          if (overflow > 0) {
            failures++;
            process.stdout.write(`FAIL [reflow] page is ${overflow}px wider than the viewport (${where})\n`);
          }
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

  // Keyboard checks on a chapter page. Reduced motion keeps hash navigation immediate.
  const keyboard = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const fail = (rule: string, message: string) => {
    failures++;
    process.stdout.write(`FAIL [${rule}] ${message}\n`);
  };
  try {
    const kb = await keyboard.newPage();
    const chapter = `${origin}${BASE}en/chapter-1/`;
    await kb.goto(chapter, { waitUntil: "load" });
    await kb.mouse.move(0, 0);

    /** Presses Tab until the focused element matches the selector (at most 200 times). */
    const tabTo = async (selector: string): Promise<boolean> => {
      for (let i = 0; i < 200; i++) {
        await kb.keyboard.press("Tab");
        if (await kb.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector)) return true;
      }
      return false;
    };

    // Calibrated term: Tab shows the tooltip, Esc hides it, focus stays on the term.
    if (!(await tabTo("a.calibrated-term"))) {
      fail("tooltip", "Tab never reached a calibrated term on the chapter page");
    } else {
      const tipId = await kb.evaluate(() => document.activeElement?.getAttribute("aria-describedby") ?? "");
      const tip = kb.locator(`[id="${tipId}"]`);
      if (tipId === "" || (await tip.getAttribute("role")) !== "tooltip") fail("tooltip", "calibrated term has no aria-describedby tooltip");
      else if (!(await tip.isVisible())) fail("tooltip", "tooltip is not visible when the term has keyboard focus");
      else {
        await kb.keyboard.press("Escape");
        if (await tip.isVisible()) fail("tooltip", "Esc does not hide the tooltip");
        const stillFocused = await kb.evaluate(() => document.activeElement?.classList.contains("calibrated-term") ?? false);
        if (!stillFocused) fail("tooltip", "focus left the term after Esc");
      }
    }

    // Citation: Enter moves to the reference, the back-link returns to the citation.
    await kb.goto(chapter, { waitUntil: "load" });
    if (!(await tabTo("a.cite-link"))) {
      fail("citation", "Tab never reached a citation link on the chapter page");
    } else {
      const cite = await kb.evaluate(() => {
        const a = document.activeElement as HTMLAnchorElement;
        return { id: a.id, target: a.getAttribute("href") ?? "" };
      });
      await kb.keyboard.press("Enter");
      const hash = await kb.evaluate(() => location.hash);
      if (hash !== cite.target) fail("citation", `citation link went to "${hash}", expected "${cite.target}"`);
      const entry = kb.locator(cite.target);
      const inView = (selector: string) =>
        kb.evaluate((sel) => {
          const r = document.querySelector(sel)?.getBoundingClientRect();
          return !!r && r.bottom > 0 && r.top < window.innerHeight;
        }, selector);
      if (!(await entry.isVisible()) || !(await inView(cite.target))) fail("citation", "reference entry is not in view after following the citation");
      const back = kb.locator(`${cite.target} .reference-back a[href="#${cite.id}"]`);
      if ((await back.count()) !== 1) {
        fail("citation", `reference ${cite.target} has no back-link to #${cite.id}`);
      } else {
        await back.focus();
        await kb.keyboard.press("Enter");
        const returned = await kb.evaluate(() => location.hash);
        if (returned !== `#${cite.id}`) fail("citation", `back-link went to "${returned}", expected "#${cite.id}"`);
        else if (!(await inView(`[id="${cite.id}"]`))) fail("citation", "citation is not in view after the back-link");
      }
    }

    // Copy buttons: reachable by Tab, labelled, and a press confirms in the live region.
    await kb.goto(chapter, { waitUntil: "load" });
    const copyButtons = await kb.locator("button[data-copy]").evaluateAll((els) =>
      els.map((el) => ({ name: el.getAttribute("aria-label") ?? "", text: el.textContent?.trim() ?? "", visible: !(el as HTMLElement).hidden })),
    );
    if (copyButtons.length < 3) fail("copy", `expected at least 3 copy buttons on the chapter page, found ${copyButtons.length}`);
    for (const b of copyButtons) {
      if (b.name === "" || b.text === "" || !b.visible) fail("copy", `copy button without accessible name, visible text or visibility: ${JSON.stringify(b)}`);
      else if (!b.name.toLowerCase().includes(b.text.toLowerCase())) fail("copy", `accessible name "${b.name}" does not contain the visible text "${b.text}"`);
    }
    if (!(await tabTo("button[data-copy]"))) {
      fail("copy", "Tab never reached a copy button");
    } else {
      await kb.keyboard.press("Enter");
      try {
        await kb.waitForFunction(() => (document.querySelector("#cite-status")?.textContent ?? "") !== "", undefined, { timeout: 3000 });
      } catch {
        fail("copy", "pressing a copy button gave no confirmation in the live region");
      }
      const role = await kb.locator("#cite-status").getAttribute("role");
      if (role !== "status") fail("copy", "the copy confirmation is not in a role=status live region");
    }

    // Previous and next links: Summary has only Next, a middle chapter both, the last chapter only Previous.
    for (const [path, expected] of [
      ["summary", ["next"]],
      ["chapter-2", ["prev", "next"]],
      ["chapter-3", ["prev"]],
    ] as const) {
      await kb.goto(`${origin}${BASE}en/${path}/`, { waitUntil: "load" });
      const rels = await kb.locator("nav.page-nav[aria-label] a[href]").evaluateAll((els) => els.map((el) => el.getAttribute("rel") ?? ""));
      if (rels.join(",") !== expected.join(",")) fail("pagenav", `${path}: expected links ${expected.join("+")}, found ${rels.join("+") || "none"}`);
    }

    // FAQ accordion: Enter opens, Space closes; a link into a closed answer opens it.
    const faq = `${origin}${BASE}en/faq/`;
    await kb.goto(faq, { waitUntil: "load" });
    if (!(await tabTo("details.faq-item > summary"))) {
      fail("faq", "Tab never reached a question");
    } else {
      const isOpen = () => kb.evaluate(() => (document.activeElement?.parentElement as HTMLDetailsElement | null)?.open ?? false);
      await kb.keyboard.press("Enter");
      if (!(await isOpen())) fail("faq", "Enter does not open the question");
      await kb.keyboard.press("Space");
      if (await isOpen()) fail("faq", "Space does not close the question");
    }
    await kb.goto(`${faq}#cite-1-1`, { waitUntil: "load" });
    const opened = await kb.evaluate(() => document.getElementById("cite-1-1")?.closest("details")?.open ?? false);
    if (!opened) fail("faq", "a hash that targets a citation inside a closed answer does not open it");

    // More ways into a closed answer: a link on another page, an in-page link, the TOC, a
    // citation back-link, and a hash change.
    const isOpenAround = (selector: string) => kb.evaluate((sel) => document.querySelector(sel)?.closest("details")?.open ?? false, selector);
    await kb.goto(chapter, { waitUntil: "load" });
    await kb.evaluate((href) => {
      const a = document.createElement("a");
      a.href = href;
      a.id = "test-faq-link";
      a.textContent = "faq";
      document.body.append(a);
    }, `${BASE}en/faq/#cite-1-1`);
    await kb.locator("#test-faq-link").click();
    await kb.waitForURL(/\/faq\/#cite-1-1$/);
    if (!(await isOpenAround("#cite-1-1"))) fail("faq", "a link from another page with a hash does not open the closed answer");

    await kb.goto(faq, { waitUntil: "load" });
    const firstToc = kb.locator("details[data-toc] a[href^='#']").first();
    const tocTarget = (await firstToc.getAttribute("href")) ?? "";
    if (await isOpenAround(tocTarget)) fail("faq", "the first question is already open before any link is used");
    await firstToc.click();
    if (!(await isOpenAround(tocTarget))) fail("faq", "a table-of-contents link does not open the closed question");

    await kb.goto(faq, { waitUntil: "load" });
    const backLink = kb.locator(".reference-back a").first();
    const backTarget = (await backLink.getAttribute("href")) ?? "";
    if (await isOpenAround(backTarget)) fail("faq", "the cited answer is open before the back-link is used");
    await backLink.click();
    if (!(await isOpenAround(backTarget))) fail("faq", "a citation back-link does not open the closed answer");

    await kb.goto(faq, { waitUntil: "load" });
    await kb.evaluate(() => {
      location.hash = "cite-1-1";
    });
    await kb.waitForFunction(() => document.getElementById("cite-1-1")?.closest("details")?.open === true, undefined, { timeout: 2000 }).catch(() => {
      fail("faq", "changing the hash does not open the closed answer");
    });

    // Without JavaScript the answers stay closed (and the page still works).
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      const jp = await noJs.newPage();
      await jp.goto(faq, { waitUntil: "load" });
      const states = await jp.locator("details.faq-item").evaluateAll((els) => els.map((el) => (el as HTMLDetailsElement).open));
      if (states.length === 0 || states.some(Boolean)) fail("faq", "without JavaScript the FAQ answers should be present and closed");
    } finally {
      await noJs.close();
    }

    checked++;
  } catch (error) {
    fail("keyboard", (error as Error).message.split("\n")[0]);
  } finally {
    await keyboard.close();
  }

  // Narrow screen: an open tooltip stays inside the viewport.
  const narrow = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  try {
    const np = await narrow.newPage();
    await np.goto(`${origin}${BASE}en/chapter-1/`, { waitUntil: "load" });
    const terms = np.locator("a.calibrated-term");
    const count = await terms.count();
    if (count === 0) failures++, process.stdout.write("FAIL [tooltip] no calibrated terms on the chapter page at 390px\n");
    for (let i = 0; i < count; i++) {
      await terms.nth(i).focus();
      const box = await np.evaluate(() => {
        const tip = document.querySelector<HTMLElement>(".calibrated:focus-within .calibrated-tip");
        const r = tip?.getBoundingClientRect();
        return r ? { left: r.left, right: r.right, width: document.documentElement.clientWidth } : undefined;
      });
      if (!box || box.left < -0.5 || box.right > box.width + 0.5) {
        failures++;
        process.stdout.write(`FAIL [tooltip] tooltip ${i + 1} leaves the 390px viewport (${JSON.stringify(box)})\n`);
      }
    }
    checked++;
  } catch (error) {
    failures++;
    process.stdout.write(`FAIL [tooltip] ${(error as Error).message.split("\n")[0]}\n`);
  } finally {
    await narrow.close();
  }

  // Back-links in References and Notes: each is a 24 by 24px target that hit-testing really reaches
  // (centre and 11px in each direction), and no two targets overlap.
  for (const [name, size] of [["desktop", { width: 1280, height: 800 }], ["mobile", { width: 390, height: 844 }]] as const) {
    const ctx = await browser.newContext({ viewport: size });
    try {
      const bp = await ctx.newPage();
      await bp.goto(`${origin}${BASE}en/chapter-1/`, { waitUntil: "load" });
      await bp.evaluate(() => document.fonts.ready);
      const problems = await bp.evaluate(() => {
        const out: string[] = [];
        const links = Array.from(document.querySelectorAll<HTMLElement>(".reference-back a, a.data-footnote-backref"));
        if (links.length === 0) out.push("no back-links found");
        const rects: Array<{ label: string; r: DOMRect }> = [];
        for (const link of links) {
          link.scrollIntoView({ block: "center" });
          const r = link.getBoundingClientRect();
          const label = link.getAttribute("aria-label") ?? link.textContent ?? "?";
          rects.push({ label, r });
          if (r.width < 23.5 || r.height < 23.5) out.push(`${label}: target is ${r.width.toFixed(1)}x${r.height.toFixed(1)}px`);
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          for (const [dx, dy] of [[0, 0], [11, 0], [-11, 0], [0, 11], [0, -11]]) {
            const hit = document.elementFromPoint(cx + dx, cy + dy);
            if (!hit || !link.contains(hit)) out.push(`${label}: hit test at (${dx}, ${dy}) from the centre does not reach the link`);
          }
        }
        // Rects were read while scrolling; compare in page coordinates.
        const page = links.map((l) => {
          const r = l.getBoundingClientRect();
          return { label: l.getAttribute("aria-label") ?? "?", left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY };
        });
        for (let i = 0; i < page.length; i++) {
          for (let j = i + 1; j < page.length; j++) {
            const p = page[i];
            const q = page[j];
            if (p.left < q.right - 0.5 && q.left < p.right - 0.5 && p.top < q.bottom - 0.5 && q.top < p.bottom - 0.5) {
              out.push(`targets overlap: "${p.label}" and "${q.label}"`);
            }
          }
        }
        return out;
      });
      for (const problem of problems.slice(0, 5)) {
        failures++;
        process.stdout.write(`FAIL [target-size] ${name}: ${problem}\n`);
      }
      checked++;
    } catch (error) {
      failures++;
      process.stdout.write(`FAIL [target-size] ${(error as Error).message.split("\n")[0]}\n`);
    } finally {
      await ctx.close();
    }
  }

  // Landing on #notes: the Notes heading is at the top of the screen (mobile) and the table of
  // contents marks it (desktop). Default motion settings, so smooth scrolling would be caught.
  for (const [name, size] of [["mobile", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 800 }]] as const) {
    const ctx = await browser.newContext({ viewport: size });
    try {
      const np = await ctx.newPage();
      await np.goto(`${origin}${BASE}en/chapter-1/#notes`, { waitUntil: "load" });
      await np.evaluate(() => document.fonts.ready);
      await np.waitForTimeout(600);
      const top = await np.evaluate(() => document.getElementById("notes")?.getBoundingClientRect().top ?? -1);
      if (top < 0 || top > size.height / 2) {
        failures++;
        process.stdout.write(`FAIL [hash-scroll] ${name}: the Notes heading is at ${Math.round(top)}px after loading #notes, expected near the top\n`);
      }
      if (name === "desktop") {
        const current = await np.evaluate(() => document.querySelector("details[data-toc] a[aria-current]")?.getAttribute("href") ?? "");
        if (current !== "#notes") {
          failures++;
          process.stdout.write(`FAIL [toc] the table of contents marks "${current}" at #notes, expected "#notes"\n`);
        }
      }
      checked++;
    } catch (error) {
      failures++;
      process.stdout.write(`FAIL [hash-scroll] ${(error as Error).message.split("\n")[0]}\n`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

process.stdout.write(`a11y: ${checked} page checks (${pages.length} pages x ${VIEWPORTS.length} viewports), ${failures} violation${failures === 1 ? "" : "s"}\n`);
process.exit(failures > 0 ? 1 : 0);

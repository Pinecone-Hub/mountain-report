// Round-trip test for the content file format: for every entry of every collection, the demo editor
// (Decap, test-repo backend) saves the entry unchanged in data, and every file it writes must equal
// the file in the repository byte for byte. Decap's output is the format standard.
// After hand edits run `npm run build && npm run cms:normalise`.
// French fixture: for every English file of pages, chapters and figures a French copy is added in
// the browser only (lang replaced, a marker sentence added), so the test proves that saving the
// English entry rewrites the French file byte for byte too.
// Usage: npm run test:cms   (run `npm run build` first). Exit code 1 on any failure.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { launch, listEntries, openEditor, ROOT, twoSave, type Entry } from "./cms-driver.ts";

const MARKER = "Phrase de repère pour le test de aller-retour.";

/** French copies of the English files of pages, chapters and figures: path to content. */
function frenchFixture(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of listEntries()) {
    if (entry.collection !== "pages" && entry.collection !== "chapters" && entry.collection !== "figures") continue;
    const path = entry.paths[0];
    let text = readFileSync(join(ROOT, path), "utf8").replace(/^lang: en$/m, "lang: fr");
    if (path.endsWith(".md")) {
      text = `${text.endsWith("\n") ? text : `${text}\n`}\n${MARKER}\n`;
    } else {
      // Replace the whole title entry (a title may continue on indented lines).
      text = text.replace(/^title:.*(?:\n[ ]+.*)*/m, `title: ${MARKER}`);
    }
    out[path.replace("/en/", "/fr/")] = text;
  }
  return out;
}

function firstDifference(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

const show = (s: string, at: number): string => JSON.stringify(s.slice(Math.max(0, at - 30), at + 50));

function bodyOf(text: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
  return match ? text.slice(match[0].length) : text;
}

/** The counts that must survive a save: citations, footnotes, cross-references and emphasis. */
function counts(text: string): Record<string, number> {
  const body = bodyOf(text);
  const count = (re: RegExp): number => (body.match(re) ?? []).length;
  return { "[@": count(/\[@/g), "[^": count(/\[\^/g), "{": count(/\{/g), "*": count(/\*/g) };
}

const fixture = frenchFixture();
const { browser, origin, server } = await launch();
let failures = 0;
let files = 0;
const fail = (message: string): void => {
  failures++;
  process.stdout.write(`FAIL ${message}\n`);
};

try {
  for (const entry of listEntries()) {
    const expected = new Map<string, string>();
    for (const path of entry.paths) expected.set(path, readFileSync(join(ROOT, path), "utf8"));
    const frPath = entry.paths[0].replace("/en/", "/fr/");
    if (entry.paths[0].includes("/en/") && fixture[frPath] !== undefined) expected.set(frPath, fixture[frPath]);
    const session = await openEditor(browser, origin, fixture);
    try {
      const written = await twoSave(session, origin, entry);
      for (const [path, original] of expected) {
        const saved = written.get(path);
        files++;
        if (saved === undefined) {
          fail(`${path}: Decap did not write this file`);
          continue;
        }
        if (saved !== original) {
          const at = firstDifference(original, saved);
          fail(`${path}: differs at offset ${at} (repository ${original.length} bytes, saved ${saved.length})\n  repository: ${show(original, at)}\n  saved:      ${show(saved, at)}`);
        }
      }
      for (const path of written.keys()) if (!expected.has(path)) fail(`${path}: Decap wrote a file that is not in the repository`);
      if ((entry.collection === "chapters" && entry.slug === "chapter-1") || (entry.collection === "pages" && entry.slug === "summary")) {
        const before = counts(expected.get(entry.paths[0]) ?? "");
        const after = counts(written.get(entry.paths[0]) ?? "");
        process.stdout.write(`   ${entry.slug} body counts ${JSON.stringify(before)}\n`);
        for (const key of Object.keys(before)) {
          if (before[key] !== after[key]) fail(`${entry.slug}: body count of "${key}" changed from ${before[key]} to ${after[key]}`);
        }
      }
      process.stdout.write(`ok ${entry.collection}/${entry.slug} (${expected.size} file${expected.size === 1 ? "" : "s"})\n`);
    } catch (error) {
      fail(`${entry.collection}/${entry.slug}: ${String(error)}`);
    } finally {
      await session.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

process.stdout.write(`cms-roundtrip: ${files} files compared, ${failures} failure${failures === 1 ? "" : "s"}\n`);
process.exit(failures > 0 ? 1 : 0);

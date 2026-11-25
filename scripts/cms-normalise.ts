// One-off (and reusable) normalisation: Decap CMS rewrites front matter, YAML and JSON in its own
// format when an entry is saved (long strings folded at about 80 characters, key order of the
// field configuration). Decap's output is the project standard, so this script saves every entry
// through the demo editor and writes Decap's bytes back to the repository.
// Usage: npm run build && npm run cms:normalise   (add --dry to only report; no file is written)
// The script builds nothing: it serves dist/ (for the editor) and takes the content from disk.
// Run it again: every file must then be reported unchanged (a fixed point).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launch, listEntries, openEditor, ROOT, twoSave } from "./cms-driver.ts";

const dry = process.argv.includes("--dry");

/** Body of a Markdown file with front matter: everything after the closing "---" line. */
function body(text: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
  return match ? text.slice(match[0].length) : text;
}

/** JSON with sorted object keys, so two files compare equal when only the key order differs. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
}

/** Reasons why a rewrite is not safe, empty when it is. */
function problems(path: string, before: string, after: string): string[] {
  const out: string[] = [];
  if (path.endsWith(".md") && body(before) !== body(after)) out.push("the body changed");
  if (path.endsWith(".json")) {
    try {
      const a = JSON.parse(before) as Record<string, unknown>;
      const b = JSON.parse(after) as Record<string, unknown>;
      if (canonical(a) !== canonical(b)) out.push("a value changed");
      // Arrays keep their order in canonical(); the key order of the top-level object may change.
      for (const key of ["languages", "chapters"]) if (JSON.stringify(a[key]) !== JSON.stringify(b[key]) && canonical(a[key]) === canonical(b[key])) out.push(`the key order inside "${key}" changed`);
    } catch (error) {
      out.push(`not valid JSON: ${String(error)}`);
    }
  }
  if (after.length === 0) out.push("empty output");
  return out;
}

const { browser, origin, server } = await launch();
const results: Array<{ path: string; text: string; changed: boolean }> = [];
let failed = false;
try {
  for (const entry of listEntries()) {
    const session = await openEditor(browser, origin);
    try {
      const written = await twoSave(session, origin, entry);
      for (const path of entry.paths) {
        const content = written.get(path);
        if (content === undefined) {
          failed = true;
          process.stdout.write(`FAIL ${path}: Decap did not write this file\n`);
          continue;
        }
        const before = readFileSync(join(ROOT, path), "utf8");
        const why = problems(path, before, content);
        if (why.length > 0) {
          failed = true;
          process.stdout.write(`FAIL ${path}: ${why.join(", ")}\n`);
          continue;
        }
        results.push({ path, text: content, changed: content !== before });
        process.stdout.write(`${content === before ? "same   " : "changed"} ${path}\n`);
      }
    } catch (error) {
      failed = true;
      process.stdout.write(`FAIL ${entry.collection}/${entry.slug}: ${String(error)}\n`);
    } finally {
      await session.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failed) {
  process.stdout.write("cms-normalise: nothing was written (see FAIL lines)\n");
  process.exit(1);
}
const changed = results.filter((r) => r.changed);
if (!dry) for (const r of changed) writeFileSync(join(ROOT, r.path), r.text);
process.stdout.write(`cms-normalise: ${results.length} files, ${changed.length} ${dry ? "would be rewritten" : "rewritten"}, ${results.length - changed.length} already in Decap's format\n`);

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { APIRoute } from "astro";
import { report } from "../../config/report";
import { buildCmsConfig } from "../../lib/cms-config";
import { buildRepoTree, isEditableFile, repoFilesScript, type RepoFile } from "../../lib/repo-files";

// The files the Decap collections use: src/content/** (not the editor guide), the references
// data and the report configuration.
const ROOT = process.cwd();
const FOLDERS = ["src/content/pages", "src/content/chapters", "src/content/figures", "src/content/downloads"];
const SINGLE_FILES = ["src/data/references.json", "report.config.json"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Sets window.repoFiles for the demo editor, so evaluators see the real content. */
export const GET: APIRoute = () => {
  const paths = [...FOLDERS.flatMap((folder) => walk(join(ROOT, folder))), ...SINGLE_FILES.map((f) => join(ROOT, f))];
  const files: RepoFile[] = paths
    .map((full) => relative(ROOT, full).split(sep).join("/"))
    .filter(isEditableFile)
    .sort()
    .map((path) => ({ path, content: readFileSync(join(ROOT, path), "utf8") }));
  // Folder collections of the editor configuration (see repoFilesScript for why).
  const folders = (buildCmsConfig(report, "test-repo").collections as Array<{ folder?: string }>).flatMap((c) => (c.folder ? [c.folder] : []));
  return new Response(repoFilesScript(buildRepoTree(files), folders), { headers: { "content-type": "text/javascript; charset=utf-8" } });
};

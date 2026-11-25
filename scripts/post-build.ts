// Runs after `astro build`: copies the 404 page to the dist/ root, writes the Cloudflare Pages
// files _routes.json, _redirects and _headers and the Apache .htaccess from report.config.json, then indexes the report with
// Pagefind (output under the base path). Usage: npm run build (not run by hand).

import { execFileSync } from "node:child_process";
import { copyFileSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { headersFile, htaccessFile, redirectsFile, routesJson, siteDirectory, unusedPagefindFiles } from "./post-build-lib.ts";

const ROOT = process.cwd();
const config = JSON.parse(readFileSync(join(ROOT, "report.config.json"), "utf8")) as {
  basePath: string;
  languages: Array<{ code: string; default?: boolean }>;
};
const site = siteDirectory(config.basePath);
const defaultLanguage = config.languages.find((l) => l.default)?.code;
if (!defaultLanguage) throw new Error("report.config.json has no default language");

copyFileSync(join(ROOT, site, "404.html"), join(ROOT, "dist", "404.html"));
writeFileSync(join(ROOT, "dist", "_routes.json"), routesJson(config.basePath));
writeFileSync(join(ROOT, "dist", "_redirects"), redirectsFile(config.basePath, defaultLanguage));
writeFileSync(join(ROOT, "dist", "_headers"), headersFile());
// Apache (LAMP) hosting: the same site as plain files, with .htaccess inside the base folder.
writeFileSync(join(ROOT, site, ".htaccess"), htaccessFile(config.basePath, defaultLanguage));

execFileSync(join(ROOT, "node_modules", ".bin", "pagefind"), ["--site", site], { stdio: "inherit" });

const outDir = join(ROOT, site, "pagefind");
for (const name of unusedPagefindFiles(readdirSync(outDir))) rmSync(join(outDir, name));

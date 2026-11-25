import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import { contentPlugins } from "./src/plugins/index.ts";

// Report identity lives in report.config.json (validated in src/config/report.ts).
const { site: SITE, basePath: BASE, languages: LANGUAGES } = JSON.parse(
  readFileSync(new URL("./report.config.json", import.meta.url), "utf8"),
);

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: "always",
  outDir: `./dist${BASE}`,
  build: {
    format: "directory",
  },
  prefetch: false,
  devToolbar: {
    enabled: false,
  },
  // Astro 7 renders Markdown with Sätteri. The content plugins (heading ids, cross-references,
  // calibrated terms, notes, citations) are Sätteri hast plugins, see src/plugins/.
  markdown: {
    processor: satteri({ hastPlugins: contentPlugins() }),
  },
  integrations: [
    sitemap({
      // The root page only redirects to the default language. The editor pages stay out of the
      // sitemap (the editor guide, admin-guide/, is a normal page).
      // xhtml:link alternates (hreflang) for every page that exists in more than one language: the
      // integration matches the language folder in the URL (the Summary also exists in Arabic).
      i18n: {
        defaultLocale: LANGUAGES.find((l) => l.default).code,
        locales: Object.fromEntries(LANGUAGES.map((l) => [l.code, l.code])),
      },
      filter: (page) => ![`${SITE}${BASE}/`, `${SITE}${BASE}/admin/`, `${SITE}${BASE}/admin-demo/`].includes(page),
    }),
  ],
});

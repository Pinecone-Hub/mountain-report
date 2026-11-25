import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import { contentPlugins } from "./src/plugins/index.ts";

// Report identity lives in report.config.json (validated in src/config/report.ts).
const { site: SITE, basePath: BASE } = JSON.parse(
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
      filter: (page) => ![`${SITE}${BASE}/`, `${SITE}${BASE}/admin/`, `${SITE}${BASE}/admin-demo/`].includes(page),
    }),
  ],
});

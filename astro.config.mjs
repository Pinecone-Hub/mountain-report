import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

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
  integrations: [
    sitemap({
      // The root page only redirects to the default language.
      filter: (page) => page !== `${SITE}${BASE}/`,
    }),
  ],
});

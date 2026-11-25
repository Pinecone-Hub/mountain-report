# Plan

The approved plan is to be pasted here by Dan. The build brief is the source of truth where they
differ. The changes below amend the brief and apply from now on.

## Changes to the brief (25 November 2026)

### 1. Downloads (stages 4 to 6)

- Replaces "Full report PDF generated from the print view with Playwright". No Playwright PDF
  generation. The print stylesheet stays.
- A Decap-managed Downloads collection holds the full report PDF, one PDF per chapter and extra
  files. Each entry has a title, a language and a date (editable). Files are uploaded through
  the CMS media library.
- File size is computed at build time, never entered in Decap.
- Figure files generated from data (stage 4: PNG, SVG, CSV) appear in Downloads automatically.
  Each entry in the Figures collection has optional "Replacement PNG / SVG / CSV" fields to
  replace a generated file.
- The Downloads page merges, at build time, the generated figure files (overridden by any
  replacement) and the Downloads entries.
- Demo PDFs are small, clearly marked placeholders.
- Cloudflare Pages accepts files of at most 25 MiB. Stage 5 adds a `check.ts` rule that FAILs on
  any file in `dist/` over 25 MiB. The limit is noted in the README.

### 2. Video (stage 6)

- The video component accepts YouTube (youtube-nocookie.com) and Vimeo (player.vimeo.com with
  `dnt=1`).
- Click-to-load with a local placeholder. No request to either host before the click.
- The video URL is an editable field in Decap.
- player.vimeo.com is on the external URL allowlist (after click only).

### 3. Reusable template (from stage 0 onwards)

- The site is a configurable template for several report microsites with the same structure
  and look.
- One file, `report.config.json` (validated by `src/config/report.ts`), sets the title, short
  title, accent colour, chapters, languages and base path. It drives layout, navigation and
  theme.
- A new report needs no code change. `worker/wrangler.toml` repeats the base path because it
  cannot read the config, so `check.ts` FAILs if they drift apart.
- The README documents this in "How to create a new report microsite" (stage 7).

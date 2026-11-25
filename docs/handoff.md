# Handoff between sessions

Read this first in a new session, then `CLAUDE.md`, `docs/brief.md` (the full brief) and
`docs/plan.md` (Dan's changes to the brief, approved sources, decisions). Last updated
25 November 2026, end of stage 5.

## Status

| Stage | Status |
| --- | --- |
| 0 Repo, skeleton, deploy | done, pushed |
| 1 Design system and layout | done, pushed |
| 2 English content | done, verified (6 rounds, nothing open), pushed |
| 3 Report templates | done, reviewed, pushed |
| 4 Data and figures | done, verified by Dan, pushed (c5538c8), live |
| 5 Decap CMS | done, reviewed, committed locally, not pushed; waits for Dan's check and the GitHub OAuth App |
| 6 Translations, remaining pages | to do |
| 7 QA and release | to do |

Deadline for the application: 30 November 2026, 23:59.

## Working rules (Dan)

- Talk to Dan in Romanian. Code, docs, commits and site content in English (British, UN style).
- Each stage ends with a Romanian report and a local commit, no push. Push only after Dan's "ok".
  After a push, confirm that the Pages build started by itself (deployment trigger
  `github:push`) and that the live page shows the new version.
- Commit messages: plain, no `Co-Authored-By`, no "Generated with" line.
- Never install any package, plugin or tool without Dan's consent (name, purpose, licence).
- Fix/verify loops are bounded: after a final verification, at most one more fix round and one
  re-check; then report what remains and stop.
- From stage 5 on, the builder agent writes the code again (Dan, 25 November 2026; stage 4 code
  was written directly). Use the agents in `.claude/agents/`: builder implements, reviewer after every builder change,
  content-writer for text, source-verifier for facts (read-only), screenshot-reviewer for
  screenshots. Subagents start without context: their prompts must be self-contained.
- Never invent facts, figures, references or DOIs. Unknown = `TODO_SOURCE`.

## Stage 4 (data and figures): what was built

- Data: `data/raw/wgms-amce-2026-02-10/` holds (locally only, git-ignored: the terms do not state that redistribution is allowed) the original README, `global.csv` and the region
  files CEU, ASC, ASW, ASE, SA1, SA2, unchanged, with `SOURCE.md` (citation, rights, download
  URL and date, SHA-256 of the zip and of each file). The 53 MB zip is not committed.
  `npm run data` (settings in `data/processing.json`) writes `data/glacier-mass-change.csv`
  (1976 to 2025, values as in the dataset). `npm run check` FAILs when it is out of date.
- The Southern Andes exist only as SA1 (Patagonia) and SA2 (Central) in the dataset; both are in
  the processed file, no combined series (no combined uncertainty in the data). No figure uses
  them yet.
- Uncertainty: the dataset gives 1-sigma. Figures and tables show the 95% interval
  (1.96 sigma), as the chapter text does (Zemp et al.: 408 ± 132 Gt = 1.96 × 67.2). The CSV
  download has both.
- Content layout: `src/content/<collection>/<lang>/<file>` (collections chapters, figures, pages; ids stay `en/summary`, `en/chapters/chapter-1`, `en/fig-1-1`). `src/data/references.json` has the root `{ "references": [...] }`.
- Figure metadata: `src/content/figures/<lang>/<id>.yml` (schema in `src/content.config.ts`,
  flat fields for Decap, optional `replacementPng/Svg/Csv` paths below `public/`). A chapter
  places a figure with a paragraph `FIGURE: <id>`; `src/plugins/figures.ts` turns it into a slot
  and `src/pages/[lang]/[page].astro` renders `src/components/figures/Figure.astro` there.
- Charts: pure SVG renderers in `src/lib/charts/` (bars with 95% whiskers; cumulative lines with
  legend and direct end labels), built in `src/lib/figures.ts`. Each chart has a wide SVG and a
  narrow one (shown below 40rem). The bar chart has a `role="slider"` layer (arrow keys,
  Home/End, Page Up/Down, pointer) with a visible readout. Colours: bars in the report accent;
  lines in a validated 4-colour categorical order (`SERIES_COLOURS` in `frame.ts`).
- Files: SVG (per language) and CSV (one per figure) are generated at build by
  `src/pages/downloads/figures/[file].ts`, under `<base>downloads/figures/`. PNGs are made
  locally (Cloudflare has no browser): **after changing data, figure metadata or chart code run
  `npm run build && npm run figures:png && npm run build`** and commit `public/downloads/figures/`
  and `data/figure-png.json`. `npm run check` FAILs on a missing or stale PNG.
- Figures page: `src/pages/[lang]/figures.astro` (own route; `[page].astro` skips "figures"):
  chapter filter (radios, JS only), cards with inline SVG, native `<dialog>` lightbox. a11y
  tests cover the slider and the lightbox (open, axe while open, Esc, focus return).
- French: figure YAML and chapter content come in stage 6; the FR Figures page shows the
  "in preparation" stub with a link to English. FR UI strings exist already.

## Stage 5 (Decap CMS): what was built

- Content layout is now `src/content/<collection>/<lang>/<file>` (collections pages, chapters,
  figures; plus downloads and guide), because Decap `multiple_folders` puts the locale just
  before the file name. Entry ids did not change. `src/data/references.json` has the root
  `{ "references": [...] }` (Decap file collections need an object).
- Decap 3.18.0 from unpkg, pinned with SRI (`src/lib/decap.ts`). The config is generated from
  `report.config.json` (`src/lib/cms-config.ts`, `cms.repo` / `cms.branch`) and served as
  `admin/config.yml` and `admin-demo/config.yml`. `/admin/`: GitHub backend, editorial workflow,
  i18n EN/FR. `/admin-demo/`: test-repo backend; `admin-demo/repo-files.js` holds the real
  content at build time. Both noindex and out of the sitemap. Markdown bodies open in raw mode
  (rich text would escape `[@key]` and `{1.2}`).
- Decap 3.18 limits: `multiple_folders` is not allowed on files collections (pages is a folder
  collection with create/delete off); list widgets take only `i18n: true`. Saving an EN entry
  also writes a stub file for FR: `src/lib/content-loader.ts` skips stubs in non-default
  languages and fails the build on a default-language stub.
- Downloads: collection `src/content/downloads/*.yml` (title, lang, date, kind, chapter, file
  under `public/media/downloads/`), placeholder PDFs from `npm run pdfs:placeholder`. The
  Downloads page merges these with the figure files (`downloadsFor()`, replacements win). Size
  is computed at build. `check.ts` FAILs on any `dist/` file over 25 MiB.
- OAuth: Pages Functions `functions/[base]/api/{auth,callback}.ts`, logic in `oauth/` (tested).
  `redirect_uri` and the postMessage origin come from config (requests reach the Function on the
  pages.dev host). Signed stateless `state`, no cookies. The build writes `dist/_routes.json`
  (only `<base>/api/*`); `check.ts` FAILs if it is wrong. Worker unchanged (GET only is enough;
  Decap talks to api.github.com directly; the token exchange is server-side).
- Editor guide: `<base>/admin-guide/` from `src/content/guide/en.md`, linked in the footer.

## Technical facts and gotchas

- Content file format (stage 5E): Decap's output is the standard for `src/content/**`,
  `src/data/references.json` and `report.config.json` (folded strings, key order of the field
  config; references.json keys come out in an Immutable.js hash order, which is stable). After
  hand edits: `npm run build && npm run cms:normalise` (rewrites files through the demo editor).
  `npm run test:cms` checks that saving every entry (with a French fixture) rewrites every file
  byte for byte. Both use `scripts/cms-driver.ts`. Decap keeps Save disabled while the entry
  equals the published data, so the technique is: change, save, publish, set back, save.

- **Astro 7 uses the Sätteri Markdown processor**, not remark/rehype. Own plugins are Sätteri
  hast plugins in `src/plugins/` (heading ids, cross-references, citations, notes, calibrated
  terms, structure, figure placeholder), wired in `astro.config.mjs`.
- **Stale content cache**: `node_modules/.astro/data-store.json` is not invalidated when a
  plugin changes. `npm run build` now deletes `.astro` and `node_modules/.astro` first. In dev,
  delete them by hand after plugin changes.
- Report identity comes only from `report.config.json` (validated in `src/config/`). No
  report-specific literal in code. `worker/wrangler.toml` repeats the base path and `check.ts`
  fails if it drifts.
- Cloudflare: Pages project `mountain-report` (Git-connected, auto-build on push works),
  subdomain `mountain-report-dwt.pages.dev` (`mountain-report.pages.dev` belongs to someone
  else). The account ID is in local memory, not in the repo. Check deployments via the Cloudflare API
  with the wrangler OAuth token from `~/Library/Preferences/.wrangler/config/default.toml`; run
  `npx wrangler whoami` first to refresh it (expires after about an hour).
- Local preview of the build: `python3 -m http.server 4321 --directory dist --bind 127.0.0.1`,
  then http://127.0.0.1:4321/mountain-report/en/. Playwright MCP screenshots can only be saved
  inside the project: use `.playwright-mcp/shots/` (gitignored).
- Local source texts (gitignored, not in the repo): `.local-sources/` holds the full ICIMOD
  Thame study (PDF and text), the WMO State of the Global Climate 2025 text, the SROCC Chapter 2
  text, and `pdf2txt.swift` (macOS PDFKit extractor, run with `swift pdf2txt.swift in.pdf
  out.txt`). Page markers in the texts: `=== PAGE n ===`.
- The content-writer agent is blocked by a tool guard when writing `src/content/pages/en/summary.md`;
  ask it to return the full file in its report and save it yourself with the Edit or Write tool
  (not a Python string replacement: that once broke a citation key).
- `.local-sources/` and `.playwright-mcp/` are in `.gitignore`.

## Open items for later stages

- Stage 5 (Dan): create the GitHub OAuth App in Pinecone-Hub (callback
  `https://pinecone.lu/mountain-report/api/callback`), send the Client ID (set as Pages env var
  `GITHUB_CLIENT_ID`, Production), set the secret himself with
  `npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name mountain-report`, then a new
  deployment. Test a real login and a save on `/admin/` after the push.
- Stage 6: the Arabic parity rule in `check.ts` must allow the shared keys the Summary page
  uses (citations, notes, cross-references), not only `summary.*` keys. `X-Robots-Tag: noindex`
  on `mountain-report-dwt.pages.dev` plus canonical to pinecone.lu. Propose the WMO video to Dan
  before using it.
- Stage 7: `npm run check -- --pre-release` turns every TODO_SOURCE into a FAIL, including the
  word used in `docs/` files (brief, plan, handoff, content-notes, verification). Before
  release, either limit the rule to `src/` and `data/` or reword those mentions; ask Dan.

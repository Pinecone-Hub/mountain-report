# Handoff between sessions

Read this first in a new session, then `CLAUDE.md`, `docs/brief.md` (the full brief) and
`docs/plan.md` (Dan's changes to the brief, approved sources, decisions). Last updated
25 November 2026, end of stage 4.

## Status

| Stage | Status |
| --- | --- |
| 0 Repo, skeleton, deploy | done, pushed |
| 1 Design system and layout | done, pushed |
| 2 English content | done, verified (6 rounds, nothing open), pushed |
| 3 Report templates | done, reviewed, pushed |
| 4 Data and figures | done, verified by Dan, pushed (c5538c8), live |
| 5 Decap CMS | next, waiting for Dan's "ok" |
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
- Figure metadata: `src/content/<lang>/figures/<id>.yml` (schema in `src/content.config.ts`,
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

## Technical facts and gotchas

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
- The content-writer agent is blocked by a tool guard when writing `src/content/en/summary.md`;
  ask it to return the full file in its report and save it yourself with the Edit or Write tool
  (not a Python string replacement: that once broke a citation key).
- `.local-sources/` and `.playwright-mcp/` are in `.gitignore`.

## Open items for later stages

- Stage 5: `check.ts` rule FAIL for any file in `dist/` over 25 MiB (Cloudflare Pages limit).
  Decap config for the Figures collection (YAML in `src/content/<lang>/figures/`) and the
  Downloads page merge (generated figure files + Downloads entries; `downloadsFor()` in
  `src/lib/figure-store.ts` already handles replacements).
- Stage 6: the Arabic parity rule in `check.ts` must allow the shared keys the Summary page
  uses (citations, notes, cross-references), not only `summary.*` keys. `X-Robots-Tag: noindex`
  on `mountain-report-dwt.pages.dev` plus canonical to pinecone.lu. Propose the WMO video to Dan
  before using it.
- Stage 7: `npm run check -- --pre-release` turns every TODO_SOURCE into a FAIL, including the
  word used in `docs/` files (brief, plan, handoff, content-notes, verification). Before
  release, either limit the rule to `src/` and `data/` or reword those mentions; ask Dan.

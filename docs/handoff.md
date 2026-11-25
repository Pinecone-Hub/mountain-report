# Handoff between sessions

Read this first in a new session, then `CLAUDE.md`, `docs/brief.md` (the full brief) and
`docs/plan.md` (Dan's changes to the brief, approved sources, decisions). Last updated
25 November 2026, end of stage 3.

## Status

| Stage | Status |
| --- | --- |
| 0 Repo, skeleton, deploy | done, pushed |
| 1 Design system and layout | done, pushed |
| 2 English content | done, verified (6 rounds, nothing open), pushed |
| 3 Report templates | done, reviewed, pushed (check `git log origin/main..` for anything unpushed) |
| 4 Data and figures | next, waiting for Dan's "ok" |
| 5 Decap CMS | to do |
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
- Use the agents in `.claude/agents/`: builder implements, reviewer after every builder change,
  content-writer for text, source-verifier for facts (read-only), screenshot-reviewer for
  screenshots. Subagents start without context: their prompts must be self-contained.
- Never invent facts, figures, references or DOIs. Unknown = `TODO_SOURCE`.

## Stage 4 plan (data and figures)

From the brief and Dan's decisions:

1. Data: WGMS annual mass-change estimates, version **2026-02-10**, author "World Glacier
   Monitoring Service (WGMS)", DOI 10.5904/wgms-amce-2026-02-10 (key `wgms2026amce` in
   `src/data/references.json`), landing page https://wgms.ch/mass_change_estimates/. Terms: open
   access with correct citation. Store the original file(s) with a citation file in `data/raw/`
   and a small processed CSV in `data/`. Regions: global, Central Europe, the High Mountain Asia
   regions (Central Asia, South Asia West, South Asia East), Southern Andes. Chart period
   **1976 to 2025** (hydrological years). Downloading the data file is not a package install,
   but say what is downloaded and from where.
2. Interactive chart: own SVG plus a small TypeScript island, no chart library. Keyboard
   accessible, visible data table alternative, units, uncertainty if the data has it, source
   line, CSV download. Load the `dataviz` skill before writing chart code.
3. Other figures: static SVG generated from the data at build time.
4. Every figure: `<figure>`, `<figcaption>`, alt text, long description (aria-describedby or
   details), downloads PNG/SVG/CSV. Captions, alt text and long descriptions are content:
   content-writer writes them from the data, source-verifier checks the values.
5. Figures page: filter by chapter, accessible lightbox with native `<dialog>` (focus trap, Esc,
   return focus).
6. The two placeholders to replace are the `TODO_FIGURE:` paragraphs in
   `src/content/en/chapters/chapter-1.md` (about line 27: annual global glacier mass change (Gt)
   by hydrological year, 1976 to 2025; about line 45: cumulative specific mass change (m w.e.) by
   hydrological year for Central Europe, Central Asia, South Asia West and South Asia East). The
   text after the marker is an editorial note for stage 4, not reader text. The
   `figure-placeholder` plugin hides it and shows "Figure in preparation".
7. Figure files generated from data will appear automatically on the Downloads page (stage 5).
   Each entry in the Figures collection will get optional "Replacement PNG / SVG / CSV" fields.
   Keep the figure metadata in a form Decap can edit later.
8. Images/figures must pass the `check.ts` rules (alt, figure + figcaption) and the a11y tests.

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
- Stage 6: the Arabic parity rule in `check.ts` must allow the shared keys the Summary page
  uses (citations, notes, cross-references), not only `summary.*` keys. `X-Robots-Tag: noindex`
  on `mountain-report-dwt.pages.dev` plus canonical to pinecone.lu. Propose the WMO video to Dan
  before using it.
- Stage 7: `npm run check -- --pre-release` turns every TODO_SOURCE into a FAIL, including the
  word used in `docs/` files (brief, plan, handoff, content-notes, verification). Before
  release, either limit the rule to `src/` and `data/` or reword those mentions; ask Dan.

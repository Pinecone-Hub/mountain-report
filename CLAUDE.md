# Mountain Report demo

Portfolio demo of a static report microsite, "Climate Risks in High Mountain Regions", for a
WMO / IPCC AR7 website developer consultancy. Served at `https://pinecone.lu/mountain-report/`.
The build brief (pasted by Dan) is the source of truth; `docs/plan.md` is the approved plan.

## Language

- Talk to Dan in Romanian.
- Code, docs, commit messages and site content in English (British spelling, UN style), except
  the French and Arabic translations.
- Commit messages: plain, no `Co-Authored-By` trailer, no "Generated with" line.

## Stack

- Astro 7 (static output, base and `outDir: dist/<basePath>` from `report.config.json`,
  `trailingSlash: "always"`), TypeScript strict.
- Content: Astro content collections in Markdown, one folder per language (EN, FR complete; AR
  Summary only, RTL). Edited through Decap CMS (stage 5).
- Interactivity: small plain TypeScript islands. No UI framework, no chart library.
- Search: Pagefind. Tests: vitest (logic, plugins, Worker), Playwright + axe-core (a11y, PDF).
- Hosting: Cloudflare Pages project `mountain-report` (build `npm run build`, output `dist`),
  fronted by the Worker `mountain-report-proxy` (`worker/`) on `pinecone.lu/mountain-report*`.
  Must also build to static files deployable on LAMP (Apache `.htaccess`).
- Node: `.node-version` (24.21.0, same as Cloudflare Pages build).

## Reusable template

The site is a template for several report microsites with the same structure. One file,
`report.config.json` (validated by `src/config/report.ts`), sets title, short title, accent
colour, chapters, languages and base path. No report-specific literal (such as
"mountain-report") in code: a new report must need no code change. Documented in README,
"How to create a new report microsite".

## Downloads and video

- Downloads are a Decap-managed collection (full report PDF, one PDF per chapter, figure files
  PNG/SVG/CSV), each with title, language and date (editable), uploaded through the CMS media
  library. File size is computed at build time, never entered in Decap.
- Figure files generated from data (stage 4) appear in Downloads automatically. To replace one,
  the editor uses the optional "Replacement PNG / SVG / CSV" fields on that figure's entry in
  the Figures collection. The Downloads collection holds only PDFs (full report, chapters) and
  extra files. The Downloads page merges both at build time (generated files, overridden by
  any replacement, plus Downloads entries).
- Stage 5: `check.ts` FAILs on any file in `dist/` over 25 MiB.
- Demo PDFs are small, clearly marked placeholders. Cloudflare Pages limit: 25 MiB per file.
- No Playwright PDF generation. Keep the print stylesheet.
- Video component: YouTube (youtube-nocookie.com) or Vimeo (dnt=1), click-to-load with a local
  placeholder, video URL editable in Decap.

## Folder layout

```
src/            Astro pages, layouts, components, i18n, content
src/i18n/       translation strings (en, fr, ar)
scripts/        check.ts and build helpers (PDF, data)
worker/         Cloudflare Worker (proxy), own tsconfig and tests
data/           processed data; data/raw/ originals with citation
docs/           plan.md, sources.md, metrics.md
public/         static files (served under the base path)
.claude/agents/ builder, reviewer, content-writer, source-verifier, screenshot-reviewer
```

## Commands

- `npm run dev`, `npm run build`, `npm test` (worker tsc + vitest)
- `npm run check` (mechanical checks, `scripts/check.ts`); `npm run check -- --pre-release`
  turns TODO_SOURCE warnings into failures.
- `npm run test:a11y` (Playwright + axe, from stage 1)

## Rules

1. Everything the site serves lives under `/mountain-report/`. Build every URL from the base.
   Only exception at the `dist/` root: `_headers`, `_redirects`, `_routes.json`, `404.html`
   (Cloudflare Pages reads them only there).
2. No analytics, cookies or third-party scripts on public pages. `localStorage` only for the
   chosen language, inside `try/catch`.
3. External URL allowlist: doi.org, official source URLs in the references data,
   youtube-nocookie.com and player.vimeo.com with dnt=1 (after click only), Decap CDN (admin pages only, pinned + SRI),
   api.github.com / github.com (admin only), creativecommons.org.
4. No hardcoded visible text in components. All strings from `src/i18n/`.
5. WCAG 2.2 AA: `<main>`, skip link, one H1, real links, visible focus, `<figure>` +
   `<figcaption>` + alt + long description, native `<dialog>`, reduced motion respected,
   content works without JS. CSS logical properties only (RTL ready).
6. Design: neutral institutional look, one font family (plus Arabic companion), no gradients,
   glow or decorative italics. Demo banner on every page. No IPCC or WMO logos.
7. Never invent facts, figures, references, DOIs or quotes. Unknown = `TODO_SOURCE`.
8. No em-dash (U+2014) anywhere in content or UI strings.
9. Approved packages only: astro, typescript, @astrojs/check, @astrojs/sitemap, vitest,
   pagefind, playwright, @axe-core/playwright, wrangler, the @fontsource package of the chosen
   font, unist-util-visit. Anything else: ask Dan first, with its licence. Pin exact versions.
10. Never handle secrets in chat. Dan sets secrets in the Cloudflare dashboard.
11. Do not modify the Pinecone Tools repo or its Worker.
12. No commit or push until Dan has verified the change. If something fails twice, stop and ask.

## Working method

Eight stages (0 to 7). At the end of each stage, stop and report to Dan in Romanian (what was
done, build / tests / check / a11y results, manual steps for Dan, next stage), then wait for "ok".

Agents: `builder` implements; `reviewer` checks after every builder change (PASS/FAIL);
`content-writer` writes and translates; `source-verifier` checks claims and references
(read-only); `screenshot-reviewer` reviews screenshots Dan sends.

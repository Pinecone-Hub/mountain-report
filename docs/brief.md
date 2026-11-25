# Mountain Report demo: build brief

This is the build brief Dan gave at the start of the project on 25 November 2026, kept here
word for word so it survives between sessions. It is the source of truth. The changes Dan made
later (Downloads collection, YouTube and Vimeo video, reusable template, source decisions, "%"
style) are in `docs/plan.md`, and they take precedence over this text where the two differ.

Talk to Dan in Romanian. Write all code, docs, commit messages and site content in English
(British spelling, UN style), except the French and Arabic translations.

## 0. Context

I am applying (deadline 30 November 2026, 23:59) for a consultancy at WMO / IPCC: "Website
Developer" for the static microsites of the IPCC Seventh Assessment Report (AR7). They want static
report microsites, editable by non-technical staff through a headless CMS, accessible to UN
standards, multilingual, with basic SEO, and buildable as static files deployable on LAMP hosting.

This project is a portfolio demo of exactly that: a report microsite called "Climate Risks in High
Mountain Regions". It must be better than the current IPCC AR6 Synthesis Report microsite and the
WMO State of the Global Climate 2025 page on accessibility, performance, multilingual support and
editability. It will also be the basis of my 4-page technical proposal.

The plan approved by me is in docs/plan.md (I will paste it there). This brief is the source of
truth if they differ.

## 1. Working method

Work in the 8 stages below. At the end of each stage, stop and report to me in Romanian: what was
done, the result of build / tests / npm run check / a11y checks, what I must do manually, and what
the next stage will do. Wait for my "ok" before the next stage.

Use the agents in .claude/agents/: builder implements; reviewer checks after every builder change
(PASS/FAIL); content-writer writes and translates content; source-verifier checks every claim and
reference (read-only); screenshot-reviewer reviews screenshots I send.

Never invent facts, figures, references, DOIs or quotes. Unknown = TODO_SOURCE, listed in your
report. Never handle secrets in chat. When a secret is needed (GitHub OAuth client secret), give
me the exact steps and I set it myself. Do not add any npm package outside the approved list
(section 6) without asking me first, with its licence. If something fails twice, stop and tell
me. Do not loop on workarounds.

## 2. Stage 0: repository, skeleton, deploy (done)

Repository Pinecone-Hub/mountain-report (public, CC BY 4.0, "Dan Butuc / Pinecone Hub"), Astro
static under /mountain-report/, scripts/check.ts, GitHub Actions, Cloudflare Pages project
mountain-report (subdomain mountain-report-dwt.pages.dev), Worker mountain-report-proxy in
worker/ on pinecone.lu/mountain-report*. Do not modify the Pinecone Tools repo or its Worker.

check.ts rules from the brief: nothing in dist/ outside /mountain-report/, no *.md in dist/; every
<img> has alt, every figure has <figure> + <figcaption>; translation key parity (EN/FR complete; AR
only for the Summary keys); no hardcoded visible text in components; no external URL except the
allowlist; no em-dash (U+2014) in content or UI strings; every cited reference key exists in the
references data, every reference has a DOI or an official URL; TODO_SOURCE is a WARN, and a FAIL
with --pre-release.

## 3. Stages 1 to 7

### Stage 1: design system and layout (done)

Neutral UN/institutional look, Noto Sans + Noto Sans Arabic self-hosted, colours as CSS variables
with WCAG 2.2 AA contrast, CSS logical properties, header, demo banner on every page ("Demo content
for portfolio purposes. Not a scientific assessment. Not affiliated with the IPCC or WMO."),
footer (licence, sources, "Built by Dan Butuc / Pinecone Hub", accessibility statement link),
sticky TOC, skip link, <main>, breadcrumbs, Home with hero, key messages, tiles, "Download full
report". Temporary illustrations: simple SVG (topographic contour lines, glacier outlines drawn
from data), nothing that looks generated.

### Stage 2: English content (done)

Summary (~800 words, headlines A/B/C with sub-points), 3 chapters, FAQ, glossary, About. Sources:
only the approved list in docs/plan.md. Paraphrase fully. Calibrated IPCC language only where the
source itself uses it. Section numbering and cross-references {1.2}.

### Stage 3: report templates (done)

Content collections per language, own plugins for {1.2}, [@key] footnotes, calibrated terms with
tooltips; collapsible sections, previous/next, How to cite (plain + BibTeX, copy button), share
links (plain links, no third-party scripts), Authors collapsible, FAQ accordion, glossary with
anchors.

### Stage 4: data and figures

- Download the WGMS annual mass-change estimates (global and selected regions: Central Europe,
  High Mountain Asia regions, Southern Andes), store the original file with its citation in
  data/raw/, and a small processed CSV in data/.
- Interactive chart: own SVG + small TypeScript island (no chart library), keyboard accessible,
  with a visible data table alternative, units, uncertainty if available, source line, and CSV
  download.
- Other figures: static SVG generated from the data at build time.
- Every figure: <figure>, <figcaption>, alt text, long description (aria-describedby or details),
  download PNG/SVG/CSV.
- Figures page: filter by chapter, accessible lightbox with native <dialog> (focus trap, Esc,
  return focus).

### Stage 5: CMS (Decap)

- /mountain-report/admin/: Decap CMS, backend GitHub (Pinecone-Hub/mountain-report, branch main),
  editorial workflow (draft, in review, ready), i18n multiple_folders EN/FR, collections for
  Summary, chapters, figures metadata, FAQ, glossary, references, site settings. Media folder for
  images.
- OAuth through Cloudflare Pages Functions under /mountain-report/api/auth and
  /mountain-report/api/callback (GET only, compatible with the Worker). base_url:
  https://pinecone.lu, auth_endpoint: mountain-report/api/auth. Env vars GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET set by me in the Pages project. Give me the exact steps to create the
  GitHub OAuth App in the Pinecone-Hub organisation (callback URL
  https://pinecone.lu/mountain-report/api/callback).
- /mountain-report/admin-demo/: same config with the test-repo backend, no login, banner "Changes
  are not saved". This is what evaluators will try.
- Decap is loaded only on the admin pages, from a pinned CDN version with SRI. noindex on admin
  pages.
- A short editor guide (/mountain-report/admin-guide/ or in About): how a non-technical editor
  adds a section, a figure, a reference.

### Stage 6: translations and remaining pages

- French: complete site (UI + content), by content-writer, checked by source-verifier for meaning.
- Arabic: Summary only, dir="rtl", marked "Machine-translated for demonstration", layout checked
  in RTL.
- Language switcher with hreflang (en, fr, ar for the Summary, x-default -> en), <html lang> and
  dir correct. URLs /mountain-report/en/..., /fr/..., /ar/summary/. Root /mountain-report/ -> /en/
  (Pages _redirects and Apache .htaccess), plus a static fallback page with links.
- Pagefind search (static), per language, under the base path.
- Video: one public WMO video from WMO's official YouTube channel on glaciers or the cryosphere.
  Propose it to me before using it. Click-to-load with a local placeholder (no request to YouTube
  before the click), youtube-nocookie.com, descriptive title, link to the original.
- Downloads: print stylesheet, and one "Full report" PDF generated from the print view with
  Playwright at build (script in scripts/), plus the CSV data. [Replaced: see docs/plan.md,
  Downloads collection managed in Decap.]
- SEO: unique title/description per page and language, canonical, Open Graph, JSON-LD (Report /
  ScholarlyArticle as appropriate, BreadcrumbList), sitemap.
- 404 page, Accessibility statement (WCAG 2.2 AA target, how tested, known limits, contact).
- LAMP: .htaccess (404, caching, MIME types, root redirect). Test the built dist/ on Apache in
  Docker (httpd) and report the result.

### Stage 7: QA and release

- Playwright + axe-core on every page (EN, FR, AR Summary): 0 violations at WCAG 2.2 AA level.
  Keyboard-only walkthrough of tiles, TOC, footnotes, tooltips, lightbox, chart, search, language
  switcher.
- Lighthouse (mobile) on Home, Summary and one chapter. Record scores.
- Measure and write docs/metrics.md with this comparison (fill the Demo column with measured
  values):

| | IPCC AR6 SYR | WMO SoGC 2025 | Demo |
| --- | --- | --- | --- |
| Stack | Gatsby 4.19 + CMS | Drupal + ArcGIS StoryMap | Astro static + Decap CMS |
| Images with alt text | 0 of 97 (SPM page) | 21 of 37 | |
| <main> / skip link | no / no | yes / yes | |
| Languages | EN only on page | 6 UN languages | |
| Interactive | figures in modal | external StoryMap | |
| Summary page weight | ~3.3 MB | - | target < 500 KB |

- npm run check -- --pre-release must pass (no TODO_SOURCE).
- Final deploy, README (what it is, stack, how to run, how to edit, licence and sources).

## 4. Site map

```
/mountain-report/                -> redirect to /en/
/mountain-report/en/             Home
/mountain-report/en/summary/     Summary for Decision-Makers
/mountain-report/en/chapter-1/   Glacier retreat
/mountain-report/en/chapter-2/   Hazards
/mountain-report/en/chapter-3/   Impacts and adaptation
/mountain-report/en/figures/
/mountain-report/en/downloads/
/mountain-report/en/faq/
/mountain-report/en/glossary/
/mountain-report/en/about/
/mountain-report/en/accessibility/
/mountain-report/en/search/
(same under /fr/; /ar/summary/ only)
/mountain-report/admin/          Decap (GitHub login)
/mountain-report/admin-demo/     Decap (test-repo, no login)
/mountain-report/404.html
```

## 5. Content and style rules

Plain, factual institutional English. Short sentences. No em-dash. No marketing tone, no
rhetorical triads, no "delve", "crucial", "landscape of", "in today's world". Every factual
statement carries a citation. Numbers exactly as in the source, with units and uncertainty. No
IPCC or WMO logos, names only in citations and in the "not affiliated" banner. My photos (added
later in assets/photos/): optimise with astro:assets (AVIF/WebP, responsive), strip all EXIF/GPS,
alt text and credit "Photo: Dan Butuc".

## 6. Technical rules

- Approved packages: astro, typescript, @astrojs/check, @astrojs/sitemap, vitest, pagefind,
  playwright + @axe-core/playwright (dev only), wrangler (dev only), the @fontsource package of
  the chosen open font (or self-hosted font files), unist-util-visit if needed for the plugins.
  Anything else: ask me. (Since added with Dan's approval: satteri, @astrojs/markdown-satteri,
  @types/hast, all MIT.)
- Decap CMS only via pinned CDN script with SRI, only on admin pages.
- No analytics, no cookies, no third-party scripts on public pages. localStorage only for the
  chosen language, in try/catch.
- External URL allowlist: doi.org, the official source URLs in the references data,
  youtube-nocookie.com (only after click), player.vimeo.com (only after click), the Decap CDN
  (admin pages only), api.github.com / github.com (admin only), creativecommons.org.
- JavaScript only where needed (chart, lightbox, TOC highlight, tooltips, search, video, copy
  button). Content must work without JS.
- Respect prefers-reduced-motion. Visible focus on everything.
- Node version in .node-version, the same as Cloudflare Pages uses.

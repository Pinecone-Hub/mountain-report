# Climate Risks in High Mountain Regions (demo report microsite)

Demo content for portfolio purposes. Not a scientific assessment. Not affiliated with the IPCC
or WMO.

## What it is

A static report microsite, in the style of an assessment report website: a Summary for
Decision-Makers, three chapters, figures generated from open data, downloads, FAQ, glossary,
search, and an accessibility statement. It is edited through a browser-based content editor
(Decap CMS) that saves to Git. Live at `https://pinecone.lu/mountain-report/`.

- Languages: English and French in full, the Summary in Arabic (right to left, machine-translated
  for the demo and marked as such).
- Accessibility: WCAG 2.2 AA as the target; axe-core finds no violations on any page at two
  viewports. See the Accessibility statement page and `docs/metrics.md`.
- No analytics, cookies or third-party scripts on public pages. Videos load only after a click,
  from youtube-nocookie.com or player.vimeo.com with `dnt=1`.
- Measured results (page weight, Lighthouse scores, comparison with two reference sites):
  `docs/metrics.md`.

The site is also a template: a new report with the same structure needs one configuration
file and new content, and no code change (see "How to create a new report microsite").

## Stack

| Part | Choice |
| --- | --- |
| Site generator | Astro 7, static output, TypeScript strict |
| Content | Markdown and YAML in Astro content collections, one folder per language |
| Editor | Decap CMS 3.18 (pinned, Subresource Integrity), GitHub backend, editorial workflow |
| Interactivity | Small plain TypeScript islands (chart slider, figure lightbox, search, tooltips); no UI framework, no chart library |
| Charts | SVG generated at build time from the data; PNG copies made locally |
| Search | Pagefind 1.6 (static index built after Astro) |
| Font | Noto Sans and Noto Sans Arabic, self-hosted (SIL OFL 1.1) |
| Tests | vitest (logic, Markdown plugins, Worker, OAuth), Playwright + axe-core (accessibility, keyboard), a Decap round trip, an Apache test in Docker |
| Hosting | Cloudflare Pages, behind a Cloudflare Worker that serves the site under a path of an existing domain; also deployable on any Apache (LAMP) host |

Node version: `.node-version` (24.21.0, the same as the Cloudflare Pages build).

## How to run

```
npm ci
npm run dev            # local development server
npm run build          # astro check, astro build, then 404, _redirects, _headers, .htaccess, Pagefind
npm run preview        # serve the built site
```

Checks and tests:

| Command | What it does |
| --- | --- |
| `npm test` | Type-checks the Worker and OAuth code, then runs vitest |
| `npm run check` | Mechanical checks over the sources and `dist/` (links, base path, allowlist, em-dash, file sizes, stale data or PNGs, TODO_SOURCE) |
| `npm run check -- --pre-release` | Same, with any `TODO_SOURCE` in `src/` or `data/` as a failure |
| `npm run test:a11y` | axe-core on every built page at desktop and mobile size, plus keyboard checks (skip link, home tiles, table of contents, footnotes, citations, tooltips, chart slider, lightbox, FAQ, search, language switcher, video) |
| `npm run test:cms` | Saves every entry through the demo editor and checks that no file changes |
| `npm run test:apache` | Serves `dist/` with Apache (image `httpd:2.4`) using only the generated `.htaccess`; needs Docker running |

Run `npm run build` before `check`, `test:a11y`, `test:cms` and `test:apache`.

## How to edit

- **Editor:** `<base>/admin/` (GitHub login; changes go through the editorial workflow as draft
  branches named `cms/<collection>/<slug>`, then published to `main`, which triggers a Pages
  build). `<base>/admin-demo/` is the same editor on a test backend: it shows the real content
  and saves nothing, so anyone can try it.
- **Editor guide:** `<base>/admin-guide/` (from `src/content/guide/en.md`): opening the editor,
  review before publishing, adding a section, a figure, a reference or a PDF.
- **Content file format:** Decap's output is the standard for `src/content/**`,
  `src/data/references.json` and `report.config.json`. After editing these files by hand, run
  `npm run build && npm run cms:normalise`; `npm run test:cms` fails if a save in the editor would
  change any file.
- **Downloads:** PDFs and extra files are entries in the Downloads collection (title, language,
  date, file); the file size is computed at build time. Figure files (SVG, CSV, PNG) are generated
  and listed automatically; an editor can replace one through the optional replacement fields of
  that figure's entry.
- **Figures from data:** after a change to the data, the figure metadata or the chart code, run
  `npm run build && npm run figures:png && npm run build` and commit `public/downloads/figures/`
  and `data/figure-png.json` (the Pages build has no browser to make PNGs). `npm run check` fails
  on a missing or stale PNG.
- **Source data:** originals that may not be redistributed stay local in `data/raw/` (ignored by
  Git) with a `SOURCE.md` (citation, download link, SHA-256 of each file). `npm run data` checks
  the hashes and writes the processed CSV in `data/`, which is committed.
- **Video:** the Home page front matter holds the video URL, title and publisher (editable in
  Decap). YouTube and Vimeo are supported, click-to-load with a local placeholder.

## How to create a new report microsite

1. Copy the repository (or use it as a GitHub template) under a new name.
2. Edit `report.config.json` (validated by `src/config/report.ts`; the build stops on an error):
   - `id`, `title` and `shortTitle` per language, `accentColour` (`npm run check` fails if it
     does not meet AA contrast), `citation`, `authors`;
   - `chapters`: id, number and title per language;
   - `languages`: code, direction (`ltr` or `rtl`), scope (`full`, or `summary` for a language
     with only the Summary), one `default`;
   - `site` (origin of the public domain), `basePath` (for example `/new-report`);
   - `cms.repo` and `cms.branch` (the GitHub repository Decap writes to).
3. Replace the content: `src/content/pages/<lang>/`, `src/content/chapters/<lang>/`,
   `src/content/figures/<lang>/`, `src/content/downloads/`, `src/data/references.json`, and the
   data in `data/` with its processing settings in `data/processing.json`. UI strings for a new
   language go in `src/i18n/<lang>.json` (copy `en.json`).
4. Cloudflare Pages: create a project connected to the new repository, build command
   `npm run build`, output directory `dist`, Node version from `.node-version`.
5. Worker: in `worker/wrangler.toml` set `name`, the route (`<domain>/<basePath>*`),
   `PAGES_ORIGIN` (the project's `*.pages.dev` address) and `BASE_PATH` (equal to `basePath`;
   `npm run check` compares them). Deploy with `npx wrangler deploy` from `worker/`. The Worker
   also removes the `X-Robots-Tag: noindex` header that `_headers` sets for the `pages.dev` host.
6. OAuth for the editor: create a GitHub OAuth App with the callback URL
   `<site><basePath>/api/callback`. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as
   environment variables of the Pages project (Production), in the Cloudflare dashboard. The
   secret never goes in the repository.
7. Run the checks (`npm run build`, `npm test`, `npm run check -- --pre-release`,
   `npm run test:a11y`, `npm run test:cms`) before the first release.

No code file contains a report-specific literal: names, paths and colours all come from
`report.config.json`.

## Release order

1. If the Worker changed: `npx wrangler deploy` from `worker/` first (otherwise the public
   domain can be served with the `noindex` header or without the new routes).
2. Push to `main`. The Pages build starts by itself; confirm that the deployment ran and that
   the live page shows the new version.

## Hosting limits

Cloudflare Pages accepts files of at most 25 MiB each. Every downloadable file (report PDFs,
chapter PDFs, figure files) must stay under that limit. The placeholder PDFs in this demo are a
few kilobytes each. `npm run check` fails on any file in `dist/` larger than 25 MiB
(26,214,400 bytes).

## LAMP (Apache) deployment

The build writes `dist<basePath>/.htaccess` (404 page, the language redirect from the base path,
caching and content types). Copy the contents of `dist<basePath>/` to the matching folder of the
web root (for example `public_html/mountain-report/`) on an Apache 2.4 host that allows
`.htaccess` overrides (`AllowOverride All`, or at least FileInfo, Indexes and Limit; it uses
`mod_alias`, `mod_mime` and `mod_headers` when present). The files at the `dist/` root (`_headers`, `_redirects`,
`_routes.json`) are for Cloudflare Pages only. The content editor needs the OAuth Functions
and is not available on a plain Apache host; the public site is. `npm run test:apache` checks
this set-up in Docker.

## Licence and sources

- Code and original content: CC BY 4.0, "Dan Butuc / Pinecone Hub" (`LICENSE`).
- Data: WGMS annual mass-change estimates (version 2026-02-10),
  doi:10.5904/wgms-amce-2026-02-10, open access with citation.
- Fonts: Noto Sans and Noto Sans Arabic, SIL Open Font License 1.1.
- Cited works are cited, never reproduced. The full list of third-party terms is in
  `docs/sources.md`; the reference list is in `src/data/references.json`.

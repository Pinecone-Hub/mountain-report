# Metrics

Measured on 26 November 2026. The reference columns (IPCC AR6 SYR, WMO State of Global Climate
2025) are the values given in the build brief; only the Demo column was measured here.

## Comparison

| | IPCC AR6 SYR | WMO SoGC 2025 | Demo |
| --- | --- | --- | --- |
| Stack | Gatsby 4.19 + CMS | Drupal + ArcGIS StoryMap | Astro 7 static + Decap CMS 3.18 |
| Images with alt text | 0 of 97 (SPM page) | 21 of 37 | 24 of 24 site-wide, 12 per language (Summary page: no images). The site has no `<img>` elements; every figure is an inline SVG with `role="img"` and an accessible name, plus caption, long description and data table |
| `<main>` / skip link | no / no | yes / yes | yes / yes, on all 25 public pages (exactly one `<main>` and one H1 each) |
| Languages | EN only on page | 6 UN languages | 3: English and French complete, Arabic Summary (right to left) |
| Interactive | figures in modal | external StoryMap | inline chart with keyboard slider, figure lightbox (native `<dialog>`), full-text search (Pagefind), calibrated-term tooltips, click-to-load video |
| Summary page weight | ~3.3 MB | - | 52 KB transferred (target < 500 KB) |

## Lighthouse (mobile)

Lighthouse 13.6.0 (`npx -y lighthouse@13.6.0`, not a project dependency), default mobile
settings (`--form-factor=mobile`, mobile emulation, simulated throttling), headless Chrome,
against the live site on 26 November 2026 after the stage 7 release (commit 69256fb).

| Page | Performance | Accessibility | Best practices | SEO | CLS | LCP | Transfer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home (`/en/`) | 100 | 100 | 100 | 100 | 0 | 0.9 s | 58 KiB |
| Summary (`/en/summary/`) | 100 | 100 | 100 | 100 | 0 | 0.9 s | 53 KiB |
| Chapter 1 (`/en/chapter-1/`) | 100 | 100 | 100 | 100 | 0 | 0.9 s | 67 KiB |

Before the stage 7 font fix, the live Summary scored 83 and Chapter 1 88 for Performance (all
other categories 100), lost only on Cumulative Layout Shift (0.36 and 0.23): the web font
replaced the fallback font after the first paint. Stage 7 adds a preload for the Latin font
file (left-to-right pages only) and a fallback face whose metrics match Noto Sans (from the
font's own tables, and a width ratio measured in the browser).

## How each value was measured

- **Images with alt text, `<main>`, skip link, H1:** Playwright (Chromium) opened every public
  page on the live site (12 EN, 12 FR, Arabic Summary; all answered 200) and counted `<img>`
  elements (with and without `alt`), `svg[role="img"]` with `aria-label` or
  `aria-labelledby`, `<main>`, `<h1>` and a skip link to `#main`. Each figure is drawn twice (a wide and a narrow SVG): Chapter 1
  has 4 labelled chart images and the Figures page 8, in each of English and French.
- **Page weight:** Playwright (Chromium), new browser context, cache disabled, viewport
  412 x 823, `https://pinecone.lu/mountain-report/en/summary/` loaded until network idle, sum of
  `encodedDataLength` from the Chrome DevTools Protocol `Network.loadingFinished` events (bytes
  on the wire, compressed). Three runs: 52,129, 52,117 and 52,174 bytes, 3 requests. For comparison, Home 57 KB and Chapter 1 66 KB with the same method.
- **Lighthouse:** run against the live site (`https://pinecone.lu/mountain-report/`).
- **Accessibility tests:** `npm run test:a11y`: axe-core (WCAG 2.0, 2.1, 2.2, levels A and AA)
  on 28 built pages at desktop and mobile viewports, 0 violations; plus scripted keyboard checks
  of the skip link, home tiles, table of contents, footnotes, citations, tooltips, chart slider,
  lightbox, FAQ, copy buttons, search, language switcher and video.
- **Pre-release check:** `npm run check -- --pre-release`: 0 FAIL, 0 WARN (no `TODO_SOURCE` in
  `src/` or `data/`).

## Known limitations (accepted for the demo)

- The Arabic Summary was machine-translated. Its terms for the IPCC calibrated language are not
  confirmed against an Arabic IPCC text, so on the Arabic page they stay plain italics,
  without the calibrated-term styling.
- French Chapter 2 (section 2.4.1) translates "displacement wave" as "vague de déplacement".
  This term was not checked against a French glossary.
- The Arabic Summary uses words from the same root for rock fall, rock failure and rock
  avalanche, so the distinction between these three is weaker than in English and French.
- The downloadable PDFs are small placeholders, not tagged for accessibility.

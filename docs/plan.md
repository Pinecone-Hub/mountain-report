# Plan

The approved plan is to be pasted here by Dan. The build brief is the source of truth where they
differ. The changes below amend the brief and apply from now on.

## Approved sources (stage 2)

Only these sources, unless Dan approves more. Copied from the build brief.

1. WMO, State of the Global Climate 2025 (March 2026), wmo.int.
2. Dussaillant, I. et al. (2025), Annual mass-change estimates for the world's glaciers, WGMS,
   doi:10.5904/wgms-amce-2025-02b. Paper: ESSD 17(5), 1977-2006, doi:10.5194/essd-17-1977-2025.
3. The GlaMBIE Team (2025), Community estimate of global glacier mass changes from 2000 to 2023,
   Nature 639, 382-388, doi:10.1038/s41586-024-08545-z.
4. Zemp, M. et al. (2026), Global glacier mass change in 2025, Nature Reviews Earth &
   Environment, doi:10.1038/s43017-026-00777-z.
5. Hock, R., Rasul, G. et al. (2019), High Mountain Areas, IPCC SROCC Chapter 2,
   doi:10.1017/9781009157964.004. Cite only, never reproduce text or figures.
6. Blatten (28 May 2025): EGU General Assembly 2026 abstracts EGU26-19777 and EGU26-6599
   (Copernicus meeting organizer).
7. Thame GLOF (16 August 2024): ICIMOD study and press release, October 2025, icimod.org.

Rules: paraphrase fully, no sentence or figure copied. Calibrated IPCC language only where the
source itself uses it for that statement. Numbers exactly as in the source, with units and
uncertainty. Unknown = `TODO_SOURCE`.

### Source decisions (25 November 2026, Dan)

The sources take priority over the brief's wording:

- WGMS dataset: version 2026-02-10 (currently recommended by WGMS), author "World Glacier
  Monitoring Service (WGMS)", DOI as given on the WGMS page. The stage 4 chart covers 1976 to
  2025.
- Zemp et al. (2026): author "The WGMS Network", Nature Reviews Earth & Environment 7,
  213-215, online 7 April 2026.
- GlaMBIE (2025): Nature 639 (8054), 382-388, online 19 February 2025.
- SROCC Chapter 2: cited as recommended in the chapter PDF (Hock et al., 2019, pp. 131-202),
  DOI 10.1017/9781009157964.004. Cambridge lists the 2022 edition year (noted in
  `docs/content-notes.md`).
- ICIMOD Thame study: 24 September 2025, ICIMOD and NDRRMA, doi:10.53055/ICIMOD.1101. The
  press release is dated 14 October 2025.
- Style: "%" (IPCC convention) in text and tables, no space ("41%").

## Decisions

### Fonts (stage 1, 25 November 2026)

Computed fonts, inspected in a browser on 25 November 2026:

| Site | Fonts | Licence |
| --- | --- | --- |
| wmo.int | Montserrat (variable, 200 to 700), from Google Fonts | SIL OFL 1.1 |
| ipcc.ch (home page and AR6 SYR microsite) | IPCCSans and IPCCSerif, self-hosted by the IPCC; secondary: Roboto, Roboto Condensed, Lora (Google Fonts) | IPCCSans and IPCCSerif: proprietary, no open licence published. Roboto, Lora: open |

Choice: Noto Sans with Noto Sans Arabic (SIL OFL 1.1), self-hosted through
`@fontsource-variable`, subset, `font-display: swap`.

Reasons:
- The IPCC fonts are not open, so they cannot be used.
- Montserrat is open, but its wide geometric letterforms read less well in long report text,
  and it has no Arabic.
- The Noto family covers all six UN languages (Arabic, Chinese, English, French, Russian,
  Spanish) with one consistent design. This matters for a template meant for several
  multilingual report microsites.

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

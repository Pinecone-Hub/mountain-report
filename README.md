# Climate Risks in High Mountain Regions (demo report microsite)

Demo content for portfolio purposes. Not a scientific assessment. Not affiliated with the IPCC
or WMO.

A static report microsite built with Astro and edited through Decap CMS. Served at
`https://pinecone.lu/mountain-report/`. The full README (stack, how to run, how to edit, how to
create a new report microsite, licence and sources) is written in stage 7.

## How to create a new report microsite

The full guide is written in stage 7. Steps that already apply:

- Report identity (title, short title, accent colour, chapters, languages, base path) is set in
  `report.config.json` only; no code change is needed.
- Data figures are generated from the data at build time (SVG and CSV). The PNG versions are
  made locally, because the Cloudflare Pages build has no browser. After any change to the data,
  the figure metadata (`src/content/figures/<lang>/`) or the chart code, run:

  ```
  npm run build && npm run figures:png && npm run build
  ```

  and commit `public/downloads/figures/` and `data/figure-png.json`. `npm run check` fails when a
  PNG is missing or older than its SVG.
- Source data: original files that may not be redistributed stay local in `data/raw/` (ignored by
  git), with a `SOURCE.md` giving the citation, download link and SHA-256 of each file.
  `npm run data` checks the hashes and writes the processed CSV in `data/`, which is committed.

## Hosting limits

Cloudflare Pages accepts files of at most 25 MiB each. Every downloadable file (report PDFs,
chapter PDFs, figure files) must stay under that limit. The placeholder PDFs in this demo are a
few kilobytes each. `npm run check` fails on any file in `dist/` larger than 25 MiB
(26,214,400 bytes).

## Content editor (Decap CMS)

- `<base>/admin/` is the editor (GitHub backend, editorial workflow). `<base>/admin-demo/` is the
  same editor on a test backend: it shows the real content and saves nothing.
- Both read a generated `config.yml` (`src/lib/cms-config.ts`, from `report.config.json`: the
  `cms` block holds the GitHub repository and branch). Decap is loaded only on these two pages,
  from a pinned version with Subresource Integrity (`src/lib/decap.ts`).
- Placeholder PDFs for the Downloads page: `node --experimental-strip-types
  scripts/placeholder-pdfs.ts` writes them to `public/media/downloads/`.
- File format: Decap rewrites `src/content/**`, `src/data/references.json` and `report.config.json`
  in its own format on every save, so that format is the standard. After hand edits run
  `npm run build && npm run cms:normalise`; `npm run test:cms` (round trip through the demo
  editor, needs a build) fails if a save would change any file.
- The editor guide is `<base>/admin-guide/` (`src/content/guide/en.md`).

## Licence

CC BY 4.0, "Dan Butuc / Pinecone Hub". Third-party data keep their own terms: see
`docs/sources.md`.

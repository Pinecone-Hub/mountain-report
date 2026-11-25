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
  the figure metadata (`src/content/<lang>/figures/`) or the chart code, run:

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
few kilobytes each.

## Licence

CC BY 4.0, "Dan Butuc / Pinecone Hub". Third-party data keep their own terms: see
`docs/sources.md`.

// Content collections (Astro content layer). One folder per language: src/content/<lang>/...
//
// Front matter, kept simple because Decap CMS edits it:
//   title        page title (the H1 of the page)
//   description  one sentence for the page summary
//   lang         language code, same as the folder name
//   id           page id, same as the file name without extension
//   chapter      chapters only: the chapter number, as in report.config.json
// Body text uses [@key] citations, {1.2} cross-references and *calibrated terms* in italics.
// The Home page holds its key messages as a numbered list in the body; each ends with a
// cross-reference to the Summary headline, such as {A}.
//
// Figures (src/content/<lang>/figures/<id>.yml) are data entries, not Markdown: see the schema
// below. A chapter places a figure with a paragraph "FIGURE: <id>" (src/plugins/figures.ts).
//
// A language folder that does not exist yet (French for now) has no entries: its pages show
// the "in preparation" stub with a link to the English page.

import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";

const base = "./src/content";
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.md$/, "");

const page = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  lang: z.string().min(2),
  id: z.string().min(1),
});

const chapterPage = page.extend({ chapter: z.number().int().positive() });

const references = defineCollection({
  loader: file("src/data/references.json", {
    parser: (text) => (JSON.parse(text) as Array<{ key: string }>).map((reference) => ({ id: reference.key, ...reference })),
  }),
  schema: z.object({
    key: z.string(),
    type: z.string(),
    authors: z.string(),
    year: z.union([z.number(), z.string()]),
    title: z.string(),
    container: z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    pages: z.string().optional(),
    publisher: z.string().optional(),
    doi: z.string().optional(),
    url: z.string().optional(),
    accessed: z.string().optional(),
  }),
});

// One data figure. chartType and measure pick the renderer (src/lib/figures.ts); series are
// ids in data/glacier-mass-change.csv. The replacement fields are optional paths below public/
// (such as "media/figures/fig-1-1.png") of files uploaded in the CMS that replace the files
// generated from the data.
const figure = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  chapter: z.string().min(1),
  number: z.string().regex(/^\d+\.\d+$/),
  section: z.string().optional(),
  chartType: z.enum(["bars", "cumulative-lines"]),
  measure: z.enum(["gt", "mwe"]),
  series: z.array(z.string().min(1)).min(1),
  source: z.array(z.string().min(1)).min(1),
  title: z.string().min(1),
  caption: z.string().min(1),
  alt: z.string().min(1).max(250),
  longDescription: z.string().min(1),
  replacementPng: z.string().optional(),
  replacementSvg: z.string().optional(),
  replacementCsv: z.string().optional(),
});

const pages = (pattern: string) => glob({ base, pattern, generateId });

export const collections = {
  summary: defineCollection({ loader: pages("*/summary.md"), schema: page }),
  chapters: defineCollection({ loader: pages("*/chapters/*.md"), schema: chapterPage }),
  faq: defineCollection({ loader: pages("*/faq.md"), schema: page }),
  glossary: defineCollection({ loader: pages("*/glossary.md"), schema: page }),
  about: defineCollection({ loader: pages("*/about.md"), schema: page }),
  home: defineCollection({ loader: pages("*/home.md"), schema: page }),
  figures: defineCollection({
    loader: glob({ base, pattern: "*/figures/*.yml", generateId: ({ entry }) => entry.replace(/\.yml$/, "").replace("/figures/", "/") }),
    schema: figure,
  }),
  references,
};

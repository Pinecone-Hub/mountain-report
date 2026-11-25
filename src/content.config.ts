// Content collections (Astro content layer). Layout: src/content/<collection>/<lang>/<file>, the
// way Decap CMS stores entries with i18n "multiple_folders". Collections: "chapters" (the
// chapter pages), "figures" (data entries) and "pages" (home, summary, faq, glossary, about).
// Entry ids do not show the folder order: they stay "<lang>/<page>" (such as en/summary), and
// "<lang>/chapters/<slug>" for chapters (en/chapters/chapter-1).
//
// Front matter, kept simple because Decap CMS edits it:
//   title        page title (the H1 of the page)
//   description  one sentence for the page summary
//   lang, id     optional, redundant with the path (language folder and file name). Decap CMS cannot
//                set them per language, so it does not write them; older files may still have them.
//   chapter      chapters only: the chapter number, as in report.config.json
// Body text uses [@key] citations, {1.2} cross-references and *calibrated terms* in italics.
// The Home page holds its key messages as a numbered list in the body; each ends with a
// cross-reference to the Summary headline, such as {A}.
//
// Downloads (src/content/downloads/<slug>.yml) are data entries too: see the schema below.
//
// Figures (src/content/figures/<lang>/<id>.yml) are data entries, not Markdown: see the schema
// below. A chapter places a figure with a paragraph "FIGURE: <id>" (src/plugins/figures.ts).
//
// A language folder that does not exist yet (French for now) has no entries: its pages show
// the "in preparation" stub with a link to the English page.

import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { skipUntranslated } from "./lib/content-loader";

const base = "./src/content";
// "en/summary.md" (in pages) -> "en/summary".
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.md$/, "");
// "en/chapter-1.md" (in chapters) -> "en/chapters/chapter-1".
const chapterId = ({ entry }: { entry: string }) => entry.replace(/\.md$/, "").replace(/^([^/]+)\//, "$1/chapters/");
// "en/fig-1-1.yml" (in figures) -> "en/fig-1-1".
const figureId = ({ entry }: { entry: string }) => entry.replace(/\.yml$/, "");

const page = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  lang: z.string().min(2).optional(),
  id: z.string().min(1).optional(),
});

const chapterPage = page.extend({ chapter: z.number().int().positive() });

const references = defineCollection({
  loader: file("src/data/references.json", {
    parser: (text) => (JSON.parse(text) as { references: Array<{ key: string }> }).references.map((reference) => ({ id: reference.key, ...reference })),
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

// A download listed on the Downloads page (src/content/downloads/<slug>.yml, edited in Decap).
// "file" is a path below public/ without a leading slash, such as "media/downloads/report.pdf".
// The size is computed at build time. Decap writes the date quoted, but an unquoted YAML date is
// read as a Date, so both are accepted and normalised to YYYY-MM-DD.
const download = z.object({
  title: z.string().min(1),
  lang: z.string().min(2),
  date: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()])
    .transform((d) => (typeof d === "string" ? d : d.toISOString().slice(0, 10))),
  kind: z.enum(["full-report", "chapter", "other"]),
  chapter: z.string().min(1).optional(),
  file: z.string().min(1).regex(/^(?!\/)(?!.*\.\.)/, "file must be a path below public/ without a leading slash"),
});

// The loaders of the translated collections skip the stub files Decap writes for languages with no
// translation yet (src/lib/content-loader.ts).
const pages = (pattern: string) => skipUntranslated(glob({ base: `${base}/pages`, pattern, generateId }));

export const collections = {
  summary: defineCollection({ loader: pages("*/summary.md"), schema: page }),
  chapters: defineCollection({ loader: skipUntranslated(glob({ base: `${base}/chapters`, pattern: "*/*.md", generateId: chapterId })), schema: chapterPage }),
  faq: defineCollection({ loader: pages("*/faq.md"), schema: page }),
  glossary: defineCollection({ loader: pages("*/glossary.md"), schema: page }),
  about: defineCollection({ loader: pages("*/about.md"), schema: page }),
  home: defineCollection({ loader: pages("*/home.md"), schema: page }),
  figures: defineCollection({
    loader: skipUntranslated(glob({ base: `${base}/figures`, pattern: "*/*.yml", generateId: figureId })),
    schema: figure,
  }),
  downloads: defineCollection({ loader: glob({ base: `${base}/downloads`, pattern: "*.yml", generateId: ({ entry }) => entry.replace(/\.yml$/, "") }), schema: download }),
  // The editor guide (not edited in Decap): one Markdown file per language.
  guide: defineCollection({
    loader: glob({ base: `${base}/guide`, pattern: "*.md", generateId: ({ entry }) => entry.replace(/\.md$/, "") }),
    schema: z.object({ title: z.string().min(1), description: z.string().min(1) }),
  }),
  references,
};

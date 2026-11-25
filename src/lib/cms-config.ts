// Builds the Decap CMS configuration from the report configuration. Pure: no file access, no
// Astro imports. The endpoints src/pages/admin/config.yml.ts and src/pages/admin-demo/config.yml.ts
// serialise the result as JSON (valid YAML).
//
// Content layout (see src/content.config.ts): src/content/<collection>/<lang>/<file>. With Decap's
// i18n "multiple_folders" the locale is inserted before the file name, so the folder collection
// "src/content/chapters" holds src/content/chapters/en/chapter-1.md, and the folder collection
// "src/content/pages" holds src/content/pages/en/summary.md (Home, Summary, FAQ, Glossary, About, Accessibility).

import type { ReportConfig } from "../config/validate";

export type CmsBackend = "github" | "test-repo";

type Json = Record<string, unknown>;

const FIGURE_FILES_FOLDER = "public/media/figures";
const DOWNLOAD_FILES_FOLDER = "public/media/downloads";

const BODY_HINT = "Citations: [@key]. Cross-references: {1.2} (section) or {A} (Summary headline). A figure goes in its own paragraph: FIGURE: fig-1-1. Calibrated terms in italics: *high confidence*.";

function origin(site: string): string {
  return new URL(site).origin;
}

function backendFor(config: ReportConfig, backend: CmsBackend): Json {
  if (backend === "test-repo") return { name: "test-repo" };
  return {
    name: "github",
    repo: config.cms.repo,
    branch: config.cms.branch,
    base_url: origin(config.site),
    auth_endpoint: `${config.basePath.replace(/^\/+|\/+$/g, "")}/api/auth`,
  };
}

function pageFields(): Json[] {
  return [
    { label: "Title", name: "title", widget: "string", i18n: true },
    { label: "Description", name: "description", widget: "text", i18n: true, hint: "One sentence for the page summary." },
    {
      label: "Video",
      name: "video",
      widget: "object",
      required: false,
      i18n: true,
      hint: "Home page only. Leave empty on every other page. The video loads only after the visitor clicks play.",
      fields: [
        { label: "URL", name: "url", widget: "string", required: false, i18n: true, hint: "A YouTube address (youtube.com/watch?v=..., youtu.be/...) or a Vimeo address (vimeo.com/<number>)." },
        { label: "Title", name: "title", widget: "string", required: false, i18n: true, hint: "The title of the video as published." },
        { label: "Publisher", name: "publisher", widget: "string", required: false, i18n: true, hint: "Who published the video, for the credit line." },
      ],
    },
    { label: "Body", name: "body", widget: "markdown", modes: ["raw", "rich_text"], i18n: true, hint: BODY_HINT },
  ];
}

function figureFields(config: ReportConfig): Json[] {
  const chapterOptions = config.chapters.map((c) => ({ label: `${c.number}. ${c.title[defaultCode(config)] ?? c.id}`, value: c.id }));
  const replacement = (name: string, label: string, hint: string): Json => ({
    label,
    name,
    widget: "file",
    required: false,
    i18n: true,
    media_folder: `/${FIGURE_FILES_FOLDER}`,
    public_folder: "media/figures",
    hint,
  });
  return [
    { label: "Id", name: "id", widget: "string", i18n: "duplicate", pattern: ["^[a-z0-9-]+$", "Lower-case letters, digits and hyphens only."], hint: "Used in the chapter as FIGURE: <id> and as the file name. Do not change it for an existing figure." },
    { label: "Chapter", name: "chapter", widget: "select", options: chapterOptions, i18n: "duplicate" },
    { label: "Number", name: "number", widget: "string", i18n: "duplicate", pattern: ["^\\d+\\.\\d+$", "Use the form 1.1."], hint: "Figure number as text, such as 1.1." },
    { label: "Section", name: "section", widget: "string", required: false, i18n: "duplicate", hint: "Section number of the chapter that holds the figure, such as 1.2." },
    { label: "Chart type", name: "chartType", widget: "select", options: ["bars", "cumulative-lines"], i18n: "duplicate" },
    { label: "Measure", name: "measure", widget: "select", options: ["gt", "mwe"], i18n: "duplicate", hint: "gt: gigatonnes. mwe: metres water equivalent." },
    // The list widget accepts i18n true or false only, not "duplicate": enter the same values in every language.
    { label: "Series", name: "series", widget: "list", i18n: true, min: 1, field: { label: "Series id", name: "series", widget: "string" }, hint: "Series ids in the processed data file. Use the same values in every language." },
    { label: "Sources", name: "source", widget: "list", i18n: true, min: 1, field: { label: "Reference key", name: "source", widget: "string" }, hint: "Keys from the References list. Use the same values in every language." },
    { label: "Title", name: "title", widget: "string", i18n: true },
    { label: "Caption", name: "caption", widget: "text", i18n: true },
    { label: "Alt text", name: "alt", widget: "string", i18n: true, pattern: ["^.{1,250}$", "Alt text is required and has at most 250 characters."], hint: "Short description of the image. At most 250 characters." },
    { label: "Long description", name: "longDescription", widget: "text", i18n: true, hint: "Full text description of the figure for readers who cannot see it." },
    replacement("replacementPng", "Replacement PNG", "Leave empty to use the file generated from the data."),
    replacement("replacementSvg", "Replacement SVG", "Leave empty to use the file generated from the data."),
    replacement("replacementCsv", "Replacement CSV", "Leave empty to use the file generated from the data."),
  ];
}

const REFERENCE_FIELDS: Json[] = [
  { label: "Key", name: "key", widget: "string", hint: "Used in the text as [@key]. Lower case, no spaces." },
  { label: "Type", name: "type", widget: "select", options: ["report", "article", "chapter", "dataset", "abstract", "press-release"] },
  { label: "Authors", name: "authors", widget: "string" },
  { label: "Year", name: "year", widget: "number", value_type: "int", min: 1000, max: 9999 },
  { label: "Title", name: "title", widget: "string" },
  { label: "Container", name: "container", widget: "string", required: false, hint: "Journal, book or series." },
  { label: "Volume", name: "volume", widget: "string", required: false },
  { label: "Issue", name: "issue", widget: "string", required: false },
  { label: "Pages", name: "pages", widget: "string", required: false },
  { label: "Publisher", name: "publisher", widget: "string", required: false },
  { label: "DOI", name: "doi", widget: "string", required: false, hint: "Without the https://doi.org/ prefix." },
  { label: "URL", name: "url", widget: "string", required: false, hint: "Official source address." },
  { label: "Accessed", name: "accessed", widget: "string", required: false, hint: "Date as YYYY-MM-DD." },
];

function defaultCode(config: ReportConfig): string {
  return (config.languages.find((l) => l.default) ?? config.languages[0]).code;
}

function localisedObject(config: ReportConfig, name: string, label: string): Json {
  return {
    label,
    name,
    widget: "object",
    fields: config.languages.filter((l) => l.scope === "full").map((l) => ({ label: l.code.toUpperCase(), name: l.code, widget: "string" })),
  };
}

/**
 * The Decap configuration for the editor (backend "github") or the demo (backend "test-repo",
 * changes are not saved).
 */
export function buildCmsConfig(config: ReportConfig, backend: CmsBackend): Json {
  const fullCodes = config.languages.filter((l) => l.scope === "full").map((l) => l.code);
  const chapterIds = config.chapters.map((c) => c.id);
  const basePath = config.basePath.replace(/\/+$/, "");

  // Decap allows i18n "multiple_folders" for folder collections only, so the fixed pages are a
  // folder collection too (src/content/pages/<lang>/<page>.md) that cannot add or delete entries.
  const pages: Json = {
    name: "pages",
    label: "Pages",
    folder: "src/content/pages",
    extension: "md",
    format: "frontmatter",
    create: false,
    delete: false,
    i18n: true,
    identifier_field: "title",
    fields: pageFields(),
  };

  const chapters: Json = {
    name: "chapters",
    label: "Chapters",
    folder: "src/content/chapters",
    extension: "md",
    format: "frontmatter",
    create: false,
    i18n: true,
    identifier_field: "title",
    fields: [
      { label: "Title", name: "title", widget: "string", i18n: true },
      { label: "Description", name: "description", widget: "text", i18n: true, hint: "One sentence for the page summary." },
      { label: "Chapter number", name: "chapter", widget: "number", value_type: "int", min: 1, i18n: "duplicate", hint: "Fixed by the report configuration. Do not change." },
      { label: "Body", name: "body", widget: "markdown", modes: ["raw", "rich_text"], i18n: true, hint: `${BODY_HINT} A new section is a level-2 heading with its number, such as: ## 1.4 Title.` },
    ],
  };

  const figures: Json = {
    name: "figures",
    label: "Figures",
    folder: "src/content/figures",
    extension: "yml",
    format: "yml",
    create: true,
    slug: "{{fields.id}}",
    identifier_field: "id",
    i18n: true,
    fields: figureFields(config),
  };

  const references: Json = {
    name: "references",
    label: "References",
    files: [
      {
        name: "references",
        label: "References",
        file: "src/data/references.json",
        format: "json",
        fields: [{ label: "References", name: "references", widget: "list", summary: "{{fields.key}}", fields: REFERENCE_FIELDS }],
      },
    ],
  };

  const downloads: Json = {
    name: "downloads",
    label: "Downloads",
    folder: "src/content/downloads",
    extension: "yml",
    format: "yml",
    create: true,
    slug: "{{slug}}",
    summary: "{{title}} ({{lang}})",
    fields: [
      { label: "Title", name: "title", widget: "string" },
      { label: "Language", name: "lang", widget: "select", options: config.languages.map((l) => l.code) },
      { label: "Date", name: "date", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD", picker_utc: true },
      { label: "Kind", name: "kind", widget: "select", options: ["full-report", "chapter", "other"], hint: "Full report, one chapter, or another file." },
      { label: "Chapter", name: "chapter", widget: "select", required: false, options: chapterIds, hint: "Only for kind Chapter." },
      {
        label: "File",
        name: "file",
        widget: "file",
        media_folder: `/${DOWNLOAD_FILES_FOLDER}`,
        public_folder: "media/downloads",
        hint: "Files over 25 MiB are rejected by the host. The file size is computed when the site is built, so there is no size field.",
      },
    ],
  };

  const settings: Json = {
    name: "settings",
    label: "Settings",
    files: [
      {
        name: "report",
        label: "Report settings",
        file: "report.config.json",
        format: "json",
        fields: [
          localisedObject(config, "title", "Title"),
          localisedObject(config, "shortTitle", "Short title"),
          { label: "Accent colour", name: "accentColour", widget: "string", pattern: ["^#[0-9A-Fa-f]{6}$", "Use the form #RRGGBB. The colour needs a contrast of at least 4.5:1 against white."] },
          {
            label: "How to cite",
            name: "citation",
            widget: "object",
            fields: [
              { label: "Authors", name: "authors", widget: "list", field: { label: "Author", name: "author", widget: "string" }, hint: "As in a reference, such as: Surname, A." },
              { label: "Publisher", name: "publisher", widget: "string" },
              { label: "Year", name: "year", widget: "number", value_type: "int", min: 1000, max: 9999 },
            ],
          },
          {
            label: "Authors box",
            name: "authors",
            widget: "list",
            fields: [
              { label: "Name", name: "name", widget: "string" },
              { label: "Affiliation", name: "affiliation", widget: "string" },
            ],
          },
        ],
      },
    ],
  };

  return {
    backend: backendFor(config, backend),
    publish_mode: "editorial_workflow",
    site_url: `${config.site}${basePath}/`,
    media_folder: "public/media/images",
    public_folder: `${basePath}/media/images`,
    i18n: { structure: "multiple_folders", locales: fullCodes, default_locale: defaultCode(config) },
    collections: [pages, chapters, figures, references, downloads, settings],
  };
}

/** Serialises the config for config.yml. JSON is valid YAML. */
export function cmsConfigText(config: ReportConfig, backend: CmsBackend): string {
  return `${JSON.stringify(buildCmsConfig(config, backend), null, 2)}\n`;
}

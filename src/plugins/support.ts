// Shared, pure helpers for the content plugins (Sätteri hast plugins, Astro 7's Markdown
// pipeline). Nothing here touches the file system or Astro, so it is unit-testable.

import type { Properties } from "hast";
import type { Reference } from "../lib/references";

/** Everything a plugin needs from the outside. Built by node-env.ts, faked in tests. */
export interface PluginEnv {
  /** Site base with both slashes, e.g. "/mountain-report/". */
  base: string;
  chapters: ReadonlyArray<{ id: string; number: number }>;
  t(lang: string, key: string): string;
  tf(lang: string, key: string, values: Record<string, string | number>): string;
  /** Section numbers ("1.2", "A.1") that exist, for the cross-reference check. */
  sections(lang: string): ReadonlySet<string>;
  references: ReadonlyMap<string, Reference>;
  /** Plain text of a glossary entry (by its heading), or undefined when there is none. */
  glossaryEntry(lang: string, heading: string): string | undefined;
  /** Formats an ISO date for a language ("2026-11-25" becomes "25 November 2026"). */
  formatDate(lang: string, isoDate: string): string;
}

// ---------- minimal hast types and builders ----------

export interface HText {
  type: "text";
  value: string;
}
export interface HElement {
  type: "element";
  tagName: string;
  properties: Properties;
  children: HChild[];
}
export type HChild = HText | HElement;

export function txt(value: string): HText {
  return { type: "text", value };
}

export function el(tagName: string, properties: Properties = {}, children: HChild[] = []): HElement {
  return { type: "element", tagName, properties, children };
}

// ---------- which page is being processed ----------

export interface PageId {
  lang: string;
  /** File name without extension: "summary", "chapter-1", "home". */
  slug: string;
}

const LANG = "[a-z]{2,3}(?:-[A-Za-z0-9]+)*";
// src/content/pages|chapters/<lang>/<slug>.md, or the editor guide src/content/guide/<lang>.md (slug "guide").
const CONTENT_PATH = new RegExp(`/content/(?:(?:pages|chapters)/(${LANG})/([A-Za-z0-9_-]+)|guide/(${LANG}))\\.md$`);

function pathOf(fileURL: URL | string | undefined): string {
  if (fileURL === undefined) throw new Error("content plugin: the file path is unknown");
  if (typeof fileURL === "string") return fileURL;
  try {
    return decodeURIComponent(fileURL.pathname);
  } catch {
    return fileURL.pathname;
  }
}

/** Language and page of a content file (src/content/pages|chapters/<lang>/<slug>.md, or guide/<lang>.md). Throws otherwise. */
export function pageFromFile(fileURL: URL | string | undefined): PageId {
  const path = pathOf(fileURL);
  const match = CONTENT_PATH.exec(path);
  if (!match) throw new Error(`${path}: not a content file (expected src/content/<collection>/<lang>/<page>.md)`);
  return match[1] !== undefined ? { lang: match[1], slug: match[2] } : { lang: match[3], slug: "guide" };
}

/** Short file name for error messages: the path from "src/" on when there is one. */
export function fileLabel(fileURL: URL | string | undefined): string {
  let path: string;
  try {
    path = pathOf(fileURL);
  } catch {
    return "(unknown file)";
  }
  const index = path.lastIndexOf("/src/");
  return index >= 0 ? path.slice(index + 1) : path;
}

/** Route below the language root: the Home page is the language root. */
export function routeOf(slug: string): string {
  return slug === "home" ? "" : slug;
}

/** Wraps a thrown message with the file, so a build error names where the problem is. */
export function inFile<T>(fileURL: URL | string | undefined, run: () => T): T {
  try {
    return run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith(fileLabel(fileURL))) throw error;
    throw new Error(`${fileLabel(fileURL)}: ${message}`);
  }
}

// ---------- per-file state ----------

/** State that lives as long as one file is processed, keyed by the shared `ctx.data` object. */
export function perFile<T>(init: () => T): (data: object) => T {
  const store = new WeakMap<object, T>();
  return (data) => {
    let value = store.get(data);
    if (value === undefined) {
      value = init();
      store.set(data, value);
    }
    return value;
  };
}

// ---------- slugs and sections ----------

/** Lower-case ASCII-and-letters slug with hyphens, like a GitHub heading anchor. */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug === "" ? "section" : slug;
}

/** Section token ("1.2", "A.1") to anchor id ("section-1-2", "a-1"). */
export function sectionAnchor(token: string): string {
  return /^\d/.test(token) ? `section-${token.replace(/\./g, "-")}` : token.toLowerCase().replace(/\./g, "-");
}

/** Section tokens defined by the numbered headings of a Markdown file ("## 1.1 Title", "## A. Title", "### A.1"). */
export function collectSections(markdown: string): Set<string> {
  const out = new Set<string>();
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, "").replace(/```[\s\S]*?```/g, "");
  for (const line of body.split(/\r?\n/)) {
    const heading = /^#{2,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const token = headingToken(heading[1]);
    if (token) out.add(token);
  }
  return out;
}

/** The section token at the start of a heading text, or undefined for an unnumbered heading. */
export function headingToken(text: string): string | undefined {
  const numbered = /^(\d+(?:\.\d+)*)\.?(?:\s|$)/.exec(text);
  if (numbered) return numbered[1];
  const lettered = /^([A-Z])(?:\.(\d+))?\.(?:\s|$)|^([A-Z]\.\d+)(?:\s|$)/.exec(text);
  if (lettered) return lettered[3] ?? (lettered[2] ? `${lettered[1]}.${lettered[2]}` : lettered[1]);
  return undefined;
}

// ---------- glossary text ----------

/** Removes Markdown markers, citations and cross-references from a snippet, leaving plain text. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\s*\[@[^\]]*\]/g, "")
    .replace(/\s*\{[0-9A-Z][^{}]*\}/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

/** Plain text of the body of the glossary entry whose "## Heading" matches, or undefined. */
export function glossaryEntryText(markdown: string, heading: string): string | undefined {
  const lines = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, "").split(/\r?\n/);
  const wanted = heading.trim().toLowerCase();
  const start = lines.findIndex((line) => {
    const match = /^#{2,6}\s+(.*?)\s*$/.exec(line);
    return match !== null && match[1].toLowerCase() === wanted;
  });
  if (start < 0) return undefined;
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    body.push(line);
  }
  const text = plainText(body.join(" "));
  return text === "" ? undefined : text;
}

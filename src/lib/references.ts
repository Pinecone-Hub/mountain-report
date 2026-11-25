// Reference data: parsing and formatting. Pure, no file access.

export interface Reference {
  key: string;
  type: string;
  authors: string;
  year: number | string;
  title: string;
  container?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  accessed?: string;
}

const REQUIRED = ["key", "type", "authors", "year", "title"] as const;
const OPTIONAL = ["container", "volume", "issue", "pages", "publisher", "doi", "url", "accessed"] as const;

/** Validates the references data and indexes it by key. Throws on malformed input or duplicate keys. */
export function parseReferences(data: unknown): Map<string, Reference> {
  if (!Array.isArray(data)) throw new Error("references data must be an array");
  const out = new Map<string, Reference>();
  data.forEach((item, index) => {
    if (item === null || typeof item !== "object") throw new Error(`references[${index}] must be an object`);
    const record = item as Record<string, unknown>;
    for (const field of REQUIRED) {
      const value = record[field];
      const ok = field === "year" ? typeof value === "number" || (typeof value === "string" && value !== "") : typeof value === "string" && value.trim() !== "";
      if (!ok) throw new Error(`references[${index}] has no valid "${field}"`);
    }
    for (const field of OPTIONAL) {
      if (record[field] !== undefined && typeof record[field] !== "string") {
        throw new Error(`references[${index}] field "${field}" must be a string`);
      }
    }
    const reference = record as unknown as Reference;
    if (out.has(reference.key)) throw new Error(`duplicate reference key "${reference.key}"`);
    out.set(reference.key, reference);
  });
  return out;
}

export interface FormattedReference {
  /** Text before the link: authors, year, title, container, publisher. */
  text: string;
  /** DOI link, or the official URL when there is no DOI. */
  link?: { href: string; label: string };
}

export interface FormatOptions {
  /** Builds the "Accessed <date>" text for a reference that is linked by URL. */
  accessed?: (isoDate: string) => string;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Authors (year). Title. Container volume(issue), pages. Publisher. Link. */
export function formatReference(reference: Reference, options: FormatOptions = {}): FormattedReference {
  const parts: string[] = [`${reference.authors.trim()} (${reference.year}).`, sentence(reference.title)];

  let container = reference.container?.trim() ?? "";
  if (reference.volume) {
    container += `${container ? " " : ""}${reference.volume}`;
    if (reference.issue) container += `(${reference.issue})`;
  }
  if (reference.pages) container += `${container ? ", " : ""}${reference.pages}`;
  if (container !== "") parts.push(sentence(container));

  if (reference.publisher?.trim()) parts.push(sentence(reference.publisher));

  if (reference.doi) {
    const href = `https://doi.org/${reference.doi}`;
    return { text: parts.join(" "), link: { href, label: href } };
  }
  if (reference.url) {
    if (reference.accessed && options.accessed) parts.push(sentence(options.accessed(reference.accessed)));
    return { text: parts.join(" "), link: { href: reference.url, label: reference.url } };
  }
  return { text: parts.join(" ") };
}

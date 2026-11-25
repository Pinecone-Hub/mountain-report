// Pure validation of report.config.json. Throws one clear error listing every
// problem, so a bad config fails the build with an actionable message.
// Only imports the pure contrast helper (with its .ts extension) so that scripts/check.ts can
// load this file under node --experimental-strip-types.

import { CONTRAST_TEXT, contrastRatio, PAGE_BACKGROUND } from "../lib/contrast.ts";

export interface LanguageConfig {
  code: string;
  dir: "ltr" | "rtl";
  scope: "full" | "summary";
  default: boolean;
}

export interface ChapterConfig {
  id: string;
  number: number;
  /** Chapter title per language; required for every full-scope language. */
  title: Record<string, string>;
}

/** Route names used by the fixed pages. A chapter id must not collide with them. */
export const RESERVED_ROUTES: readonly string[] = ["summary", "figures", "downloads", "faq", "glossary", "about", "accessibility", "search", "admin", "admin-demo", "api", "pagefind", "_astro"];

export interface ReportConfig {
  id: string;
  site: string;
  basePath: string;
  title: Record<string, string>;
  shortTitle: Record<string, string>;
  accentColour: string;
  languages: LanguageConfig[];
  chapters: ChapterConfig[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/**
 * @param raw the parsed JSON
 * @param knownLanguageCodes codes that have a translation file in src/i18n
 */
export function validateReportConfig(raw: unknown, knownLanguageCodes: readonly string[]): ReportConfig {
  const problems: string[] = [];
  if (!isRecord(raw)) {
    throw new Error("report.config.json: the file must contain a JSON object");
  }

  if (!isNonEmptyString(raw.id)) problems.push('"id" is missing or empty');

  if (!isNonEmptyString(raw.site)) {
    problems.push('"site" is missing or empty');
  } else {
    try {
      const u = new URL(raw.site);
      if (u.protocol !== "https:" && u.protocol !== "http:") problems.push('"site" must be an http(s) URL');
      if (raw.site.endsWith("/")) problems.push('"site" must not end with "/"');
    } catch {
      problems.push('"site" is not a valid URL');
    }
  }

  if (!isNonEmptyString(raw.basePath)) {
    problems.push('"basePath" is missing or empty');
  } else {
    if (!raw.basePath.startsWith("/")) problems.push('"basePath" must start with "/"');
    if (raw.basePath.endsWith("/")) problems.push('"basePath" must not end with "/"');
    if (raw.basePath === "/") problems.push('"basePath" must name a folder, not just "/"');
  }

  if (!isNonEmptyString(raw.accentColour) || !/^#[0-9A-Fa-f]{6}$/.test(raw.accentColour)) {
    problems.push('"accentColour" must be a colour in #RRGGBB form');
  } else {
    const ratio = contrastRatio(raw.accentColour, PAGE_BACKGROUND);
    if (ratio < CONTRAST_TEXT) {
      problems.push(`"accentColour" ${raw.accentColour} has contrast ${ratio.toFixed(2)}:1 against the page background ${PAGE_BACKGROUND}; at least ${CONTRAST_TEXT}:1 is required (WCAG 2.2 AA)`);
    }
  }

  // Languages
  const languages: LanguageConfig[] = [];
  if (!Array.isArray(raw.languages) || raw.languages.length === 0) {
    problems.push('"languages" must be a non-empty array');
  } else {
    const seen = new Set<string>();
    raw.languages.forEach((item, i) => {
      if (!isRecord(item)) {
        problems.push(`languages[${i}] must be an object`);
        return;
      }
      const code = item.code;
      if (!isNonEmptyString(code)) {
        problems.push(`languages[${i}].code is missing or empty`);
        return;
      }
      if (seen.has(code)) problems.push(`duplicate language code "${code}"`);
      seen.add(code);
      if (!knownLanguageCodes.includes(code)) {
        problems.push(`language "${code}" has no translation file in src/i18n (known: ${knownLanguageCodes.join(", ") || "none"})`);
      }
      if (item.dir !== "ltr" && item.dir !== "rtl") problems.push(`language "${code}": "dir" must be "ltr" or "rtl"`);
      if (item.scope !== "full" && item.scope !== "summary") problems.push(`language "${code}": "scope" must be "full" or "summary"`);
      languages.push({
        code,
        dir: item.dir === "rtl" ? "rtl" : "ltr",
        scope: item.scope === "summary" ? "summary" : "full",
        default: item.default === true,
      });
    });
    const defaults = languages.filter((l) => l.default);
    if (defaults.length !== 1) problems.push(`exactly one language must have "default": true (found ${defaults.length})`);
    else if (defaults[0].scope !== "full") problems.push("the default language must have scope \"full\"");
  }

  // Localised names: required for every language with full scope.
  const fullCodes = languages.filter((l) => l.scope === "full").map((l) => l.code);
  const readNames = (field: "title" | "shortTitle"): Record<string, string> => {
    const value = raw[field];
    if (!isRecord(value)) {
      problems.push(`"${field}" must be an object keyed by language code`);
      return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      if (!isNonEmptyString(v)) problems.push(`${field}.${k} must be a non-empty string`);
      else out[k] = v;
    }
    for (const code of fullCodes) {
      if (!(code in out)) problems.push(`${field}.${code} is missing`);
    }
    return out;
  };
  const title = readNames("title");
  const shortTitle = readNames("shortTitle");

  // Chapters
  const chapters: ChapterConfig[] = [];
  if (!Array.isArray(raw.chapters)) {
    problems.push('"chapters" must be an array');
  } else {
    const ids = new Set<string>();
    raw.chapters.forEach((item, i) => {
      if (!isRecord(item)) {
        problems.push(`chapters[${i}] must be an object`);
        return;
      }
      if (!isNonEmptyString(item.id)) {
        problems.push(`chapters[${i}].id is missing or empty`);
        return;
      }
      if (ids.has(item.id)) problems.push(`duplicate chapter id "${item.id}"`);
      ids.add(item.id);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(item.id)) problems.push(`chapter id "${item.id}" must use lower-case letters, digits and hyphens only`);
      if (RESERVED_ROUTES.includes(item.id)) problems.push(`chapter id "${item.id}" is a reserved route name`);
      const chapterTitle: Record<string, string> = {};
      if (!isRecord(item.title)) {
        problems.push(`chapter "${item.id}": "title" must be an object keyed by language code`);
      } else {
        for (const [k, v] of Object.entries(item.title)) {
          if (!isNonEmptyString(v)) problems.push(`chapter "${item.id}": title.${k} must be a non-empty string`);
          else chapterTitle[k] = v;
        }
        for (const code of fullCodes) {
          if (!(code in chapterTitle)) problems.push(`chapter "${item.id}": title.${code} is missing`);
        }
      }
      if (typeof item.number !== "number" || !Number.isInteger(item.number) || item.number < 1) {
        problems.push(`chapter "${item.id}": "number" must be a positive integer`);
      } else {
        chapters.push({ id: item.id, number: item.number, title: chapterTitle });
      }
    });
  }

  if (problems.length > 0) {
    throw new Error(`Invalid report.config.json:\n- ${problems.join("\n- ")}`);
  }

  return {
    id: raw.id as string,
    site: raw.site as string,
    basePath: raw.basePath as string,
    title,
    shortTitle,
    accentColour: raw.accentColour as string,
    languages,
    chapters,
  };
}

import raw from "../../report.config.json";
import { languageCodes } from "../i18n/index";
import { validateReportConfig, type LanguageConfig, type ReportConfig } from "./validate";

export type { LanguageConfig, ReportConfig };

/** The validated report configuration. Throws at build time when report.config.json is invalid. */
export const report: ReportConfig = validateReportConfig(raw, languageCodes);

export const defaultLanguage: LanguageConfig = report.languages.find((l) => l.default) as LanguageConfig;

/** Languages that get the whole report (the Summary-only ones are excluded). */
export const fullLanguages: LanguageConfig[] = report.languages.filter((l) => l.scope === "full");

export function languageConfig(code: string): LanguageConfig {
  const found = report.languages.find((l) => l.code === code);
  if (!found) throw new Error(`Unknown language "${code}" (not in report.config.json)`);
  return found;
}

/**
 * Localised report title for a language. A summary-scope language may have no title of its own:
 * it then shows the default-language title. Throws for any other language without a title.
 */
export function reportTitle(code: string): string {
  const value = report.title[code];
  if (value !== undefined) return value;
  if (report.languages.find((l) => l.code === code)?.scope === "summary") return report.title[defaultLanguage.code];
  throw new Error(`report.config.json has no title for language "${code}"`);
}

/** Short title for a language, with the same fallback as reportTitle. */
export function reportShortTitle(code: string): string {
  const value = report.shortTitle[code];
  if (value !== undefined) return value;
  if (report.languages.find((l) => l.code === code)?.scope === "summary") return report.shortTitle[defaultLanguage.code];
  throw new Error(`report.config.json has no short title for language "${code}"`);
}

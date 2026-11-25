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

/** Localised report title for a language. Throws when the language has no title. */
export function reportTitle(code: string): string {
  const value = report.title[code];
  if (value === undefined) throw new Error(`report.config.json has no title for language "${code}"`);
  return value;
}

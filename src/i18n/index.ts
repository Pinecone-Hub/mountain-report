import en from "./en.json";
import fr from "./fr.json";
import ar from "./ar.json";

export type TranslationKey = keyof typeof en;

const dictionaries: Record<string, Record<string, string>> = { en, fr, ar };

/** Language codes that have a translation file. */
export const languageCodes: string[] = Object.keys(dictionaries);

/** Looks a string up. Throws on a missing key: a missing key is a bug. */
export function t(lang: string, key: TranslationKey): string {
  const dictionary = dictionaries[lang];
  const value = dictionary?.[key];
  if (value === undefined) {
    throw new Error(`Missing translation key "${key}" for language "${lang}"`);
  }
  return value;
}

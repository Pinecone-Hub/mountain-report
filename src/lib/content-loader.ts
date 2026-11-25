// Decap CMS with i18n "multiple_folders" writes one file per language every time an entry is
// saved. Saving an English entry therefore also writes, for a language that has no translation
// yet, a stub file that holds only the language independent fields (such as "chapter: 1"), or an
// empty file. A stub is not a translation: the loaders below leave it out of the collection (non-default languages only), so
// the page keeps showing "in preparation" and the build does not fail on the missing title.
// A stub in the default language is a real error and fails the build.

import type { Loader } from "astro/loaders";
import { defaultLanguage } from "../config/report";

const defaultLanguageCode: string = defaultLanguage.code;

/** Fields that hold translated text. A file with none of them filled in is a stub. */
export const TRANSLATED_TEXT_FIELDS: readonly string[] = ["title", "description", "caption", "alt", "longDescription"];

/** True when the front matter or YAML data holds no translated text at all. */
export function isUntranslatedStub(data: unknown): boolean {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return true;
  const record = data as Record<string, unknown>;
  return !TRANSLATED_TEXT_FIELDS.some((field) => typeof record[field] === "string" && (record[field] as string).trim() !== "");
}

/** Language of a content file: the name of its parent folder (".../pages/fr/faq.md" gives "fr"). */
export function languageOfFile(filePath: string | undefined): string | undefined {
  const parts = (filePath ?? "").split(/[\\/]/).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : undefined;
}

/**
 * Wraps a loader so that stub files of the non-default languages are neither validated nor
 * stored. A stub in the default language is an error: the build fails and names the file.
 */
export function skipUntranslated(loader: Loader, defaultLanguage: string = defaultLanguageCode): Loader {
  const checkStub = (data: unknown, filePath: string | undefined, id: string): boolean => {
    if (!isUntranslatedStub(data)) return false;
    if (languageOfFile(filePath) === defaultLanguage) {
      throw new Error(
        `${filePath ?? id}: the default language ("${defaultLanguage}") file has no translated text (needs at least one of: ${TRANSLATED_TEXT_FIELDS.join(", ")})`,
      );
    }
    return true;
  };
  return {
    ...loader,
    load: (context) => {
      const store = new Proxy(context.store, {
        get(target, prop) {
          if (prop === "set") {
            return (entry: { id: string; data: unknown; filePath?: string }) =>
              checkStub(entry.data, entry.filePath, entry.id) ? false : target.set(entry as never);
          }
          const value = Reflect.get(target, prop, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      return loader.load({
        ...context,
        store,
        // A stub is returned as it is, without the schema check (it would fail on the missing title).
        parseData: (options) =>
          checkStub(options.data, (options as { filePath?: string }).filePath, options.id)
            ? Promise.resolve(options.data as never)
            : context.parseData(options),
      });
    },
  };
}

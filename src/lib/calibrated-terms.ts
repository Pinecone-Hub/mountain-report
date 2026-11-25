// IPCC calibrated language: the fixed list of terms that get a tooltip and a glossary link.
// Only the English list exists for now; a language without a list leaves its italics plain.
// Plain TypeScript (no enums) so scripts/check.ts can import it under Node.

export type TermKind = "likelihood" | "confidence" | "evidence" | "agreement" | "evidence-agreement";

/** Glossary entry category a term points to. Agreement has no entry of its own: it uses Evidence. */
export type GlossaryCategory = "likelihood" | "confidence" | "evidence";

interface TermLists {
  likelihood: readonly string[];
  confidence: readonly string[];
  evidence: readonly string[];
  agreement: readonly string[];
}

const EN: TermLists = {
  likelihood: [
    "virtually certain",
    "extremely likely",
    "very likely",
    "likely",
    "more likely than not",
    "about as likely as not",
    "unlikely",
    "very unlikely",
    "extremely unlikely",
    "exceptionally unlikely",
  ],
  confidence: ["very low confidence", "low confidence", "medium confidence", "high confidence", "very high confidence"],
  evidence: ["limited evidence", "medium evidence", "robust evidence"],
  agreement: ["low agreement", "medium agreement", "high agreement"],
};

const LISTS: Readonly<Record<string, TermLists>> = { en: EN };

/** Words that suggest calibrated language, for the check.ts WARN about near misses. */
export const CALIBRATED_WORD_PATTERN = /confidence|likely|evidence|agreement/i;

export function hasTermList(lang: string): boolean {
  return Object.prototype.hasOwnProperty.call(LISTS, lang);
}

/** Lower case, single spaces, no surrounding space. */
export function normaliseTerm(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * The kind of a calibrated term, or undefined when the whole text is not on the list.
 * Combinations such as "medium evidence, high agreement" are one term.
 */
export function classifyTerm(text: string, lang: string): TermKind | undefined {
  const lists = hasTermList(lang) ? LISTS[lang] : undefined;
  if (!lists) return undefined;
  const term = normaliseTerm(text);
  if (term === "") return undefined;
  if (lists.likelihood.includes(term)) return "likelihood";
  if (lists.confidence.includes(term)) return "confidence";
  if (lists.evidence.includes(term)) return "evidence";
  if (lists.agreement.includes(term)) return "agreement";
  const parts = term.split(/\s*,\s*/);
  if (parts.length === 2 && lists.evidence.includes(parts[0]) && lists.agreement.includes(parts[1])) {
    return "evidence-agreement";
  }
  return undefined;
}

export function glossaryCategory(kind: TermKind): GlossaryCategory {
  if (kind === "likelihood") return "likelihood";
  if (kind === "confidence") return "confidence";
  return "evidence";
}

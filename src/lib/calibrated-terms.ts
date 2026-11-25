// IPCC calibrated language: the fixed list of terms that get a tooltip and a glossary link.
// English and French lists exist; a language without a list leaves its italics plain.
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

// French list: IPCC SROCC Summary for Policymakers, French edition, footnote 6
// Source: www.ipcc.ch/site/assets/uploads/sites/3/2020/07/SROCC_SPM_fr.pdf (written without the scheme:
// ipcc.ch is not on the external URL allowlist, which check.ts applies to source files too).
// Stored with the straight apostrophe; normaliseTerm maps the typographic one to it.
const FR: TermLists = {
  likelihood: [
    "quasiment certain",
    "extrêmement probable",
    "très probable",
    "probable",
    "plus probable qu'improbable",
    "à peu près aussi probable qu'improbable",
    "improbable",
    "très improbable",
    "extrêmement improbable",
    "exceptionnellement improbable",
  ],
  confidence: ["degré de confiance très faible", "degré de confiance faible", "degré de confiance moyen", "degré de confiance élevé", "degré de confiance très élevé"],
  evidence: ["éléments probants limités", "éléments probants moyens", "éléments probants robustes"],
  agreement: ["degré de cohérence faible", "degré de cohérence moyen", "degré de cohérence élevé"],
};

const LISTS: Readonly<Record<string, TermLists>> = { en: EN, fr: FR };

const WORD_PATTERNS: Readonly<Record<string, RegExp>> = {
  en: /confidence|likely|evidence|agreement/i,
  fr: /confiance|probable|probants|cohérence|coherence/i,
};

/** Words that suggest calibrated language in a language, for the check.ts WARN about near misses. */
export function calibratedWordPattern(lang: string): RegExp | undefined {
  return Object.prototype.hasOwnProperty.call(WORD_PATTERNS, lang) ? WORD_PATTERNS[lang] : undefined;
}

export function hasTermList(lang: string): boolean {
  return Object.prototype.hasOwnProperty.call(LISTS, lang);
}

/** Lower case, single spaces (no-break spaces too), no surrounding space, straight apostrophe, NFC. */
export function normaliseTerm(text: string): string {
  return text.normalize("NFC").replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
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

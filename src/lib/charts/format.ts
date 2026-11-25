// Number formatting for charts and tables: locale grouping, a fixed number of decimals and the
// minus sign U+2212 (Intl gives a hyphen-minus in most locales).

const MINUS = "−";

export function formatNumber(lang: string, value: number, decimals: number, options: { sign?: boolean } = {}): string {
  const rounded = Number(value.toFixed(decimals));
  const text = new Intl.NumberFormat(lang, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: options.sign ? "exceptZero" : "auto",
  }).format(rounded === 0 ? 0 : rounded);
  return text.replace(/-/g, MINUS);
}

/** Escapes text for SVG/XML content and attribute values. */
export function xml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A coordinate with at most two decimals, for compact path data. */
export function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

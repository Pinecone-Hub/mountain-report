// Pure WCAG 2.x contrast helpers. No imports: also used by the config validator and
// by scripts/check.ts under node --experimental-strip-types.

/** The page background the accent colour is validated against (the --bg token). */
export const PAGE_BACKGROUND = "#ffffff";

/** WCAG 2.2 AA thresholds. */
export const CONTRAST_TEXT = 4.5;
export const CONTRAST_LARGE_OR_UI = 3;

/** Parses #rgb or #rrggbb into 0..255 channels. Returns null for anything else. */
export function parseHex(hex: string): [number, number, number] | null {
  if (typeof hex !== "string") return null;
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  let digits = m[1];
  if (digits.length === 3) digits = digits.split("").map((c) => c + c).join("");
  return [parseInt(digits.slice(0, 2), 16), parseInt(digits.slice(2, 4), 16), parseInt(digits.slice(4, 6), 16)];
}

/** WCAG relative luminance, 0 (black) to 1 (white). Throws on an invalid colour. */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`Invalid hex colour: ${JSON.stringify(hex)}`);
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. Symmetric. Throws on an invalid colour. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** True when the pair reaches `minimum`. Invalid colours never pass. */
export function meetsContrast(foreground: string, background: string, minimum: number): boolean {
  try {
    return contrastRatio(foreground, background) >= minimum;
  } catch {
    return false;
  }
}

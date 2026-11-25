// Pagefind excerpts are HTML text in which the matched words are wrapped in <mark>. The search page
// never inserts that HTML: it splits it into plain text and marked parts and builds DOM nodes.

export interface ExcerptPart {
  text: string;
  mark: boolean;
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&nbsp;": " " };

function decode(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g, (entity) => ENTITIES[entity]);
}

/** Splits an excerpt at <mark>...</mark>. Any other tag is dropped. Empty parts are left out. */
export function parseExcerpt(html: string): ExcerptPart[] {
  const parts: ExcerptPart[] = [];
  let mark = false;
  let last = 0;
  const push = (raw: string) => {
    const text = decode(raw.replace(/<[^>]*>/g, ""));
    if (text !== "") parts.push({ text, mark });
  };
  for (const tag of html.matchAll(/<(\/?)mark\b[^>]*>/gi)) {
    push(html.slice(last, tag.index));
    mark = tag[1] === "";
    last = (tag.index ?? 0) + tag[0].length;
  }
  push(html.slice(last));
  return parts;
}

/** The search term from a URL query string ("?q=ice"), trimmed. Empty when absent. */
export function queryFromSearch(search: string): string {
  return (new URLSearchParams(search).get("q") ?? "").trim();
}

/** Fills {name} placeholders in a template. Unknown placeholders stay as they are. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

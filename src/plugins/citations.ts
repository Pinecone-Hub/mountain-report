// Citations. "[@key]" or "[@a; @b]" become numbered markers that link to a References list
// appended to the page. Numbers follow the order of first citation on the page; a repeated key
// keeps its number. Every reference lists back-links to each place it was cited.

import type { HastPluginDefinition } from "satteri";
import { formatReference } from "../lib/references";
import { el, inFile, pageFromFile, perFile, txt, type HChild, type HElement, type PluginEnv } from "./support";

export type CiteSegment = { kind: "text"; value: string } | { kind: "cite"; keys: string[] };

const KEY = /^@([\w][\w:.\-/]*)$/;

/** Keys of one citation group, without the brackets ("@a; @b"). Throws on malformed input. */
export function parseCitationGroup(inner: string): string[] {
  const parts = inner.split(";").map((part) => part.trim());
  const keys = parts.map((part) => KEY.exec(part)?.[1]);
  if (keys.some((key) => key === undefined)) {
    throw new Error(`malformed citation "[${inner}]": use [@key] or [@key1; @key2]`);
  }
  return keys as string[];
}

/** Splits text at citation groups. Text without "[@" comes back as one text segment. */
export function splitCitations(text: string): CiteSegment[] {
  const out: CiteSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(/\[(@[^[\]]*)\]/g)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ kind: "text", value: text.slice(last, index) });
    out.push({ kind: "cite", keys: parseCitationGroup(match[1]) });
    last = index + match[0].length;
  }
  const rest = text.slice(last);
  if (rest.includes("[@")) throw new Error(`malformed citation: "[@" without a closing bracket in ${JSON.stringify(rest.slice(0, 40))}`);
  if (rest !== "") out.push({ kind: "text", value: rest });
  return out;
}

export interface CitedReference {
  key: string;
  number: number;
  /** How many times it is cited on the page. */
  occurrences: number;
}

/** Numbers references by first citation and counts occurrences. */
export class CitationRegistry {
  private order: CitedReference[] = [];
  private byKey = new Map<string, CitedReference>();

  /** Registers one citation of `key`. Returns its number and which occurrence this is (from 1). */
  cite(key: string): { number: number; occurrence: number } {
    let entry = this.byKey.get(key);
    if (!entry) {
      entry = { key, number: this.order.length + 1, occurrences: 0 };
      this.order.push(entry);
      this.byKey.set(key, entry);
    }
    entry.occurrences += 1;
    return { number: entry.number, occurrence: entry.occurrences };
  }

  entries(): readonly CitedReference[] {
    return this.order;
  }
}

/** Letter for an occurrence: 1 is "a", 26 is "z", 27 is "aa". */
export function occurrenceLetter(occurrence: number): string {
  let n = Math.max(1, Math.floor(occurrence));
  let letters = "";
  while (n > 0) {
    n -= 1;
    letters = String.fromCharCode(97 + (n % 26)) + letters;
    n = Math.floor(n / 26);
  }
  return letters;
}

export function citationId(number: number, occurrence: number): string {
  return `cite-${number}-${occurrence}`;
}

export function referenceId(number: number): string {
  return `ref-${number}`;
}

function buildReferenceList(registry: CitationRegistry, lang: string, env: PluginEnv): HElement {
  const items = registry.entries().map((entry): HElement => {
    const reference = env.references.get(entry.key);
    if (!reference) throw new Error(`unknown reference key "${entry.key}"`);
    const formatted = formatReference(reference, {
      accessed: (date) => env.tf(lang, "references.accessed", { date: env.formatDate(lang, date) }),
    });
    const children: HChild[] = [el("span", { className: ["reference-text"] }, [txt(formatted.text)])];
    if (formatted.link) {
      children.push(txt(" "), el("a", { href: formatted.link.href, className: ["reference-link"] }, [txt(formatted.link.label)]));
    }
    // One link per occurrence. A single one shows the arrow; several show the arrow once,
    // then small superscript letters (a, b, c ...), each with its full accessible label.
    const mark = env.t(lang, "references.backText");
    const links = Array.from({ length: entry.occurrences }, (_, i) => {
      const occurrence = i + 1;
      return el(
        "a",
        {
          href: `#${citationId(entry.number, occurrence)}`,
          ariaLabel: env.tf(lang, "references.back", { number: entry.number, occurrence }),
        },
        [entry.occurrences > 1 ? el("sup", {}, [txt(occurrenceLetter(occurrence))]) : txt(mark)],
      );
    });
    // The arrow and the first letter never split across lines.
    const backLinks: HChild[] =
      entry.occurrences > 1
        ? [el("span", { className: ["back-start"] }, [el("span", { ariaHidden: "true" }, [txt(mark)]), txt(" "), links[0]])]
        : [links[0]];
    for (const link of links.slice(1)) backLinks.push(txt(" "), link);
    children.push(txt(" "), el("span", { className: ["reference-back"] }, backLinks));
    return el("li", { id: referenceId(entry.number) }, children);
  });
  return el("section", { className: ["references"], ariaLabelledBy: ["references"] }, [
    el("h2", { id: "references" }, [txt(env.t(lang, "references.title"))]),
    el("ol", { className: ["reference-list"] }, items),
  ]);
}

export function citationsPlugin(env: PluginEnv): HastPluginDefinition {
  const state = perFile(() => new CitationRegistry());
  return {
    name: "mountain-report-citations",
    text(node, ctx) {
      if (!node.value.includes("[@")) return;
      const parent = ctx.parent(node);
      if (parent && "tagName" in parent && (parent.tagName === "code" || parent.tagName === "pre")) return;
      const registry = state(ctx.data);
      const nodes = inFile(ctx.fileURL, () => {
        const { lang } = pageFromFile(ctx.fileURL);
        return splitCitations(node.value).flatMap((segment): HChild[] => {
          if (segment.kind === "text") return [txt(segment.value)];
          const links: HChild[] = [];
          segment.keys.forEach((key, i) => {
            if (!env.references.has(key)) throw new Error(`unknown reference key "${key}"`);
            const { number, occurrence } = registry.cite(key);
            if (i > 0) links.push(txt(", "));
            links.push(
              el(
                "a",
                {
                  href: `#${referenceId(number)}`,
                  id: citationId(number, occurrence),
                  className: ["cite-link"],
                  ariaLabel: env.tf(lang, "cite.label", { number }),
                },
                [txt(String(number))],
              ),
            );
          });
          return [el("span", { className: ["cite"] }, [txt("["), ...links, txt("]")])];
        });
      });
      ctx.replaceNode(node, nodes);
    },
    after(root, ctx) {
      const registry = state(ctx.data);
      if (registry.entries().length === 0) return;
      const section = inFile(ctx.fileURL, () => buildReferenceList(registry, pageFromFile(ctx.fileURL).lang, env));
      ctx.appendChild(root, section);
    },
  };
}

// Cross-references. "{1.2}", "{1.3, 2.1}" and, for Summary headlines, "{A}" or "{A.1}" become
// visible braces around links to the section. Unknown sections and malformed braces are build errors.

import type { HastPluginDefinition } from "satteri";
import { el, inFile, pageFromFile, sectionAnchor, txt, type HChild, type PluginEnv } from "./support";

export type XrefSegment = { kind: "text"; value: string } | { kind: "ref"; token: string };

const TOKEN = /^(?:\d+(?:\.\d+)*|[A-Z](?:\.\d+)?)$/;

function parseGroup(inner: string): string[] {
  const tokens = inner.split(",").map((part) => part.trim());
  if (tokens.some((token) => !TOKEN.test(token))) {
    throw new Error(`malformed cross-reference "{${inner}}": use section numbers separated by commas, such as {1.2, 2.1}`);
  }
  return tokens;
}

/** Splits text at cross-references. Text without braces comes back as one text segment. */
export function splitCrossRefs(text: string): XrefSegment[] {
  const out: XrefSegment[] = [];
  let last = 0;
  const push = (value: string) => {
    if (value !== "") out.push({ kind: "text", value });
  };
  for (const match of text.matchAll(/\{([^{}]*)\}|[{}]/g)) {
    if (match[1] === undefined) {
      throw new Error(`malformed cross-reference: unmatched "${match[0]}" in ${JSON.stringify(text.slice(Math.max(0, (match.index ?? 0) - 20), (match.index ?? 0) + 20))}`);
    }
    const tokens = parseGroup(match[1]);
    push(text.slice(last, match.index));
    out.push({ kind: "text", value: "{" });
    tokens.forEach((token, i) => {
      if (i > 0) out.push({ kind: "text", value: ", " });
      out.push({ kind: "ref", token });
    });
    out.push({ kind: "text", value: "}" });
    last = (match.index ?? 0) + match[0].length;
  }
  push(text.slice(last));
  return out;
}

export interface ResolvedXref {
  href: string;
  /** Set when the target page is in another language than the page that holds the link (summary-scope languages). */
  hreflang?: string;
  /** Translation key for the link's accessible name (takes {number}). */
  labelKey: "xref.section" | "xref.summary";
}

/** Link target of a section token, seen from `page`. Throws on an unknown section or chapter. */
export function resolveXref(token: string, page: { lang: string; slug: string }, env: PluginEnv): ResolvedXref {
  const summary = /^[A-Z]/.test(token);
  let target: string;
  if (summary) {
    target = "summary";
  } else {
    const number = Number.parseInt(token.split(".")[0], 10);
    const chapter = env.chapters.find((c) => c.number === number);
    if (!chapter) throw new Error(`cross-reference "${token}": there is no chapter ${number} in report.config.json`);
    target = chapter.id;
  }
  if (!env.sections(page.lang).has(token)) throw new Error(`unknown section "${token}" in a cross-reference`);
  const anchor = sectionAnchor(token);
  const labelKey = summary ? "xref.summary" : "xref.section";
  if (page.slug === target) return { href: `#${anchor}`, labelKey };
  const link = env.link(page.lang, target, anchor);
  return { href: link.href, hreflang: link.hreflang, labelKey };
}

export function crossRefsPlugin(env: PluginEnv): HastPluginDefinition {
  return {
    name: "mountain-report-crossrefs",
    text(node, ctx) {
      if (!node.value.includes("{") && !node.value.includes("}")) return;
      const parent = ctx.parent(node);
      if (parent && "tagName" in parent && (parent.tagName === "code" || parent.tagName === "pre")) return;
      const nodes = inFile(ctx.fileURL, () => {
        const page = pageFromFile(ctx.fileURL);
        return splitCrossRefs(node.value).map((segment): HChild => {
          if (segment.kind === "text") return txt(segment.value);
          const { href, hreflang, labelKey } = resolveXref(segment.token, page, env);
          return el("a", { href, ...(hreflang ? { hrefLang: hreflang } : {}), className: ["xref"], ariaLabel: env.tf(page.lang, labelKey, { number: segment.token }) }, [txt(segment.token)]);
        });
      });
      ctx.replaceNode(node, nodes);
    },
  };
}

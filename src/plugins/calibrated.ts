// Calibrated IPCC terms. An italic whose whole text is on the fixed list becomes a link to the
// glossary entry for its category, with a tooltip (role="tooltip", described-by) that CSS shows on
// hover and focus. Other italics stay plain. The glossary page itself is left alone.

import type { HastPluginDefinition } from "satteri";
import { classifyTerm, glossaryCategory, type GlossaryCategory } from "../lib/calibrated-terms";
import { el, inFile, pageFromFile, perFile, slugify, txt, type HChild, type HElement, type PluginEnv } from "./support";

export interface Tooltip {
  /** Glossary anchor, e.g. "likelihood". */
  anchor: string;
  /** Short label followed by the glossary entry's plain text. */
  label: string;
  text: string;
}

/**
 * Everything the tooltip shows for a category. Throws when the glossary has no such entry.
 * `glossaryLang` is the language of the glossary the term links to (the default language for a
 * summary-scope language, which has no glossary of its own).
 */
export function tooltipFor(category: GlossaryCategory, lang: string, env: PluginEnv, glossaryLang: string = lang): Tooltip {
  const heading = env.t(glossaryLang, `calibrated.glossary.${category}`);
  const text = env.glossaryEntry(glossaryLang, heading);
  if (text === undefined) {
    throw new Error(`calibrated term: the ${glossaryLang} glossary has no entry "${heading}" for the ${category} category`);
  }
  const name = env.t(glossaryLang, `calibrated.category.${category}`);
  return { anchor: slugify(heading), label: env.tf(glossaryLang, "calibrated.label", { category: name }), text };
}

export function buildCalibratedTerm(termChildren: HChild[], tip: Tooltip, tipId: string, glossaryHref: string, hreflang?: string): HElement {
  return el("span", { className: ["calibrated"] }, [
    el("a", { href: glossaryHref, ...(hreflang ? { hrefLang: hreflang } : {}), className: ["calibrated-term"], ariaDescribedBy: [tipId] }, [el("em", {}, termChildren)]),
    el("span", { className: ["calibrated-tip"], role: "tooltip", id: tipId, dataPagefindIgnore: "all" }, [
      el("span", { className: ["calibrated-tip-label"] }, [txt(tip.label)]),
      txt(" "),
      el("span", { className: ["calibrated-tip-text"] }, [txt(tip.text)]),
    ]),
  ]);
}

export function calibratedPlugin(env: PluginEnv): HastPluginDefinition {
  const counter = perFile(() => ({ n: 0 }));
  return {
    name: "mountain-report-calibrated",
    element: {
      filter: ["em"],
      visit(node, ctx) {
        const { lang, slug } = inFile(ctx.fileURL, () => pageFromFile(ctx.fileURL));
        if (slug === "glossary") return;
        const children = node.children;
        if (children.length !== 1 || children[0].type !== "text") return;
        const kind = classifyTerm(children[0].value, lang);
        if (kind === undefined) return;
        const parent = ctx.parent(node);
        if (parent && "tagName" in parent && /^(a|h[1-6])$/.test(String(parent.tagName))) return;
        const replacement = inFile(ctx.fileURL, () => {
          const glossary = env.link(lang, "glossary");
          const tip = tooltipFor(glossaryCategory(kind), glossary.hreflang ?? lang, env);
          const c = counter(ctx.data);
          c.n += 1;
          return buildCalibratedTerm([txt(children[0].type === "text" ? children[0].value : "")], tip, `calibrated-tip-${c.n}`, env.link(lang, "glossary", tip.anchor).href, glossary.hreflang);
        });
        ctx.replaceNode(node, replacement);
      },
    },
  };
}

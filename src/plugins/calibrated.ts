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

/** Everything the tooltip shows for a category. Throws when the glossary has no such entry. */
export function tooltipFor(category: GlossaryCategory, lang: string, env: PluginEnv): Tooltip {
  const heading = env.t(lang, `calibrated.glossary.${category}`);
  const text = env.glossaryEntry(lang, heading);
  if (text === undefined) {
    throw new Error(`calibrated term: the ${lang} glossary has no entry "${heading}" for the ${category} category`);
  }
  const name = env.t(lang, `calibrated.category.${category}`);
  return { anchor: slugify(heading), label: env.tf(lang, "calibrated.label", { category: name }), text };
}

export function buildCalibratedTerm(termChildren: HChild[], tip: Tooltip, tipId: string, glossaryHref: string): HElement {
  return el("span", { className: ["calibrated"] }, [
    el("a", { href: glossaryHref, className: ["calibrated-term"], ariaDescribedBy: [tipId] }, [el("em", {}, termChildren)]),
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
          const tip = tooltipFor(glossaryCategory(kind), lang, env);
          const c = counter(ctx.data);
          c.n += 1;
          return buildCalibratedTerm([txt(children[0].type === "text" ? children[0].value : "")], tip, `calibrated-tip-${c.n}`, `${env.base}${lang}/glossary/#${tip.anchor}`);
        });
        ctx.replaceNode(node, replacement);
      },
    },
  };
}

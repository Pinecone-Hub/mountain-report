// Figure slots. A paragraph that is only "FIGURE: <id>" (such as "FIGURE: fig-1-1") marks where a
// data figure goes. The plugin turns it into an empty <div data-figure="<id>"></div>; the page
// (src/pages/[lang]/[page].astro) splits the rendered HTML there and renders the Figure
// component, which needs the figure metadata and data that a Markdown plugin does not have.

import type { HastPluginDefinition } from "satteri";
import { el } from "./support";

export const FIGURE_SLOT = /^FIGURE:\s*([a-z0-9-]+)$/;

/** The figure id of a slot paragraph's text, or undefined. */
export function figureSlotId(text: string): string | undefined {
  return FIGURE_SLOT.exec(text.trim())?.[1];
}

/** Splits rendered HTML at the figure slots: text parts and figure ids, alternating. */
export function splitAtFigureSlots(html: string): Array<{ html: string } | { figure: string }> {
  const out: Array<{ html: string } | { figure: string }> = [];
  let last = 0;
  for (const m of html.matchAll(/<div data-figure="([a-z0-9-]+)"><\/div>/g)) {
    out.push({ html: html.slice(last, m.index) });
    out.push({ figure: m[1] });
    last = (m.index ?? 0) + m[0].length;
  }
  out.push({ html: html.slice(last) });
  return out.filter((part) => !("html" in part) || part.html !== "");
}

export function figuresPlugin(): HastPluginDefinition {
  return {
    name: "mountain-report-figures",
    element: {
      filter: ["p"],
      visit(node, ctx) {
        const first = node.children[0];
        if (!first || first.type !== "text" || !first.value.trimStart().startsWith("FIGURE:")) return;
        const id = figureSlotId(ctx.textContent(node));
        if (id === undefined) return;
        ctx.replaceNode(node, el("div", { dataFigure: id }));
      },
    },
  };
}

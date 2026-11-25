// Figure placeholders. Content keeps a "TODO_FIGURE: description" paragraph until the figure
// exists (stage 4 replaces it). On the public site such a paragraph becomes a labelled box,
// without the marker. Only the label is shown: the description is an editorial note that stays
// in the Markdown for stage 4.

import type { HastPluginDefinition } from "satteri";
import { el, inFile, pageFromFile, txt, type PluginEnv } from "./support";

export const FIGURE_MARKER = "TODO_FIGURE:";

/** The description after the marker, or undefined when the text is not a figure placeholder. */
export function figureDescription(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith(FIGURE_MARKER)) return undefined;
  return trimmed.slice(FIGURE_MARKER.length).trim();
}

export function figurePlaceholderPlugin(env: PluginEnv): HastPluginDefinition {
  return {
    name: "mountain-report-figure-placeholder",
    element: {
      filter: ["p"],
      visit(node, ctx) {
        const first = node.children[0];
        if (!first || first.type !== "text" || !first.value.trimStart().startsWith(FIGURE_MARKER)) return;
        if (figureDescription(ctx.textContent(node)) === undefined) return;
        const { lang } = inFile(ctx.fileURL, () => pageFromFile(ctx.fileURL));
        ctx.replaceNode(
          node,
          el("div", { className: ["figure-placeholder"] }, [
            el("p", { className: ["figure-placeholder-label"] }, [txt(env.t(lang, "figure.placeholder"))]),
          ]),
        );
      },
    },
  };
}

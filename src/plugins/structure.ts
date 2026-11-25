// Page structure that Markdown cannot express, added after the headings have ids:
//  - Summary: the sub-points (h3) of each headline (h2) go in a <details open>.
//  - FAQ: each question (h2) and its answer become a <details> with the heading inside <summary>,
//    so screen-reader heading navigation still lists the questions.
//  - Glossary: a "back to the index" link ends every entry.
// Runs before the citations plugin, so the References and Notes sections stay outside.

import type { HastPluginDefinition } from "satteri";
import { headingToken, el, inFile, pageFromFile, txt, type HChild, type PluginEnv } from "./support";

/** Id of the glossary index that the back links point to. */
export const GLOSSARY_INDEX_ID = "glossary-index";

type Node = { type: string; tagName?: string; properties?: Record<string, unknown> };

const isTag = (node: Node, ...names: string[]) => node.type === "element" && names.includes(node.tagName ?? "");

/** A group runs from an h2 to the next h2 or the first generated section (Notes, References). */
function endOfGroup(children: readonly Node[], start: number): number {
  let i = start + 1;
  while (i < children.length && !isTag(children[i], "h2", "section")) i++;
  return i;
}

export function structurePlugin(env: PluginEnv): HastPluginDefinition {
  return {
    name: "mountain-report-structure",
    after(root, ctx) {
      const { lang, slug } = inFile(ctx.fileURL, () => pageFromFile(ctx.fileURL));
      if (slug !== "summary" && slug !== "faq" && slug !== "glossary") return;
      const kids = root.children as unknown as Array<Node & HChild>;
      const out: unknown[] = [];
      let i = 0;
      while (i < kids.length) {
        const node = kids[i];
        if (!isTag(node, "h2")) {
          out.push(node);
          i++;
          continue;
        }
        const end = endOfGroup(kids, i);
        const group = kids.slice(i, end);
        if (slug === "faq") {
          const [heading, ...answer] = group;
          out.push(el("details", { className: ["faq-item"] }, [el("summary", {}, [heading as never]), ...(answer as never[])]));
        } else if (slug === "glossary") {
          out.push(...group, el("p", { className: ["back-to-top"] }, [el("a", { href: `#${GLOSSARY_INDEX_ID}` }, [txt(env.t(lang, "glossary.backToIndex"))])]));
        } else {
          const first = group.findIndex((n) => isTag(n, "h3"));
          if (first < 0) {
            out.push(...group);
          } else {
            const subs = group.slice(first);
            const tokens = subs
              .filter((n) => isTag(n, "h3"))
              .map((n) => headingToken(ctx.textContent(n as never).trim()) ?? ctx.textContent(n as never).trim());
            const label =
              tokens.length === 1
                ? env.tf(lang, "summary.subpoints.one", { first: tokens[0] })
                : env.tf(lang, "summary.subpoints.many", { first: tokens[0], last: tokens[tokens.length - 1] });
            out.push(...group.slice(0, first), el("details", { open: true, className: ["subpoints"] }, [el("summary", {}, [txt(label)]), ...(subs as never[])]));
          }
        }
        i = end;
      }
      ctx.setField(root, "children", out as never);
    },
  };
}

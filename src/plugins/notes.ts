// Notes. GFM footnotes ([^name]) are rendered by the Markdown pipeline with fixed English labels.
// This plugin replaces those labels with the page language's strings and turns the visually
// hidden "Footnotes" heading into a visible "Notes" heading, separate from References.

import type { HastPluginDefinition } from "satteri";
import { occurrenceLetter } from "./citations";
import { el, inFile, pageFromFile, perFile, txt, type PluginEnv } from "./support";

export const NOTES_ID = "notes";

interface NotesState {
  /** Note number by footnote href ("#user-content-fn-name"). */
  numbers: Map<string, number>;
  /** Back-links seen so far per note, for the occurrence number. */
  backlinks: Map<string, number>;
  /** How many times each note is referenced, by footnote href. */
  refs: Map<string, number>;
}

function isElement(node: unknown): node is { tagName: string; properties: Record<string, unknown> } {
  return typeof node === "object" && node !== null && (node as { type?: string }).type === "element";
}

function hasProp(node: { properties?: Record<string, unknown> }, name: string): boolean {
  return node.properties !== undefined && node.properties[name] !== undefined && node.properties[name] !== false;
}

export function notesPlugin(env: PluginEnv): HastPluginDefinition {
  const state = perFile((): NotesState => ({ numbers: new Map(), backlinks: new Map(), refs: new Map() }));
  return {
    name: "mountain-report-notes",
    element: {
      filter: ["a", "h2"],
      visit(node, ctx) {
        const { lang } = inFile(ctx.fileURL, () => pageFromFile(ctx.fileURL));
        const s = state(ctx.data);
        if (node.tagName === "h2") {
          const classes = node.properties?.className;
          if (Array.isArray(classes) && classes.includes("sr-only") && node.properties?.id === "footnote-label") {
            ctx.setProperty(node, "className", ["notes-title"]);
            ctx.setProperty(node, "id", NOTES_ID);
            ctx.setField(node, "children", [txt(env.t(lang, "notes.title"))]);
          }
          return;
        }
        if (hasProp(node, "dataFootnoteRef")) {
          const number = Number.parseInt(ctx.textContent(node), 10);
          const href = String(node.properties.href ?? "");
          s.numbers.set(href, number);
          s.refs.set(href, (s.refs.get(href) ?? 0) + 1);
          ctx.setProperty(node, "ariaLabel", env.tf(lang, "notes.ref", { number }));
          ctx.setProperty(node, "ariaDescribedBy", [NOTES_ID]);
          return;
        }
        if (hasProp(node, "dataFootnoteBackref")) {
          // a < p < li: the list item carries the note's id.
          const paragraph = ctx.parent(node);
          const item = paragraph ? ctx.parent(paragraph) : undefined;
          const id = item && isElement(item) ? String(item.properties.id ?? "") : "";
          const number = s.numbers.get(`#${id}`) ?? 0;
          const occurrence = (s.backlinks.get(id) ?? 0) + 1;
          s.backlinks.set(id, occurrence);
          ctx.setProperty(node, "ariaLabel", env.tf(lang, "notes.back", { number, occurrence }));
          const mark = env.t(lang, "notes.backText");
          const several = (s.refs.get(`#${id}`) ?? 1) > 1;
          ctx.setField(node, "children", several ? [txt(mark), el("sup", {}, [txt(occurrenceLetter(occurrence))])] : [txt(mark)]);
        }
      },
    },
  };
}


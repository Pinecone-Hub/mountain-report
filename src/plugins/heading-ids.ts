// Stable heading ids. "1.2 Title" -> "section-1-2", "A. Title" -> "a", "A.1" -> "a-1",
// anything else -> a slug of the text. Duplicates get -2, -3, ...

import type { HastPluginDefinition } from "satteri";
import { headingToken, perFile, sectionAnchor, slugify } from "./support";

/** Ids that other plugins create (the Notes and References sections). Headings never take them. */
export const RESERVED_IDS: readonly string[] = ["notes", "references"];

export class IdAllocator {
  private used: Set<string>;

  constructor(reserved: readonly string[] = RESERVED_IDS) {
    this.used = new Set(reserved);
  }

  /** The id for a heading text, unique within the page. */
  next(text: string): string {
    const token = headingToken(text.trim());
    const base = token ? sectionAnchor(token) : slugify(text);
    let id = base;
    for (let n = 2; this.used.has(id); n++) id = `${base}-${n}`;
    this.used.add(id);
    return id;
  }

  /** Records an id that is already in the page. */
  claim(id: string): void {
    this.used.add(id);
  }
}

export function headingIdsPlugin(): HastPluginDefinition {
  const state = perFile(() => new IdAllocator());
  return {
    name: "mountain-report-heading-ids",
    element: {
      filter: ["h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        const allocator = state(ctx.data);
        const existing = node.properties?.id;
        if (typeof existing === "string" && existing !== "") {
          allocator.claim(existing);
          return;
        }
        ctx.setProperty(node, "id", allocator.next(ctx.textContent(node)));
      },
    },
  };
}

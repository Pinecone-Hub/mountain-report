/** One step of the breadcrumb trail. The last step has no href. */
export interface Crumb {
  label: string;
  href?: string;
  /** Set when the link goes to a page in another language than the current one. */
  hreflang?: string;
}

/** A heading shown in the table of contents. */
export interface TocHeading {
  depth: 2 | 3;
  id: string;
  text: string;
}

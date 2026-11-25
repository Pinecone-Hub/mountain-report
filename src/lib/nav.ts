/** One step of the breadcrumb trail. The last step has no href. */
export interface Crumb {
  label: string;
  href?: string;
}

/** A heading shown in the table of contents. */
export interface TocHeading {
  depth: 2 | 3;
  id: string;
  text: string;
}

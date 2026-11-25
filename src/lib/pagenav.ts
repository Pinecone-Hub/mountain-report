/** Reading order of the report pages: the Summary first, then the chapters from the config. */
export function pageSequence(chapterIds: readonly string[]): string[] {
  return ["summary", ...chapterIds];
}

export interface Neighbours {
  previous?: string;
  next?: string;
}

/** The pages before and after `slug` in the sequence. Empty for a page that is not in it. */
export function neighbours(sequence: readonly string[], slug: string): Neighbours {
  const index = sequence.indexOf(slug);
  if (index < 0) return {};
  return { previous: sequence[index - 1], next: sequence[index + 1] };
}

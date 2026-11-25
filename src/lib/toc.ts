/**
 * Index of the heading to mark as current: the last heading whose top edge is at or above
 * `threshold` (pixels from the top of the viewport). Before the first heading is reached the
 * first one is current. Returns -1 when there are no headings.
 */
export interface ActiveOptions {
  /** The page is scrolled to the very bottom: the last heading wins. */
  atBottom?: boolean;
  /** Index of the heading named by the URL hash. At the bottom it wins while it is on screen. */
  preferred?: number;
  viewportHeight?: number;
}

export function pickActiveIndex(tops: readonly number[], threshold: number, options: ActiveOptions = {}): number {
  if (tops.length === 0) return -1;
  if (options.atBottom) {
    const { preferred, viewportHeight } = options;
    if (preferred !== undefined && preferred >= 0 && preferred < tops.length && viewportHeight !== undefined) {
      const top = tops[preferred];
      if (Number.isFinite(top) && top >= 0 && top < viewportHeight) return preferred;
    }
    return tops.length - 1;
  }
  let active = 0;
  tops.forEach((top, i) => {
    if (Number.isFinite(top) && top <= threshold) active = i;
  });
  return active;
}

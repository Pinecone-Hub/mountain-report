/**
 * Index of the heading to mark as current: the last heading whose top edge is at or above
 * `threshold` (pixels from the top of the viewport). Before the first heading is reached the
 * first one is current. Returns -1 when there are no headings.
 */
export function pickActiveIndex(tops: readonly number[], threshold: number): number {
  if (tops.length === 0) return -1;
  let active = 0;
  tops.forEach((top, i) => {
    if (Number.isFinite(top) && top <= threshold) active = i;
  });
  return active;
}

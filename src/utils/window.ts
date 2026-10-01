// Stateless list windowing shared by the Kanban columns and the archived
// dialog. Runtime only; no exported types.

/** Slice `items` to `size` rows, keeping `selectedIndex` centered-ish.
 * `selectedIndex` of -1 (no selection) starts at the top. */
export function windowSlice<T>(items: T[], selectedIndex: number, size: number): T[] {
  if (size <= 0 || items.length <= size) {
    return items;
  }
  const maxStart = items.length - size;
  const half = Math.floor(size / 2);
  const start = Math.min(Math.max(0, selectedIndex - half), maxStart);
  return items.slice(start, start + size);
}

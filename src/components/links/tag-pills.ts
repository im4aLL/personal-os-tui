// Pure fitter for the tag filter row: keeps the leading `all` pill and as many
// used tags as fit the available columns. The screen uses the returned list as
// its cursor space so keyboard focus can never land on a dropped pill.
// Runtime only; the pill shape lives in `tag-pills.types.ts`.
import type { LinkTagPill } from "./tag-pills.types";

export function fitTagPills(tags: string[], width: number): LinkTagPill[] {
  const room = Math.max(8, width);
  const candidates: LinkTagPill[] = [
    { id: "all", label: "[all]", tag: null },
    ...tags.map((name) => ({ id: `tag:${name}`, label: `[${name}]`, tag: name })),
  ];

  const kept: LinkTagPill[] = [];
  let used = 0;
  for (const pill of candidates) {
    const extra = (kept.length === 0 ? 0 : 1) + pill.label.length;
    if (used + extra > room) {
      break;
    }
    kept.push(pill);
    used += extra;
  }
  return kept;
}

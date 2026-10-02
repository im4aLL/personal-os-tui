// Shared ASCII text-fitting helpers for list rows and status lines. Runtime
// only; no exported types.

/** End truncation: `...` when there is room, else a hard slice. */
export function truncate(text: string, room: number): string {
  if (text.length <= room) {
    return text;
  }
  if (room <= 3) {
    return text.slice(0, Math.max(0, room));
  }
  return `${text.slice(0, room - 3)}...`;
}

/** Greedily pack whole segments into lines no wider than `room`, joined by
 * `joiner`. Segments are never split, so a shortcut like `[ ] window` stays
 * intact; a segment wider than `room` still gets its own line. Used to wrap a
 * shortcut footer instead of truncating it. */
export function wrapSegments(segments: string[], joiner: string, room: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const segment of segments) {
    if (current === "") {
      current = segment;
      continue;
    }
    const candidate = `${current}${joiner}${segment}`;
    if (candidate.length <= room) {
      current = candidate;
    } else {
      lines.push(current);
      current = segment;
    }
  }
  if (current !== "") {
    lines.push(current);
  }
  return lines;
}

/** Middle truncation: keeps the head (so a domain stays visible) and the tail
 * while the elided middle is replaced with `...`. Falls back to a hard slice
 * when the room is too small for an ellipsis. */
export function truncateMiddle(text: string, room: number): string {
  if (text.length <= room) {
    return text;
  }
  if (room <= 3) {
    return text.slice(0, Math.max(0, room));
  }
  const keep = room - 3;
  const front = Math.ceil(keep / 2);
  const back = keep - front;
  return `${text.slice(0, front)}...${back === 0 ? "" : text.slice(text.length - back)}`;
}

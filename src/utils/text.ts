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

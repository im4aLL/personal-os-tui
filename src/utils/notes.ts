// Shared note display helpers: the title fallback for untitled notes and the
// ASCII truncation used by the list rows, the editor toolbar, and the status
// line. Runtime only; the `Note` shape is imported as a type.
import type { Note } from "../repos/types";

/** Title, or the formatted created-at date when the note is untitled. */
export function noteDisplayTitle(note: Note): string {
  if (note.title.trim() !== "") {
    return note.title;
  }
  const created = new Date(note.createdAt);
  if (Number.isNaN(created.getTime())) {
    return "Untitled";
  }
  return created.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** ASCII truncation; `...` when there is room, else a hard slice. */
export function truncate(text: string, room: number): string {
  if (text.length <= room) {
    return text;
  }
  if (room <= 3) {
    return text.slice(0, Math.max(0, room));
  }
  return `${text.slice(0, room - 3)}...`;
}

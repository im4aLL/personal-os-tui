// Shared note display helpers: the title fallback for untitled notes. The
// ASCII truncation used by the list rows, the editor toolbar, and the status
// line lives in `utils/text.ts`. Runtime only; the `Note` shape is imported as
// a type.
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

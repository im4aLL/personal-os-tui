import type { Note } from "../../repos/types";

export interface NoteRowProps {
  note: Note;
  /** Draws the `> ` marker and emphasizes the title. */
  selected: boolean;
  /** Privacy mode on a non-selected row: title and date render as a fixed mask. */
  masked: boolean;
  /** Content width available for this row, in columns. */
  width: number;
}

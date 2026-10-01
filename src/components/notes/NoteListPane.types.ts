import type { Note } from "../../repos/types";

export interface NoteListPaneProps {
  /** The already-windowed rows to render. */
  items: Note[];
  /** Total notes after filtering (drives the header count). */
  count: number;
  selectedId: string | null;
  loading: boolean;
  /** True when the search field owns the keyboard. */
  searchFocused: boolean;
  search: string;
  privacyMode: boolean;
  /** Content width available for a row, in columns. */
  width: number;
  onSearchChange: (value: string) => void;
}

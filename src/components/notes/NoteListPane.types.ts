import type { Note } from "../../repos/types";

export interface NoteListPaneProps {
  /** The already-windowed rows to render. */
  items: Note[];
  /** Total notes after filtering (drives the panel title count). */
  count: number;
  selectedId: string | null;
  loading: boolean;
  /** True when the list panel (or its search) owns the keyboard. */
  focused: boolean;
  /** True when the search field owns the keyboard. */
  searchFocused: boolean;
  search: string;
  privacyMode: boolean;
  /** Outer panel width in columns; rows use `width - 4` inside the frame. */
  width: number;
  onSearchChange: (value: string) => void;
  /** Mouse: select/activate a note row without a keyboard. */
  onSelectNote?: (id: string) => void;
  onActivateNote?: (id: string) => void;
  /** Mouse wheel delta (-1 up, +1 down) over the list. */
  onWheel?: (delta: number) => void;
}

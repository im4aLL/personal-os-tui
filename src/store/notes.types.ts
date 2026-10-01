import type { Note } from "../repos/types";

export interface NotesState {
  notes: Note[];
  selectedId: string | null;
  loading: boolean;
  /** Last load/refresh failure; cleared by a successful load. */
  error: string | null;
  /** Load with the skeleton state (initial mount, scenario change, revert). */
  loadNotes: () => Promise<void>;
  /** Silent reload: no loading flag, used after a successful write. */
  refreshNotes: () => Promise<void>;
  setNotes: (notes: Note[]) => void;
  selectNote: (id: string | null) => void;
  addNote: (note: Note) => void;
  patchNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;
  /** Optimistic pin toggle; reloads the list and records an error on failure. */
  togglePin: (id: string) => Promise<void>;
  /** Distinct tag names across all notes, sorted ascending. */
  allTags: () => Promise<string[]>;
}

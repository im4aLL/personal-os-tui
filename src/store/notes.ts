// Notes store: local list state plus load/refresh over the repository seam.
// Mirrors the desktop `personal-os/src/store/notes.ts`. Mutations are local
// only; the Notes screen performs the repo write and patches here, reverting
// by reloading on failure. The list is kept in `pinned DESC, updated_at DESC`
// order after every mutation. Runtime only; the state shape lives in
// `notes.types.ts`.
import { create } from "zustand";
import type { Note } from "../repos/types";
import { messageOf } from "../utils/error";
import type { NotesState } from "./notes.types";
import { getRepos } from "./repos";

function byPinnedThenUpdated(a: Note, b: Note): number {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }
  return b.updatedAt.localeCompare(a.updatedAt);
}

function ordered(notes: Note[]): Note[] {
  return [...notes].sort(byPinnedThenUpdated);
}

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  selectedId: null,
  loading: true,
  error: null,

  loadNotes: async () => {
    set({ loading: true, error: null });
    try {
      const notes = await getRepos().notes.list();
      set({ notes: ordered(notes), loading: false });
    } catch (error) {
      set({ loading: false, error: messageOf(error) });
    }
  },

  refreshNotes: async () => {
    try {
      const notes = await getRepos().notes.list();
      set({ notes: ordered(notes) });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  setNotes: (notes) => set({ notes: ordered(notes) }),
  selectNote: (selectedId) => set({ selectedId }),
  addNote: (note) => set((state) => ({ notes: ordered([...state.notes, note]) })),
  patchNote: (id, patch) =>
    set((state) => ({
      notes: ordered(state.notes.map((note) => (note.id === id ? { ...note, ...patch } : note))),
    })),
  removeNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  togglePin: async (id) => {
    const target = get().notes.find((note) => note.id === id);
    if (target === undefined) {
      return;
    }
    const pinned = !target.pinned;
    set((state) => ({
      notes: ordered(state.notes.map((note) => (note.id === id ? { ...note, pinned } : note))),
    }));
    try {
      await getRepos().notes.setPinned(id, pinned);
    } catch (error) {
      set({ error: messageOf(error) });
      await get().loadNotes();
    }
  },

  allTags: async () => {
    try {
      return await getRepos().notes.allTags();
    } catch {
      // Suggestions are a nicety; a failed tag read must not break editing.
      return [];
    }
  },
}));

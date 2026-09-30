// Turso stub (M0). Throws until the Notes wiring milestone lands.
import type { CreateNoteInput, Note, NoteRepo, UpdateNoteInput } from "../types";

function notWired(what: string): Error {
  return new Error(`turso ${what} is not wired yet`);
}

export const tursoNoteRepo: NoteRepo = {
  list(): Promise<Note[]> {
    throw notWired("notes.list");
  },
  getById(_id: string): Promise<Note | null> {
    throw notWired("notes.getById");
  },
  search(_query: string): Promise<Note[]> {
    throw notWired("notes.search");
  },
  create(_input: CreateNoteInput): Promise<Note> {
    throw notWired("notes.create");
  },
  update(_id: string, _input: UpdateNoteInput): Promise<void> {
    throw notWired("notes.update");
  },
  remove(_id: string): Promise<void> {
    throw notWired("notes.remove");
  },
  setPinned(_id: string, _pinned: boolean): Promise<void> {
    throw notWired("notes.setPinned");
  },
};

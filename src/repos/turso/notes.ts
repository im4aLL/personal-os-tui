// Real NoteRepo: remote rows through src/lib/notes.ts. Mapping only; the SQL,
// tag serialization, and column translation live in the lib layer.
import {
  createNote,
  deleteNote,
  getAllTags,
  getNoteById,
  getNotesList,
  searchNotes,
  setNotePinned,
  setTagsForNote,
  updateNote,
} from "../../lib/notes";
import type { CreateNoteInput, Note, NoteRepo, UpdateNoteInput } from "../types";

export const tursoNoteRepo: NoteRepo = {
  async list(): Promise<Note[]> {
    return getNotesList();
  },
  async getById(id: string): Promise<Note | null> {
    return getNoteById(id);
  },
  async search(query: string): Promise<Note[]> {
    return searchNotes(query);
  },
  async create(input: CreateNoteInput): Promise<Note> {
    return createNote(input);
  },
  async update(id: string, input: UpdateNoteInput): Promise<void> {
    await updateNote(id, input);
  },
  async remove(id: string): Promise<void> {
    await deleteNote(id);
  },
  async setPinned(id: string, pinned: boolean): Promise<void> {
    await setNotePinned(id, pinned);
  },
  async allTags(): Promise<string[]> {
    return getAllTags();
  },
  async setTags(id: string, tags: string[]): Promise<void> {
    await setTagsForNote(id, tags);
  },
};

// In-memory NoteRepo: pinned DESC, updated_at DESC, matching the real query.
// Tags live on the note objects (the mock folds `note_tags` into the row) so
// remove drops a note and its tags together. The `large` scenario clones rows
// with rewritten ids; the generated list is cached so `getById` can resolve a
// selected clone instead of failing.
import { randomUUID } from "node:crypto";
import { createFixtures } from "../../mock/fixtures";
import type { Fixtures } from "../../mock/fixtures.types";
import type { CreateNoteInput, Note, NoteRepo, UpdateNoteInput } from "../types";
import { applyListScenario, isEmptyScenario, mockCall } from "./guard";

let rows: Note[] = cloneNotes(createFixtures().notes);
// Result of the most recent `list()` call, so ids synthesized by the `large`
// scenario resolve in `getById`.
let generatedRows: Note[] = [];

function cloneNotes(notes: Note[]): Note[] {
  return notes.map((note) => ({ ...note, tags: [...note.tags] }));
}

export function resetNoteFixtures(fixtures: Fixtures): void {
  rows = cloneNotes(fixtures.notes);
  generatedRows = [];
}

function stamp(): string {
  return new Date().toISOString();
}

function sorted(): Note[] {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function largeList(): Note[] {
  return applyListScenario(sorted(), (row, index) => ({
    ...row,
    id: `${row.id}-large-${index}`,
    tags: [...row.tags],
  }));
}

export const mockNoteRepo: NoteRepo = {
  list(): Promise<Note[]> {
    return mockCall(() => {
      generatedRows = largeList();
      return generatedRows;
    });
  },

  getById(id: string): Promise<Note | null> {
    return mockCall(() => {
      if (isEmptyScenario()) {
        return null;
      }
      const note = rows.find((row) => row.id === id);
      if (note !== undefined) {
        return note;
      }
      return generatedRows.find((row) => row.id === id) ?? null;
    });
  },

  search(query: string): Promise<Note[]> {
    return mockCall(() => {
      if (isEmptyScenario()) {
        return [];
      }
      const needle = query.trim().toLowerCase();
      return sorted().filter(
        (note) =>
          note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle),
      );
    });
  },

  create(input: CreateNoteInput): Promise<Note> {
    return mockCall(() => {
      const now = stamp();
      const note: Note = {
        id: randomUUID(),
        title: input.title,
        content: input.content ?? "",
        pinned: input.pinned ?? false,
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
      rows.push(note);
      return note;
    });
  },

  update(id: string, input: UpdateNoteInput): Promise<void> {
    return mockCall(() => {
      const note = rows.find((row) => row.id === id);
      if (note === undefined) {
        throw new Error(`mock note not found: ${id}`);
      }
      Object.assign(note, { ...input, id: note.id, updatedAt: stamp() });
    });
  },

  remove(id: string): Promise<void> {
    return mockCall(() => {
      rows = rows.filter((row) => row.id !== id);
    });
  },

  setPinned(id: string, pinned: boolean): Promise<void> {
    return mockCall(() => {
      const note = rows.find((row) => row.id === id);
      if (note === undefined) {
        throw new Error(`mock note not found: ${id}`);
      }
      note.pinned = pinned;
      note.updatedAt = stamp();
    });
  },

  allTags(): Promise<string[]> {
    return mockCall(() => {
      const names = new Set<string>();
      for (const row of rows) {
        for (const tag of row.tags) {
          names.add(tag);
        }
      }
      return [...names].sort((a, b) => a.localeCompare(b));
    });
  },

  setTags(id: string, tags: string[]): Promise<void> {
    return mockCall(() => {
      const note = rows.find((row) => row.id === id);
      if (note === undefined) {
        throw new Error(`mock note not found: ${id}`);
      }
      // Replace in place; mirrors the desktop `setTagsForNote`, which does not
      // bump `updated_at`.
      note.tags = [...tags];
    });
  },
};

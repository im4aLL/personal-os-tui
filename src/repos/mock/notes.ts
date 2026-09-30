// In-memory NoteRepo: pinned DESC, updated_at DESC, matching the real query.
import { randomUUID } from "node:crypto";
import { createFixtures } from "../../mock/fixtures";
import type { Fixtures } from "../../mock/fixtures.types";
import type { CreateNoteInput, Note, NoteRepo, UpdateNoteInput } from "../types";
import { applyListScenario, isEmptyScenario, mockCall } from "./guard";

let rows: Note[] = createFixtures().notes;

export function resetNoteFixtures(fixtures: Fixtures): void {
  rows = [...fixtures.notes];
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

export const mockNoteRepo: NoteRepo = {
  list(): Promise<Note[]> {
    return mockCall(() =>
      applyListScenario(sorted(), (row, index) => ({ ...row, id: `${row.id}-large-${index}` })),
    );
  },

  getById(id: string): Promise<Note | null> {
    return mockCall(() => {
      if (isEmptyScenario()) {
        return null;
      }
      return rows.find((row) => row.id === id) ?? null;
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
};

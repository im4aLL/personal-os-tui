// Remote notes access: the desktop SQL with `?` placeholders, returning domain
// `Note` values. The Turso repo delegates here; the mock mirrors the ordering
// and tag semantics. The database stores snake_case columns and booleans as
// `INTEGER 0|1`, so every read and write translates at this boundary.
import { randomUUID } from "node:crypto";
import type { CreateNoteInput, Note, UpdateNoteInput } from "../repos/types";
import { tursoBatchExecute, tursoExecute, tursoSelect } from "./turso";

interface NoteRow {
  id: string;
  title: string | null;
  content: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    // The TUI domain title is a non-null string; the desktop column is
    // nullable, so a stored NULL reads back as an empty title.
    title: row.title ?? "",
    content: row.content,
    pinned: row.pinned === 1,
    tags: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The shared column projection for the list, search, and single-note reads.
// `content` is included even though the list rows render only title and date:
// NotesScreen filters over both `note.title` and `note.content` client-side.
// Tags are deliberately excluded; only `getNoteById` loads them.
export const NOTE_COLUMNS = "id, title, content, pinned, created_at, updated_at";

export async function getNotesList(): Promise<Note[]> {
  const rows = await tursoSelect<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM notes ORDER BY pinned DESC, updated_at DESC`,
  );
  return rows.map(toNote);
}

export async function searchNotes(query: string): Promise<Note[]> {
  const like = `%${query}%`;
  const rows = await tursoSelect<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY pinned DESC, updated_at DESC`,
    [like, like],
  );
  return rows.map(toNote);
}

export async function getNoteById(id: string): Promise<Note | null> {
  const rows = await tursoSelect<NoteRow>(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ?`, [id]);
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  const tags = await getTagsForNote(id);
  return { ...toNote(row), tags };
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const now = new Date().toISOString();
  const note: Note = {
    id: randomUUID(),
    title: input.title ?? "",
    content: input.content ?? "",
    pinned: input.pinned ?? false,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };

  await tursoExecute(
    `INSERT INTO notes (id, title, content, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [note.id, note.title, note.content, note.pinned ? 1 : 0, note.createdAt, note.updatedAt],
  );

  return note;
}

/** The column and DB representation for one updatable field. A key present in
 * the input with an `undefined` value writes NULL (`value ?? null`), matching
 * the W2 `updateTodo` pattern. Unknown runtime keys throw instead of emitting
 * invalid SQL. */
function updateAssignment(field: string, raw: unknown): { column: string; value: unknown } {
  const value = raw ?? null;
  switch (field) {
    case "title":
      return { column: "title", value };
    case "content":
      return { column: "content", value };
    case "pinned":
      return { column: "pinned", value: value === null ? null : value ? 1 : 0 };
    default:
      throw new Error(`unsupported note update field: ${field}`);
  }
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];

  for (const field of Object.keys(input)) {
    const { column, value } = updateAssignment(field, input[field as keyof UpdateNoteInput]);
    sets.push(`${column} = ?`);
    args.push(value);
  }

  sets.push("updated_at = ?");
  args.push(new Date().toISOString(), id);

  await tursoExecute(`UPDATE notes SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function setNotePinned(id: string, pinned: boolean): Promise<void> {
  await tursoExecute("UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ?", [
    pinned ? 1 : 0,
    new Date().toISOString(),
    id,
  ]);
}

/** Delete a note and its tags in one batch (tags first, then the note), so a
 * mid-batch failure never leaves orphaned `note_tags` rows behind. */
export async function deleteNote(id: string): Promise<void> {
  await tursoBatchExecute([
    { sql: "DELETE FROM note_tags WHERE note_id = ?", args: [id] },
    { sql: "DELETE FROM notes WHERE id = ?", args: [id] },
  ]);
}

export async function getTagsForNote(noteId: string): Promise<string[]> {
  const rows = await tursoSelect<{ name: string }>(
    "SELECT name FROM note_tags WHERE note_id = ? ORDER BY created_at ASC",
    [noteId],
  );
  return rows.map((row) => row.name);
}

/** One batch that replaces a note's full tag set: DELETE then one INSERT per
 * tag. Does not bump `updated_at`, matching the desktop `setTagsForNote`. */
async function writeTags(noteId: string, tags: string[]): Promise<void> {
  const now = new Date().toISOString();
  await tursoBatchExecute([
    { sql: "DELETE FROM note_tags WHERE note_id = ?", args: [noteId] },
    ...tags.map((name) => ({
      sql: "INSERT INTO note_tags (id, note_id, name, created_at) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), noteId, name, now],
    })),
  ]);
}

// Per-note serialized tag-write queue. Mirrors the desktop note editor's
// `queueTagWrite`: each new write chains after the previous one for that note
// so rapid add/remove (or a note switch) cannot interleave two DELETE + INSERT
// batches. Prior rejections are swallowed for chaining only; each caller still
// sees its own write's rejection.
const tagWriteQueues = new Map<string, Promise<void>>();

export function setTagsForNote(noteId: string, tags: string[]): Promise<void> {
  const previous = tagWriteQueues.get(noteId) ?? Promise.resolve();
  const next = previous
    .catch(() => {
      // A failed earlier write must not block this one.
    })
    .then(() => writeTags(noteId, tags));
  const tail = next.catch(() => {});
  tagWriteQueues.set(noteId, tail);
  // Drop the queue entry once this tail settles, unless a newer write replaced
  // it in the meantime, so the map does not grow without bound.
  void tail.then(() => {
    if (tagWriteQueues.get(noteId) === tail) {
      tagWriteQueues.delete(noteId);
    }
  });
  return next;
}

export async function getAllTags(): Promise<string[]> {
  const rows = await tursoSelect<{ name: string }>(
    "SELECT DISTINCT name FROM note_tags ORDER BY name ASC",
  );
  return rows.map((row) => row.name);
}

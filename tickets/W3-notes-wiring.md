---
id: W3
title: Notes wiring
type: wiring
status: not-started
phase: notes
order: 11
depends_on: [G3]
wires: M3
---

# W3 - Notes wiring

> Type: wiring · Status: not-started · Phase: notes

## Objective

Notes read and write real rows, including tags, pinning, and autosave.

## Swap in

`NoteRepo` -> `src/lib/notes.ts`, using the `getNotesList` projection for the list and `getNoteById` for the editor. `setTagsForNote` uses `tursoBatchExecute` (delete then insert). `src/store/notes.ts` unchanged.

## Optimistic updates and rollback

Title, content, and pin update the store immediately. Saves are debounced; the `Saving...`/`Saved` indicator reflects the real request. A failed save keeps the typed text, marks the indicator as failed, and retries on the next edit or `Ctrl+S`. Tag writes keep the per-note serialized queue from the desktop so DELETE and INSERT cannot interleave.

## Errors and loading

Note switching flushes the previous note before loading the next, so no write is lost. A load failure shows a retry affordance in the editor pane instead of a blank editor.

## Files touched

- `src/repos/turso/notes.ts` - Turso implementation of `NoteRepo`
- `src/lib/notes.ts` - the desktop SQL with `?` placeholders
- `src/components/notes/NoteEditorPane.tsx` - save-status error state only

## Verification checklist

- [ ] Create a note, type, wait for `Saved`, restart `pos`: content intact.
- [ ] Switch notes mid-edit: the previous note is flushed and present in the database.
- [ ] Pin a note; verify `pinned = 1` and the ordering in the desktop app.
- [ ] Add and remove tags rapidly; the final tag set in `note_tags` is exact.
- [ ] A 3,000-character body saves and reloads without truncation; verify with SQL length.
- [ ] With the network off: a save fails visibly, the text is preserved, and a later save succeeds.
- [ ] Export to `.txt` and `.md` after wiring still works (it is file-system only, so this is a regression check).
- [ ] Delete a note; `note_tags` rows are gone.

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

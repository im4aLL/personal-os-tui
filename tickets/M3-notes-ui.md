---
id: M3
title: Notes UI
type: milestone
status: not-started
phase: notes
order: 9
depends_on: [W2]
gate: G3
---

# M3 - Notes UI

> Type: milestone · Status: not-started · Phase: notes

## Objective

The full Notes experience on fixtures: two panes, search, pin, privacy mode, editor with Edit/Preview toggle, tags, autosave indicator, delete, font-size or density control, export, and add-selection-as-todo.

## Deliverables

- [ ] `src/screens/NotesScreen.tsx` with the two-pane list and editor layout.
- [ ] `src/components/notes/NoteListPane.tsx` and `NoteRow.tsx`: search, pinned-first then `updated_at` descending ordering, relative dates, and the created-at fallback for an untitled note.
- [ ] `src/components/notes/NoteEditorPane.tsx` with title, tags, and body fields, the `Saving...`/`Saved` indicator, and `Ctrl+S` immediate flush.
- [ ] `src/components/notes/NoteToolbar.tsx` with Edit/Preview, pin, privacy, size, export, and delete.
- [ ] Markdown preview covering headings, lists, task lists, code fences, links, blockquotes, and tables; empty content shows "Nothing to preview yet.".
- [ ] Tag input with suggestions from other notes; `Enter` adds, `Backspace` on an empty input removes the last, and the tag set survives a note switch.
- [ ] Privacy mode masks every row except the selected one, with a stable mask width so the list does not jitter.
- [ ] Text size or density control with `-`/`+`, persisted in config.
- [ ] Export menu (`x`) writing `.txt` (markdown syntax stripped, list markers preserved) and `.md` (verbatim).
- [ ] `Ctrl+Enter` with a preview selection creates a todo; over 100 characters the title truncates with `...` and the full text becomes the description.
- [ ] Delete with confirmation, removing the note and its tags.
- [ ] Empty list states ("No notes yet", "No notes match your search") and "No note selected" in the editor pane.
- [ ] Loading skeletons in the list; the editor clears content immediately when switching notes so the previous note never flashes.
- [ ] Error state: `POS_MOCK_SCENARIO=error` rejects the save with a non-blocking status-line error while keeping the typed content; delete errors show a toast.
- [ ] Narrow (below 100 columns): single-pane mode with `Tab` or `Ctrl+N` switching.
- [ ] Fixtures: 14 notes, 3 pinned, one with no title, one with a 3,000-character markdown body (headings, nested lists, task list, two code fences, a table, a blockquote, an inline link, bold and italic), one with a single very long unbroken line, 4 tagged from a shared pool, and `updated_at` spread across today, yesterday, last week, and last year.
- [ ] Scenario transforms: `empty`, `loading` (1500 ms), `large` (200 short notes), `error`.

## Design notes

### Screen layout

```text
+--------------------+---------------------------------------------------+
| Notes         + @  | Edit | Preview           - 14 +  Saving... b x d |
|--------------------+---------------------------------------------------+
| Search notes...    |  Release checklist                                |
|--------------------|  [ work ] [ release ]                             |
| > Release checkl.. |  -------------------------------------------------|
|   2m ago           |  # Release checklist                              |
| ------------------ |                                                   |
|   Meeting notes    |  - [x] bump version                               |
|   3h ago           |  - [ ] tag the release                            |
| ------------------ |  - [ ] update the changelog                       |
|   **********       |                                                   |
|   *****            |  ```bash                                          |
|   (privacy mode)   |  npm run release                                  |
|                    |  ```                                              |
+--------------------+---------------------------------------------------+
 p preview  b pin  v privacy  - / + size  x export  d delete
```

Narrow (under 100 columns) shows one pane at a time with `Tab` or `Ctrl+N` switching:

```text
+------------------------------------------+
| [ List ] Editor                          |
|------------------------------------------|
| # Release checklist                      |
| - [x] bump version                       |
+------------------------------------------+
```

### Keybindings

| Key | Action |
| --- | --- |
| `j` / `k` | Move selection in the list |
| `Enter` | Focus the editor body |
| `n` | New note (title focused) |
| `p` | Toggle Edit / Preview |
| `b` | Toggle pin on the selected note |
| `v` | Toggle privacy mode |
| `-` / `+` | Decrease / increase text size (or density) |
| `x` | Export menu (.txt, .md) |
| `d` | Delete with confirmation |
| `Ctrl+S` | Flush save immediately |
| `Ctrl+Enter` | Add the selected preview text as a todo |
| `Tab` | Cycle fields: title, tags, body; in narrow mode, switch panes |
| `Esc` | Leave the editor body, then the note |

### States

- Empty list: "No notes yet" and "No notes match your search"; editor pane shows "No note selected", matching `personal-os/src/pages/notes.tsx`.
- Loading: skeletons in the list, and the editor clears content immediately when switching notes so the previous note never flashes.
- Populated: fixtures below; pinned notes sort above unpinned then by `updated_at` descending.
- Saving states: hidden when idle, `Saving...` during a debounce-and-write, `Saved` for two seconds after.
- Error: `POS_MOCK_SCENARIO=error` rejects the save and shows a non-blocking status-line error while keeping the typed content; delete errors show a toast.
- Privacy mode: every row except the selected one shows a fixed-width mask for both title and date.
- Preview: markdown headings, lists, task lists, code fences, links, blockquotes, and tables; empty content shows "Nothing to preview yet.".
- Narrow: single-pane mode as sketched.

## Files touched

- `src/screens/NotesScreen.tsx` - the two-pane screen
- `src/components/notes/NoteListPane.tsx` - searchable, ordered list pane
- `src/components/notes/NoteRow.tsx` - list row with relative date and privacy mask
- `src/components/notes/NoteEditorPane.tsx` - editor with autosave indicator
- `src/components/notes/NoteToolbar.tsx` - preview toggle and note actions
- `src/store/notes.ts` - store mirroring `personal-os/src/store/notes.ts`
- `src/repos/mock/notes.ts` - in-memory implementation over the fixtures
- `src/lib/export-note.ts` - `.txt` and `.md` export

## Approval

Approved at [G3](G3-notes-ui-approval.md). Do not start the next ticket until G3 is `done`.

## Deferred

- PDF export
- Images
- Version history
- Spellcheck
- Split-pane resizing

## Notes

- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

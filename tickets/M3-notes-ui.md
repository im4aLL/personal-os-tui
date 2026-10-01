---
id: M3
title: Notes UI
type: milestone
status: done
phase: notes
order: 9
depends_on: [W2]
gate: G3
---

# M3 - Notes UI

> Type: milestone · Status: done · Phase: notes

## Objective

The full Notes experience on fixtures: two panes, search, pin, privacy mode, editor with Edit/Preview toggle, tags, autosave indicator, delete, font-size or density control, export, and add-selection-as-todo.

## Deliverables

- [x] `src/screens/NotesScreen.tsx` with the two-pane list and editor layout.
- [x] `src/components/notes/NoteListPane.tsx` and `NoteRow.tsx`: search, pinned-first then `updated_at` descending ordering, relative dates, and the created-at fallback for an untitled note.
- [x] `src/components/notes/NoteEditorPane.tsx` with title, tags, and body fields, the `Saving...`/`Saved` indicator, and `Ctrl+S` immediate flush.
- [x] `src/components/notes/NoteToolbar.tsx` with Edit/Preview, pin, privacy, size, export, and delete.
- [x] Markdown preview covering headings, lists, task lists, code fences, links, blockquotes, and tables; empty content shows "Nothing to preview yet.".
- [x] Tag input with suggestions from other notes; `Enter` adds, `Backspace` on an empty input removes the last, and the tag set survives a note switch.
- [x] Privacy mode masks every row except the selected one, with a stable mask width so the list does not jitter.
- [x] Text size or density control - removed by decision. A terminal renders at a fixed cell size and OpenTUI exposes no per-panel font size or line spacing, so the `-`/`+` control and its `notesDensity` config setting were deleted rather than shipped as a list-spacing approximation.
- [x] Export menu (`x`) writing `.txt` (markdown syntax stripped, list markers preserved) and `.md` (verbatim).
- [x] `Ctrl+Enter` with a selection creates a todo, in either the editor or the preview; over 100 characters the title truncates with `...` and the full text becomes the description.
- [x] Delete with confirmation, removing the note and its tags.
- [x] Empty list states ("No notes yet", "No notes match your search") and "No note selected" in the editor pane.
- [x] Loading skeletons in the list; the editor clears content immediately when switching notes so the previous note never flashes.
- [x] Error state: `POS_MOCK_SCENARIO=error` rejects the save with a non-blocking status-line error while keeping the typed content; delete errors show a toast.
- [x] Narrow (below 100 columns): single-pane mode with `Tab` or `Ctrl+N` switching.
- [x] Fixtures: 14 notes, 3 pinned, one with no title, one with a 3,000-character markdown body (headings, nested lists, task list, two code fences, a table, a blockquote, an inline link, bold and italic), one with a single very long unbroken line, 4 tagged from a shared pool, and `updated_at` spread across today, yesterday, last week, and last year.
- [x] Scenario transforms: `empty`, `loading` (1500 ms), `large` (200 short notes), `error`.

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
| `Ctrl+Enter` | Add the selected text (editor or preview) as a todo |
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
- Implemented and reviewed via `hadi-reviewer` (a second pass confirmed every finding resolved and found no regressions); `npm run typecheck`, `npm run check`, and `npm run build` pass. The interactive G3 checklist remains a manual pass.
- The repo `Note` model gained `tags: string[]`, and `NoteRepo` gained `allTags()` and `setTags(id, tags)`, so the tag input and suggestions work on mock data. The Turso implementations stay W3 `notWired` stubs.
- Tags are folded onto the mock note row (the mock has no `note_tags` table), so delete drops a note and its tags together and `setTags` does not bump `updated_at`, matching the desktop `setTagsForNote`.
- "Text size or density" was removed by decision: a terminal renders at a fixed cell size and OpenTUI exposes no per-panel font size or line spacing, so a list-spacing approximation was rejected and the `-`/`+` control, its key handling, and the `notesDensity` config setting were deleted. `saveUiPreferences` remains for `notesPrivacyMode`.
- Editor layout follow-up from the manual pass: the body now flex-fills the remaining pane height instead of a fixed row count (which overflowed once the tag area grew), and the dashed separator and the body box border under the tags were removed so the editor body matches the borderless preview.
- Export writes to `POS_EXPORT_DIR` when set, else `<configDir>/exports`, de-duplicating collisions. `.txt` strips markdown syntax while preserving list markers; `.md` is verbatim. The written path is shown in the screen status line.
- The `large` scenario clones fixture rows with suffixed ids and caches the generated list so `getById` can open a clone; `empty`/`loading`/`error`/`large` all route through the shared mock guard.
- Review follow-ups (non-gate-blocking): a save that fails for the outgoing note can still be lost when switching away under the error scenario, and `NoteToolbarProps.privacyMode` is an unused prop. Both are cleanup candidates for W3.

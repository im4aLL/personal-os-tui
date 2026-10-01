---
id: M2
title: Todo UI
type: milestone
status: done
phase: todo
order: 6
depends_on: [W1]
gate: G2
---

# M2 - Todo UI

> Type: milestone · Status: done · Phase: todo

## Objective

The full Todo screen on fixtures: three columns, selection, search, create/edit/delete forms, status changes, reordering, archived todos, bulk archive/clear, and the "Add as work log" action (creating a mock work log).

## Deliverables

- [x] `src/screens/TodoScreen.tsx` with the three-column Kanban layout (Todo, In Progress, Completed) and accurate counts in the column headers.
- [x] `src/components/todos/KanbanColumn.tsx` and `TodoRow.tsx` with priority badges (`high` danger, `medium` peach, `low` blue) and due-date badges that turn danger when overdue.
- [x] `src/components/todos/TodoForm.tsx` for create and edit, opening with the focused column's default status and pre-filling every field on edit, including priority and due date.
- [x] `src/components/todos/ArchivedTodosDialog.tsx` with list, restore, restore all, and permanent delete.
- [x] Selection and movement: `j`/`k`, `g`/`G`, `Ctrl+D`/`Ctrl+U`, and `h`/`l` column movement.
- [x] Status changes: `m` cycles forward (todo -> in progress -> completed -> todo); `H`/`L` moves across columns; both update visible counts immediately.
- [x] Reordering within a column with `K`/`J`, keeping the moved item under the cursor.
- [x] Delete with confirmation (`d`), archive all completed with confirmation (`A`), and destructive clear all completed (`X`).
- [x] Case-insensitive search over title and description with `/`, cleared with `Esc`.
- [x] "Add as work log" (`w`) on completed items, creating a mock work log; the action is absent for non-completed items.
- [x] Empty states per column, plus the single centered empty state with the hint `n to add your first todo`.
- [x] Loading skeletons matching the desktop's three-column skeleton layout.
- [x] Error banner above the columns under `POS_MOCK_SCENARIO=error` with a retry hint, retaining whatever data was already loaded.
- [x] Form validation for an empty title, plus the saving state on `Enter`.
- [x] Narrow (below 100 columns): single-column mode with a column tab strip; below 70: badges move to a second line to avoid truncating titles.
- [x] Fixtures: 12 active todos (at least 4 `todo`, 3 `in_progress`, 3 `completed`, plus 2 more to force column scrolling), at least 2 overdue, 2 due today, 2 future, all priorities plus 2 with `priority: null`, one long title, one long description, and 2 completed; 3 archived todos with stale `updated_at`; positions intentionally gappy (0, 1, 5, 6).
- [x] Scenario transforms: `empty` (all arrays empty), `loading` (1500 ms latency), `large` (150 todos), `error` (every mutation rejects).

## Design notes

### Screen layout

```text
+--------------+--------------+---------------+
| TODO    (5)  | IN PROGRESS  | COMPLETED (2) |
|--------------|--------------|---------------|
|> Fix login   | > Wire export|   Ship setup  |
|  ! high      |   med        |   Aug 12      |
|  today       |   Sep 30     |               |
|              |              |   Write docs  |
|  Read the    |              |   Aug 10      |
|  docs        |              |               |
|  low         |              |               |
|              |              |               |
|  Pay rent    |              |               |
|  2d overdue  |              |               |
+--------------+--------------+---------------+
 n new  Enter edit  m cycle status  H/L move column
 K/J reorder  d delete  a archived  A archive done  w work log
```

Narrow (under 100 columns):

```text
+------------------------------------------+
| [ Todo 5 ] In Progress 2 | Completed 2    |
|------------------------------------------|
|> Fix login            high     today     |
|  Read the docs         low                |
|  Pay rent                       2d over   |
+------------------------------------------+
```

### Keybindings

| Key | Action |
| --- | --- |
| `h` / `l` | Move between columns (or `1`/`2`/`3` in wide mode) |
| `j` / `k` | Move selection |
| `g` / `G` | First / last item |
| `Ctrl+D` / `Ctrl+U` | Page down / up |
| `Enter` | Open edit form |
| `n` | New todo in the focused column |
| `m` | Cycle status forward (todo -> in progress -> completed -> todo) |
| `H` / `L` | Move selected todo to previous / next status column |
| `K` / `J` | Reorder selected todo up / down within its column |
| `d` | Delete with confirmation |
| `/` | Focus search |
| `a` | Archived todos dialog |
| `A` | Archive all completed (confirmation) |
| `X` | Clear all completed (destructive confirmation) |
| `w` | Add as work log (completed items only) |
| `Esc` | Clear search, then back out |

### States

- Empty: per-column "No todos" text; when all three are empty, a single centered empty state with the hint `n to add your first todo`.
- Loading: three skeleton columns with a header placeholder, matching the desktop's skeleton layout.
- Populated: the fixture set below, with priority badges (`high` danger, `medium` peach, `low` blue) and due-date badges that turn danger when overdue.
- Error: `POS_MOCK_SCENARIO=error` renders an inline banner above the columns with a retry hint, and the columns render whatever data was already loaded.
- Narrow: below 100 columns, single-column mode with a column tab strip (`h`/`l` switch); below 70, badges move to a second line to avoid truncating titles.
- Archived dialog: list, restore, restore all, permanent delete; empty state "No archived todos".
- Form states: validation errors for empty title, and the saving state on `Enter`.

## Files touched

- `src/screens/TodoScreen.tsx` - the Kanban screen
- `src/components/todos/KanbanColumn.tsx` - one status column with its header count
- `src/components/todos/TodoRow.tsx` - row with priority and due-date badges
- `src/components/todos/TodoForm.tsx` - create and edit form
- `src/components/todos/ArchivedTodosDialog.tsx` - archived list, restore, and delete
- `src/components/ui/*` - ConfirmDialog, TextArea, Select, DateField, TagInput additions
- `src/store/todos.ts` - store mirroring `personal-os/src/store/todos.ts`
- `src/repos/mock/todos.ts` - in-memory implementation over the fixtures

## Approval

Approved at [G2](G2-todo-ui-approval.md). Do not start the next ticket until G2 is `done`.

## Deferred

- Mouse drag
- Multi-select
- Batch operations beyond archive/clear

## Notes

- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- No automated tests: this repo uses manual verification and approval checklists instead (`PLAN.md`). M2 was verified with `typecheck`, biome, `build`, `build:prod`, an internal code review, and pty smoke checks; the interactive checklist above still gates G2.
- `TagInput` was not built: Todo has no tags, so no tag control is needed (AGENTS: use OpenTUI primitives, add a custom component only when one is missing and needed). The other M2 UI additions (ConfirmDialog, TextArea, Select, DateField) landed.
- The repo `Todo` model gained `description: string | null` and `priority: TodoPriority | null` to match the desktop schema and the M2 fixtures (search over description, 2 null priorities, one long description). W2 maps the remaining field names at the Turso boundary.
- Screen keys are resolved through a small `useKeyboardScope` seam: `App` consults the active screen scope before its global registry, so screen keys win without depending on React listener ordering. On the Todo screen this makes `Ctrl+D` page down instead of opening the mock panel; `Ctrl+Shift+D` still reaches the mock panel where the terminal reports shift. On terminals that report `Ctrl+Shift+D` as plain `Ctrl+D` (see M0), the panel is unreachable from the Todo screen by design.
- `w` ("Add as work log") is present only for completed items: the key is inert elsewhere and the footer hint advertises it only when a completed item is selected, per the deliverable that the action is absent for non-completed items.
- The `large` scenario renders 150 todos by cloning fixture rows with suffixed ids (`<id>-large-<n>`). Cloned ids map back to no source row, so mutations on a clone reject with "mock todo not found"; `large` is a read-only scrolling/verification mode (documented in `src/repos/mock/todos.ts`).
- `K`/`J` reorder and `A`/`X` archive/clear operate on the current (search-filtered) view; `m`/`H`/`L` position writes use the unfiltered column order so persisted positions stay a complete contiguous range. The `A`/`X` confirm body states the search scope.
- Deferred, unchanged: mouse drag, multi-select, batch operations beyond archive/clear (see Deferred above).

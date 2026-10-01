---
id: G2
title: Todo UI approval
type: gate
status: done
phase: todo
order: 7
depends_on: [M2]
approves: M2
---

# G2 - Todo UI approval

> Type: gate · Status: done · Phase: todo

## Purpose

Approve the Todo UI ([M2](M2-todo-ui.md)) before its functionality is built.

## Preconditions

- [x] [M2](M2-todo-ui.md) deliverables are complete
- [x] [M2](M2-todo-ui.md) is implemented, reviewed, and already marked `done`

## Approval checklist

- [ ] Three columns render with accurate counts in the headers.
- [ ] Overdue items show a danger-tinted due badge; today's items are distinguishable from overdue.
- [ ] `j`/`k`/`g`/`G` movement feels right, including at column boundaries; `h`/`l` changes columns in wide mode and the tab strip in narrow mode.
- [ ] `n` opens the form with the correct default status for the focused column; empty title is rejected with a clear inline error.
- [ ] `Enter` edits an existing todo and pre-fills every field, including priority and due date.
- [ ] `m` cycles status; `H`/`L` moves across columns; both update the visible counts immediately.
- [ ] `K`/`J` reorders within a column, and the item stays under the cursor after the move.
- [ ] `d` requires confirmation; `A` requires confirmation and moves all completed items to archived; `X` requires a destructive confirmation.
- [ ] `a` shows the three archived todos; restore one, restore all, and permanent delete each behave correctly and update the main list.
- [ ] `w` on a completed todo reports success and (in mock mode) a row appears in the mock work log; the action is absent for non-completed items.
- [ ] `/` filters by title and description, case-insensitively; `Esc` clears it and restores the full list.
- [ ] `POS_MOCK_SCENARIO=empty`, `loading`, `large`, and `error` each render the intended state.
- [ ] Narrow-terminal pass at 120, 100, 80, 60, and 50 columns.
- [ ] Approve the column layout, the badge styling, the density (rows per screen), and the reorder feel.

## On approval

- [x] Set this ticket to `done` ([M2](M2-todo-ui.md) is already `done`).
- [x] Unblock the next ticket in the sequence.

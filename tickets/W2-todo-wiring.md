---
id: W2
title: Todo wiring
type: wiring
status: done
phase: todo
order: 8
depends_on: [G2]
wires: M2
---

# W2 - Todo wiring

> Type: wiring · Status: done · Phase: todo

## Objective

Todo reads and writes real rows with the exact desktop schema.

## Swap in

`TodoRepo` methods -> `src/lib/todos.ts`: `list`, `listByStatus`, `search`, `archived`, `create`, `update`, `remove`, `removeMany`, `archive`, `restore`, `updatePositions`. `src/store/todos.ts` is unchanged.

## Optimistic updates and rollback

Matches the desktop's `personal-os/src/store/todos.ts` and `kanban-board.tsx`: `patchTodo` updates the local list before the write; a failed write triggers a full reload (the desktop's revert strategy). Position reorders apply locally first and roll back to the previous order on failure. `H`/`L` status moves compute `newTargetIds` exactly as the desktop's drag handler does, then persist the status and the positions in one `tursoBatchExecute`.

## Errors and loading

Initial load shows skeletons; refresh after sync-style events is silent. A failed write shows a status-line error and restores the previous list. A request that times out leaves the UI in the last-known-good state.

## Files touched

- `src/repos/turso/todos.ts` - Turso implementation of `TodoRepo`
- `src/lib/todos.ts` - the desktop SQL with `?` placeholders
- `src/store/todos.ts` - only if a real error surface is needed
- `src/lib/turso.ts` - batch for position writes

## Verification checklist

- [ ] Create a todo in `pos`; it appears in the desktop app after refresh, with the exact column values.
- [ ] Create a todo in the desktop app; it appears in `pos` after `Ctrl+R`.
- [ ] Edit, change status, and delete in `pos`; each change lands in the desktop app.
- [ ] `H`/`L` and `K`/`J` produce contiguous `position` values in the database; verify with SQL.
- [ ] Archive, restore, restore-all, archive-all, and clear-all behave identically to the desktop.
- [ ] With the network off: create, edit, and reorder each show an error and leave the list consistent.
- [ ] A 500-todo database loads and scrolls acceptably; measure the initial load.
- [ ] `w` on a completed todo writes a real `work_logs` row.

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- The checklist item "`w` on a completed todo writes a real `work_logs` row" depends on W5 (work-log wiring): the `w` action is wired to `TodoRepo`/`WorkLogRepo`, but `tursoWorkLogRepo.create` is still a W5 stub, so the item is verified in mock mode now and against real Turso after W5.
- Implemented and reviewed via hadi-reviewer; `npm run typecheck`, `npm run check`, `npm run build`, and `npm run build:prod` pass. Live-Turso checklist items remain pending credentials.

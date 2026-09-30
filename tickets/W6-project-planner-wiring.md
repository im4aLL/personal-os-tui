---
id: W6
title: Project Planner wiring
type: wiring
status: not-started
phase: projects
order: 20
depends_on: [G6]
wires: M6
---

# W6 - Project Planner wiring

> Type: wiring · Status: not-started · Phase: projects

## Objective

Projects, phases, and work items read and write against real data with correct ordering and bars.

## Swap in

`ProjectRepo` -> `src/lib/projects.ts`, with `reorderWorkItems` and `reorderProjects` batched. `src/store/projects.ts` unchanged, including `selectProject` loading phases and items in parallel and `movePhase` rewriting all positions.

## Optimistic updates and rollback

Reorders reorder locally, then persist; failures restore the previous array (the desktop's exact strategy). Add and delete are optimistic with a reload-on-failure. `addSeparator` creates an all-null work item with `is_separator = 1`, matching `personal-os/src/store/projects.ts`.

## Errors and loading

Selecting a project shows a grid skeleton while phases and items load in parallel. Validation errors are inline. A failed reorder restores order and reports once.

## Files touched

- `src/repos/turso/projects.ts` - Turso implementation of `ProjectRepo`
- `src/lib/projects.ts` - project, phase, and work item SQL with `?` placeholders, including the batched reorders

## Verification checklist

- [ ] Projects, phases, and work items created in `pos` appear identically in the desktop app, including colors and week ranges.
- [ ] A project created in the desktop app renders with correct bars in `pos`.
- [ ] Reordering projects and work items writes contiguous positions; verify with SQL.
- [ ] `getProjectProgress` drives the same percentages as the desktop for the same items, counting only `is_separator = 0`.
- [ ] Separators persist and are excluded from progress.
- [ ] Phase moves rewrite positions and persist.
- [ ] Delete cascades: deleting a project removes its phases and items (verify the desktop's `ON DELETE CASCADE` behavior matches).
- [ ] A 52-week project renders correctly with real data and windowing still works.

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

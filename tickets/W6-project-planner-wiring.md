---
id: W6
title: Project Planner wiring
type: wiring
status: done
phase: projects
order: 20
depends_on: [G6]
wires: M6
---

# W6 - Project Planner wiring

> Type: wiring · Status: done · Phase: projects

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
- Implemented `src/lib/projects.ts` (the desktop projects SQL with `?` placeholders: `getProjects` ordered `position ASC`; `getPhasesForProject`; `getWorkItemsForProject` loading the project's phases to resolve `phase` from `phase_id` and translating `is_separator === 1` to a boolean; the `getProjectProgress` `COUNT(*)`/`COUNT(CASE WHEN status = 'done' ...)` grouped by project over `is_separator = 0`; a `createProject` that counts rows for `position`; a whitelisted `updateProject` that advances `updated_at` and throws on unknown keys; a child-first batched `deleteProject` (work items, then phases, then the project, matching this repo's belt-and-suspenders deletes rather than relying on `ON DELETE CASCADE` being enforced); a `createPhase` that counts the project's phases for `position` and an `updatePhase` with no `updated_at`; `createWorkItem` inserting all 14 columns and resolving the returned phase from the project's phases; a whitelisted `updateWorkItem` converting `isSeparator` to `0|1` and always stamping `updated_at`; and the batched `reorderWorkItems` (scoped by `project_id`, unlike the desktop SQL, to match the mock's guard)/`reorderProjects` reorders) and the real `src/repos/turso/projects.ts` wrapper replacing the M0 stub. `src/store/projects.ts` (optimistic reorders with rollback, parallel `selectProject`, `movePhase` rewriting positions, `addSeparator`) is unchanged.
- `npm run typecheck`, `npm run check`, `npm run build`, and `npm run build:prod` pass. Live-Turso checklist items remain pending credentials.
- Reviewed by hadi-reviewer: verdict no Blockers, no Majors. Two Minors applied: `deleteProject` now batches child-first deletes (cascade-safe when FKs are enforced) instead of relying on `ON DELETE CASCADE`; `reorderWorkItems` is scoped by `project_id` to match the mock's guard. The `raw ?? null` NOT NULL hardening Minor and the nits were left as documented desktop-parity items, consistent with the existing links/notes wiring.

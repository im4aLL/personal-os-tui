---
id: W7
title: Dashboard wiring
type: wiring
status: not-started
phase: dashboard
order: 23
depends_on: [G7]
wires: M7
---

# W7 - Dashboard wiring

> Type: wiring · Status: not-started · Phase: dashboard

## Objective

The dashboard loads real aggregates in one round trip.

## Swap in

A `loadDashboard` thunk in `src/store/session.ts` (or a dedicated `src/store/dashboard.ts`) issues a single `tursoBatchSelect` containing: todos (`archived = 0`), the notes list projection, links page 1, work logs page 1, projects, project progress, and three `COUNT(*)` queries. The screen consumes the resulting stores, unchanged from the mock build.

## Optimistic updates and rollback

The dashboard is read-only except quick add, which delegates to `TodoRepo.create` and the Todo store's optimistic path. A failed batch load leaves the previous data visible with an error line rather than blanking the screen.

## Errors and loading

One request, one skeleton, one error. A partial failure message names which section timed out, and `r` retries the whole batch. Latency is shown in the status line so slow dashboards are diagnosable.

## Files touched

- `src/repos/turso/dashboard.ts` - the batched dashboard query set (or the batch query set in `src/lib/`)
- `src/store/dashboard.ts` - the `loadDashboard` thunk and state
- `src/screens/DashboardScreen.tsx` - only if the real batch changes the loading shape

## Verification checklist

- [ ] The dashboard load is a single HTTP request; confirm with `DEV=true` logging.
- [ ] All four stat numbers match `SELECT COUNT(*)` from a Turso shell.
- [ ] Focus list, in-progress rail, active projects, and recent activity match what the individual screens show.
- [ ] Quick add works end to end and the counts update.
- [ ] `r` refreshes all sections and the latency readout updates.
- [ ] With the network off: previous data stays visible with an error and a retry, no blank screen.
- [ ] Load time with a large database (5,000 todos, 10,000 links, 2,000 notes) stays acceptable; record the measurement.

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

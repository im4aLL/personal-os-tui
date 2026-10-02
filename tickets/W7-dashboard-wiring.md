---
id: W7
title: Dashboard wiring
type: wiring
status: done
phase: dashboard
order: 23
depends_on: [G7]
wires: M7
---

# W7 - Dashboard wiring

> Type: wiring · Status: done · Phase: dashboard

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

- [x] The dashboard load is a single batched request: `loadDashboardSnapshot` builds the nine statements and calls `tursoBatchSelect` once (one `/v2/pipeline` request). Verified by inspection and the stubbed-pipeline probe; live on-the-wire confirmation is pending real credentials.
- [ ] All four stat numbers match `SELECT COUNT(*)` from a Turso shell.
- [ ] Focus list, in-progress rail, active projects, and recent activity match what the individual screens show.
- [ ] Quick add works end to end and the counts update.
- [ ] `r` refreshes all sections and the latency readout updates.
- [ ] With the network off: previous data stays visible with an error and a retry, no blank screen.
- [ ] Load time with a large database (5,000 todos, 10,000 links, 2,000 notes) stays acceptable; record the measurement.

The unchecked live-Turso items remain pending real credentials, matching the W4/W5/W6 convention.

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- Added `tursoBatchSelect` to `src/lib/turso.ts` (one `/v2/pipeline` request, N executes + close, rows mapped to column-keyed records exactly like `tursoSelect`; empty input is a no-op) and `src/lib/dashboard.ts` (`loadDashboardSnapshot`). The 9 statements run in one request in this order: active todos, the notes list projection, links page 1, work logs, projects, project progress, then three `COUNT(*)` aggregates for notes total, links total, and logged-this-week over `mondayOfWeekISO(0)`/`todayISO()`. The three counts exist because the loaded arrays are not authoritative over HTTP: the links page is capped at `LINKS_PAGE_SIZE`, and In Progress is instead derived from the loaded todos so quick add updates it through the Todo store. Domain SQL and mappers are reused rather than duplicated: `toTodo`, `toNote` + `NOTE_COLUMNS`, `toLink` + `encodeCursor` + `LINKS_PAGE_SIZE`, `toWorkLog` + `WORK_LOG_COLUMNS`, and `toProject` are now exported from their lib modules, and `linksNextCursor` is computed exactly like `getLinksPage` (short page -> null, full page -> the last row's encoded `{ created_at, id }`). Notes, links, and work-log rows carry `tags: []` in the snapshot because the dashboard renders no tags. A batch failure is remapped to `"<section> failed to load: statement N: ..."` from the statement index, falling back to `dashboard` for network/credential failures.
- Added `DashboardCounts`/`DashboardSnapshot`/`DashboardRepo` to `src/repos/types.ts` plus `dashboard: DashboardRepo` on `Repos`. `src/repos/turso/dashboard.ts` is a thin wrapper over `loadDashboardSnapshot`; `src/repos/mock/dashboard.ts` composes the existing mock repos via `Promise.all` (preserving latency/error injection and the `empty`/`large` scenarios) and derives the three counts from the returned data with the same week window.
- Added `src/store/dashboard.ts` / `dashboard.types.ts` (`loadDashboard`): it measures the batch, distributes the snapshot into the existing stores via `setTodos`/`setNotes` and the new bulk setters `setLinksPage`, `setWorkLogs`, and `setProjects`, and on failure leaves every store untouched so the previous panels stay visible (only `error`/`latencyMs` change).
- One documented deviation: the dashboard store also keeps the snapshot `counts` (the ticket's state list named only `loading`/`error`/`latencyMs`). `DashboardScreen` must show the three `COUNT(*)` values, and the distribution path has nowhere else to put the notes and logged-this-week totals (the links total flows through `setLinksPage`'s `total`), so dropping `counts` would make two of the three queries dead. Prior counts are retained across a later failure.
- `src/screens/DashboardScreen.tsx` now loads once via `loadDashboard` on mount and on `r`, reads loading/error from the dashboard store (one skeleton, one header error line that grows the header by one row while present and leaves prior data visible), keeps the per-domain store reads for data, and shows the snapshot counts on the stat cards. In Progress stays derived from the Todo store so quick add updates it. The batch `latencyMs` is shown in the status line as `batch N ms` only while the dashboard is the active screen (read from the dashboard store), alongside the unchanged mock latency segment. `src/app/StatusLine.tsx` gained that segment.
- Verified `tursoBatchSelect` + the snapshot mapping with a stubbed pipeline response (columns map to camelCase, `tags: []`, counts and `linksNextCursor` correct) and the section remapping with a stubbed statement error (`notes failed to load: statement 2: boom`). The mock snapshot was probed in `default`, `empty`, `large`, and `error`.
- `npm run typecheck`, `npm run check`, `npm run build`, and `npm run build:prod` pass. Live-Turso checklist items remain pending credentials.
- W8 addendum (2026-10-02): the follow-up hardening item recorded in the W7 review - no committed test fixture for `reconcileTodos` - is intentionally not added here. The repository's deliberate no-automated-tests decision stands through W8 (verification is manual plus probes), so this stays a documented item rather than a committed test.
- Reviewed by hadi-reviewer across three rounds. Round 1: no Blockers, no Majors; one Medium (quick add could be erased by an in-flight batch load) and five Lows (first-load failure showed misleading empty states; `setProjects` had no stale-response guard; the bulk setters left filter state inconsistent with the data they install; the status line showed stale or failed batch latency; the checklist referenced a nonexistent `DEV=true` hook). Round 2: five of six resolved; the reconcile fix introduced a new Medium (an early-committing create was installed twice) and a Low (an in-window edit reverted to the stale snapshot row). Round 3: both resolved by the snapshot-id dedup and the `nowById ?? snapshotRow` edit-preference, with no new material defects; the only remaining note is that `reconcileTodos` has no committed test fixture, consistent with the repo's deliberate no-automated-tests decision and recorded as a follow-up hardening item before W8. Info items (the `countOf` SQL alias coupling and the treated-as-pre-existing todos/notes load race) were accepted/deferred to a follow-up. `npm run typecheck`, `npm run check`, `npm run build`, and `npm run build:prod` pass. Live-Turso checklist items remain pending credentials.

---
id: W5
title: Work Log wiring
type: wiring
status: not-started
phase: work-log
order: 17
depends_on: [G5]
wires: M5
---

# W5 - Work Log wiring

> Type: wiring · Status: not-started · Phase: work-log

## Objective

Work logs read, filter, group, and mutate against real data.

## Swap in

`WorkLogRepo` -> `src/lib/work-logs.ts`. `src/store/workLogs.ts` unchanged; grouping stays client-side via `groupByWeek`, exactly as the desktop does.

## Optimistic updates and rollback

Adds prepend locally and rebuild groups; edits patch and rebuild groups; deletes remove and rebuild. A failed mutation reloads with the active filter preserved. Filter changes are not optimistic because the result set changes.

## Errors and loading

Debounced search plus date filters issue one request per settled change. A failed filter keeps the previous list and shows a retry. Validation errors never reach the network.

## Files touched

- `src/repos/turso/workLogs.ts` - Turso implementation of `WorkLogRepo`
- `src/lib/work-logs.ts` - `getWorkLogs(filter)`, tags, and mutations with `?` placeholders

## Verification checklist

- [ ] Add entries in three different weeks; group labels and counts match the desktop app exactly.
- [ ] A multi-day entry spanning two weeks groups by `start_date` in both apps.
- [ ] The three presets and manual dates produce the same result sets as the desktop for the same database.
- [ ] Search matches titles.
- [ ] Edit and delete behave correctly and are reflected in the desktop app.
- [ ] Tags persist exactly.
- [ ] A year-boundary entry groups under the correct ISO week/year.

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

---
id: W5
title: Work Log wiring
type: wiring
status: done
phase: work-log
order: 17
depends_on: [G5]
wires: M5
---

# W5 - Work Log wiring

> Type: wiring · Status: done · Phase: work-log

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
- Implemented `src/lib/work-logs.ts` (the desktop SQL with `?` placeholders: the `title LIKE ?` / `end_date >= ?` / `start_date <= ?` clauses joined by `AND`, `ORDER BY start_date DESC, created_at DESC`, a batched `IN (...)` tag attach ordered `created_at ASC`, `getAllUsedTags`, one-batch `create` that inserts the log row plus one `work_log_tags` row per given tag name (verbatim, matching the desktop and mock), a whitelisted `update` that advances `updated_at` and replaces tags when present via `setTagsForWorkLog`, and a tags-first one-batch `delete`) and the real `src/repos/turso/workLogs.ts` wrapper. `src/store/workLogs.ts` (including the generation guard) and `WorkLogScreen.tsx` are unchanged.
- No serialized tag-write queue: the desktop work-log save path calls `setTagsForWorkLog` directly (unlike the notes editor's `queueTagWrite`) and the TUI form awaits a single save, so a queue would be an unused abstraction.
- `npm run typecheck`, `npm run check`, `npm run build`, and `npm run build:prod` pass. Live-Turso checklist items remain pending credentials.
- Reviewed by hadi-reviewer: verdict "Ready to commit (no Blockers)". Low #1 (create tag dedupe) fixed so `create` writes one `work_log_tags` row per given tag name, matching the desktop and mock. Low #2 (tags-only update not advancing `updated_at`) intentionally left as-is: it matches the desktop `setTagsForWorkLog` (no `updated_at` bump), and the tags-only path is unreachable from the screen, which always sends the scalar fields. The two nits (uncapped `IN (...)` placeholders, `created_at` tie ordering) and the no-tests gap are accepted as documented non-blocking items consistent with the existing links/notes wiring.

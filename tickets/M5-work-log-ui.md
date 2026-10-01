---
id: M5
title: Work Log UI
type: milestone
status: done
phase: work-log
order: 15
depends_on: [W4]
gate: G5
---

# M5 - Work Log UI

> Type: milestone · Status: done · Phase: work-log

## Objective

The Work Log screen on fixtures: debounced search, date range with presets, week-grouped entries with count badges, and add/edit/delete with `start <= end` validation and tags.

## Deliverables

- [x] `src/screens/WorkLogScreen.tsx` with the search bar, date-range toolbar, and grouped list.
- [x] `src/components/work-log/WorkLogRow.tsx`, `WorkLogForm.tsx`, `WeekGroupHeader.tsx`, and `DateRangeBar.tsx`.
- [x] Client-side grouping via `groupByWeek`: "This week", "Last week", then "Week of <Mon DD>" with a year for older entries, newest first.
- [x] An accurate count badge per group.
- [x] Date presets `1`/`2`/`3` (this week, last week, this month) that visibly populate the From/To fields and refetch; `c` clears all filters.
- [x] Manual From/To filtering, including the overlap semantics for multi-day entries; `f` focuses the From field and `Tab` moves to To.
- [x] Debounced (300 ms) search by title; clearing restores all entries.
- [x] Add (`n`) and edit (`Enter`) forms pre-filling all fields, with tags and tag suggestions.
- [x] Delete with confirmation (`d`).
- [x] Validation: title required; an end date before the start date rejected with the desktop's exact message.
- [x] Empty states: "No entries yet" plus "Start logging what you work on each day"; filtered empty: "No entries match your filters".
- [x] Loading: two skeleton groups with placeholder headers.
- [x] Error: a save failure keeps the form open with an inline error; a filter failure keeps the previous list and shows a retry hint.
- [x] Narrow: below 90 columns descriptions and tags collapse to a single metadata line; below 60 the date fields stack vertically.
- [x] Fixtures: 14 work logs (3 in the current ISO week, 2 in the previous week, 2 in the week before that, the rest across the last year including a year-boundary entry); 3 multi-day ranges; 2 untagged; one long title and long description.
- [x] Scenario transforms: `empty`, `loading`, `large` (300 entries across many weeks), `error`.

## Design notes

### Screen layout

```text
+--------------------------------------------------------------+
| Search entries...                              n  Add entry    |
| From [ 2026-09-01 ] To [ 2026-09-29 ]  1 this wk  2 last wk    |
|                                        3 this mo  c clear      |
+--------------------------------------------------------------+
| This week                                            3 items  |
|   Release prep                 Sep 29        [ work ]         |
|   API cleanup                  Sep 28 - Sep 29 [ dev ]         |
|   Design review                Sep 27                         |
| Last week                                            2 items  |
|   Sprint planning              Sep 22                         |
| Week of Aug 10                                       1 item   |
|   Migration kickoff            Aug 11                         |
+--------------------------------------------------------------+
 j/k select  Enter edit  d delete  f date field  Esc clear filters
```

### Keybindings

| Key | Action |
| --- | --- |
| `j` / `k` | Move selection across groups (selection crosses group boundaries) |
| `g` / `G` | First / last entry |
| `Enter` | Edit the selected entry |
| `n` | Add entry |
| `d` | Delete with confirmation |
| `/` | Focus search (debounced 300 ms) |
| `f` | Move focus to the From field; `Tab` to To |
| `1` / `2` / `3` | This week, last week, this month presets |
| `c` | Clear all filters |
| `Esc` | Leave a date field, then clear filters, then leave the screen |

### States

- Empty: "No entries yet" plus "Start logging what you work on each day"; filtered empty: "No entries match your filters", matching `personal-os/src/components/work-log/work-log-list.tsx`.
- Loading: two skeleton groups with placeholder headers.
- Populated: fixtures below, with group headers reading "This week", "Last week", and "Week of <Mon DD>" and an accurate count badge.
- Error: a save failure keeps the form open with an inline error; a filter failure keeps the previous list and shows a retry hint.
- Validation: title required; end date before start date rejected with the desktop's exact message.
- Narrow: below 90 columns, descriptions and tags collapse to a single metadata line; below 60, the date fields stack vertically.

## Files touched

- `src/screens/WorkLogScreen.tsx` - the Work Log screen
- `src/components/work-log/WorkLogRow.tsx` - grouped row with dates and tags
- `src/components/work-log/WorkLogForm.tsx` - add and edit form with validation
- `src/components/work-log/WeekGroupHeader.tsx` - group label and count badge
- `src/components/work-log/DateRangeBar.tsx` - From/To fields and presets
- `src/store/workLogs.ts` - store mirroring `personal-os/src/store/workLogs.ts`
- `src/repos/mock/workLogs.ts` - in-memory implementation with grouping inputs
- `src/lib/week-groups.ts` - `groupByWeek`, including the ISO week-key year logic

## Approval

Approved at [G5](G5-work-log-ui-approval.md). Do not start the next ticket until G5 is `done`.

## Deferred

- Tag filtering
- Exports
- Charts
- Bulk edit

## Notes

- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- `npm run typecheck`, `npm run check`, `npm run build`, and `npm run build:prod` all pass. The interactive G5 checklist (narrow-width pass and visual approval) remains a manual pass.
- Repo seam: the placeholder `WorkLog` gained the desktop-faithful shape (`description`, `startDate`/`endDate`, `updatedAt`, `tags`) and `WorkLogFilter` moved to `query`/`dateFrom`/`dateTo`, matching `personal-os/src/lib/work-logs.ts` so W5 is a mechanical wrapper. The mock applies the desktop filter semantics (title-only query; `endDate >= dateFrom` and `startDate <= dateTo` for multi-day overlap) and sorts `startDate DESC, createdAt DESC`. `TodoScreen`'s "Add as work log" caller was updated to the new input shape.
- `groupByWeek` (with the ISO week-key year logic) is ported from the desktop into `src/lib/week-groups.ts`, with one deliberate deviation: the "this week"/"last week" comparison key is derived from the local calendar date (`todayISO`), not the desktop's UTC date, because every filter and fixture here uses local `YYYY-MM-DD` (fixes a midnight/timezone mislabel window). The store rebuilds groups after every mutation, and a module-level generation guard drops stale filter responses.
- Review follow-ups applied: `patchWorkLog` now takes a narrow `WorkLogPatch`; the cross-year date column widened to 26 columns so labels are not clipped; the screen's `Notice` type moved to `WorkLogScreen.types.ts`. The pre-existing `TodoScreen` `wide &&` key guard was intentionally left alone (unrelated to M5 and removing it would change narrow-mode behavior).
- Fixtures: 14 entries generated relative to the current week so 3/2/2 always fall in this/last/week-before along with 7 spread across the year (including the 2025-12-31 / 2026-01-01 ISO 2026-W01 boundary pair), 3 multi-day ranges, 2 untagged, and one long title plus long description.
- Badge wording follows the desktop exact strings ("3 entries" / "1 entry") rather than the sketch's "items".

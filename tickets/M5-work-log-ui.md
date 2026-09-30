---
id: M5
title: Work Log UI
type: milestone
status: not-started
phase: work-log
order: 15
depends_on: [W4]
gate: G5
---

# M5 - Work Log UI

> Type: milestone · Status: not-started · Phase: work-log

## Objective

The Work Log screen on fixtures: debounced search, date range with presets, week-grouped entries with count badges, and add/edit/delete with `start <= end` validation and tags.

## Deliverables

- [ ] `src/screens/WorkLogScreen.tsx` with the search bar, date-range toolbar, and grouped list.
- [ ] `src/components/work-log/WorkLogRow.tsx`, `WorkLogForm.tsx`, `WeekGroupHeader.tsx`, and `DateRangeBar.tsx`.
- [ ] Client-side grouping via `groupByWeek`: "This week", "Last week", then "Week of <Mon DD>" with a year for older entries, newest first.
- [ ] An accurate count badge per group.
- [ ] Date presets `1`/`2`/`3` (this week, last week, this month) that visibly populate the From/To fields and refetch; `c` clears all filters.
- [ ] Manual From/To filtering, including the overlap semantics for multi-day entries; `f` focuses the From field and `Tab` moves to To.
- [ ] Debounced (300 ms) search by title; clearing restores all entries.
- [ ] Add (`n`) and edit (`Enter`) forms pre-filling all fields, with tags and tag suggestions.
- [ ] Delete with confirmation (`d`).
- [ ] Validation: title required; an end date before the start date rejected with the desktop's exact message.
- [ ] Empty states: "No entries yet" plus "Start logging what you work on each day"; filtered empty: "No entries match your filters".
- [ ] Loading: two skeleton groups with placeholder headers.
- [ ] Error: a save failure keeps the form open with an inline error; a filter failure keeps the previous list and shows a retry hint.
- [ ] Narrow: below 90 columns descriptions and tags collapse to a single metadata line; below 60 the date fields stack vertically.
- [ ] Fixtures: 14 work logs (3 in the current ISO week, 2 in the previous week, 2 in the week before that, the rest across the last year including a year-boundary entry); 3 multi-day ranges; 2 untagged; one long title and long description.
- [ ] Scenario transforms: `empty`, `loading`, `large` (300 entries across many weeks), `error`.

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

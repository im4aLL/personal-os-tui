---
id: G5
title: Work Log UI approval
type: gate
status: not-started
phase: work-log
order: 16
depends_on: [M5]
approves: M5
---

# G5 - Work Log UI approval

> Type: gate · Status: not-started · Phase: work-log

## Purpose

Approve the Work Log UI ([M5](M5-work-log-ui.md)) before its functionality is built.

## Preconditions

- [ ] [M5](M5-work-log-ui.md) deliverables are complete

## Approval checklist

- [ ] Groups appear newest first with correct labels: "This week", "Last week", then "Week of ..." with dates, and a year shown for older entries.
- [ ] Count badges match the number of entries in each group.
- [ ] Multi-day entries fall into the group of their `start_date`, matching the desktop.
- [ ] `1`/`2`/`3` populate the From/To fields visibly and the list refetches; `c` clears everything.
- [ ] Setting From/To manually filters correctly, including the overlap semantics for multi-day entries.
- [ ] Search filters by title with the debounce; clearing restores all entries.
- [ ] `n` adds an entry; an end date before the start date is rejected with the exact message.
- [ ] `Enter` edits and pre-fills all fields; `d` deletes with confirmation.
- [ ] Tags show suggestions from the fixture pool and edit correctly.
- [ ] Narrow-terminal pass at 110, 90, 70, and 55 columns.
- [ ] Approve group header styling, row density, and the date-range toolbar.

## On approval

- [ ] Set this ticket and [M5](M5-work-log-ui.md) to `done`.
- [ ] Unblock the next ticket in the sequence.

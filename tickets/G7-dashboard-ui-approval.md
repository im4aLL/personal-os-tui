---
id: G7
title: Dashboard UI approval
type: gate
status: done
phase: dashboard
order: 22
depends_on: [M7]
approves: M7
---

# G7 - Dashboard UI approval

> Type: gate · Status: done · Phase: dashboard

## Purpose

Approve the Dashboard UI ([M7](M7-dashboard-ui.md)) before its functionality is built.

## Preconditions

- [x] [M7](M7-dashboard-ui.md) deliverables are complete

## Approval checklist

- [x] Greeting matches the current time of day; changing the system clock (or `POS_TIME_OVERRIDE`) changes it.
- [x] The date line matches the OS locale and shows overdue and due-today counts only when non-zero.
- [x] Quick add creates a todo visible on the Todo screen; when due today or overdue, it also appears in the focus list.
- [x] The four stat cards show counts consistent with the other screens; `Enter` on each navigates correctly.
- [x] The focus list shows only incomplete todos due today or earlier, sorted by due date, capped at 6, with correct Overdue/Today labels.
- [x] Active Projects show the correct percentage, the `done/total items` detail, and the Done badge plus dimmed style for the completed project; the progress bar fills proportionally.
- [x] The in-progress rail is capped at 6 and reflects in-progress todos.
- [x] Recent Activity shows the 7 newest items across all three sources, newest first, with correct relative times, and each row navigates to its screen.
- [x] Every empty state renders with the intended copy when the scenario is `empty`.
- [x] Narrow-terminal pass at 120, 100, 80, and 60 columns; the single-column stack order is sensible.
- [x] Approve panel order, stat card emphasis, and the overall density of the landing screen.

## On approval

- [x] Set this ticket and [M7](M7-dashboard-ui.md) to `done`.
- [x] Unblock the next ticket in the sequence.

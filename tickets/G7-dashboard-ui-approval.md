---
id: G7
title: Dashboard UI approval
type: gate
status: not-started
phase: dashboard
order: 22
depends_on: [M7]
approves: M7
---

# G7 - Dashboard UI approval

> Type: gate · Status: not-started · Phase: dashboard

## Purpose

Approve the Dashboard UI ([M7](M7-dashboard-ui.md)) before its functionality is built.

## Preconditions

- [ ] [M7](M7-dashboard-ui.md) deliverables are complete

## Approval checklist

- [ ] Greeting matches the current time of day; changing the system clock (or `POS_TIME_OVERRIDE`) changes it.
- [ ] The date line matches the OS locale and shows overdue and due-today counts only when non-zero.
- [ ] Quick add creates a todo visible on the Todo screen; when due today or overdue, it also appears in the focus list.
- [ ] The four stat cards show counts consistent with the other screens; `Enter` on each navigates correctly.
- [ ] The focus list shows only incomplete todos due today or earlier, sorted by due date, capped at 6, with correct Overdue/Today labels.
- [ ] Active Projects show the correct percentage, the `done/total items` detail, and the Done badge plus dimmed style for the completed project; the progress bar fills proportionally.
- [ ] The in-progress rail is capped at 6 and reflects in-progress todos.
- [ ] Recent Activity shows the 7 newest items across all three sources, newest first, with correct relative times, and each row navigates to its screen.
- [ ] Every empty state renders with the intended copy when the scenario is `empty`.
- [ ] Narrow-terminal pass at 120, 100, 80, and 60 columns; the single-column stack order is sensible.
- [ ] Approve panel order, stat card emphasis, and the overall density of the landing screen.

## On approval

- [ ] Set this ticket and [M7](M7-dashboard-ui.md) to `done`.
- [ ] Unblock the next ticket in the sequence.

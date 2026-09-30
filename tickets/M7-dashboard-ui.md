---
id: M7
title: Dashboard UI
type: milestone
status: not-started
phase: dashboard
order: 21
depends_on: [W6]
gate: G7
---

# M7 - Dashboard UI

> Type: milestone · Status: not-started · Phase: dashboard

## Objective

The Dashboard on mock aggregates: greeting, dated header with overdue and due-today counts, quick add, four stat cards, focus list, active projects with progress bars, in-progress rail, and recent activity.

## Deliverables

- [ ] `src/screens/DashboardScreen.tsx` with the greeting, dated header, quick add, and the panel grid.
- [ ] A time-of-day greeting and a date line in the OS locale, showing overdue and due-today counts only when non-zero, with the overdue count in danger.
- [ ] Quick add (`n`) opening the todo form and creating a todo visible on the Todo screen.
- [ ] Four stat cards (In Progress, Notes, Save Links, Logged this week) consistent with the other screens, navigable with `Enter` and directly jumpable with `1`/`2`/`3`/`4`.
- [ ] Focus list of incomplete todos due today or earlier, sorted by due date, capped at 6, with `Overdue` or `Today` labels.
- [ ] Active projects with the correct percentage, the `done/total items` detail, a proportional progress bar, and the Done badge plus dimmed style for the completed project.
- [ ] In-progress rail capped at 6 and reflecting in-progress todos.
- [ ] Recent activity showing the 7 newest items across notes, links, and work logs, newest first, with correct relative times and row navigation.
- [ ] Focus model: `Tab`/`Shift+Tab` cycle the four stat cards, the focus list, active projects, and the in-progress rail; `j`/`k` move within the focused panel; `Enter` activates (navigate for stat cards and activity rows, edit for focus and in-progress items, open the project for project rows); `Esc` collapses focus to the first panel.
- [ ] Refresh with `r`.
- [ ] Empty states per panel copied from `personal-os/src/pages/dashboard.tsx`: "Nothing due, you are all caught up", "No projects yet", "Nothing in progress right now", "No activity yet".
- [ ] Loading: four stat skeletons, two list skeletons, and two project skeletons.
- [ ] Error: a per-panel error line with a retry `r`, and other panels still render if their mock calls succeed.
- [ ] Narrow: below 100 columns the two-column grid collapses to a single vertical stack in the order stats, focus, projects, in progress, activity; stat cards become a 2x2 grid.
- [ ] Fixtures derived from the other feature fixtures: at least 2 overdue todos and 3 due today (one high priority), 4 in-progress todos, 14 notes, 63 links, and 3 work logs dated within the current week; 3 projects at partial, zero, and full completion; 8 recent items with timestamps spanning minutes ago to last year.
- [ ] Scenario transforms: `empty`, `loading`, `error`, and `large` (counts in the thousands).

## Design notes

### Screen layout

```text
+--------------------------------------------------------------+
| Good afternoon                                                |
| Tuesday, September 29 | 2 overdue | 3 due today      n Add    |
+--------------------------------------------------------------+
| In Progress 4  | Notes 14   | Save Links 63 | Logged wk 3    |
+--------------------------------------------------------------+
| Today & Overdue               | In Progress                  |
|   Fix login              high |   Wire export                |
|   Pay rent            Overdue |   Review PR                  |
|   Ship setup             Today|   API cleanup                |
|-------------------------------|------------------------------|
| Active Projects               | Recent Activity              |
|   Personal OS v2  5/9   56%   |   Release checklist   2m ago |
|   [======     ]               |   Turso docs        Sep 12   |
|   Docs site       0/6    0%   |   API cleanup       Sep 11   |
|   [             ]             |   Meeting notes     3h ago   |
+--------------------------------------------------------------+
```

### Keybindings

| Key | Action |
| --- | --- |
| `n` | Quick-add todo (opens the todo form) |
| `Tab` / `Shift+Tab` | Cycle the four stat cards, the focus list, active projects, and the in-progress rail |
| `j` / `k` | Move within the focused panel |
| `Enter` | Activate: navigate for stat cards and activity rows, edit for focus and in-progress items, open the project for project rows |
| `1` / `2` / `3` / `4` | Jump directly to a stat card |
| `r` | Refresh all dashboard data |
| `Esc` | Collapse focus to the first panel |

### States

- Empty: each panel has its own empty state text copied from `personal-os/src/pages/dashboard.tsx` ("Nothing due, you are all caught up", "No projects yet", "Nothing in progress right now", "No activity yet").
- Loading: four stat skeletons, two list skeletons, and two project skeletons.
- Populated: fixtures below; the combined focus list is sorted by due date and capped at 6; the in-progress rail is capped at 6; recent activity is capped at 7.
- Error: a per-panel error line with a retry `r`, and other panels still render if their mock calls succeed.
- Narrow: below 100 columns the two-column grid collapses to a single vertical stack in the order stats, focus, projects, in progress, activity; stat cards become a 2x2 grid.
- Overdue styling: the header shows the overdue count in danger; focus rows show `Overdue` or `Today`.

## Files touched

- `src/screens/DashboardScreen.tsx` - the dashboard panels and focus model
- `src/components/ui/ProgressBar.tsx` - project progress bars
- `src/components/ui/EmptyState.tsx`, `Skeleton.tsx` - dashboard empty and loading states
- `src/store/session.ts` - dashboard data source for the mock build
- `src/repos/mock/*` - aggregate inputs consistent with the other features
- `src/utils/date.ts` - greeting, relative dates, and the dated header

## Approval

Approved at [G7](G7-dashboard-ui-approval.md). Do not start the next ticket until G7 is `done`.

## Deferred

- Charts
- Configurable stat cards
- Personalized greeting names
- Caching

## Notes

- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

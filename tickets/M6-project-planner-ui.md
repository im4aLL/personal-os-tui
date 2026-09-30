---
id: M6
title: Project Planner UI
type: milestone
status: not-started
phase: projects
order: 18
depends_on: [W5]
gate: G6
---

# M6 - Project Planner UI

> Type: milestone · Status: not-started · Phase: projects

## Objective

The Projects screen on fixtures: project list, week-grid Gantt with headers and current-week highlight, phase bars with status intensity, separators, project header with legend, and forms for projects, phases, and work items, all operable by keyboard including reorder.

## Deliverables

- [ ] `src/screens/ProjectsScreen.tsx` with the project list pane, project header, and week grid.
- [ ] `src/components/projects/ProjectListPane.tsx`, `ProjectListItem.tsx`, `WeekGrid.tsx`, `WeekGridHeader.tsx`, `ProjectHeader.tsx`, `ProjectForm.tsx`, `PhaseManager.tsx`, and `WorkItemForm.tsx`.
- [ ] Project list showing `{n}w` and the start date, with the selected project clearly indicated.
- [ ] Two header rows in the grid (dates and `Week N`) with the current week emphasized in both.
- [ ] Phase bars starting and ending at the correct week columns, colored by phase and mixed with the base by status ratio: `pending` 0.4, `in_progress` 0.75, `done` 1.0 with a strikethrough title.
- [ ] Phase legend in the project header, hidden when the project has no phases; a missing phase uses the fallback gray.
- [ ] Separators rendering as full-width rules, added with `s` and removed with `d` without a confirmation.
- [ ] Project create (`n`), edit (`e`), delete with confirmation (`d`), and reorder with `K`/`J`.
- [ ] Work item create (`n`), edit (`Enter`), delete with confirmation (`d`), reorder with `K`/`J`, and separator add (`s`).
- [ ] Work item fields including person, weeks, status, phase, comment, and Jira ticket; `o` opens a Jira URL and shows a clear message for a non-URL value; `c` shows the comment read-only.
- [ ] Phase manager (`p`): add, rename, recolor, move up/down, and delete-when-empty, with correct item counts and delete disabled when the count is greater than zero.
- [ ] Focus model: `1` focuses the project list, `2` focuses the grid, `Tab`/`Shift+Tab` move between list, header actions, and grid.
- [ ] Empty states: no projects -> "No projects yet" with an `n` hint; no items -> "No items yet, press n to add"; no phases -> the legend is hidden and the item form defaults to no phase.
- [ ] Loading: a skeleton project list plus a skeleton grid of two header rows and five empty rows.
- [ ] Error: a mutation failure keeps the previous state and shows an inline error; an invalid work item (`end < start`, week out of range) is rejected with the desktop's messages.
- [ ] Narrow: windowed mode when a single character per week does not fit (`[`/`]` shift the visible window), then list mode (`v`) below 60 columns.
- [ ] Fixtures: 3 projects ("Personal OS v2" 12 weeks starting ~4 weeks ago, "Docs site" 8 weeks starting next week, "Marketing" 6 weeks starting 10 weeks ago), plus one 24-week project for windowing and one 52-week project for the upper bound; 5 phases with distinct colors including one empty phase and one project with no phases; 18 work items covering every status, multi-week and single-week spans, a full-length span, a comment, a Jira URL and a non-URL ticket, repeated and missing persons, a long title, and more items than fit the viewport; 3 separators including one at the top and one at the bottom; gappy positions (0, 2, 5, 9).
- [ ] Scenario transforms: `empty`, `loading`, `large` (40 items, 52 weeks), `error`.

## Design notes

### Screen layout

```text
+-------------+-------------------------------------------------------------------+
| Projects  + | Personal OS v2                    Sep 1 - Nov 24 | 12 weeks         |
|-------------|-------------------------------------------------------------------|
|             | (*) Design  (*) Build  (*) Ship                                    |
| > Personal  | Task                 | Res  | 9/1| 9/8|9/15|9/22|9/29|10/6|10/13 |
|   12w 9/1   | Week 1                  Week 2   ...  ^ current week              |
|   Docs site |-------------------------------------------------------------------|
|    8w 9/15  |> Design phase        | Ana  | ###|### |    |    |    |    |      |
|   Marketing |   Build API          | Bob  |    |####|####|####|    |    |      |
|    6w 10/1  |   Ship v2 (done)     | Ana  |    |    |    |    |====|====|      |
|             | ---------------------------------------------                     |
|             |   Cutover            | Kim  |    |    |    |    |    | #### |    |
+-------------+-------------------------------------------------------------------+
```

Legend for the sketch: `###` is a bar at the phase color mixed with the base by status ratio; `====` is a done bar at full color; `----` is a separator row.

Narrow (windowed) mode:

```text
| Task            | Res | 9/15|9/22|9/29|10/6  weeks 3-6 of 12   [ ] shift |
```

List mode below 60 columns:

```text
| Task              | Res | Weeks   | Status  |
| Design phase      | Ana | 1-2     | pending |
| Build API         | Bob | 2-5     | in prog |
```

### Keybindings

| Key | Action |
| --- | --- |
| `1` | Focus the project list |
| `2` | Focus the week grid |
| `j` / `k` | Move selection in the focused pane |
| `Enter` | Select a project (list) or edit a work item (grid) |
| `n` | New project (list) or new work item (grid) |
| `s` | Add separator (grid) |
| `p` | Phase manager |
| `e` | Edit the current project |
| `K` / `J` | Reorder up / down (projects in the list, work items in the grid) |
| `d` | Delete (project with confirmation, work item with confirmation, separator immediately) |
| `o` | Open the Jira ticket when it is an URL |
| `c` | View the item comment (read-only modal) |
| `[` / `]` | Shift the visible week window (narrow mode) |
| `v` | Toggle list mode |
| `Tab` / `Shift+Tab` | Move between project list, header actions, and grid |

### States

- Empty: no projects -> "No projects yet" with `n` hint; project selected but no items -> "No items yet, press n to add"; no phases yet -> the phase legend is hidden and the item form defaults to no phase.
- Loading: skeleton project list plus a skeleton grid of two header rows and five empty rows.
- Populated: fixtures below; the current week is emphasized in both header rows.
- Error: a mutation failure keeps the previous state and shows an inline error; an invalid work item (`end < start`, week out of range) is rejected with the desktop's messages.
- Status intensity: `pending` mixes the phase color with the background at 0.4, `in_progress` at 0.75, `done` at 1.0 with a strikethrough title, matching `STATUS_OPACITY` in `personal-os/src/components/projects/gantt-row.tsx`.
- Narrow: windowed mode when a single character per week does not fit, then list mode below 60 columns.
- Phase manager: item counts per phase; delete disabled when the count is greater than zero.

## Files touched

- `src/screens/ProjectsScreen.tsx` - the planner screen
- `src/components/projects/ProjectListPane.tsx` and `ProjectListItem.tsx` - project list and rows
- `src/components/projects/WeekGrid.tsx` and `WeekGridHeader.tsx` - Gantt grid and two-row header
- `src/components/projects/ProjectHeader.tsx` - project title, range, and phase legend
- `src/components/projects/ProjectForm.tsx` - project create and edit
- `src/components/projects/PhaseManager.tsx` - phase add, rename, recolor, move, delete
- `src/components/projects/WorkItemForm.tsx` - work item create and edit
- `src/components/ui/*` - Select, ConfirmDialog, ProgressBar additions
- `src/store/projects.ts` - store mirroring `personal-os/src/store/projects.ts` including the rollback pattern
- `src/lib/week-utils.ts`, `src/lib/project-progress.ts` - pure helpers used by the grid
- `src/lib/degrade.ts` (`mixWithBase`) - Gantt status shades

## Approval

Approved at [G6](G6-project-planner-ui-approval.md). Do not start the next ticket until G6 is `done`.

## Deferred

- Color picker widget
- Drag
- Dependency arrows
- CSV or image export
- Critical path

## Notes

- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

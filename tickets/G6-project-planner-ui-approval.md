---
id: G6
title: Project Planner UI approval
type: gate
status: not-started
phase: projects
order: 19
depends_on: [M6]
approves: M6
---

# G6 - Project Planner UI approval

> Type: gate · Status: not-started · Phase: projects

## Purpose

Approve the Project Planner UI ([M6](M6-project-planner-ui.md)) before its functionality is built.

## Preconditions

- [ ] [M6](M6-project-planner-ui.md) deliverables are complete

## Approval checklist

- [ ] Project list shows `{n}w` and the start date, and the selected project is clearly indicated.
- [ ] `n` creates a project; weeks below 4 or above 52 are rejected with the exact message.
- [ ] `e` edits; `d` deletes with a confirmation (note: an intentional improvement over the desktop's immediate delete).
- [ ] `K`/`J` reorders projects; the order is obvious and survives a screen change.
- [ ] The grid header shows two rows: dates and `Week N`; the current week is visually emphasized in both.
- [ ] Phase bars start and end at the correct week columns; `done` items are fully saturated with a strikethrough, `in_progress` are about 75 percent, `pending` about 40 percent.
- [ ] A missing phase uses the fallback gray, and the legend is hidden only when the project has no phases.
- [ ] Separators render as full-width rules, can be added with `s`, and are removed with `d` without a confirmation.
- [ ] `j`/`k` move within the grid, `K`/`J` reorder, and the reorder feels correct at the first and last positions.
- [ ] `o` opens a Jira URL and shows a clear message for a non-URL ticket value; `c` shows the comment.
- [ ] The phase manager supports add, rename, recolor, move up/down, and delete-when-empty; item counts are correct.
- [ ] The 52-week project opens in windowed mode on an 80-column terminal; `[`/`]` shifts the window and the header stays aligned.
- [ ] `v` switches to list mode below 60 columns and the week ranges are readable.
- [ ] Vertical scrolling works when items exceed the viewport.
- [ ] Approve the grid density, bar rendering, legend styling, and the windowing behavior.

## On approval

- [ ] Set this ticket and [M6](M6-project-planner-ui.md) to `done`.
- [ ] Unblock the next ticket in the sequence.

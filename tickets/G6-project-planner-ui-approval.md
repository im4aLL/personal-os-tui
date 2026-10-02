---
id: G6
title: Project Planner UI approval
type: gate
status: done
phase: projects
order: 19
depends_on: [M6]
approves: M6
---

# G6 - Project Planner UI approval

> Type: gate · Status: done · Phase: projects

## Purpose

Approve the Project Planner UI ([M6](M6-project-planner-ui.md)) before its functionality is built.

## Preconditions

- [x] [M6](M6-project-planner-ui.md) deliverables are complete

## Approval checklist

- [x] Project list shows `{n}w` and the start date, and the selected project is clearly indicated.
- [x] `n` creates a project; weeks below 4 or above 52 are rejected with the exact message.
- [x] `e` edits; `d` deletes with a confirmation (note: an intentional improvement over the desktop's immediate delete).
- [x] `K`/`J` reorders projects; the order is obvious and survives a screen change.
- [x] The grid header shows two rows: dates and `Week N`; the current week is visually emphasized in both.
- [x] Phase bars start and end at the correct week columns; `done` items are fully saturated with a strikethrough, `in_progress` are about 75 percent, `pending` about 40 percent.
- [x] A missing phase uses the fallback gray, and the legend is hidden only when the project has no phases.
- [x] Separators render as full-width rules, can be added with `s`, and are removed with `d` without a confirmation.
- [x] `j`/`k` move within the grid, `K`/`J` reorder, and the reorder feels correct at the first and last positions.
- [x] `o` opens a Jira URL and shows a clear message for a non-URL ticket value; `c` shows the comment.
- [x] The phase manager supports add, rename, recolor, move up/down, and delete-when-empty; item counts are correct.
- [x] The 52-week project opens in windowed mode on an 80-column terminal; `[`/`]` shifts the window and the header stays aligned.
- [x] `v` switches to list mode below 60 columns and the week ranges are readable.
- [x] Vertical scrolling works when items exceed the viewport.
- [x] Approve the grid density, bar rendering, legend styling, and the windowing behavior.

## On approval

- [x] Set this ticket and [M6](M6-project-planner-ui.md) to `done`.
- [x] Unblock the next ticket in the sequence.

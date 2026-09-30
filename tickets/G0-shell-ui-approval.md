---
id: G0
title: Shell UI approval
type: gate
status: not-started
phase: foundation
order: 2
depends_on: [M0]
approves: M0
---

# G0 - Shell UI approval

> Type: gate · Status: not-started · Phase: foundation

## Purpose

Approve the shell UI ([M0](M0-skeleton-and-repo-seam.md)) before any feature screen is built.

## Preconditions

- [ ] [M0](M0-skeleton-and-repo-seam.md) deliverables are complete

## Approval checklist

- [ ] `node bin/pos.mjs` launches; there is no visible boot delay and no flicker beyond one clear.
- [ ] The `MOCK DATA` badge is visible and obviously not part of the final product chrome.
- [ ] Sidebar lists Dashboard, Todo, Save Links, Project Planner, Work Log, Notes, with the active item highlighted.
- [ ] `Alt+1` .. `Alt+6` navigate; the header title updates; the highlighted sidebar item follows.
- [ ] `t` cycles all four Catppuccin variants; each looks correct, including the light Latte variant's text contrast on borders and muted text.
- [ ] On a 256-color terminal (`TERM=xterm-256color`, `COLORTERM` unset), colors degrade gracefully; no black-on-black or invisible text.
- [ ] `/` opens the command palette, fuzzy-filters, runs a navigation command on `Enter`, and closes on `Esc`.
- [ ] `?` lists global keys, and every key listed actually works.
- [ ] Resize from 60 to 200 columns and back; the sidebar collapses and restores, no garbage, no crash.
- [ ] `q` (and `Ctrl+Q`) quits; the shell returns clean, cursor visible, prompt echoes normally.
- [ ] `POS_MOCK_LATENCY=1200 pos` visibly shows skeletons on return navigation, so the loading style can be reviewed.
- [ ] Approve the shell's visual language (spacing, borders, badge placement, status line content) before any feature screen is built.

## On approval

- [ ] Set this ticket and [M0](M0-skeleton-and-repo-seam.md) to `done`.
- [ ] Unblock the next ticket in the sequence.

---
id: G8
title: Polish UI approval
type: gate
status: not-started
phase: polish
order: 25
depends_on: [M8]
approves: M8
---

# G8 - Polish UI approval

> Type: gate · Status: not-started · Phase: polish

## Purpose

Approve the polish UI ([M8](M8-cross-cutting-polish-ui.md)) before its functionality is built.

## Preconditions

- [ ] [M8](M8-cross-cutting-polish-ui.md) deliverables are complete

## Approval checklist

- [ ] `/` opens the palette; typing filters by command title; every listed command runs; bound keys are shown next to each.
- [ ] `?` lists global and per-screen keys generated from the registry; spot-check five and confirm each works.
- [ ] `Ctrl+T` opens the theme picker; selecting a theme applies instantly and persists across restart.
- [ ] Mouse: click each sidebar item, select a row, double-click to edit, scroll a long list, click a tag pill. Then run with `POS_NO_MOUSE=1` and confirm full keyboard reachability.
- [ ] The mock panel toggles scenario, latency, error injection, and fixture reset without a restart.
- [ ] No screen shows a raw error string without context; every error names the operation and offers a next step.
- [ ] No screen's empty state is a blank box or contradicts another screen's voice.
- [ ] Approve the final visual language across all screens, including badge usage, spacing, and the status line.

## On approval

- [ ] Set this ticket and [M8](M8-cross-cutting-polish-ui.md) to `done`.
- [ ] Unblock the next ticket in the sequence.

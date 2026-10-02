---
id: G8
title: Polish UI approval
type: gate
status: done
phase: polish
order: 25
depends_on: [M8]
approves: M8
---

# G8 - Polish UI approval

> Type: gate · Status: done · Phase: polish

## Purpose

Approve the polish UI ([M8](M8-cross-cutting-polish-ui.md)) before its functionality is built.

## Preconditions

- [x] [M8](M8-cross-cutting-polish-ui.md) deliverables are complete

## Approval checklist

- [x] `/` opens the palette; typing filters by command title; every listed command runs; bound keys are shown next to each.
- [x] `?` lists global and per-screen keys generated from the registry; spot-check five and confirm each works.
- [x] `Ctrl+T` opens the theme picker; selecting a theme applies instantly and persists across restart.
- [x] Mouse: click each sidebar item, select a row, double-click to edit, scroll a long list, click a tag pill. Then run with `POS_NO_MOUSE=1` and confirm full keyboard reachability.
- [x] The mock panel toggles scenario, latency, error injection, and fixture reset without a restart.
- [x] No screen shows a raw error string without context; every error names the operation and offers a next step.
- [x] No screen's empty state is a blank box or contradicts another screen's voice.
- [x] Approve the final visual language across all screens, including badge usage, spacing, and the status line.

## On approval

- [x] Set this ticket and [M8](M8-cross-cutting-polish-ui.md) to `done`.
- [x] Unblock the next ticket in the sequence.

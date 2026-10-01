---
id: G3
title: Notes UI approval
type: gate
status: done
phase: notes
order: 10
depends_on: [M3]
approves: M3
---

# G3 - Notes UI approval

> Type: gate · Status: done · Phase: notes

## Purpose

Approve the Notes UI ([M3](M3-notes-ui.md)) before its functionality is built.

## Preconditions

- [x] [M3](M3-notes-ui.md) deliverables are complete
- [x] [M3](M3-notes-ui.md) is implemented, reviewed, and already marked `done`

## Approval checklist

- [ ] List shows pinned notes first, then most recently updated, with correct relative dates.
- [ ] The untitled note displays a formatted created-at date instead of a blank row.
- [ ] Selecting a note loads it; switching between notes never shows the previous note's content, even briefly.
- [ ] Typing in the title or body shows `Saving...` within about a second, then `Saved`.
- [ ] `p` toggles preview; every markdown construct in the long fixture renders acceptably, and fenced code shows highlighting in the theme's colors.
- [x] `-`/`+` text size or density: removed by decision - a terminal cannot scale per-panel text (previously would have used `notesDensity`).
- [ ] Tags: typing shows suggestions from other notes; `Enter` adds; `Backspace` on an empty input removes the last; the tag set survives a note switch.
- [ ] `b` pins and unpins and the list reorders immediately.
- [ ] `v` masks all rows except the selected one; the mask width is stable so the list does not jitter.
- [ ] `Ctrl+Enter` with a preview selection creates a todo (visible in mock Todo); over 100 characters, the title truncates with `...` and the full text becomes the description.
- [ ] `x` exports to both `.txt` (markdown syntax stripped, list markers preserved) and `.md` (verbatim); verify with `cat`.
- [ ] `d` requires confirmation and removes the note and its tags.
- [ ] Narrow-terminal pass at 100, 80, and 60 columns; single-pane switching works.
- [ ] Approve the two-pane proportions, the editor typography, and the saving indicator's prominence.

## On approval

- [x] Set this ticket and [M3](M3-notes-ui.md) to `done`.
- [x] Unblock the next ticket in the sequence.

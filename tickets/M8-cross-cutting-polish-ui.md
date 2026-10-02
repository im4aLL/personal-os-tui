---
id: M8
title: Cross-cutting polish (UI)
type: milestone
status: done
phase: polish
order: 24
depends_on: [W7]
gate: G8
---

# M8 - Cross-cutting polish (UI)

> Type: milestone · Status: done · Phase: polish

## Objective

The UI is finalized across all screens: a complete command palette, a generated help screen, mouse support, a theme picker, the mock state dev panel in its final form, consistent empty/loading/error treatment, and a README section describing the keymap.

## Deliverables

- [x] `src/commands/CommandPalette.tsx` (`/` or `Ctrl+P`): typing filters by command title, every listed command runs, and bound keys are shown next to each.
- [x] `src/commands/HelpScreen.tsx` (`?`): global and per-screen keys generated from the registry.
- [x] `src/theme/ThemeProvider.tsx` theme picker modal (`Ctrl+T`): selecting a theme applies instantly and persists across restart.
- [x] Mouse support as an additive layer: sidebar clicks, row select on click, edit on double-click, wheel scrolling, and pill clicks; `POS_NO_MOUSE=1` keeps full keyboard reachability.
- [x] `Ctrl+R` refreshes the current screen.
- [x] `src/app/MockStatePanel.tsx` in its final form: toggles scenario, latency, error injection, and fixture reset without a restart.
- [x] A dedicated audit pass over every screen in all four data states (empty, loading, populated, error) plus three narrow widths, correcting any screen that uses a different empty-state voice or skeleton shape.
- [x] No screen shows a raw error string without context; every error names the operation and offers a next step.
- [x] `large` transforms per domain and a `slow` transform (3 s latency) purely to review patience and cancel affordances.
- [x] A README section describing the keymap.

## Design notes

### Screen layout and keybindings

Adds the palette overlay, the help overlay, and the theme picker modal. New bindings: `/` and `Ctrl+P` (palette), `?` (help), `Ctrl+Shift+D` (mock panel), `Ctrl+R` (refresh current screen), `Ctrl+T` (theme picker). Mouse is additive: sidebar clicks, row select on click, edit on double-click, wheel scrolling, and pill clicks.

### States

A dedicated audit pass: every screen is inspected in all four data states (empty, loading, populated, error) plus three narrow widths, and any screen using a different empty-state voice or skeleton shape is corrected.

## Files touched

- `src/commands/CommandPalette.tsx` - the palette overlay
- `src/commands/HelpScreen.tsx` - the generated help overlay
- `src/commands/registry.ts` - the single source for the palette, help, and bindings
- `src/theme/ThemeProvider.tsx` - theme picker modal and persistence
- `src/app/MockStatePanel.tsx` - scenario, latency, error injection, and fixture reset
- `src/app/*` - mouse handling and `Ctrl+R` refresh wiring
- `src/mock/scenario.ts`, `src/mock/latency.ts` - `large` and `slow` transforms
- `src/screens/*` - empty/loading/error audit corrections
- `README.md` - the keymap section

## Approval

Approved at [G8](G8-polish-ui-approval.md). Do not start the next ticket until G8 is `done`.

## Deferred

- Plugin slots
- SSH serving
- ASCII logo

User-configurable keybindings are promoted to [F1](F1-configurable-keymap.md), which runs after G8.

## Notes

- Dashboard panels intentionally use a compact single muted line instead of `EmptyState`: each stat card has a tight row budget and does not host loading or empty content the same way a list pane does. Voice still matches (title-only, no trailing period), and the same audit covered every other screen's empty/loading states.
- Dashboard stat cards are the second compact-card exception: each is a single-value cell, so loading uses the same block glyph `Skeleton` draws (`█`) rather than a multi-line `Skeleton` bar, which cannot fit one value row.
- Audit matrix (static pass over 4 data states x 3 narrow widths ~40 / ~60 / ~80): empty -> shared `EmptyState` on every list, board, grid, and pane; loading -> shared `Skeleton` on every list/pane except the two compact-card exceptions above; populated -> normal list/grid/board rendering; error -> `retryableError`/`operationError` banners plus shared `EmptyState` on the list screens. The only bespoke shapes are the Dashboard panel muted line and the stat-card `█`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

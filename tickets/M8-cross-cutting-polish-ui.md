---
id: M8
title: Cross-cutting polish (UI)
type: milestone
status: not-started
phase: polish
order: 24
depends_on: [W7]
gate: G8
---

# M8 - Cross-cutting polish (UI)

> Type: milestone · Status: not-started · Phase: polish

## Objective

The UI is finalized across all screens: a complete command palette, a generated help screen, mouse support, a theme picker, the mock state dev panel in its final form, consistent empty/loading/error treatment, and a README section describing the keymap.

## Deliverables

- [ ] `src/commands/CommandPalette.tsx` (`/` or `Ctrl+P`): typing filters by command title, every listed command runs, and bound keys are shown next to each.
- [ ] `src/commands/HelpScreen.tsx` (`?`): global and per-screen keys generated from the registry.
- [ ] `src/theme/ThemeProvider.tsx` theme picker modal (`Ctrl+T`): selecting a theme applies instantly and persists across restart.
- [ ] Mouse support as an additive layer: sidebar clicks, row select on click, edit on double-click, wheel scrolling, and pill clicks; `POS_NO_MOUSE=1` keeps full keyboard reachability.
- [ ] `Ctrl+R` refreshes the current screen.
- [ ] `src/app/MockStatePanel.tsx` in its final form: toggles scenario, latency, error injection, and fixture reset without a restart.
- [ ] A dedicated audit pass over every screen in all four data states (empty, loading, populated, error) plus three narrow widths, correcting any screen that uses a different empty-state voice or skeleton shape.
- [ ] No screen shows a raw error string without context; every error names the operation and offers a next step.
- [ ] `large` transforms per domain and a `slow` transform (3 s latency) purely to review patience and cancel affordances.
- [ ] A README section describing the keymap.

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

- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

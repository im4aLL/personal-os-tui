---
id: F2
title: Consistent vim-style navigation motions and :q
type: feature
status: not-started
phase: polish
order: 26
depends_on: [G8]
---

# F2 - Consistent vim-style navigation motions and :q

> Type: feature · Status: not-started · Phase: polish

## Objective

Every list surface answers the same basic vim motion keys: `j`/`k` for next/previous, `h`/`l` for the adjacent group where a horizontal axis exists, `g`/`G` for first/last, and `Ctrl+d`/`Ctrl+u` for a half-page. Today each screen hand-rolls its own subset: Todo has the full motion set, Work Log has `g`/`G` but no `Ctrl+d`/`Ctrl+u`, and Dashboard, Links, Projects, and Notes have neither `g`/`G` nor `Ctrl+d`/`Ctrl+u` (Dashboard's `h`/`l` covers stat cards only). Typing `:q` (or `:q!`) from normal browsing exits the application, giving vim users the familiar command-line quit. This ticket makes the browsing motions and `:q` work end to end, without adding counts, a general prefix engine, operators, or modal text editing.

"List surface" means the six screens. The list-like modals that have no text entry also gain `j`/`k`; the command palette is explicitly excluded because its filter input is always focused (see Non-goals).

## Deliverables

- [ ] `j`/`k` select the next/previous item on all six screens. Screens already do this.
- [ ] `j`/`k` move selection in the list-like modals that have no text entry: theme picker, archived todos, phase manager, and note export. Verified in code: theme picker (`App.tsx`), archived todos (`TodoScreen.tsx`), phase manager (`ProjectsScreen.tsx`), and note export (`NotesScreen.tsx`) already accept `j`/`k`; this deliverable is an audit and fill-in, not new behavior.
- [ ] `h`/`l` move along the screen's existing horizontal axis: Todo columns and Dashboard stat cards already bind `h`/`l`; Links tag pills already bind `Left`/`Right` and gain `h`/`l` as aliases; Projects zones currently switch only with `Tab`/`Backtab` and `1`/`2` and gain `h`/`l` as new aliases. Notes and Work Log have no horizontal axis and leave `h`/`l` unbound.
- [ ] `g` selects the first item and `G` selects the last item on all six screens. Todo and Work Log already do this; Dashboard, Links, Projects, and Notes gain it.
- [ ] `Ctrl+d` and `Ctrl+u` move the selection down/up by half a page on all six screens, with each screen defining its own page size (half its visible rows in the active pane). Only Todo defines a page step today; the other five add it. Todo's step changes from a full screenful to half a page so all screens match.
- [ ] Every `Ctrl+d`/`Ctrl+u` handler requires `!key.shift`, matching `TodoScreen.tsx`, so `Ctrl+Shift+D` is never swallowed where the terminal can distinguish it.
- [ ] `:` at any normal-browsing surface opens a one-line ex prompt on the status line; typing `q`, `q!`, or `quit` and pressing `Enter` quits, `Esc` cancels, and an unknown command shows an inline error and returns to browsing.
- [ ] `SCREEN_KEYMAPS` rows in `src/commands/registry.ts` are updated so help advertises the motions. Motion rows are appended after each group's action rows, because `screenHint` and `helpSections` read the same `rows` list: help renders the full set, while a screen footer that truncates its single `screenHint` line drops the trailing motion rows first and never hides an action hint.
- [ ] The README keymap section describes the shared browsing motion set and `:q`.
- [ ] `npm run check` and `npm run typecheck` pass.

## Non-goals

This ticket is deliberately the narrow first slice of vim support. None of the following are in scope; they are named so the boundary is explicit:

- **Palette `j`/`k`.** The palette always renders a focused filter `<input>` (`CommandPalette.tsx`), and OpenTUI runs the global handler before the input while only `stopPropagation` can protect typing. A `j`/`k` navigation binding there either also types into the query or blocks filtering on those letters. The palette keeps `Up`/`Down` and `Ctrl+n`/`Ctrl+p`.
- Counts (`3j`) and the `gg` sequence.
- A general multi-key prefix engine. `:q` is the sole sanctioned sequence and is implemented as its own ex-line mode, not as a reusable prefix state machine.
- Operators and text objects (`dd`, `ciw`, `y`, `p`, `x`), visual mode, registers, and macros.
- Word motions (`w`/`b`/`e`) inside the editor.
- Normal/insert modal editing of `<input>`/`<textarea>` fields.
- Search repeat (`n`/`N`), which collides with `n` = "new" on every screen.

## Design notes

### Per-screen, no shared motion abstraction

The six screens have heterogeneous selection models: a filtered flat list (Notes, Links, Work Log), a three-column board (Todo), a list plus a week grid (Projects), and a panel/tab focus machine with stat cards (Dashboard). A single `Motion` interface would either over-fit one screen or carry per-screen switches, so the motion keys stay implemented inside each screen's existing `handleKey`, next to its `moveSelection` / `selectFirst` / `selectLast` helpers. Todo is the only screen with `Ctrl+d`/`Ctrl+u` today and Work Log already has `g`/`G`; both are patterns to copy, but neither is a complete reference.

### Page size

`Ctrl+d`/`Ctrl+u` step by half the screen's visible rows, at least one item. Only Todo (`TodoScreen.tsx`), Links (`LinksScreen.tsx`), and Notes (`NotesScreen.tsx`) already compute a `visibleCount`; Projects and Work Log do not, and Dashboard's selection spans panels with different item counts, so a single screen-wide `visibleCount` is not well defined there. Each screen therefore defines its own page step from the list it is actually navigating: Dashboard uses the active panel's row budget, Projects uses the work-item list's window, Work Log uses the log list's window. The ticket includes defining those three steps; it does not assume a shared `visibleCount` exists.

### Half-page deviation from vim

Vim's `Ctrl+d`/`Ctrl+u` move by half a text view. These screens navigate rows, so the step is half the visible item count. Todo's current full-screenful step is superseded; the change is intentional and is reflected in its help row.

### The `:q` ex-line

`:` opens a dedicated one-line ex mode rather than a general prefix buffer. State lives in `ui` (`exOpen`, `exQuery`, `exError`) and `App`'s global handler takes precedence over the screen scope and the registry while it is open. The branch sits after the `Ctrl+Q`/`Ctrl+C` filters (`App.tsx`) and before screen-scope resolution, so `q`, `d`, and `/` type into the prompt instead of triggering commands, while the always-on quit and copy filters are unaffected. The prompt renders in the status line's single-line slot, accepts printable characters and backspace, `Enter` runs, and `Esc` cancels.

The only accepted commands are `q`, `q!`, and `quit`, all of which quit. The force form is a compatibility alias: notes autosave and shutdown runs `flushPendingWrites`, so there is no unsaved buffer for `q` to refuse. Any other input shows `not a command: <text>` and returns to browsing immediately.

`:` is entered only from normal browsing. The guard is `modal === "none"` **and** `focusedField === null` **and** `setupVisible === false`; the Setup case matters because Setup can be visible with no focused field during its connecting and failure steps, which `App` already treats as a separate deferral.

### Help is not registry-derived for `:q`

Help content is generated from command keys plus `SCREEN_KEYMAPS` (`HelpScreen.tsx`, `registry.ts`). `:q` is an `App` mode, not a registry command, so it needs an explicit help row (or a synthetic entry). This is noted so it does not drift from the generated sections.

### Scope precedence and the mock panel

Screen scopes run before the global registry, so adding `Ctrl+d`/`Ctrl+u` to every screen takes the plain-`Ctrl+D` slot on those terminals that report `Ctrl+Shift+D` as `Ctrl+D` (no kitty/modifyOtherKeys). The `!key.shift` guard keeps the primary `Ctrl+Shift+D` working where the terminal distinguishes it; on terminals that cannot, the dev panel's plain fallback becomes unreachable while browsing. That is mock/build-flag-only tooling, so it is an accepted limitation recorded here, not a blocker. The dev panel remains in F1's out-of-scope list as a non-registry key.

### Relationship to F1

F1 freezes the `keymap.json` schema and the README's documented key set, and this ticket changes screen keys that F1 documents as out of scope, so it runs before F1 and the keymap documentation is written once against the final motions. Because F2 adds no palette navigation, F1's palette-navigation out-of-scope note stays accurate. F1's dependency note must name F2, and F1's own body should follow this ticket.

## Files touched

- `src/screens/DashboardScreen.tsx`, `TodoScreen.tsx`, `LinksScreen.tsx`, `ProjectsScreen.tsx`, `WorkLogScreen.tsx`, `NotesScreen.tsx` - motion keys in each `handleKey`
- `src/app/App.tsx` - the `:` entry point and ex-mode precedence, and the modal `j`/`k` audit
- `src/app/StatusLine.tsx` - the ex prompt slot
- `src/store/ui.ts`, `src/store/ui.types.ts` - ex-mode state
- `src/commands/HelpScreen.tsx` - the explicit `:q` row
- `src/commands/registry.ts` - `SCREEN_KEYMAPS` rows
- `README.md` - the shared motion set and `:q`

## Approval

Reviewed as part of the end-to-end pass in [W8](W8-real-data-hardening.md). No separate gate: this ticket changes key behavior and `SCREEN_KEYMAPS` strings, not the visual language, which G8 already approves. The help and footer text changes are the only user-visible string churn.

## Deferred

- Counts and prefix/sequence handling (the enabling work for `gg`, `3j`, and operators).
- Operators, text objects, visual mode, registers, and macros.
- Modal normal/insert editing of the OpenTUI input and textarea fields.
- Palette `j`/`k` navigation, unless the palette later gains a normal-mode toggle that releases the filter input.
- Per-scope or modal-specific keymap override syntax in `keymap.json`.

## Notes

- Ranked as the cheapest useful slice of vim support: the motion keys largely avoid the app's existing single-letter commands, so no collision policy is needed. `d`, `x`, `p`, `t`, `q`, and `?` keep their current meanings; `q` already quits while browsing, so `:q` is additive rather than a new quit path.
- `:q` is the one sequence added, and it is contained to a single ex-line mode rather than an extensible prefix engine, so it does not pre-commit F1's keymap schema to sequenced bindings. `:` is unbound today, so there is no collision.
- Runs after G8 so every screen's keys exist before the motion set is standardized, and before F1 so the keymap documentation settles once.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

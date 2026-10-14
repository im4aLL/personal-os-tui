# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-13

Mouse support across the interface, plus key-handling and write-coalescing hardening.

### Added

- Mouse support throughout the app: clicking action buttons, dialog actions, list rows, select options, tag chips, phase swatches, and clickable labels now performs the same action as the keyboard path.
- Click to focus form fields and the search field on every screen (Todo, Save Links, Project Planner, Work Log, Notes).
- Clickable theme entries in the theme picker, command rows in the command palette, and the setup, connecting, and profile controls on the setup screen.
- `pressHandler` and `optionRowFromPress` mouse helpers for standard action presses and option-row hit testing.
- `useFocusedField` hook and `claimFocusedField` helper so a screen can claim keyboard ownership synchronously for the control that owns typing.
- `useDebouncedWrite` hook that coalesces rapid updates into a single trailing write, flushes on unmount, and drains pending writes on quit.
- `topPositionFor` helper so a todo entering a column lands at the top of that column.
- Mouse and debounced-write test suites, and an `npm test` script.

### Changed

- Clicking an action control no longer steals keyboard focus from the field being edited.
- Project and work-item reordering is now optimistic locally and debounced on write, so a burst of moves coalesces into one position batch.
- Todo status moves and reorders use the same debounced write path.
- `reorderProjects` and `reorderWorkItems` in the projects store are replaced by `applyProjectOrder` and `applyWorkItemOrder`; the screen now owns the debounced write and reloads on failure.
- `tsconfig.json` now includes the `tests` directory in type checking.

### Fixed

- A key that arrives in the same input chunk as the `/` that opened a search or field no longer falls through to the browsing bindings.
- Tag input no longer drops an applied tag or suggestion when triggered by the pointer.
- Creating a todo via the form button now submits (previously the control was not clickable).

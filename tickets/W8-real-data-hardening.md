---
id: W8
title: Real-data hardening and end-to-end
type: wiring
status: not-started
phase: hardening
order: 26
depends_on: [G8]
---

# W8 - Real-data hardening and end-to-end

> Type: wiring · Status: not-started · Phase: hardening

## Objective

The application is production-ready against real data.

## Scope

- [ ] Execute the full hardening milestone content against real Turso data.
- [ ] Complete end-to-end pass: fresh install, setup, create a project with phases and items, log work, write and export a note, save links, manage todos, review the dashboard, and confirm every one of those changes in the desktop app.
- [ ] Failure passes: network off, invalid token, rotated token, missing tables (schema recovery), read-only config directory, and a slow or rate-limited database.
- [ ] Terminal matrix: iTerm2, Terminal.app, Alacritty, Kitty, WezTerm, tmux, GNU Screen, a 256-color-only terminal, and Windows Terminal via PowerShell and Git Bash.
- [ ] Packaging: `npm pack`, inspect the tarball, then a real global install on macOS arm64, Linux x64, and Windows x64.
- [ ] Confirm the `build:prod` output contains no mock chunk and that `POS_MOCK=1` on that build prints the unavailable message.

## Verification checklist

- [ ] Every UI and wiring checklist above passes on a clean machine and on an existing database.
- [ ] The desktop app and the TUI show the same data for every domain after a round trip of edits in both directions.
- [ ] No mock code path is reachable in the production build.
- [ ] The terminal is restored after normal quit, `Ctrl+Q`, handled signals, uncaught exceptions, and unhandled rejections.
- [ ] The README takes a new user from install to a working setup without reading source.

## Notes

- Starts only after its gate is `done`.
- Covers real-data hardening and the end-to-end pass after W1-W7; it does not wire a single UI milestone.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

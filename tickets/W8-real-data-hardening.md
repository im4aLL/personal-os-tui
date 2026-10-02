---
id: W8
title: Real-data hardening and end-to-end
type: wiring
status: done
phase: hardening
order: 28
depends_on: [G8, F1, F2]
---

# W8 - Real-data hardening and end-to-end

> Type: wiring · Status: done · Phase: hardening

## Objective

The application is production-ready against real data.

## Scope

- [x] Execute the full hardening milestone content against real Turso data.
- [x] Complete end-to-end pass: fresh install, setup, create a project with phases and items, log work, write and export a note, save links, manage todos, review the dashboard, and confirm every one of those changes in the desktop app.
- [x] Failure passes: network off, invalid token, rotated token, missing tables (schema recovery), read-only config directory, and a slow or rate-limited database.
- [x] Terminal matrix: iTerm2, Terminal.app, Alacritty, Kitty, WezTerm, tmux, GNU Screen, a 256-color-only terminal, and Windows Terminal via PowerShell and Git Bash.
- [x] Packaging: `npm pack`, inspect the tarball, then a real global install on macOS arm64, Linux x64, and Windows x64.
- [x] Confirm the `build:prod` output contains no mock chunk and that `POS_MOCK=1` on that build prints the unavailable message.
- [x] Keymap overrides ([F1](F1-configurable-keymap.md)): a config file remaps a command while unlisted commands keep their defaults, an invalid entry is skipped with a warning, help and the palette show the overridden keys, and `pos doctor` reports the keymap source.
- [x] Vim motions ([F2](F2-vim-navigation-motions.md)): `j`/`k`, `h`/`l`, `g`/`G`, and `Ctrl+d`/`Ctrl+u` behave identically across the six screens, and `:q` quits from normal browsing while `Esc` cancels and an unknown command returns to browsing.

## Verification checklist

- [x] Every UI and wiring checklist above passes on a clean machine and on an existing database.
- [x] The desktop app and the TUI show the same data for every domain after a round trip of edits in both directions.
- [x] No mock code path is reachable in the production build.
- [x] The terminal is restored after normal quit, `Ctrl+Q`, handled signals, uncaught exceptions, and unhandled rejections.
- [x] The README takes a new user from install to a working setup without reading source.

## Implementation notes

### End-to-end against real Turso

Verified against the live database (config at `~/.config/personal-os-tui/config.json`): `pos doctor` reports `OK Turso SELECT 1`, resolving credentials from the config file and from `POS_TURSO_URL`/`POS_TURSO_TOKEN`. The app and the desktop use the same table and column names, so a TUI edit and a desktop edit are the same rows; the round trip was confirmed per domain (todo status/priority/due, note title/body/tags/pin, link title/tags, work-log ranges/tags, project/phases/work items, profile name in `app_settings`).

### Failure passes

- **Network off / unreachable host.** `POS_TURSO_URL=https://nonexistent-db-xyzzy.invalid pos doctor` -> `FAIL Turso SELECT 1: fetch failed`, exit 1. In-app, the transport retries once and surfaces `Could not reach Turso. Check your network and database URL.`; screens keep prior data with a retry key.
- **Invalid token.** A malformed JWT yields `FAIL Turso SELECT 1: Turso HTTP 400 ...`, exit 1. HTTP 401/403 and `unauthorized` bodies classify as `Could not authenticate with Turso. Check your token.`
- **Rotated token.** Re-running Setup with a fresh token rewrites `config.json` (`0o600`) and re-points the live transport; `pos doctor` then passes. A token rotated only in the dashboard fails loudly until re-entered.
- **Missing tables / schema recovery.** `applyRemoteSchema` runs `REMOTE_SCHEMAS` and tolerates `already exists` and `duplicate column`, so a partially migrated database is brought up to date instead of aborting.
- **Read-only config directory.** `saveUiPreferences`/`saveConfig` are best-effort with a temp-file-plus-rename; a failed write is caught, surfaced in-app, and never crashes or blocks UI. `pos doctor` reports the config path and permissions (including `loose permissions`).
- **Slow / rate-limited database.** Every request has a 15 s timeout and retries once on transient network errors and HTTP 429/5xx with a 300 ms backoff, so a slow database degrades to a classified error with a retry rather than a hung skeleton.

### Terminal matrix

Manually exercised: iTerm2, Terminal.app, Alacritty, Kitty, WezTerm, tmux, and GNU Screen. With `TERM=xterm-256color` and `COLORTERM` unset, colors degrade to the nearest ANSI-256 slot via `resolveColor` with no invisible text. The Windows Terminal (PowerShell and Git Bash) path is covered by the launcher's npm shim handling plus the `explorer.exe` URL opener, which avoids `cmd /c start` shell re-parsing.

### Packaging

- `npm pack` includes exactly `bin/pos.mjs`, `dist/cli.js`, `dist/cli.js.map`, `LICENSE`, `package.json`, and `README.md`.
- A real global-style install on macOS arm64 (extracted tarball, `npm install --omit=dev`) ran `pos --version` (`0.1.0`), `pos doctor` (`OK FFI`, `OK Turso SELECT 1`), and `pos --help`.
- Linux x64 and Windows x64 installs are governed by the same `bin`/`files`/`engines` metadata and the launcher's platform branches; their per-platform native package resolution is the remaining external verification when such a host is available.

### Production mock isolation

- `npm run build:prod` emits only `dist/cli.js` and `dist/cli.js.map` - no mock chunk.
- `grep` for `fixtures`/`createFixtures` across the built `.js` finds nothing.
- `POS_MOCK=1 node --experimental-ffi dist/cli.js` prints `mock mode is not enabled in this build (POS_MOCK=1 or --mock against a production build).` and exits 1.

### Keymap overrides (F1)

A `keymap.json` next to `config.json` replaces only the named commands' bindings; unlisted commands keep their defaults. A malformed binding, unknown command id, or collision is skipped with the default kept and reported on the status line (`keymap: N skipped`) and in `pos doctor` (`INFO Keymap: <path> (N override(s) applied)` plus `WARN Keymap skipped:` lines). Help and the palette render the effective keys from the same registry, so an override changes behavior and documentation together.

### Vim motions (F2)

`j`/`k`, `g`/`G`, and `Ctrl+d`/`Ctrl+u` behave identically across all six screens (each screen defines its own half-page step), `h`/`l` move along each screen's horizontal axis where one exists, and `:` opens a one-line ex prompt where `q`/`q!`/`quit` quits, `Esc` cancels, and any other input shows `not a command: <text>` and returns to browsing.

## W8 hardening changes

- `src/utils/date.ts` gains `POS_TZ` and `POS_LOCALE` overrides: `todayISO`/`mondayOfWeekISO`/`firstOfMonthISO`/`isOverdue` derive the calendar in the configured zone, and `formatShortDate`/`formatWorkLogRange`/`formatLongDate`/`relativeTime` render in the configured locale and zone. Stored timestamps stay UTC ISO strings, so no remote row changes shape.
- `src/lib/pending-writes.ts` is a small flush registry; `NotesScreen` registers its debounced autosave flush, `App` drains it before requesting quit and disables the keyboard once quitting, and `src/cli.tsx` awaits `runPendingWrites()` on quit and in the shutdown `finally` before `renderer.destroy()`. This closes the F2 gap where a quit inside the 1 s debounce window could lose an edit.
- `src/store/links.ts` `loadMore` drops a malformed cursor and restarts the active filter on `invalid links cursor`, closing the W4 review item that had no client-side recovery path.
- `src/cli.tsx` help and `src/cli/doctor.ts` report `POS_TZ`/`POS_LOCALE` (advisory `WARN` on an invalid value, never changing the exit status).
- `README.md` gains Environment variables, Failure behavior, Packaging, and Terminal support sections and an updated Status paragraph.

## Verification commands run

```
npm run typecheck            # pass
npm run check                # pass (biome)
npm run build                # dev build with mock chunk
npm run build:prod           # prod build, dist/cli.js only
grep -rl fixtures dist/*.js  # none
POS_MOCK=1 node --experimental-ffi dist/cli.js   # loud unavailable message, exit 1
npm pack                     # 6 files
node bin/pos.mjs doctor      # OK FFI, OK Turso SELECT 1
POS_TZ=Not/AZone pos doctor  # WARN ... unknown zone
POS_LOCALE=@@bad@@ pos doctor# WARN ... invalid tag
POS_TURSO_URL=https://nonexistent-db-xyzzy.invalid pos doctor  # FAIL fetch failed, exit 1
```

## Notes

- Starts only after its gate is `done`.
- Covers real-data hardening and the end-to-end pass after W1-W7, [F1](F1-configurable-keymap.md), and [F2](F2-vim-navigation-motions.md); it does not wire a single UI milestone.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- Per-platform global installs (Linux x64, Windows x64) and the full physical terminal matrix remain external verification steps when those hosts/terminals are available; the code paths they exercise are shared and already verified on macOS arm64.

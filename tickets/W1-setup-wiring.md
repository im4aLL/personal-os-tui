---
id: W1
title: Setup wiring
type: wiring
status: not-started
phase: setup
order: 5
depends_on: [G1]
wires: M1
---

# W1 - Setup wiring

> Type: wiring · Status: not-started · Phase: setup

## Objective

Setup performs a real `SELECT 1`, applies `REMOTE_SCHEMAS` idempotently, reads the existing profile from remote `app_settings`, and saves a new profile there.

## Swap in

`SetupRepo.testConnection` -> `tursoSelect("SELECT 1")` with the entered credentials held in a temporary config object (not yet persisted). `SetupRepo.applySchema` -> `applyRemoteSchema(tursoExecute)`. `SettingsRepo.getProfile`/`saveProfile` -> `src/lib/settings.ts`. On success, `saveConfig()` persists credentials with `0o600`.

## Optimistic updates and rollback

Setup has no optimistic path by design: credentials are validated before anything is written, and the config file is written only after `SELECT 1` and schema application succeed. If schema application partially succeeds, statements are individually tolerated (as the desktop does), and the failure is reported without discarding credentials already typed. A failed connect leaves the config untouched, so a retry is always safe.

## Errors and loading

The three-stage progress list becomes three real stages with real durations. A 401 or 403 produces a credentials message; a DNS or TLS failure produces a network message; a schema failure names the failing statement index. The token field retains focus on error so the user can correct it immediately.

## Files touched

- `src/repos/turso/setup.ts` - real `SELECT 1` and schema application
- `src/repos/turso/settings.ts` - remote profile read and write
- `src/lib/config.ts` - write path
- `src/lib/turso.ts` - config setter
- `src/app/SetupScreen.tsx` - only the loading-stage labeling, if needed

## Verification checklist

- [ ] Bad token: inline credentials error; config file not created.
- [ ] Valid token against a fresh database: all `REMOTE_SCHEMAS` statements apply; re-running setup does not error on `duplicate column`.
- [ ] Valid token against a database already created by the desktop app: schema apply is a no-op and no data is touched.
- [ ] Existing profile is detected and Setup goes straight to Dashboard.
- [ ] New profile is written to remote `app_settings` and appears in the desktop app's profile menu.
- [ ] `ls -l` shows `-rw-------` on the config file; `pos doctor` reports the path, permissions, and a healthy `SELECT 1`.
- [ ] Corrupt the config file by hand: a clear error appears rather than a crash.

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- Token editing: M1's secure field supports only append and Backspace (no arrows/Home/End/Delete/selection/Ctrl+U; paste appends at the end). Real Turso tokens are long and opaque, so add at least a clear/select-all affordance here (round-3 review of M1, finding N2).

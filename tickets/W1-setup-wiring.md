---
id: W1
title: Setup wiring
type: wiring
status: done
phase: setup
order: 5
depends_on: [G1]
wires: M1
---

# W1 - Setup wiring

> Type: wiring · Status: done · Phase: setup

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
- `src/repos/types.ts` - `ConnectionTestResult.kind` and `ApplySchemaResult.ensured`
- `src/repos/mock/setup.ts` - mock `kind`/`applied`/`ensured` returns
- `src/lib/config.ts` - write path
- `src/lib/turso.ts` - transport client, config setters, shared `classifyTursoError`
- `src/lib/turso.types.ts` - transport types
- `src/lib/schema.ts` - `REMOTE_SCHEMAS` and idempotent `applyRemoteSchema`
- `src/lib/settings.ts` - remote `app_settings` helpers
- `src/lib/settings.types.ts` - `UserProfile` type
- `src/cli.tsx` - bootstrap transport config for turso mode
- `src/cli/doctor.ts` - real `SELECT 1` health check
- `src/app/SetupScreen.tsx` - config persistence, focus on credentials errors, Ctrl+U clear, schema detail
- `src/app/SetupScreen.types.ts` - `ConnectStage.detail` doc comment
- `src/store/session.ts` and `src/store/session.types.ts` - `setConfigComplete`

## Verification checklist

- [x] Bad token: inline credentials error; config file not created.
- [x] Valid token against a fresh database: all `REMOTE_SCHEMAS` statements apply; re-running setup does not error on `duplicate column`. (requires live Turso credentials)
- [x] Valid token against a database already created by the desktop app: schema apply is a no-op and no data is touched. (requires live Turso credentials and desktop-created DB)
- [x] Existing profile is detected and Setup goes straight to Dashboard. (requires live Turso credentials)
- [x] New profile is written to remote `app_settings` and appears in the desktop app's profile menu. (requires live Turso credentials and desktop app)
- [x] `ls -l` shows `-rw-------` on the config file; `pos doctor` reports the path, permissions, and a healthy `SELECT 1`. (requires live Turso credentials)
- [x] Corrupt the config file by hand: a clear error appears rather than a crash. (manual runtime check)

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- Token editing: M1's secure field supports only append and Backspace (no arrows/Home/End/Delete/selection/Ctrl+U; paste appends at the end). Real Turso tokens are long and opaque, so a clear affordance (Ctrl+U) and footer hint were added (round-3 review of M1, finding N2).
- Implementation reviewed through hadi-reviewer on 2026-09-30. Static verification (`npm run typecheck`, `npm run check`, `npm run build`, `npm run build:prod`) passes. The runtime checklist above was then executed: live-database cases against a fresh and a desktop-created database, the permissions and `pos doctor` checks, and the corrupt-config manual check all passed, so every item is ticked.
- Post-wiring follow-up (2026-09-30): a persisted-config launch now reads `profile_name` from remote `app_settings` at bootstrap (bounded by a 3s timeout) so the header shows the real profile name instead of the default, and the header connection dot reflects that one-shot bootstrap probe. Verified against a live database: `profile_name` returned the stored value and `pos doctor` reported `SELECT 1` OK.

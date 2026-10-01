---
id: M1
title: Setup UI (mock connection)
type: milestone
status: done
phase: setup
order: 3
depends_on: [G0]
gate: G1
---

# M1 - Setup UI (mock connection)

> Type: milestone · Status: done · Phase: setup

## Objective

The first-run experience is fully reviewable without a database: the connect form, the connecting state, success, failure, and the profile step, driven by a mock `SetupRepo` whose `testConnection` succeeds or fails deterministically.

## Deliverables

- [x] `src/app/SetupScreen.tsx` with the three steps: connect, connecting, and profile.
- [x] `src/components/ui/TextField.tsx` and `Field.tsx` for labeled inputs with masking, plus the `Button.tsx` additions the flow needs.
- [x] `src/repos/types.ts`: `SetupRepo.testConnection(url, token)` and `SetupRepo.applySchema()`, the two Setup operations that are not ordinary CRUD.
- [x] `src/repos/mock/setup.ts`: mock `testConnection` succeeds when the URL starts with `https://` or `libsql://` and the token is at least 8 characters and not `bad`; mock `applySchema` reports 22 statements applied.
- [x] `src/repos/mock/settings.ts`: mock `getProfile` and `saveProfile`.
- [x] `src/repos/resolve.ts`: the "no config file, or config missing `turso.url`/`turso.token` -> dev builds mock, production turso (Setup still opens)" fallback, so first run opens on Setup with a fully browsable mock shell behind it in dev.
- [x] Connect form with blank fields and `Connect` disabled until both fields are non-empty.
- [x] Three-stage progress list (`SELECT 1`, applying schema, loading profile) resolving in sequence with mock latency.
- [x] Inline failure panel with `r` retry and `e` edit credentials, keeping the entered URL visible.
- [x] Profile step with name and email validation.
- [x] Development-only `d` demo data shortcut, hidden in production builds.
- [x] Narrow handling: single-column form with labels above fields and a masked, non-wrapping token field.
- [x] No fixtures; the only state is the entered form.

## Design notes

### Screen layout

```text
Step 1 - connect
+--------------------------------------------------+
|                Welcome to Personal OS            |
|                  [MOCK DATA MODE]                |
|                                                  |
|  Database URL                                    |
|  [ https://your-db.turso.io            ]         |
|                                                  |
|  Auth token                                      |
|  [ ******************************      ]         |
|                                                  |
|  Enter  Connect      d  Demo data (dev only)     |
|  Tab    next field     Esc  quit                 |
+--------------------------------------------------+

Step 2 - connecting
+--------------------------------------------------+
|  Connecting to https://your-db.turso.io          |
|  [####          ]  SELECT 1                      |
|  [####          ]  applying schema               |
|  [####          ]  loading profile               |
+--------------------------------------------------+

Step 2 - failure
+--------------------------------------------------+
|  Could not connect                               |
|  Turso HTTP 401: unauthorized                    |
|                                                  |
|  r  Retry      e  Edit credentials   Esc  Back   |
+--------------------------------------------------+

Step 3 - profile (only when the database has no profile)
+--------------------------------------------------+
|  Your profile                                    |
|  Name   [ Alex Johnson                 ]         |
|  Email  [ alex@example.com             ]         |
|  Enter  Get started      Esc  back               |
+--------------------------------------------------+
```

### Keybindings

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Move between fields |
| `Enter` | Connect (step 1), Get started (step 3), Retry (failure) |
| `d` | Explore with demo data on mock data (development builds only; hidden in production builds) |
| `e` | Edit credentials after a failure |
| `r` | Retry connection |
| `Esc` | Back one step, or quit from step 1 |

### States

- Empty: fields blank, `Connect` disabled until both fields are non-empty.
- Loading: the three-stage progress list; each stage resolves in sequence with mock latency.
- Populated: not applicable (Setup is a form flow).
- Error: mock `testConnection` fails when the token is empty, equals `bad`, or the scenario is `error`; the inline error keeps the entered URL visible and offers retry.
- Narrow: below 70 columns the form stays single-column with labels above fields; no ASCII framing is rendered at any width (the box drawings above are schematic); the token field truncates with a visible mask, never wrapping.

## Files touched

App shell and Setup flow:

- `src/app/SetupScreen.tsx`, `src/app/SetupScreen.types.ts` (new) - the connect, connecting, failure, and profile steps, including key- and paste-driven token editing and the clamped narrow form width
- `src/app/App.tsx`, `src/app/App.types.ts` - Setup visibility and the global keyboard deferral while Setup owns the viewport; Setup and Settings seams threaded from bootstrap
- `src/cli.tsx` - passes the resolved setup and settings repos into `App`

UI components:

- `src/components/ui/TextField.tsx`, `src/components/ui/TextField.types.ts` (new) - labeled input; secure fields render an always-masked, non-wrapping mask
- `src/components/ui/Field.tsx`, `src/components/ui/Field.types.ts` (new) - field label and error layout
- `src/components/ui/Button.tsx`, `src/components/ui/Button.types.ts` - focused and disabled states for the flow's actions

State and logic:

- `src/store/ui.ts`, `src/store/ui.types.ts` - `focusedField`, `setupDismissed` updates, and `showSetupScreen`
- `src/store/session.ts`, `src/store/session.types.ts` - `setProfileName` for the completed profile
- `src/app/StatusLine.tsx` - hides the global browsing hints while Setup is visible
- `src/lib/validate.ts` (new) - hand-written URL, profile name, and email validators
- `src/repos/types.ts` - `SetupRepo` additions
- `src/repos/mock/setup.ts` - deterministic `testConnection` and `applySchema`
- `src/repos/mock/settings.ts` - mock profile read and write
- `src/repos/resolve.ts` - first-run fallback to Setup over a browsable mock shell

## Approval

Approved at [G1](G1-setup-ui-approval.md). Do not start the next ticket until G1 is `done`.

## Deferred

- Real `SELECT 1`
- Real `applyRemoteSchema`
- Real config file writes
- Real profile persistence

## Notes

- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- No automated tests: this repo has a locked decision of manual verification and approval checklists instead (`PLAN.md:13`). The M1 validators (`src/lib/validate.ts`) and the mock contract (`testConnection`/`applySchema`) are verified manually against the G1 checklist, so the deliberate deviation is recorded here rather than adding a test framework.
- Labels above fields at all widths is an intentional simplification of the PLAN step-3 drawing (which shows labels to the left on wide terminals), kept so wide and narrow terminals share one columnar form. Confirm at G1.
- G1 existing-profile path: complete the profile once, then reopen Setup via the palette; the mock `getProfile` is a module singleton, so it returns the saved profile. Dev-panel profile seeding is deferred.
- Secure token input: the field renders no `<input>` (so the cleartext never reaches the screen), so Setup owns its keys *and* paste in `SetupScreen`; a paste is ANSI-stripped and folded to a single printable line (C0/C1 controls and DEL dropped) before appending.
- Narrow width floor: `formWidth` clamps to a minimum of 8 columns, so terminals under ~13 columns clip the failure/URL lines to `"..."`. Deliberate: such terminals are unusable anyway, and the floor keeps the form non-negative.
- `getSetupRepo`/`SetupBundle` (`src/repos/index.ts`, `src/repos/index.types.ts`) are M0 seam code with no M1 consumer; left in place because they predate M1 (see `M0-skeleton-and-repo-seam.md`).
- Production-drop claim, restated precisely (round-3 review L1): `dist/cli.js` has no mock chunk and no `Demo data`/`createFixtures`/`POS_MOCK_SCENARIO` strings; mock code is genuinely DCE'd. However `dist/cli.js.map` still embeds the original TypeScript via `sourcesContent`, so the dev-only demo hint survives in the map. `dist/` is gitignored and excluded from the uncommitted tree; the map policy (shipping `sourcesContent` in `build:prod`) is a build-config concern, not M1 behavior. Left for a build/packaging follow-up.
- Token field cursor movement (round-3 review N2): the secure field supports only append and Backspace (arrows/Home/End/Delete/selection/Ctrl+U ignored, paste appends at the end). Fine for M1's short mock tokens; W1 should add at least a clear/select-all affordance for long real tokens.
- Production first-run (G1 review H1): with the mock chunk dropped, the no-config fallback resolves to turso instead of mock, so a production build with no config still opens Setup (backed by the turso SetupRepo until W1 wires it) instead of exiting with "mock mode is not enabled". Explicit `--mock`/`POS_MOCK=1` in production still resolves to mock and fails loudly at the import boundary. Dev behavior is unchanged.
- Header placeholder (G1 review N2): the session defaults `profileName` to Alex Johnson, so the header shows AJ behind Setup on a fresh run before any profile exists. Deliberate mock placeholder; W1 replaces it with the remote profile once settings are wired.

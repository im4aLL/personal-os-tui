---
id: M1
title: Setup UI (mock connection)
type: milestone
status: not-started
phase: setup
order: 3
depends_on: [G0]
gate: G1
---

# M1 - Setup UI (mock connection)

> Type: milestone · Status: not-started · Phase: setup

## Objective

The first-run experience is fully reviewable without a database: the connect form, the connecting state, success, failure, and the profile step, driven by a mock `SetupRepo` whose `testConnection` succeeds or fails deterministically.

## Deliverables

- [ ] `src/app/SetupScreen.tsx` with the three steps: connect, connecting, and profile.
- [ ] `src/components/ui/TextField.tsx` and `Field.tsx` for labeled inputs with masking, plus the `Button.tsx` additions the flow needs.
- [ ] `src/repos/types.ts`: `SetupRepo.testConnection(url, token)` and `SetupRepo.applySchema()`, the two Setup operations that are not ordinary CRUD.
- [ ] `src/repos/mock/setup.ts`: mock `testConnection` succeeds when the URL starts with `https://` or `libsql://` and the token is at least 8 characters and not `bad`; mock `applySchema` reports 22 statements applied.
- [ ] `src/repos/mock/settings.ts`: mock `getProfile` and `saveProfile`.
- [ ] `src/repos/resolve.ts`: the "no config file, or config missing `turso.url`/`turso.token` -> mock" fallback, so first run opens on Setup with a fully browsable mock shell behind it.
- [ ] Connect form with blank fields and `Connect` disabled until both fields are non-empty.
- [ ] Three-stage progress list (`SELECT 1`, applying schema, loading profile) resolving in sequence with mock latency.
- [ ] Inline failure panel with `r` retry and `e` edit credentials, keeping the entered URL visible.
- [ ] Profile step with name and email validation.
- [ ] Development-only `d` demo data shortcut, hidden in production builds.
- [ ] Narrow handling: single-column form with labels above fields and a masked, non-wrapping token field.
- [ ] No fixtures; the only state is the entered form.

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
- Narrow: below 70 columns the form becomes single-column, the ASCII framing is dropped, and labels sit above fields; the token field truncates with a visible mask, never wrapping.

## Files touched

- `src/app/SetupScreen.tsx` - the connect, connecting, failure, and profile steps
- `src/components/ui/TextField.tsx` - labeled text input with masking
- `src/components/ui/Field.tsx` - field label and error layout
- `src/components/ui/Button.tsx` - primary and secondary actions for the flow
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

---
id: M0
title: Skeleton, theme, shell, navigation, and the repository seam
type: milestone
status: done
phase: foundation
order: 1
depends_on: [B0]
gate: G0
---

# M0 - Skeleton, theme, shell, navigation, and the repository seam

> Type: milestone · Status: done · Phase: foundation

## Objective

`pos` launches a themed full-screen shell with sidebar, header, status line, six navigable placeholder screens, working theme switching, a first-cut command palette and help screen, and a `MOCK DATA` badge. It contains the repository interfaces, the resolver, the mock and turso implementations (turso methods throwing "not wired yet" stubs are acceptable at this point), and a minimal fixture set. No real database is touched.

## Deliverables

- [x] `bin/pos.mjs`: Node version gate, the `--experimental-ffi` re-exec with `stdio: "inherit"` and forwarded signals, `OPENTUI_LIBC` handling, and the "run npm run build" message when the entry is missing.
- [x] `src/cli.tsx`: config load, `getRepos()`, renderer creation and destruction with the terminal-restoration guarantees, and the `pos`, `pos --help`, `pos --version`, `pos doctor`, `pos reset` subcommands parsed before the renderer exists.
- [x] `src/repos/*`: one interface per domain in `types.ts`, the precedence resolver in `resolve.ts` (flag > env > auto > turso), and `getRepos()` / `getSetupRepo()` in `index.ts` with exactly one dynamic mock import.
- [x] `src/repos/mock/*` and `src/repos/turso/*` with the same file set; turso methods may throw "not wired yet" stubs at this milestone.
- [x] `src/mock/fixtures.ts` created with empty arrays per domain, plus one todo and one note so the shell has something to render references to.
- [x] `src/app/*`: App, Layout, Sidebar, Header (with the `MOCK DATA` badge), StatusLine, ConnectionDot, SetupScreen, and MockStatePanel.
- [x] `src/screens/*`: the six placeholder screens (Dashboard, Todo, Save Links, Project Planner, Work Log, Notes).
- [x] `src/theme/*`: `types.ts` (palette and semantic tokens), `registry.ts` with all four Catppuccin variants and Mocha as the default, `catppuccin.ts`, `degrade.ts`, and `ThemeProvider.tsx`.
- [x] `src/commands/registry.ts`: commands defined as data so the global key handler, the command palette, and the help screen cannot drift.
- [x] `src/components/ui/*`: Button, Modal, EmptyState, Skeleton, and List.
- [x] `src/lib/config.ts` read path only: location precedence, loose-permission reporting, env overrides, and token redaction.

## Design notes

### Screen layout

```text
+----------------+------------------------------------------------------+
| Personal OS    | Dashboard                        [MOCK DATA] * ok     |
+----------------+------------------------------------------------------+
| > Dashboard    |                                                      |
|   Todo         |                                                      |
|   Save Links   |            (screen content)                          |
|   Project Pl.. |                                                      |
|   Work Log     |                                                      |
|   Notes        |                                                      |
|                |                                                      |
| AB  Alex J.    |                                                      |
+----------------+------------------------------------------------------+
| / commands  ? help  t theme  q quit          mock  | 0 ms          |
+----------------+------------------------------------------------------+
```

### Keybindings

| Key | Action |
| --- | --- |
| `Alt+1` .. `Alt+6` | Jump to screen |
| `/` or `Ctrl+P` | Command palette |
| `?` | Help and keymap |
| `t` | Cycle theme (Latte, Frappe, Macchiato, Mocha) |
| `Ctrl+\` | Toggle sidebar |
| `Ctrl+Shift+D` | Mock state panel (latency, scenario, inject error, reset fixtures) |
| `q` | Quit from normal browsing (ignored while a text field or the editor has focus) |
| `Ctrl+Q` | Quit (always, including from modals and text fields) |
| `Ctrl+C` | Copy when there is a selection; quit from normal browsing otherwise |
| `Esc` | Close modal, or leave editor focus |

### States

- Empty: placeholders with `EmptyState` text, the real strings the finished screens will use.
- Loading: `Skeleton` blocks shown when `POS_MOCK_LATENCY` makes the mock resolve slowly.
- Populated: not applicable at this milestone beyond the shell chrome.
- Error: `POS_MOCK_SCENARIO=error` renders the shell-level error banner and status-line message.
- Narrow: below 80 columns the sidebar collapses to a 2-character column; below 60 it hides and `Ctrl+\` is the only way back; the status line truncates hint segments rather than wrapping.

## Files touched

- `bin/pos.mjs` - version gate, `--experimental-ffi` re-exec, `OPENTUI_LIBC`, signals
- `src/cli.tsx` - entry: subcommands, config load, repo resolve, renderer lifecycle
- `src/repos/*` - repository interfaces, resolver, mock and turso implementations
- `src/mock/fixtures.ts` - minimal fixture set (empty arrays plus one todo and one note)
- `src/app/*` - shell chrome and the Setup screen
- `src/screens/*` - placeholder screens
- `src/theme/*` - theme registry and degradation
- `src/commands/registry.ts` - command registry
- `src/components/ui/*` - Button, Modal, EmptyState, Skeleton, List
- `src/lib/config.ts` - read only

## Approval

Marked `done` after implementation and hadi-reviewer approval. The shell UI is still approved at [G0](G0-shell-ui-approval.md); do not start the next ticket until G0 is `done`.

## Deferred

- Real data
- Mouse
- `--ascii` mode
- Full help content
- Theme picker modal

## Notes

- Depends on [B0](B0-project-bootstrap.md) for the initialized project, installed dependencies, and tooling config.
- Builds the full `bin/pos.mjs` launcher on top of the B0 placeholder.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

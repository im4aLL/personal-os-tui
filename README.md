# Personal OS TUI

Keyboard-first terminal UI for Personal OS, built on OpenTUI + React. Full-feature port of the Personal OS desktop app: Dashboard, Todo, Save Links, Project Planner, Work Log, and Notes.

It talks directly to the user's Turso libSQL database over the HTTP v2 pipeline. Turso is the single source of truth, so a TUI session and a desktop session pointed at the same database see the same rows.

## Requirements

- Node.js >= 26.4.0 (the OpenTUI native core is loaded through `--experimental-ffi`)
- macOS, Linux, or Windows; the launcher adds the FFI flag itself, so no flags are needed at the call site

## Install

```sh
npm install -g @im4all/personal-os-tui
pos
```

## Run from source

```sh
npm install
npm run build
node bin/pos.mjs
```

UI development runs straight from TypeScript, with mock data and no database:

```sh
npm run dev         # node --experimental-ffi --import tsx src/cli.tsx
npm run dev:mock    # same, with POS_MOCK=1
```

## Keymap

Global keys (also listed by `?`):

| Key | Action |
| --- | --- |
| `alt+1` .. `alt+6` | Jump to Dashboard, Todo, Save Links, Project Planner, Work Log, Notes |
| `/` or `ctrl+p` | Command palette (`/` searches the current list first on Todo and Notes) |
| `?` | Help and keymap |
| `t` | Cycle theme |
| `ctrl+t` | Theme picker |
| `ctrl+r` | Refresh the current screen |
| `ctrl+\` | Toggle the sidebar |
| `ctrl+shift+d` | Mock state panel (development builds only); the plain `ctrl+d` fallback is reachable via the palette once browsing uses `ctrl+d` for half page |
| `q` | Quit while browsing |
| `:q` | Quit via the ex line (`:q!` and `:quit` are aliases; `esc` cancels) |
| `ctrl+q` | Quit from anywhere, including forms and dialogs |
| `ctrl+c` | Copy the current text selection; with nothing selected, quit while browsing (plain `c` copies a selected link) |
| `esc` | Close the open dialog, or leave a focused editor |

Per-screen keys (the status line shows the active set):

| Screen | Keys |
| --- | --- |
| Dashboard | `tab` panel, `j/k` move, `h/l` stat card, `g/G` first or last, `ctrl+d/u` half page, `1-4` card, `enter` open, `n` add, `r` refresh |
| Todo | `n` new, `enter` edit, `m` cycle status, `h/l` focus column, `H/L` move column, `K/J` reorder, `g/G` first or last, `ctrl+d/u` half page, `/` search, `d` delete, `a` archived, `A` archive done, `X` clear done |
| Save Links | `enter` open, `e` edit title, `c` copy, `d` delete, `n` save, `/` search, `tab` tags, `h/l` tags, `g/G` first or last, `ctrl+d/u` half page, `esc` clear |
| Project Planner | `1/2` list or grid, `tab` zone, `h/l` zone, `j/k` select, `g/G` first or last, `ctrl+d/u` half page, `enter` open or edit, `n` new, `e` edit, `d` delete, `p` phases, `K/J` reorder, `s` separator, `o` jira, `c` comment, `[` `]` window |
| Work Log | `j/k` select, `g/G` first or last, `ctrl+d/u` half page, `enter` edit, `n` add, `d` delete, `/` search, `f` date, `1-3` preset, `c` clear |
| Notes | `n` new, `p` preview, `b` pin, `v` privacy, `x` export, `d` delete, `/` search, `enter` open, `g/G` first or last, `ctrl+d/u` half page, `ctrl+s` save, `ctrl+enter` todo |

All six browsing screens share a common vim-style motion set: `j`/`k` move the selection, `g`/`G` jump to the first or last item, and `ctrl+d`/`ctrl+u` move by half a page. Arrow keys mirror the motions: `up`/`down` are `k`/`j`, and `left`/`right` are `h`/`l`. Where a horizontal axis exists, `h`/`l` move along it (Todo columns, Dashboard stat cards, Save Links tag pills, Project Planner zones); Notes and Work Log have no horizontal axis and leave `h`/`l` unbound. `:` opens a one-line ex prompt on the status line from normal browsing: `q`, `q!`, or `quit` plus `enter` quits, `esc` cancels, and an unknown command shows `not a command: <text>` and returns to browsing. Counts, `gg`, operators, and palette `j`/`k` are intentionally not part of this set.

Mouse is additive, never required: click a sidebar item to navigate, click a row to select it, double-click a row to open or edit it, scroll a list with the wheel, and click a tag pill to apply it. Run with `POS_NO_MOUSE=1` for keyboard-only reachability.

In development builds, `ctrl+shift+d` opens the mock state panel: switch scenario (`1-6`, including `slow` at 3 s and `large`), adjust latency (`-`/`+`), toggle error injection (`e`), and reset fixtures (`r`) without a restart. On terminals that report `ctrl+shift+d` as plain `ctrl+d`, browsing consumes `ctrl+d` for half page, so open the panel from the command palette there instead.

## Scripts

| Script | Purpose |
| --- | --- |
| `build` | Development build with tsdown (mock chunk included) |
| `build:prod` | Production build; `POS_MOCK_ENABLED=false` makes the mock branch statically dead, so rolldown drops its chunk |
| `dev` / `dev:mock` | Run the unbundled entry under `--experimental-ffi` with tsx |
| `typecheck` | `tsc --noEmit` (Biome does not typecheck) |
| `check:ffi` | Reproducible FFI smoke check: imports `@opentui/core` under `--experimental-ffi` and asserts the native core loads. Contributor-only: not included in the published tarball, and it targets glibc/macOS without going through the launcher's Alpine/musl handling |
| `check` | Biome lint + format + assist, no writes; this is the gate |
| `check:write` | Same, applying safe fixes |
| `format` / `lint` | Formatting and linting alone |
| `ci` | Biome's non-interactive CI check |

## Installed dependencies

Runtime (exact versions from `package-lock.json` on the bootstrap machine, macOS arm64, Node v26.4.0):

| Package | Declared | Installed |
| --- | --- | --- |
| `@opentui/core` | `^0.5.12` | `0.5.12` |
| `@opentui/react` | `^0.5.12` | `0.5.12` |
| `@opentui/core-darwin-arm64` | optional, resolved transitively | `0.5.12` |
| `react` | `^19.2.0` | `19.3.0` |
| `zustand` | `^5.0.14` | `5.0.15` |
| `ws` | `^8.18.0` | `8.22.0` |
| `web-tree-sitter` | `0.25.10` (exact) | `0.25.10` |

Development:

| Package | Declared | Installed |
| --- | --- | --- |
| `typescript` | `~5.8` | `5.8.3` |
| `@types/node` | `^24` | `24.19.0` |
| `@types/react` | `^19.2` | `19.3.0` |
| `tsdown` | `^0.10` | `0.10.2` |
| `tsx` | `^4` | `4.23.15` |
| `@biomejs/biome` | `^2` | `2.5.14` |

Deliberately omitted: `zod` (hand-written validators), `date-fns`, `react-markdown`/`remark-gfm`/`rehype-highlight` (OpenTUI `<markdown>` handles preview), `jspdf`/`jspdf-autotable` (PDF dropped), `string-width` unless OpenTUI's width utilities prove insufficient, and `@opentui/keymap` (deferred to the polish phase). Rationale for each is in `PLAN.md` under "Dependencies".

## Status

All six feature screens (Dashboard, Todo, Save Links, Project Planner, Work Log, Notes) are implemented and wired to Turso through the repository seam, with Setup wired first. The M8 cross-cutting polish is complete: the command palette lists each command with its bound keys, `?` renders global and per-screen keys generated from one registry, `ctrl+t` opens a theme picker that persists to `config.json`, `ctrl+r` refreshes the current screen, the dev-only mock panel toggles scenario, latency, error injection, and fixtures, mouse is an additive layer (disabled with `POS_NO_MOUSE=1`), and every screen's empty, loading, and error states share one voice. The M8 milestone awaits G8 approval. Without credentials the app runs on in-memory mock data behind a MOCK DATA badge; `POS_MOCK_LATENCY` and `POS_MOCK_SCENARIO` (including `slow` and `large`) shape loading and error states in dev builds, and the mock chunk is dropped from `build:prod`.

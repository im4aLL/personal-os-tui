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

The bootstrap (B0) is complete and the dependency list is confirmed. `pos` gates the Node version, re-execs itself with `--experimental-ffi`, and runs the bundled entry; the entry itself is still a placeholder that prints `M0 shell is not implemented yet`. Feature screens land incrementally per `PLAN.md`, on mock data first and wired to Turso after each approval gate.

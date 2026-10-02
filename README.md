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

### Overriding keys with `keymap.json`

Registry key bindings can be overridden from a `keymap.json` file in the same config directory as `config.json` (`POS_CONFIG_DIR` > `XDG_CONFIG_HOME` > the platform default, which is `~/.config/personal-os-tui` on macOS/Linux and `%APPDATA%\personal-os-tui` on Windows). It is a sibling file, never a section in `config.json`: the keymap is not secret and is safe to share or keep in a dotfiles repository.

An override replaces the bindings only for the command ids it names, and it replaces that command's entire list; every unlisted command keeps its full default set. An empty array clears a command's bindings deliberately.

```json
{
  "version": 1,
  "keys": {
    "nav.todo": [{ "name": "t", "meta": true }],
    "global.theme": [{ "name": "t", "shift": true }]
  }
}
```

This file changes two commands and leaves `global.quit` untouched, so all of its defaults (`q`, `ctrl+q`, and `ctrl+c`) survive. Because naming a command replaces its whole list, keeping only some of a command's defaults means repeating the ones you want.

Key matching is case-insensitive, so a single-character `name`'s case is display-only: `{ "name": "t" }` fires on both `t` and `Shift+T`, and binding only `Shift+T` needs `{ "name": "t", "shift": true }` (as above), not `{ "name": "T" }`.

- `version` must be `1`. Any other value rejects the whole file so a command rename in a later release cannot silently mis-map a stale keymap.
- `keys` maps a command id to an array of bindings. A binding is `{ "name": "...", "ctrl"?: bool, "meta"?: bool, "shift"?: bool }`, the same shape shown by `?`. `meta` is Alt.
- `name` is normalized and validated against the keys the renderer can emit: a single printable character (`q`, `?`, `/`, `\`, `2`, `-`, `+`) or a named key from the parser's set (navigation `up`/`down`/`left`/`right`/`home`/`end`/`pageup`/`pagedown`, editing `insert`/`delete`/`backspace`, `escape`, `return`, `linefeed`, `tab`, `space`, `enter`, function keys `f1`..`f35`, keypad `kp*`, media/volume names, and modifier names). The display aliases `esc` and `enter` are accepted and normalized to `escape` and `return`. Control characters and unknown names are rejected, never silently accepted as a dead key.
- The modifiers must be booleans. Extra fields are ignored.
- One malformed binding rejects that whole command entry, which then keeps its default.
- An entry that collides with a different command's effective binding is rejected, keeping the default.
- An unknown command id is rejected. Nothing is fatal: the app always starts.

Rejected entries are reported. `pos doctor` prints the resolved keymap source and one line per skip, and the status line shows `keymap: N skipped` while any are present. `pos doctor` treats keymap problems as advisory, so they never change its exit status.

Only registry commands are remappable: the `nav.*` and `global.*` commands and the visible mock commands in development builds. Bindings that bypass the registry are out of scope and cannot be overridden. The six screens own their keys imperatively (the per-screen table above lists them) and screen scopes run before the global registry, so an override onto a screen-owned key is shadowed while that screen is active and applies only where no screen scope claims it. Also out of scope: command-palette navigation (`up`/`down`/`ctrl+n`/`ctrl+p`), the mock dev panel's internal keys (`1`-`5`, `r`, `-`/`+`), Setup's `d` demo key, and the always-on `ctrl+q` quit path. The always-on quit filter follows the `global.quit` command's `ctrl+q` binding and quits from anywhere, including forms; it is not separately remappable, so remapping `global.quit` should keep a `ctrl+q` binding if that escape hatch is wanted.

Dev-only commands such as the mock panel are part of the registry in development builds and reserve their keys. A file that remaps onto `ctrl+d` is therefore rejected in a dev build and accepted in a production build; it is reported as an advisory skip on the status line and in `pos doctor`, never a crash.

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

## Environment variables

| Variable | Purpose |
| --- | --- |
| `POS_CONFIG_DIR` | Override the config directory (default: `~/.config/personal-os-tui`, or `%APPDATA%\personal-os-tui`) |
| `POS_TURSO_URL` / `POS_TURSO_TOKEN` | Credential overrides, never persisted |
| `POS_TZ` | Override the calendar zone used for "today", week boundaries, and displayed dates (e.g. `Europe/Berlin`); defaults to the system zone |
| `POS_LOCALE` | Override the display locale (e.g. `de-DE`); defaults to the OS locale |
| `POS_NO_MOUSE` | Set to `1` for keyboard-only reachability |
| `POS_MOCK` / `POS_MOCK_LATENCY` / `POS_MOCK_SCENARIO` | Development-build mock controls (see the mock sections above) |

Stored timestamps are always UTC ISO strings; `POS_TZ` and `POS_LOCALE` only affect how the TUI derives calendar dates and renders them, so no remote row changes shape. `pos doctor` reports both, plus an advisory warning when a value is invalid and the process default is used instead.

## Failure behavior

- **Network off / unreachable database.** Every request retries once on a transient network error and then surfaces a classified message; screens keep the previous data visible with a retry key rather than blanking.
- **Invalid or rotated token.** Turso HTTP 401/403 and `unauthorized` bodies map to "Could not authenticate with Turso. Check your token." Re-running Setup with a fresh token recovers; `pos doctor` fails its `SELECT 1` line and exits non-zero.
- **Missing tables.** Setup applies `REMOTE_SCHEMAS` and tolerates benign `already exists` / `duplicate column` statements, so a partially migrated database is brought up to date instead of failing.
- **Read-only config directory.** Writes use a temp file plus rename and are best-effort: a failed UI-preference or autosave write never crashes the app; the failure is surfaced in-app and `pos doctor` reports the config path and permissions.
- **Slow or rate-limited database.** Requests time out after 15 s and retry once on HTTP 429/5xx with a 300 ms backoff, so a slow database degrades to an error with a retry instead of hanging a skeleton.

## Packaging

`npm pack` produces a tarball containing `bin/`, `dist/`, `README.md`, `LICENSE`, and `package.json`. A production build (`npm run build:prod`) emits only `dist/cli.js` and its sourcemap - no mock chunk. Requesting mock against that build (`POS_MOCK=1 pos` or `pos --mock`) fails loudly with `mock mode is not enabled in this build`. Install globally with `npm install -g @im4all/personal-os-tui`.

## Terminal support

Tested terminals are iTerm2, Terminal.app, Alacritty, Kitty, WezTerm, tmux, and GNU Screen on macOS/Linux, plus Windows Terminal (PowerShell and Git Bash). On a 256-color-only terminal (`TERM=xterm-256color`, no `COLORTERM`) colors degrade to the nearest ANSI slot rather than rendering invisibly. The terminal is restored on normal quit, `Ctrl+Q`, handled signals, uncaught exceptions, and unhandled rejections.

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

Deliberately omitted: `zod` (hand-written validators), `date-fns`, `react-markdown`/`remark-gfm`/`rehype-highlight` (OpenTUI `<markdown>` handles preview), `jspdf`/`jspdf-autotable` (PDF dropped), `string-width` unless OpenTUI's width utilities prove insufficient, and `@opentui/keymap` (not needed; the in-house command registry covers the keymap).

## Status

All six feature screens (Dashboard, Todo, Save Links, Project Planner, Work Log, Notes) are implemented and wired to Turso through the repository seam, with Setup wired first. The cross-cutting polish is complete: the command palette lists each command with its bound keys, `?` renders global and per-screen keys generated from one registry, `ctrl+t` opens a theme picker that persists to `config.json`, `ctrl+r` refreshes the current screen, the dev-only mock panel toggles scenario, latency, error injection, and fixtures, mouse is an additive layer (disabled with `POS_NO_MOUSE=1`), and every screen's empty, loading, and error states share one voice. Configurable key bindings (`keymap.json`) and the shared vim-style motion set with `:q` are in place. The real-data path is hardened: quitting drains pending writes (including the Notes autosave) before the terminal is restored, `POS_TZ`/`POS_LOCALE` override the calendar and display locale, a malformed links cursor self-heals, and the failure passes (network off, invalid/rotated token, missing tables, read-only config directory, slow/rate-limited database) surface classified errors with retries. Without credentials the app runs on in-memory mock data behind a MOCK DATA badge; `POS_MOCK_LATENCY` and `POS_MOCK_SCENARIO` (including `slow` and `large`) shape loading and error states in dev builds, and the mock chunk is dropped from `build:prod`.

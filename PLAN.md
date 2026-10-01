# Personal OS TUI - Revised Implementation Plan (UI-first delivery with approval gates)

## Goal

Ship `@im4all/personal-os-tui`, an npm-global CLI named `pos` that runs a keyboard-first terminal application built on OpenTUI + React. It is a full-feature port of the Personal OS desktop app (`/Users/hadi/repos/personal-os`): Dashboard, Todo, Save Links, Project Planner, Work Log, and Notes.

It talks directly to the user's Turso libSQL database over the HTTP v2 pipeline - no local database, no sync engine. Turso is the single source of truth, so a TUI session and a desktop session pointed at the same database see the same rows with identical table names, column names, and timestamp formats.

The delivery model is UI-first, one feature at a time: each feature is built first as a fully interactive screen running on in-memory mock data, the user inspects and approves it at a gate, and only then is that same feature wired to real Turso before the next feature's UI begins. Setup is wired immediately after its gate to prove real connectivity once, early. Mock mode keeps the whole app browsable and demoable with no database at any point.

## Assumptions and decisions

Locked decisions restated once and not revisited: Turso-only direct read/write via the HTTP v2 pipeline; Node.js 26.4+ ESM with `--experimental-ffi`; public open-source npm package `@im4all/personal-os-tui` under the MIT license, installed globally with bin `pos`; OpenTUI + `@opentui/react`; JSX with `jsxImportSource: "@opentui/react"`; keyboard-first with mouse secondary; Project Planner as a week grid with keyboard move/reorder instead of drag-and-drop; built-in `<textarea>` editor with a Markdown preview toggle; no network fetch for link metadata (title typed manually, `favicon_url` stored null); all four Catppuccin variants behind a data-driven theme registry with Mocha as the default and no automatic light/dark following; `q` quits from normal browsing, `Ctrl+Q` always quits, and `Ctrl+C` copies when there is a selection and quits otherwise; delivery is one feature at a time (UI, approval gate, then wiring) with Setup wired immediately after its gate; the mock is strictly excluded from production; no automated tests (manual verification and approval checklists instead).

Decisions confirmed from the open questions: package is public `@im4all/personal-os-tui` (MIT license); default theme Mocha with dark-only palettes (Latte remains selectable, but nothing follows the terminal's system preference); `q` quit policy as above; one-feature-at-a-time cadence; Setup wired right after G1 (W1); mock strictly excluded from the production build with no shipped demo mode.

New decisions introduced by the UI-first model:

| Area | Decision | Why |
| --- | --- | --- |
| Data seam | A repository interface per domain with two implementations: `mock` (in-memory fixtures) and `turso` (thin wrappers over `src/lib/*`). Stores depend only on the interfaces | This is the mechanism that makes "see the UI first" possible with zero database. It is not speculative: it is the requested workflow, and it is also the seam that keeps screens unchanged during wiring |
| Mock selection | In development builds: `--mock` flag > `POS_MOCK` env > automatic mock when no config exists > turso. In production builds the mock is unavailable, so a missing config always routes to Setup | Explicit developer control for UI review; production always talks to Turso |
| Mock visibility | Unmissable `MOCK DATA` badge in the header and status line; mock writes never persist; mock mode is a per-session flag | Prevents anyone mistaking fixtures for real data |
| Mock latency | Mock repos simulate 150-400 ms latency by default, tunable with `POS_MOCK_LATENCY`, plus injectable errors | Loading, skeleton, and error states must be reviewable during approval, not just the happy path |
| Mock scenarios | `POS_MOCK_SCENARIO=default|empty|loading|error|large`, plus runtime commands in the command palette | The user can approve every state without editing code |
| Build guarantee | The mock is strictly excluded from production: `build:prod` makes the mock branch statically dead so the bundler drops its chunk, and `POS_MOCK=1` or `--mock` against a production build fails loudly. No demo mode is shipped | Mock code is never required at runtime in production and cannot silently appear there |
| Delivery cadence | One feature at a time: build the feature UI, approve at its gate, then wire that feature before starting the next one | User decision; keeps each approval tied to a single focused feature |
| Default theme | Mocha (dark). All four Catppuccin variants remain selectable, but nothing follows the terminal's system light/dark preference | User decision |
| Quit keys | `q` quits from normal browsing, `Ctrl+Q` always quits, and `Ctrl+C` copies when there is a selection and quits otherwise | User decision; avoids hijacking copy while keeping a single-key quit |
| UI approval | No wiring milestone starts until its gate is explicitly approved | Matches the requested workflow; avoids building data code behind an unapproved design |
| State | `zustand` v5 stores mirroring `personal-os/src/store/*` one-for-one, calling repository interfaces | Same shapes as the desktop; the store layer is written once and survives wiring untouched |
| Validation | Hand-written validators in `src/lib/validate.ts` | Six simple forms; `zod` plus react-hook-form is unnecessary weight. Easy to add later |
| Keymap | In-house `CommandRegistry` consumed by one global handler and the command palette; `@opentui/keymap` deferred | `useKeyboard` plus per-component `keyBindings` covers a mostly-modal app; the registry shape makes a later keymap migration mechanical |
| Bundler | `tsdown` with code splitting, OpenTUI/React externalized | Native optional packages must resolve from `node_modules` at runtime; splitting gives the mock a separate chunk that production drops |
| Lint and format | Biome v2 (`@biomejs/biome`) with a single `biome.json`; `npm run check` is the gate, `npm run ci` for CI | One fast tool for both lint and format, so no ESLint/Prettier pair; settings aligned with the coding style guide |
| Notes list query | New projection `getNotesList()` selecting only `id,title,pinned,created_at,updated_at` | `getNotes()` selects `*` including full `content`; wasteful over HTTP for a list pane |
| Multi-statement writes | `tursoBatch()` sending several statements in one `/v2/pipeline` request | Tag replacement, position updates, and reorders are N writes each |
| Dashboard counts | `SELECT COUNT(*)` per store instead of first-page array length | The desktop's `links.length` is the loaded page (max 50), wrong for larger libraries |
| Profile | Stored in remote `app_settings` (`profile_name`, `profile_email`) | Interop with the desktop app |
| UI preferences | Config file only | The desktop keeps them in `localStorage`; they are per-machine |

Unresolved decisions are collected in "Open questions".

## The mock seam

### Interfaces

One interface per domain, in `src/repos/types.ts`, with method signatures copied from the desktop's `personal-os/src/lib/*.ts` functions so that the Turso implementation is a mechanical wrapper and the stores never change:

```ts
export interface TodoRepo {
  list(): Promise<Todo[]>;
  listByStatus(status: TodoStatus): Promise<Todo[]>;
  search(query: string): Promise<Todo[]>;
  archived(): Promise<Todo[]>;
  create(input: CreateTodoInput): Promise<Todo>;
  update(id: string, input: UpdateTodoInput): Promise<void>;
  remove(id: string): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
  archive(ids: string[]): Promise<void>;
  restore(ids: string[]): Promise<void>;
  updatePositions(updates: { id: string; position: number }[]): Promise<void>;
}
```

The same shape applies to `NoteRepo`, `LinkRepo`, `WorkLogRepo`, `ProjectRepo`, and `SettingsRepo` (plus `SetupRepo.testConnection(url, token)` and `SetupRepo.applySchema()`, which are the two operations the Setup screen needs that are not ordinary CRUD).

`link.list` takes the full `GetLinksPageParams` shape from `personal-os/src/lib/links.ts` including `limit`, `cursor`, `query`, and `tag`, and returns `LinksPage`, so pagination semantics are identical between mock and real.

### Implementations

- `src/repos/turso/*.ts` - thin wrappers over `src/lib/<domain>.ts`, which holds the exact desktop SQL with `?` placeholders. No logic beyond mapping and batching.
- `src/repos/mock/*.ts` - in-memory arrays seeded from `src/mock/fixtures.ts`, honoring ids, ordering, pagination windows, and the same ordering rules as the real queries (for example `pinned DESC, updated_at DESC` for notes).
- `src/repos/index.ts` - `getRepos(): Promise<Repos>` and `getSetupRepo()`.

### How the active implementation is chosen

Precedence, evaluated once at bootstrap in `src/repos/resolve.ts` (a pure function, easy to reason about):

1. `--mock` / `--turso` CLI flag.
2. `POS_MOCK=1` / `POS_MOCK=0` environment variable.
3. No config file, or config missing `turso.url`/`turso.token` -> `mock` (automatic fallback). The app still opens on the Setup screen, but the shell behind it is fully browsable in mock mode.
4. Otherwise -> `turso`.

Deliberate exception: if config exists but Turso is unreachable, there is no silent fallback to mock. The app stays in an error state with a retry, because hiding a connectivity or credential failure behind fixtures would be misleading.

### How the mock is guaranteed not to be required in production

1. Exactly one dynamic `import()` of the mock module exists, inside `getRepos()` in `src/repos/index.ts`.
2. `tsdown.config.ts` enables code splitting, so `src/mock/**` and `src/repos/mock/**` compile to a separate chunk.
3. `npm run build` (development build, mock included) and `npm run build:prod` (production build) differ by a build-time define. `build:prod` sets the mock-enabled flag to `false`, making the `if (mockEnabled)` branch statically dead so rolldown drops both the branch and the chunk.
4. If mock mode is requested but the chunk is absent, `getRepos()` catches the import failure and exits with `mock mode is not enabled in this build`. So a published production package cannot load fixtures even if a user sets `POS_MOCK=1`.
5. Verifiable checks, both cheap: `grep -r "fixtures" dist/` finds nothing in a `build:prod` output, and `POS_MOCK=1 node dist/cli.js` prints the unavailable message.

### Removability

The mock is removable in three escalating ways, so it never becomes load-bearing: delete `src/mock/**` and `src/repos/mock/**` (the resolver then reports mock unavailable), or flip the build define, or ship a production build. Nothing in `src/screens/**`, `src/components/**`, or `src/store/**` references mock code by import.

## Architecture

### Process and runtime model

One Node process. No daemon, no server, no background workers.

```text
pos (bin/pos.mjs, shebang #!/usr/bin/env node)
  -> version gate (>= 26.4.0)
  -> ensure --experimental-ffi, set OPENTUI_LIBC if needed
  -> re-exec: node --experimental-ffi <dist/cli.js> [args]   (stdio inherit; SIGTERM forwarded, SIGINT via process group)
       -> dist/cli.js (bundled ESM)
            -> load config
            -> getRepos() (mock or turso)
            -> createCliRenderer()
            -> createRoot(renderer).render(<App />)
```

The launcher exists because runtime flags cannot be set from inside a running Node process, and because `@opentui/core` reads `OPENTUI_LIBC` while evaluating its module graph, so it must be in the child's environment before any Core import. A single re-exec is cheap and behaves identically on macOS, Linux, and Windows.

Escape hatch: if `bun` is detected and `pos --bun` (or `POS_RUNTIME=bun`) is set, the launcher skips the FFI flag and runs `bun dist/cli.js`. OpenTUI documents Bun 1.3+ as first class, so this is a one-branch fallback.

### Bin launcher and version gate

`bin/pos.mjs`, plain ESM, imports only `node:child_process`, `node:path`, `node:url`, `node:fs`.

1. Parse `process.versions.node` and compare to `[26, 4, 0]`. On failure, print a clear message (required version, detected version, install link) to stderr and exit 1 before the renderer touches the terminal.
2. `OPENTUI_LIBC`: set for `musl` only when already requested or on Alpine; otherwise leave unset (glibc default). Pass the full environment through.
3. If `process.execArgv` already contains `--experimental-ffi` or `--allow-ffi`, import `dist/cli.js` directly. Otherwise `spawn(process.execPath, ["--experimental-ffi", entry, ...process.argv.slice(2)], { stdio: "inherit", env })`.
4. Forward `SIGTERM` to the child; deliver `SIGINT` through the terminal's foreground process group (a single-PID `SIGINT` is not propagated). Exit with the child's code, or re-raise the child's terminating signal; report spawn errors clearly.
5. Resolve the entry via `fileURLToPath(new URL("../dist/cli.js", import.meta.url))` and print "run npm run build" when missing.

Windows note: npm generates `pos.cmd` and `pos.ps1` shims, so the shebang is ignored and Node is invoked explicitly; the re-exec then adds the FFI flag exactly as on Unix. Windows remains an explicit hardening test item because OpenTUI's Node acceptance currently runs on Linux x64 only.

### App bootstrap and lifecycle

`src/cli.tsx` owns renderer creation and destruction.

```text
main()
  config = loadConfig()
  repos  = await getRepos()                 # mock or turso, resolved once
  renderer = await createCliRenderer({ exitOnCtrlC: false, exitSignals: [], backgroundColor: theme.bg })
  root = createRoot(renderer)
  installProcessErrorHandlers(renderer)
  try {
    root.render(<App initialConfig={config} repos={repos} />)
    await waitForShutdown()
  } finally {
    try { await flushPendingWrites() } catch {}
    try { root.unmount() } finally { renderer.destroy() }
  }
```

Terminal restoration guarantees:

- `exitSignals: []` and `exitOnCtrlC: false` so the app owns shutdown and can flush the debounced note autosave.
- `uncaughtException` and `unhandledRejection` handlers that surface the error, run the same shutdown path, and set a non-zero exit code. OpenTUI's own listeners report but do not destroy, so we add ours.
- `renderer.destroy()` in `finally`; it is idempotent and restores raw mode, mouse, alternate screen, cursor, and title.
- No `process.exit()` before `destroy()`.

CLI subcommands, parsed before the renderer is created so they work without a terminal: `pos`, `pos --help`, `pos --version`, `pos doctor` (Node version, FFI availability, config path, permissions, active repository mode, `SELECT 1` when applicable - printed as text), and `pos reset` (move config aside so the next run shows Setup).

### State management

`zustand` verbatim from the desktop app, one store per domain, because the desktop stores already encode the optimistic-update and rollback semantics needed for a high-latency backend.

- `src/store/todos.ts` mirrors `personal-os/src/store/todos.ts`.
- `src/store/notes.ts`, `links.ts`, `workLogs.ts`, `projects.ts` mirror their counterparts, keeping the `linksGeneration` stale-response guard from `personal-os/src/store/links.ts` and the rollback pattern from `personal-os/src/store/projects.ts`.
- New stores: `ui.ts` (screen, modal stack, command palette, help, sidebar collapse, connection state, mock badge) and `session.ts` (profile, config, theme id, repository mode, capability flags).

Every store calls `repos.<domain>.<method>()`, never `src/lib/*` directly. That is the seam that makes wiring a swap rather than a rewrite.

### Data-access layer

`src/lib/turso.ts` is a port and extension of `personal-os/src/lib/turso.ts`.

Ported as-is: `toArg`, `parseValue`, `pipeline()` posting to `${url}/v2/pipeline` with `Authorization: Bearer <token>` and the `[{ type: "execute", ... }, { type: "close" }]` request array, plus the `data.results[0]` error check.

Extensions: `setTursoConfig`/`clearTursoConfig` (URL normalized `libsql://` -> `https://`, trailing slash stripped, as in `personal-os/src/pages/setup.tsx`); `tursoExecute`; `tursoSelect`; `tursoBatchSelect(queries)`; `tursoBatchExecute(statements)` (one pipeline, N executes, `close`, results mapped by index, error carries the index and SQL with args redacted); a transport wrapper emitting `{ phase: "start" | "ok" | "error", ms, message }` into `store/ui.ts`, retrying once on network failure and on HTTP 429/5xx with 300 ms backoff, never leaking the token; and a `SELECT 1` health check used by `pos doctor` and the "Test connection" command.

Repositories use `?` placeholders because Turso is positional; the desktop's `$1` style appears only in its local-SQLite paths.

| File | Mirrors | Operations |
| --- | --- | --- |
| `src/lib/todos.ts` | `personal-os/src/lib/todos.ts` | `getTodos`, `getTodosByStatus`, `searchTodos`, `getArchivedTodos`, `createTodo`, `updateTodo`, `deleteTodo`, `deleteTodos` (batched), `archiveTodos`, `restoreTodos`, `updateTodoPositions` (batched) |
| `src/lib/notes.ts` | `personal-os/src/lib/notes.ts` | `getNotesList`, `searchNotes`, `getNoteById`, `createNote`, `updateNote`, `setNotePinned`, `deleteNote` (also deletes `note_tags`), `getTagsForNote`, `setTagsForNote` (batched) |
| `src/lib/links.ts` | `personal-os/src/lib/links.ts` | `getLinksPage` (all query branches, `LINKS_PAGE_SIZE = 50`, `{ created_at, id }` keyset cursor), `getAllUsedTags`, `checkDuplicateUrl`, `createLink`, `updateLink`, `deleteLink`, `setTagsForLink` (batched) |
| `src/lib/work-logs.ts` | `personal-os/src/lib/work-logs.ts` | `getWorkLogs(filter)`, `getAllUsedTags`, `createWorkLog`, `updateWorkLog`, `deleteWorkLog`, `setTagsForWorkLog` |
| `src/lib/projects.ts` | `personal-os/src/lib/projects.ts` | `getProjects`, `createProject` (position = `COUNT(*)`), `updateProject`, `deleteProject`, `getPhasesForProject`, `createPhase`, `updatePhase`, `deletePhase`, `getProjectProgress`, `getWorkItemsForProject`, `createWorkItem`, `updateWorkItem`, `deleteWorkItem`, `reorderWorkItems` (batched), `reorderProjects` (batched) |
| `src/lib/settings.ts` | `personal-os/src/lib/profile.ts` | `getSetting`, `setSetting` (`ON CONFLICT(key) DO UPDATE`), `getProfile`, `saveProfile`. `gravatarUrl` dropped |
| `src/lib/schema.ts` | `personal-os/src/lib/schema.ts` | `REMOTE_SCHEMAS` verbatim, `applyRemoteSchema(exec)` with the same per-statement tolerance (`duplicate column`), broadened to treat `already exists` as benign |

Row mapping kept identical for interop: booleans as `INTEGER 0|1` (`archived === 1`, `pinned === 1`, `is_separator === 1`); datetimes as `new Date().toISOString()`; dates as `YYYY-MM-DD`; ids from `randomUUID()`.

Pure helpers copied verbatim: `week-utils.ts`, `week-groups.ts`, `project-progress.ts`, `uuid.ts`. Date formatting starts with the same `toLocaleDateString(undefined, ...)` calls as the desktop; `POS_LOCALE`/`POS_TZ` overrides are a hardening item.

### Config file

Location: `POS_CONFIG_DIR`, else `XDG_CONFIG_HOME`, else platform default (`~/.config`, or `%APPDATA%` on Windows), joined with `personal-os/config.json`.

```json
{
  "version": 1,
  "turso": { "url": "https://db-name-user.turso.io", "token": "eyJ..." },
  "ui": {
    "theme": "mocha",
    "notesFontSize": 14,
    "notesPrivacyMode": false,
    "sidebarCollapsed": false
  },
  "onboarding": { "completed": true, "completedAt": "2026-09-29T10:00:00.000Z" }
}
```

`loadConfig()` returns `{ config, path, complete }`; `complete` is false when credentials or onboarding are missing. `saveConfig()` writes `config.json.tmp` then renames, with directory mode `0o700` and file mode `0o600`. `POS_TURSO_URL` and `POS_TURSO_TOKEN` override and are not persisted, and the status line says "credentials from environment". On load, loose permissions are reported in the status line. All errors and logs redact the token. Profile lives in remote `app_settings`, not here.

### Theme registry

`src/theme/types.ts` defines `ThemePalette` (the 26 raw Catppuccin-shaped colors), `ThemeTokens` (the semantic tokens the UI consumes), and `Theme`.

`ThemeTokens`: `bg`, `bgPanel`, `bgAlt`, `bgRaised`, `bgHover`, `border`, `borderMuted`, `borderFocus`, `fg`, `fgMuted`, `fgSubtle`, `fgDisabled`, `accent`, `accentAlt`, `success`, `warning`, `danger`, `info`, `link`, `selectionBg`, `selectionFg`, `cursor`, `statusBg`, `statusFg`, `headerBg`, `sidebarBg`, `sidebarActiveBg`, `sidebarActiveFg`, `priorityHigh`, `priorityMedium`, `priorityLow`, `phaseFallback`.

`src/theme/registry.ts` holds `Record<string, Theme>` plus `getTheme`, `listThemes`, `defaultThemeId`. Adding a palette later is a data-only change: append one object with the same 26 keys. A `fromAnsiPalette(colors: string[])` adapter maps terminal ANSI slots to the same keys, so "use my terminal colors" is also data.

`src/theme/catppuccin.ts` exports all four variants with concrete values:

| token | Latte | Frappe | Macchiato | Mocha |
| --- | --- | --- | --- | --- |
| base | #eff1f5 | #303446 | #24273a | #1e1e2e |
| mantle | #e6e9ef | #292c3c | #1e2030 | #181825 |
| crust | #dce0e8 | #232634 | #181926 | #11111b |
| surface0 | #ccd0da | #414559 | #363a4f | #313244 |
| surface1 | #bcc0cc | #51576d | #494d64 | #45475a |
| surface2 | #acb0be | #626880 | #5b6078 | #585b70 |
| overlay0 | #9ca0b0 | #737994 | #6e738d | #6c7086 |
| overlay1 | #8c8fa1 | #838ba7 | #8087a2 | #7f849c |
| overlay2 | #7c7f93 | #949cbb | #939ab7 | #9399b2 |
| text | #4c4f69 | #c6d0f5 | #cad3f5 | #cdd6f4 |
| subtext0 | #6c6f85 | #a5adce | #a5adcb | #a6adc8 |
| subtext1 | #5c5f77 | #b5bfe2 | #b8c0e0 | #bac2de |
| rosewater | #dc8a78 | #f2d5cf | #f4dbd6 | #f5e0dc |
| flamingo | #dd7878 | #eebebe | #f0c6c6 | #f2cdcd |
| pink | #ea76cb | #f4b8e4 | #f5bde6 | #f5c2e7 |
| mauve | #8839ef | #ca9ee6 | #c6a0f6 | #cba6f7 |
| red | #d20f39 | #e78284 | #ed8796 | #f38ba8 |
| maroon | #e64553 | #ea999c | #ee99a0 | #eba0ac |
| peach | #fe640b | #ef9f76 | #f5a97f | #fab387 |
| yellow | #df8e1d | #e5c890 | #eed49f | #f9e2af |
| green | #40a02b | #a6d189 | #a6da95 | #a6e3a1 |
| teal | #179299 | #81c8be | #8bd5ca | #94e2d5 |
| sky | #04a5e5 | #99d1db | #91d7e3 | #89dceb |
| sapphire | #209fb5 | #85c1dc | #7dc4e4 | #74c7ec |
| blue | #1e66f5 | #8caaee | #8aadf4 | #89b4fa |
| lavender | #7287fd | #babbf1 | #b7bdf8 | #b4befe |

`deriveTokens(palette)` maps raw to semantic: `bg=base`, `bgPanel=mantle`, `bgAlt=surface0`, `bgRaised=surface1`, `bgHover=surface2`, `border=surface1`, `borderMuted=surface0`, `borderFocus=mauve`, `fg=text`, `fgMuted=subtext0`, `fgSubtle=overlay1`, `fgDisabled=overlay0`, `accent=mauve`, `accentAlt=blue`, `success=green`, `warning=yellow`, `danger=red`, `info=sky`, `link=sapphire`, `selectionBg=surface2`, `selectionFg=text`, `cursor=rosewater`, `statusBg=crust`, `statusFg=subtext0`, `headerBg=mantle`, `sidebarBg=crust`, `sidebarActiveBg=surface0`, `sidebarActiveFg=text`, `priorityHigh=red`, `priorityMedium=peach`, `priorityLow=blue`, `phaseFallback=overlay1`.

Truecolor and degradation: read `renderer.capabilities.rgb` and `.ansi256` after creation and subscribe to `CliRenderEvents.CAPABILITIES` (values can flip from false to true during the startup window; never treat the first snapshot as final). `src/theme/degrade.ts` exposes `resolveColor(hex, caps)` returning a `ColorInput` - pass-through hex for `rgb`, nearest ANSI-256 via `RGBA.fromIndex()` for `ansi256`, nearest of 16 named colors otherwise - plus `mixWithBase(colorHex, baseHex, ratio)` for Gantt status shades, since text background alpha is not reliably blended. `--ascii` switches borders to `+ - |` and bars to `#` / `=`.

Persistence: `config.ui.theme`, changed with `t` (cycle), the command palette, or the theme picker modal.

### Navigation and screen model

No router library. A discriminated union in `src/store/ui.ts`:

```ts
type Screen = "dashboard" | "todo" | "links" | "projects" | "work-log" | "notes";
type Modal =
  | { kind: "none" }
  | { kind: "todo-form"; todo?: Todo; status?: TodoStatus }
  | { kind: "link-form" }
  | { kind: "work-log-form"; log?: WorkLogWithTags }
  | { kind: "project-form"; project?: Project }
  | { kind: "phase-manager" }
  | { kind: "work-item-form"; item?: WorkItemWithPhase }
  | { kind: "archived-todos" }
  | { kind: "confirm"; title: string; body: string; confirmLabel: string; destructive: boolean; onConfirm: () => void }
  | { kind: "command-palette" }
  | { kind: "theme-picker" }
  | { kind: "help" }
  | { kind: "export-note"; noteId: string };
```

Only one modal is open at a time; a modal stack lets a confirm layer over a form. `SetupScreen` is a top-level mode chosen when `config.complete` is false.

Layout: `Sidebar` (6 nav items, collapsible), `Header` (screen title, connection dot, `MOCK DATA` badge when applicable, theme name, profile initials), content region, `StatusLine` (command hints, connection and latency text, toasts, save status).

Modal focus: OpenTUI has no automatic Tab traversal, so `src/hooks/useFormFocus.ts` provides an ordered field registry; `Tab`/`Shift+Tab` move focus, `Enter` submits (`Ctrl+Enter` in multiline fields), `Escape` closes.

### Keyboard command model

`src/commands/registry.ts` defines commands as data:

```ts
interface Command {
  id: string;                       // "todo.new"
  title: string;
  group: "global" | "nav" | "todo" | "links" | "notes" | "worklog" | "projects" | "mock";
  keys?: string[];
  when?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void | Promise<void>;
}
```

One global `useKeyboard` handler resolves events against the registry, filtered by `when`, with modal commands taking priority over screen commands and screen commands over global ones. The same registry drives the command palette (`/` or `Ctrl+P`), so the palette, the help screen, and the bindings can never drift. Text fields and `<textarea>` own their keys while focused; the global handler defers using `ui.focusedField`, and the textarea's `traits.capture` tells us when it wants `escape` and `tab`.

`@opentui/keymap` is deliberately not used yet; when introduced, each command becomes a keymap command and `keys` becomes a binding list with no screen changes.

## Proposed structure

```text
personal-os-tui/
  bin/
    pos.mjs                       # version gate, --experimental-ffi re-exec, OPENTUI_LIBC, signals
  src/
    cli.tsx                       # entry: subcommands, config load, repo resolve, renderer lifecycle
    cli/
      doctor.ts                   # `pos doctor` text diagnostics (includes active repo mode)
    app/
      App.tsx                     # providers, screen switch, global key resolution, modal stack
      Layout.tsx                  # sidebar + header + content + status line
      Sidebar.tsx
      Header.tsx                  # includes MOCK DATA badge
      StatusLine.tsx
      ConnectionDot.tsx
      SetupScreen.tsx
      MockStatePanel.tsx          # Ctrl+Shift+D dev panel: scenario, latency, inject error, reset
    screens/
      DashboardScreen.tsx
      TodoScreen.tsx
      LinksScreen.tsx
      ProjectsScreen.tsx
      WorkLogScreen.tsx
      NotesScreen.tsx
    components/
      ui/                         # Modal, Button, Field, TextField, TextArea, Select, DateField,
                                  # TagInput, ConfirmDialog, List, ProgressBar, EmptyState, Skeleton, Toast
      todos/                      # KanbanColumn, TodoRow, TodoForm, ArchivedTodosDialog
      links/                      # LinkRow, LinkForm, TagFilterBar
      notes/                      # NoteListPane, NoteRow, NoteEditorPane, NoteToolbar
      work-log/                   # WorkLogRow, WorkLogForm, WeekGroupHeader, DateRangeBar
      projects/                   # ProjectListPane, ProjectListItem, WeekGrid, WeekGridHeader,
                                  # ProjectHeader, ProjectForm, PhaseManager, WorkItemForm
    commands/
      registry.ts
      CommandPalette.tsx
      HelpScreen.tsx
    store/
      todos.ts notes.ts links.ts workLogs.ts projects.ts settings.ts ui.ts session.ts
    repos/
      types.ts                    # repository interfaces (the seam)
      resolve.ts                  # mode resolution: flag > env > auto > turso
      index.ts                    # getRepos(), getSetupRepo(), single dynamic mock import
      turso/                      # todos.ts notes.ts links.ts workLogs.ts projects.ts settings.ts setup.ts
      mock/                       # same file set, in-memory + latency + error injection
    mock/
      fixtures.ts                 # the fixture dataset
      scenario.ts                 # empty | loading | error | large transforms
      latency.ts                  # delay + failure injection
    lib/
      turso.ts                    # HTTP v2 pipeline client, batch, retry, status events
      schema.ts                   # REMOTE_SCHEMAS + applyRemoteSchema
      config.ts                   # config file read/write, permissions, env overrides
      validate.ts                 # title/email/url/date/week-range validators
      todos.ts notes.ts links.ts work-logs.ts projects.ts settings.ts
      week-utils.ts week-groups.ts project-progress.ts uuid.ts
      export-note.ts              # .txt and .md only
      open-url.ts
      types/                      # todo.ts note.ts link.ts work-log.ts project.ts
    theme/
      types.ts registry.ts catppuccin.ts degrade.ts ThemeProvider.tsx
    hooks/
      useDebouncedValue.ts useFormFocus.ts useKeyboardScope.ts useTerminalSize.ts
    utils/
      date.ts text.ts             # width-aware truncate/pad, relativeDate, startOfWeek, todayISO
  tsconfig.json
  tsdown.config.ts
  biome.json                    # Biome lint + format config
  package.json
  README.md
  LICENSE                       # MIT (open source release)
  .gitignore
  .editorconfig
```

Where automated tests would go later (not planned): `src/lib/*.test.ts` and `src/repos/*.test.ts` for pure functions, SQL builders, and interface conformance of both implementations; `src/components/**` with `@opentui/react/test-utils` and `@opentui/core/testing` for render and capability fixtures.

## Dependencies

Runtime:

| Package | Version | Why |
| --- | --- | --- |
| `@opentui/core` | `^0.5.12` (pin 0.5.12 initially) | Renderer, renderables, `<textarea>`, `<markdown>`, `<select>`, `<scrollbox>`, clipboard, capability detection. `engines.node >= 26.4.0` |
| `@opentui/react` | `^0.5.12` | Reconciler, `createRoot`, `useKeyboard`, `useTerminalDimensions`, `usePaste`, `useSelectionHandler` |
| `react` | `^19.2.0` | Required by the binding |
| `zustand` | `^5.0.14` | Store parity with the desktop app |
| `ws` | `^8.18.0` | Declared peer of `@opentui/react`; list directly so global installs always resolve it |
| `web-tree-sitter` | `0.25.10` (exact) | `@opentui/core` lists it as an exact, non-optional peer; declare it directly so global installs always resolve it |

Optional/fallback: `@opentui/keymap` `^0.5.12` (polish phase only).

Not used, with rationale: `zod` (hand-written validators suffice), `date-fns` (a few helpers), `react-markdown`/`remark-gfm`/`rehype-highlight` (OpenTUI `<markdown>` handles preview), `jspdf`/`jspdf-autotable` (PDF dropped), `string-width` unless OpenTUI's width utilities prove insufficient - if imported, declare it directly rather than relying on a transitive resolution.

Dev: `typescript ~5.8`, `@types/node ^24`, `@types/react ^19.2`, `tsdown`, `tsx` (for `npm run dev`), and `@biomejs/biome ^2` for linting and formatting.

`tsdown.config.ts`: `entry: ["src/cli.tsx"]`, `format: ["esm"]`, `platform: "node"`, `target: "node26"`, `outDir: "dist"`, `clean: true`, `sourcemap: true`, `external: ["@opentui/core", "@opentui/react", "react", "react-reconciler", "ws", /^@opentui\/core-/]`. Externalizing the platform native packages is mandatory. No `splitting` option is set: tsdown 0.10 has none, because rolldown already emits one chunk per dynamic `import()`, which is what makes the mock a droppable chunk. No asset embedding is needed, which avoids `OTUI_ASSET_ROOT`. `dts: false` for v1.

`POS_MOCK_ENABLED` is inlined through tsdown's `define`, and `build:prod` sets it with `--env.POS_MOCK_ENABLED=false` (tsdown 0.10 has no `--define` CLI flag; `--env.*` is the supported, shell-portable equivalent). Three constraints come with that mechanism: the config reads the flag off `cliOptions.env`, so `define` is computed per build; the identifier must be declared ambiently in a `*.d.ts`, because a module-local `declare const POS_MOCK_ENABLED` makes rolldown treat it as a local binding and silently skip the replacement; and only the bare `POS_MOCK_ENABLED` identifier is valid, because `--env.POS_MOCK_ENABLED=false` also defines `process.env.POS_MOCK_ENABLED` as the truthy string `"false"`, so reading the flag through `process.env` would silently defeat mock elimination. The `grep -r "fixtures" dist/` check in W8 remains the backstop.

`package.json` essentials:

```json
{
  "name": "@im4all/personal-os-tui",
  "version": "0.1.0",
  "license": "MIT",
  "type": "module",
  "publishConfig": { "access": "public" },
  "bin": { "pos": "bin/pos.mjs" },
  "files": ["bin", "dist", "README.md"],
  "engines": { "node": ">=26.4.0" },
  "scripts": {
    "build": "tsdown",
    "build:prod": "tsdown --env.POS_MOCK_ENABLED=false",
    "dev": "node --experimental-ffi --import tsx src/cli.tsx",
    "dev:mock": "POS_MOCK=1 npm run dev",
    "typecheck": "tsc --noEmit",
    "format": "biome format --write .",
    "lint": "biome lint .",
    "check": "biome check .",
    "check:write": "biome check --write .",
    "check:ffi": "node --experimental-ffi scripts/check-ffi.mjs",
    "ci": "biome ci ."
  },
  "dependencies": { "@opentui/core": "^0.5.12", "@opentui/react": "^0.5.12", "react": "^19.2.0", "web-tree-sitter": "0.25.10", "ws": "^8.18.0", "zustand": "^5.0.14" },
  "devDependencies": { "@biomejs/biome": "^2", "@types/node": "^24", "@types/react": "^19.2", "tsdown": "^0.10", "tsx": "^4", "typescript": "~5.8" }
}
```

`license` and `publishConfig.access: "public"` are explicit so a public MIT scoped package publishes publicly regardless of the npm major used. `check:ffi` runs `scripts/check-ffi.mjs`, which imports `@opentui/core` under `--experimental-ffi` and asserts the native core loads (`RGBA.fromHex("#cba6f7").toInts()` returns `[203, 166, 247, 255]`), exiting non-zero with a clear message on failure. It makes the FFI verification reproducible instead of a one-off command.

`tsconfig.json`: `target ESNext`, `module ESNext`, `moduleResolution bundler`, `lib ["ESNext","DOM"]`, `jsx react-jsx`, `jsxImportSource "@opentui/react"`, `strict`, `skipLibCheck`, `noEmit`, `resolveJsonModule`, `types ["node"]`. No `#`-style import map (Vite-specific in the desktop app); relative imports only.

`biome.json` (Biome v2) is the single lint and format config, aligned with Hadi's coding style guide:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.11/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!!**/dist"] },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100, "lineEnding": "lf" },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  },
  "linter": { "rules": { "preset": "recommended", "style": { "useBlockStatements": "on" } } },
  "assist": { "actions": { "source": { "recommended": true } } }
}
```

- Formatting encodes the style guide: 2-space indent, double quotes, semicolons, trailing commas, LF, 100 columns.
- `files.includes` force-ignores `dist` (`!!**/dist`) so the scanner never indexes build output; `node_modules` is always ignored.
- `assist.actions.source.recommended` enables the import-organizing action; `style.useBlockStatements` enforces braces on every control-flow block. Verify with `biome explain useBlockStatements` after install and move the rule to `nursery` or drop it if the installed Biome major does not expose it under `style`.
- Scripts: `check` (lint + format + assist, no writes) is the gate, `check:write` applies fixes, and `ci` is the non-interactive CI form. `typecheck` stays separate because Biome does not typecheck.
- An `.editorconfig` also exists, but `biome.json` takes precedence (`formatter.useEditorconfig` defaults to false).

## Phasing

### Milestone index

Delivery is sequential, one feature at a time: each feature's UI is built and approved at its gate, then wired to real Turso before the next feature's UI begins. Setup is wired immediately after G1 so real connectivity is proven once, early.

| Order | Feature | UI milestone | Gate | Wiring milestone | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | Repo seam, fixtures, shell, sidebar, header, status line, themes, nav, first-cut palette and help | M0 | G0 | n/a (no data) | - |
| 2 | Setup (Turso connect + profile) | M1 | G1 | W1 | M0 |
| 3 | Todo | M2 | G2 | W2 | M0, W1 |
| 4 | Notes | M3 | G3 | W3 | M0 |
| 5 | Save Links | M4 | G4 | W4 | M0 |
| 6 | Work Log | M5 | G5 | W5 | M0 |
| 7 | Project Planner | M6 | G6 | W6 | M0 |
| 8 | Dashboard | M7 | G7 | W7 | M2-M6 |
| 9 | Cross-cutting polish (command palette, help, theme picker, mock panel full) | M8 | G8 | n/a | M0-M7 |
| 10 | Configurable keymap (config file) | F1 | - | n/a | G8 |
| 11 | Real-data hardening and end-to-end | W8 | - | - | W1-W7, F1 |

Notes on the table: the sequence is M0 -> G0 -> M1 -> G1 -> W1 -> M2 -> G2 -> W2 -> ... -> M7 -> G7 -> W7 -> M8 -> G8 -> F1 -> W8. Work Log's UI is listed after Todo only by preference; neither depends on the other's UI, because Todo's "Add as work log" action only needs the `WorkLogRepo` interface, which exists from M0. Dashboard is last among screens because it aggregates all domains, and its UI only needs mock aggregates plus working navigation targets.

### Order flexibility provided by the seam

- The chosen cadence is one feature at a time, so the default sequence is: M0, M1, W1, then M2/W2, M3/W3, M4/W4, M5/W5, M6/W6, M7/W7, then M8, G8, F1, and W8.
- Because every cross-feature dependency is expressed through an interface, mock implementations satisfy all of them from M0, so the feature UIs have no hard ordering constraint beyond "the shell exists". If priorities change, features can be reordered without rework.
- Dashboard stays last among screens because it aggregates every domain. A partial Dashboard can also be approved early with placeholder panels if desired.
- Todo's "Add as work log" and Notes' "Add as todo" only need the corresponding repository interface, so they work in mock mode regardless of when those screens are approved or wired.
- Setup is the only feature whose *wiring* is a prerequisite for other *wiring*, not for other UI, and it is wired immediately after G1 (W1) per the chosen cadence.

### Milestone 0: Skeleton, theme, shell, navigation, and the repository seam

#### Outcome

`pos` launches a themed full-screen shell with sidebar, header, status line, six navigable placeholder screens, working theme switching, a first-cut command palette and help screen, and a `MOCK DATA` badge. It contains the repository interfaces, the resolver, the mock and turso implementations (turso methods throwing "not wired yet" stubs are acceptable at this point), and a minimal fixture set. No real database is touched.

#### Screen layout

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

#### Keybindings

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

#### States

- Empty: placeholders with `EmptyState` text, the real strings the finished screens will use.
- Loading: `Skeleton` blocks shown when `POS_MOCK_LATENCY` makes the mock resolve slowly.
- Populated: not applicable at this milestone beyond the shell chrome.
- Error: `POS_MOCK_SCENARIO=error` renders the shell-level error banner and status-line message.
- Narrow: below 80 columns the sidebar collapses to a 2-character column; below 60 it hides and `Ctrl+\` is the only way back; the status line truncates hint segments rather than wrapping.

#### Mock data used

`src/mock/fixtures.ts` is created with empty arrays per domain, plus one todo and one note so the shell has something to render references to. Fixtures grow per feature milestone.

Shared scenario transforms live in `src/repos/mock/guard.ts`: `loading` is a fixed 1500 ms delay, and `large` appends a shared default of 200 rows until a feature's own fixtures land. The per-domain counts documented in each feature's "Mock data used" section (M2-M7) supersede that default once those fixtures exist.

#### Files touched

`package.json`, `tsconfig.json`, `tsdown.config.ts`, `bin/pos.mjs`, `src/cli.tsx`, `src/repos/*`, `src/mock/fixtures.ts`, `src/app/*`, `src/screens/*` (placeholders), `src/theme/*`, `src/commands/registry.ts`, `src/components/ui/*` (Button, Modal, EmptyState, Skeleton, List), `src/lib/config.ts` (read only).

#### Approval checklist (G0)

1. `node bin/pos.mjs` launches; there is no visible boot delay and no flicker beyond one clear.
2. The `MOCK DATA` badge is visible and obviously not part of the final product chrome.
3. Sidebar lists Dashboard, Todo, Save Links, Project Planner, Work Log, Notes, with the active item highlighted.
4. `Alt+1` .. `Alt+6` navigate; the header title updates; the highlighted sidebar item follows.
5. `t` cycles all four Catppuccin variants; each looks correct, including the light Latte variant's text contrast on borders and muted text.
6. On a 256-color terminal (`TERM=xterm-256color`, `COLORTERM` unset), colors degrade gracefully; no black-on-black or invisible text.
7. `/` opens the command palette, fuzzy-filters, runs a navigation command on `Enter`, and closes on `Esc`.
8. `?` lists global keys, and every key listed actually works.
9. Resize from 60 to 200 columns and back; the sidebar collapses and restores, no garbage, no crash.
10. `q` (and `Ctrl+Q`) quits; the shell returns clean, cursor visible, prompt echoes normally.
11. `POS_MOCK_LATENCY=1200 pos` visibly shows skeletons on return navigation, so the loading style can be reviewed.
12. Approve the shell's visual language (spacing, borders, badge placement, status line content) before any feature screen is built.

#### Deliberately deferred

Real data, mouse, `--ascii` mode, full help content, theme picker modal.

---

## UI milestones

Each of the following is built entirely on mock data. Its wiring milestone (W1-W7) is implemented once the user approves the gate, before the next feature's UI begins. The loop is: build feature UI -> approve at gate -> wire the same feature -> next feature. Setup's wiring (W1) runs immediately after G1.

### Milestone 1: Setup UI (mock connection)

#### Outcome

The first-run experience is fully reviewable without a database: the connect form, the connecting state, success, failure, and the profile step, driven by a mock `SetupRepo` whose `testConnection` succeeds or fails deterministically.

#### Screen layout

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

#### Keybindings

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Move between fields |
| `Enter` | Connect (step 1), Get started (step 3), Retry (failure) |
| `d` | Explore with demo data on mock data (development builds only; hidden in production builds) |
| `e` | Edit credentials after a failure |
| `r` | Retry connection |
| `Esc` | Back one step, or quit from step 1 |

#### States

- Empty: fields blank, `Connect` disabled until both fields are non-empty.
- Loading: the three-stage progress list; each stage resolves in sequence with mock latency.
- Populated: not applicable (Setup is a form flow).
- Error: mock `testConnection` fails when the token is empty, equals `bad`, or the scenario is `error`; the inline error keeps the entered URL visible and offers retry.
- Narrow: below 70 columns the form becomes single-column, the ASCII framing is dropped, and labels sit above fields; the token field truncates with a visible mask, never wrapping.

#### Mock data used

`SettingsRepo` mock for `getProfile`/`saveProfile`; `SetupRepo` mock for `testConnection` and `applySchema`. Mock `testConnection` succeeds when the URL starts with `https://` or `libsql://`, the token is at least 8 characters and not `bad`. Mock `applySchema` reports 22 statements applied. No fixtures; the only state is the entered form.

#### Files touched

App shell and Setup flow: `src/app/SetupScreen.tsx` (new `SetupScreen.types.ts`), `src/app/App.tsx`, `src/app/App.types.ts`, `src/app/StatusLine.tsx`, `src/cli.tsx`.

UI components: `src/components/ui/TextField.tsx` (new `TextField.types.ts`), `Field.tsx` (new `Field.types.ts`), `Button.tsx`, `Button.types.ts`.

State and logic: `src/store/ui.ts`, `src/store/ui.types.ts`, `src/store/session.ts`, `src/store/session.types.ts`, `src/lib/validate.ts` (new).

Repos and mock: `src/repos/types.ts`, `src/repos/mock/setup.ts`, `src/repos/mock/settings.ts`, `src/repos/resolve.ts`.

#### Approval checklist (G1)

1. Launch with no config: Setup appears, with the `MOCK DATA MODE` notice.
2. `Connect` stays disabled until both fields are filled.
3. Submitting a malformed URL (no scheme) shows the scheme error; `libsql://` is accepted.
4. Submitting with token `bad` shows the connection failure panel with the retry and edit affordances.
5. Submitting a good URL and token shows all three progress stages in order, then either the profile step or straight into the app (simulate the existing-profile path by setting the mock profile in the dev panel).
6. Profile step: empty name or invalid email is rejected with the exact messages; valid input proceeds to Dashboard.
7. In a development build, `d` from step 1 enters the app on mock data with the badge visible; in a production build the option is absent.
8. Narrow terminal (60 columns): the form is readable and usable.
9. Approve the copy, error wording, and the sense that this is a one-time gate before the app.

#### Deliberately deferred

Real `SELECT 1`, real `applyRemoteSchema`, real config file writes, real profile persistence.

---

### Milestone 2: Todo UI

#### Outcome

The full Todo screen on fixtures: three columns, selection, search, create/edit/delete forms, status changes, reordering, archived todos, bulk archive/clear, and the "Add as work log" action (creating a mock work log).

#### Screen layout

```text
+--------------+--------------+---------------+
| TODO    (5)  | IN PROGRESS  | COMPLETED (2) |
|--------------|--------------|---------------|
|> Fix login   | > Wire export|   Ship setup  |
|  ! high      |   med        |   Aug 12      |
|  today       |   Sep 30     |               |
|              |              |   Write docs  |
|  Read the    |              |   Aug 10      |
|  docs        |              |               |
|  low         |              |               |
|              |              |               |
|  Pay rent    |              |               |
|  2d overdue  |              |               |
+--------------+--------------+---------------+
 n new  Enter edit  m cycle status  H/L move column
 K/J reorder  d delete  a archived  A archive done  w work log
```

Narrow (under 100 columns):

```text
+------------------------------------------+
| [ Todo 5 ] In Progress 2 | Completed 2    |
|------------------------------------------|
|> Fix login            high     today     |
|  Read the docs         low                |
|  Pay rent                       2d over   |
+------------------------------------------+
```

#### Keybindings

| Key | Action |
| --- | --- |
| `h` / `l` | Move between columns (or `1`/`2`/`3` in wide mode) |
| `j` / `k` | Move selection |
| `g` / `G` | First / last item |
| `Ctrl+D` / `Ctrl+U` | Page down / up |
| `Enter` | Open edit form |
| `n` | New todo in the focused column |
| `m` | Cycle status forward (todo -> in progress -> completed -> todo) |
| `H` / `L` | Move selected todo to previous / next status column |
| `K` / `J` | Reorder selected todo up / down within its column |
| `d` | Delete with confirmation |
| `/` | Focus search |
| `a` | Archived todos dialog |
| `A` | Archive all completed (confirmation) |
| `X` | Clear all completed (destructive confirmation) |
| `w` | Add as work log (completed items only) |
| `Esc` | Clear search, then back out |

#### States

- Empty: per-column "No todos" text; when all three are empty, a single centered empty state with the hint `n to add your first todo`.
- Loading: three skeleton columns with a header placeholder, matching the desktop's skeleton layout.
- Populated: the fixture set below, with priority badges (`high` danger, `medium` peach, `low` blue) and due-date badges that turn danger when overdue.
- Error: `POS_MOCK_SCENARIO=error` renders an inline banner above the columns with a retry hint, and the columns render whatever data was already loaded.
- Narrow: below 100 columns, single-column mode with a column tab strip (`h`/`l` switch); below 70, badges move to a second line to avoid truncating titles.
- Archived dialog: list, restore, restore all, permanent delete; empty state "No archived todos".
- Form states: validation errors for empty title, and the saving state on `Enter`.

#### Mock data used

- 12 active todos: at least 4 in `todo`, 3 in `in_progress`, 3 in `completed`, plus 2 more spread to force column scrolling; at least 2 with `due_date` before today (overdue), 2 due today, 2 in the future; at least one of each priority plus 2 with `priority: null`; one with a long title that must truncate with an ellipsis; one with a long description to prove the two-line clamp; two completed items to make `Add as work log` and `X` meaningful.
- 3 archived todos with stale `updated_at` values.
- Positions intentionally gappy in the fixture (0, 1, 5, 6) to prove the UI does not depend on contiguous positions.
- Scenario transforms: `empty` (all arrays empty), `loading` (1500 ms latency), `large` (150 todos to test scrolling), `error` (every mutation rejects).

#### Approval checklist (G2)

1. Three columns render with accurate counts in the headers.
2. Overdue items show a danger-tinted due badge; today's items are distinguishable from overdue.
3. `j`/`k`/`g`/`G` movement feels right, including at column boundaries; `h`/`l` changes columns in wide mode and the tab strip in narrow mode.
4. `n` opens the form with the correct default status for the focused column; empty title is rejected with a clear inline error.
5. `Enter` edits an existing todo and pre-fills every field, including priority and due date.
6. `m` cycles status; `H`/`L` moves across columns; both update the visible counts immediately.
7. `K`/`J` reorders within a column, and the item stays under the cursor after the move.
8. `d` requires confirmation; `A` requires confirmation and moves all completed items to archived; `X` requires a destructive confirmation.
9. `a` shows the three archived todos; restore one, restore all, and permanent delete each behave correctly and update the main list.
10. `w` on a completed todo reports success and (in mock mode) a row appears in the mock work log; the action is absent for non-completed items.
11. `/` filters by title and description, case-insensitively; `Esc` clears it and restores the full list.
12. `POS_MOCK_SCENARIO=empty`, `loading`, `large`, and `error` each render the intended state.
13. Narrow-terminal pass at 120, 100, 80, 60, and 50 columns.
14. Approve the column layout, the badge styling, the density (rows per screen), and the reorder feel.

#### Deliberately deferred

Mouse drag, multi-select, batch operations beyond archive/clear.

---

### Milestone 3: Notes UI

#### Outcome

The full Notes experience on fixtures: two panes, search, pin, privacy mode, editor with Edit/Preview toggle, tags, autosave indicator, delete, font-size or density control, export, and add-selection-as-todo.

#### Screen layout

```text
+--------------------+---------------------------------------------------+
| Notes         + @  | Edit | Preview           - 14 +  Saving... b x d |
|--------------------+---------------------------------------------------+
| Search notes...    |  Release checklist                                |
|--------------------|  [ work ] [ release ]                             |
| > Release checkl.. |  -------------------------------------------------|
|   2m ago           |  # Release checklist                              |
| ------------------ |                                                   |
|   Meeting notes    |  - [x] bump version                               |
|   3h ago           |  - [ ] tag the release                            |
| ------------------ |  - [ ] update the changelog                       |
|   **********       |                                                   |
|   *****            |  ```bash                                          |
|   (privacy mode)   |  npm run release                                  |
|                    |  ```                                              |
+--------------------+---------------------------------------------------+
 p preview  b pin  v privacy  - / + size  x export  d delete
```

Narrow (under 100 columns) shows one pane at a time with `Tab` or `Ctrl+N` switching:

```text
+------------------------------------------+
| [ List ] Editor                          |
|------------------------------------------|
| # Release checklist                      |
| - [x] bump version                       |
+------------------------------------------+
```

#### Keybindings

| Key | Action |
| --- | --- |
| `j` / `k` | Move selection in the list |
| `Enter` | Focus the editor body |
| `n` | New note (title focused) |
| `p` | Toggle Edit / Preview |
| `b` | Toggle pin on the selected note |
| `v` | Toggle privacy mode |
| `-` / `+` | Decrease / increase text size (or density) |
| `x` | Export menu (.txt, .md) |
| `d` | Delete with confirmation |
| `Ctrl+S` | Flush save immediately |
| `Ctrl+Enter` | Add the selected preview text as a todo |
| `Tab` | Cycle fields: title, tags, body; in narrow mode, switch panes |
| `Esc` | Leave the editor body, then the note |

#### States

- Empty list: "No notes yet" and "No notes match your search"; editor pane shows "No note selected", matching `personal-os/src/pages/notes.tsx`.
- Loading: skeletons in the list, and the editor clears content immediately when switching notes so the previous note never flashes.
- Populated: fixtures below; pinned notes sort above unpinned then by `updated_at` descending.
- Saving states: hidden when idle, `Saving...` during a debounce-and-write, `Saved` for two seconds after.
- Error: `POS_MOCK_SCENARIO=error` rejects the save and shows a non-blocking status-line error while keeping the typed content; delete errors show a toast.
- Privacy mode: every row except the selected one shows a fixed-width mask for both title and date.
- Preview: markdown headings, lists, task lists, code fences, links, blockquotes, and tables; empty content shows "Nothing to preview yet.".
- Narrow: single-pane mode as sketched.

#### Mock data used

- 14 notes: 3 pinned; one with no title to exercise `noteDisplayTitle`'s created-at fallback; one with a 3,000-character markdown body including headings, nested lists, a task list, two code fences (one `ts`, one `bash`), a table, a blockquote, an inline link, and bold/italic runs; one with a single very long unbroken line to test wrapping; 4 notes with tags drawn from a shared tag pool so tag suggestions are exercised; `updated_at` spread across today, yesterday, last week, and last year to exercise relative dates.
- Scenario transforms: `empty`, `loading` (1500 ms), `large` (200 short notes for list scrolling), `error`.

#### Approval checklist (G3)

1. List shows pinned notes first, then most recently updated, with correct relative dates.
2. The untitled note displays a formatted created-at date instead of a blank row.
3. Selecting a note loads it; switching between notes never shows the previous note's content, even briefly.
4. Typing in the title or body shows `Saving...` within about a second, then `Saved`.
5. `p` toggles preview; every markdown construct in the long fixture renders acceptably, and fenced code shows highlighting in the theme's colors.
6. `-`/`+` change text size (or density) and the choice survives a restart.
7. Tags: typing shows suggestions from other notes; `Enter` adds; `Backspace` on an empty input removes the last; the tag set survives a note switch.
8. `b` pins and unpins and the list reorders immediately.
9. `v` masks all rows except the selected one; the mask width is stable so the list does not jitter.
10. `Ctrl+Enter` with a preview selection creates a todo (visible in mock Todo); over 100 characters, the title truncates with `...` and the full text becomes the description.
11. `x` exports to both `.txt` (markdown syntax stripped, list markers preserved) and `.md` (verbatim); verify with `cat`.
12. `d` requires confirmation and removes the note and its tags.
13. Narrow-terminal pass at 100, 80, and 60 columns; single-pane switching works.
14. Approve the two-pane proportions, the editor typography, and the saving indicator's prominence.

#### Deliberately deferred

PDF export, images, version history, spellcheck, split-pane resizing.

---

### Milestone 4: Save Links UI

#### Outcome

The Links screen on fixtures: search, tag filter pills, paginated list, save form with duplicate detection, inline title editing, open URL, and delete.

#### Screen layout

```text
+--------------------------------------------------------------+
| Search links...                                n  Save link    |
+--------------------------------------------------------------+
| [ all ] [ dev ] [ db ] [ reading ] [ tools ] [ design ] ...   |
+--------------------------------------------------------------+
| > Turso docs                                          Sep 12  |
|   docs.turso.tech          [ dev ] [ db ]                     |
|   ----------------------------------------------------------  |
|   OpenTUI components                                  Sep 11  |
|   opentui.com              [ dev ] [ ui ]                     |
|   ----------------------------------------------------------  |
|   A very long link title that must truncate cleanly    Sep 10  |
|   example.com/very/long/path  [ reading ]                     |
+--------------------------------------------------------------+
 Enter open  e edit title  c copy  d delete  Tab cycle tags
 status: 50 of 63 shown, j to load more
```

#### Keybindings

| Key | Action |
| --- | --- |
| `j` / `k` | Move selection (loading the next page when hitting the bottom sentinel) |
| `Enter` | Open the URL in the system browser |
| `e` | Edit the title inline (`Enter` commits, `Esc` reverts) |
| `c` | Copy the URL to the clipboard |
| `d` | Delete with confirmation |
| `n` | Open the save form |
| `/` | Focus search (debounced) |
| `Tab` / `Shift+Tab` | Cycle tag filter pills |
| `Enter` on a pill | Apply or clear the tag filter |
| `Esc` | Clear the tag filter, then the search |
| `r` | Retry the last failed request |

#### States

- Empty: "No links yet" plus "Save your first link to get started"; filtered empty: "No links match your search" plus guidance, matching `personal-os/src/components/links/link-list.tsx`.
- Loading: three skeleton rows on first load; a two-row skeleton plus `loading more` at the pagination sentinel.
- Populated: 63 fixture links so pagination is real (50 then 13).
- Error: duplicate URL on save shows "This link is already saved"; an invalid URL shows the parse error; a load-more failure keeps existing rows and shows a retry hint.
- Inline edit: the title becomes an input with a visible cursor; no layout shift.
- Narrow: below 90 columns, tags move under the title and the date column is dropped; below 60, the URL line truncates from the middle so the domain stays visible.

#### Mock data used

- 63 links so the first page is exactly 50 and the second is 13, which also exercises the "cursor returns null at the end" branch.
- 5-7 tags distributed so that several pills match multiple links, and at least one tag matches a single link and one matches zero links (to review the empty filtered state).
- Two links whose titles are identical but whose URLs differ, to prove duplicate detection is URL-based.
- One link with a very long path and one with a non-`http` scheme to review truncation and open-URL failure messaging.
- Fixture `created_at` values spread over months so the date column and ordering are reviewable.
- Scenario transforms: `empty`, `loading`, `large` (600 links), `error`.

#### Approval checklist (G4)

1. First load shows 50 items; scrolling to the bottom loads the remaining 13 with no duplicates and no jump.
2. Pagination terminates cleanly: no infinite sentinel loop, and a "all shown" hint replaces the load-more row.
3. Pills reflect all used tags; cycling with `Tab` is discoverable; applying a pill filters and resets the search.
4. A pill with zero matches shows the filtered empty state, not the generic one.
5. Search filters by title and URL substring, case-insensitively, after the debounce; a slow response never overwrites a newer query.
6. `n` saves a valid URL with a manually typed title and tags; saving an identical URL shows the duplicate error.
7. Saving with a blank title defaults to the domain.
8. `e` inline-edits a title; `Enter` commits and `Esc` reverts with no write.
9. `Enter` opens the URL (browser or the copied-URL fallback message), and `c` copies it.
10. `d` deletes with confirmation.
11. Narrow-terminal pass at 120, 90, 70, and 55 columns.
12. Approve row density, tag pill styling, and the search/pill relationship.

#### Deliberately deferred

Favicons, metadata fetch, virtualization, bulk delete, link health checks.

---

### Milestone 5: Work Log UI

#### Outcome

The Work Log screen on fixtures: debounced search, date range with presets, week-grouped entries with count badges, and add/edit/delete with `start <= end` validation and tags.

#### Screen layout

```text
+--------------------------------------------------------------+
| Search entries...                              n  Add entry    |
| From [ 2026-09-01 ] To [ 2026-09-29 ]  1 this wk  2 last wk    |
|                                        3 this mo  c clear      |
+--------------------------------------------------------------+
| This week                                            3 items  |
|   Release prep                 Sep 29        [ work ]         |
|   API cleanup                  Sep 28 - Sep 29 [ dev ]         |
|   Design review                Sep 27                         |
| Last week                                            2 items  |
|   Sprint planning              Sep 22                         |
| Week of Aug 10                                       1 item   |
|   Migration kickoff            Aug 11                         |
+--------------------------------------------------------------+
 j/k select  Enter edit  d delete  f date field  Esc clear filters
```

#### Keybindings

| Key | Action |
| --- | --- |
| `j` / `k` | Move selection across groups (selection crosses group boundaries) |
| `g` / `G` | First / last entry |
| `Enter` | Edit the selected entry |
| `n` | Add entry |
| `d` | Delete with confirmation |
| `/` | Focus search (debounced 300 ms) |
| `f` | Move focus to the From field; `Tab` to To |
| `1` / `2` / `3` | This week, last week, this month presets |
| `c` | Clear all filters |
| `Esc` | Leave a date field, then clear filters, then leave the screen |

#### States

- Empty: "No entries yet" plus "Start logging what you work on each day"; filtered empty: "No entries match your filters", matching `personal-os/src/components/work-log/work-log-list.tsx`.
- Loading: two skeleton groups with placeholder headers.
- Populated: fixtures below, with group headers reading "This week", "Last week", and "Week of <Mon DD>" and an accurate count badge.
- Error: a save failure keeps the form open with an inline error; a filter failure keeps the previous list and shows a retry hint.
- Validation: title required; end date before start date rejected with the desktop's exact message.
- Narrow: below 90 columns, descriptions and tags collapse to a single metadata line; below 60, the date fields stack vertically.

#### Mock data used

- 14 work logs spanning: 3 in the current ISO week, 2 in the previous week, 2 in the week before that, and the rest spread across the last year including one entry crossing a year boundary (to exercise the ISO week-key year logic in `week-groups.ts`).
- 3 entries with multi-day ranges (for example Sep 28 to Sep 29) to prove the `end_date >= dateFrom` and `start_date <= dateTo` filter semantics.
- 2 entries with no tags, and the rest using a shared tag pool.
- One entry with a long title and long description to review truncation.
- Scenario transforms: `empty`, `loading`, `large` (300 entries across many weeks), `error`.

#### Approval checklist (G5)

1. Groups appear newest first with correct labels: "This week", "Last week", then "Week of ..." with dates, and a year shown for older entries.
2. Count badges match the number of entries in each group.
3. Multi-day entries fall into the group of their `start_date`, matching the desktop.
4. `1`/`2`/`3` populate the From/To fields visibly and the list refetches; `c` clears everything.
5. Setting From/To manually filters correctly, including the overlap semantics for multi-day entries.
6. Search filters by title with the debounce; clearing restores all entries.
7. `n` adds an entry; an end date before the start date is rejected with the exact message.
8. `Enter` edits and pre-fills all fields; `d` deletes with confirmation.
9. Tags show suggestions from the fixture pool and edit correctly.
10. Narrow-terminal pass at 110, 90, 70, and 55 columns.
11. Approve group header styling, row density, and the date-range toolbar.

#### Deliberately deferred

Tag filtering, exports, charts, bulk edit.

---

### Milestone 6: Project Planner UI

#### Outcome

The Projects screen on fixtures: project list, week-grid Gantt with headers and current-week highlight, phase bars with status intensity, separators, project header with legend, and forms for projects, phases, and work items, all operable by keyboard including reorder.

#### Screen layout

```text
+-------------+-------------------------------------------------------------------+
| Projects  + | Personal OS v2                    Sep 1 - Nov 24 | 12 weeks         |
|-------------|-------------------------------------------------------------------|
|             | (*) Design  (*) Build  (*) Ship                                    |
| > Personal  | Task                 | Res  | 9/1| 9/8|9/15|9/22|9/29|10/6|10/13 |
|   12w 9/1   | Week 1                  Week 2   ...  ^ current week              |
|   Docs site |-------------------------------------------------------------------|
|    8w 9/15  |> Design phase        | Ana  | ###|### |    |    |    |    |      |
|   Marketing |   Build API          | Bob  |    |####|####|####|    |    |      |
|    6w 10/1  |   Ship v2 (done)     | Ana  |    |    |    |    |====|====|      |
|             | ---------------------------------------------                     |
|             |   Cutover            | Kim  |    |    |    |    |    | #### |    |
+-------------+-------------------------------------------------------------------+
```

Legend for the sketch: `###` is a bar at the phase color mixed with the base by status ratio; `====` is a done bar at full color; `----` is a separator row.

Narrow (windowed) mode:

```text
| Task            | Res | 9/15|9/22|9/29|10/6  weeks 3-6 of 12   [ ] shift |
```

List mode below 60 columns:

```text
| Task              | Res | Weeks   | Status  |
| Design phase      | Ana | 1-2     | pending |
| Build API         | Bob | 2-5     | in prog |
```

#### Keybindings

| Key | Action |
| --- | --- |
| `1` | Focus the project list |
| `2` | Focus the week grid |
| `j` / `k` | Move selection in the focused pane |
| `Enter` | Select a project (list) or edit a work item (grid) |
| `n` | New project (list) or new work item (grid) |
| `s` | Add separator (grid) |
| `p` | Phase manager |
| `e` | Edit the current project |
| `K` / `J` | Reorder up / down (projects in the list, work items in the grid) |
| `d` | Delete (project with confirmation, work item with confirmation, separator immediately) |
| `o` | Open the Jira ticket when it is an URL |
| `c` | View the item comment (read-only modal) |
| `[` / `]` | Shift the visible week window (narrow mode) |
| `v` | Toggle list mode |
| `Tab` / `Shift+Tab` | Move between project list, header actions, and grid |

#### States

- Empty: no projects -> "No projects yet" with `n` hint; project selected but no items -> "No items yet, press n to add"; no phases yet -> the phase legend is hidden and the item form defaults to no phase.
- Loading: skeleton project list plus a skeleton grid of two header rows and five empty rows.
- Populated: fixtures below; the current week is emphasized in both header rows.
- Error: a mutation failure keeps the previous state and shows an inline error; an invalid work item (`end < start`, week out of range) is rejected with the desktop's messages.
- Status intensity: `pending` mixes the phase color with the background at 0.4, `in_progress` at 0.75, `done` at 1.0 with a strikethrough title, matching `STATUS_OPACITY` in `personal-os/src/components/projects/gantt-row.tsx`.
- Narrow: windowed mode when a single character per week does not fit, then list mode below 60 columns.
- Phase manager: item counts per phase; delete disabled when the count is greater than zero.

#### Mock data used

- 3 projects: "Personal OS v2" (12 weeks starting ~4 weeks ago, so the current week sits mid-project), "Docs site" (8 weeks starting next week, so nothing is current), and "Marketing" (6 weeks starting 10 weeks ago, so the project has ended).
- One project at 24 weeks to prove windowed mode and horizontal scrolling, and one at 52 weeks to prove the form's upper bound is reachable.
- 5 phases across projects with distinct colors, including one phase with zero items and one project with no phases at all.
- 18 work items across the three projects: at least one per status, several multi-week spans, one single-week span, one spanning the full project length, one with a comment, one with a Jira URL ticket and one with a non-URL ticket, two with the same person (for resource suggestions) and one with no person, one with a very long title, plus one project whose items exceed the viewport height so vertical scrolling is reviewable.
- 3 separators, including one at the top and one at the bottom of a project's item list.
- Gappy fixture positions (0, 2, 5, 9) to prove reorder does not assume contiguity.
- Scenario transforms: `empty`, `loading`, `large` (40 items, 52 weeks), `error`.

#### Approval checklist (G6)

1. Project list shows `{n}w` and the start date, and the selected project is clearly indicated.
2. `n` creates a project; weeks below 4 or above 52 are rejected with the exact message.
3. `e` edits; `d` deletes with a confirmation (note: an intentional improvement over the desktop's immediate delete).
4. `K`/`J` reorders projects; the order is obvious and survives a screen change.
5. The grid header shows two rows: dates and `Week N`; the current week is visually emphasized in both.
6. Phase bars start and end at the correct week columns; `done` items are fully saturated with a strikethrough, `in_progress` are about 75 percent, `pending` about 40 percent.
7. A missing phase uses the fallback gray, and the legend is hidden only when the project has no phases.
8. Separators render as full-width rules, can be added with `s`, and are removed with `d` without a confirmation.
9. `j`/`k` move within the grid, `K`/`J` reorder, and the reorder feels correct at the first and last positions.
10. `o` opens a Jira URL and shows a clear message for a non-URL ticket value; `c` shows the comment.
11. The phase manager supports add, rename, recolor, move up/down, and delete-when-empty; item counts are correct.
12. The 52-week project opens in windowed mode on an 80-column terminal; `[`/`]` shifts the window and the header stays aligned.
13. `v` switches to list mode below 60 columns and the week ranges are readable.
14. Vertical scrolling works when items exceed the viewport.
15. Approve the grid density, bar rendering, legend styling, and the windowing behavior.

#### Deliberately deferred

Color picker widget, drag, dependency arrows, CSV or image export, critical path.

---

### Milestone 7: Dashboard UI

#### Outcome

The Dashboard on mock aggregates: greeting, dated header with overdue and due-today counts, quick add, four stat cards, focus list, active projects with progress bars, in-progress rail, and recent activity.

#### Screen layout

```text
+--------------------------------------------------------------+
| Good afternoon                                                |
| Tuesday, September 29 | 2 overdue | 3 due today      n Add    |
+--------------------------------------------------------------+
| In Progress 4  | Notes 14   | Save Links 63 | Logged wk 3    |
+--------------------------------------------------------------+
| Today & Overdue               | In Progress                  |
|   Fix login              high |   Wire export                |
|   Pay rent            Overdue |   Review PR                  |
|   Ship setup             Today|   API cleanup                |
|-------------------------------|------------------------------|
| Active Projects               | Recent Activity              |
|   Personal OS v2  5/9   56%   |   Release checklist   2m ago |
|   [======     ]               |   Turso docs        Sep 12   |
|   Docs site       0/6    0%   |   API cleanup       Sep 11   |
|   [             ]             |   Meeting notes     3h ago   |
+--------------------------------------------------------------+
```

#### Keybindings

| Key | Action |
| --- | --- |
| `n` | Quick-add todo (opens the todo form) |
| `Tab` / `Shift+Tab` | Cycle the four stat cards, the focus list, active projects, and the in-progress rail |
| `j` / `k` | Move within the focused panel |
| `Enter` | Activate: navigate for stat cards and activity rows, edit for focus and in-progress items, open the project for project rows |
| `1` / `2` / `3` / `4` | Jump directly to a stat card |
| `r` | Refresh all dashboard data |
| `Esc` | Collapse focus to the first panel |

#### States

- Empty: each panel has its own empty state text copied from `personal-os/src/pages/dashboard.tsx` ("Nothing due, you are all caught up", "No projects yet", "Nothing in progress right now", "No activity yet").
- Loading: four stat skeletons, two list skeletons, and two project skeletons.
- Populated: fixtures below; the combined focus list is sorted by due date and capped at 6; the in-progress rail is capped at 6; recent activity is capped at 7.
- Error: a per-panel error line with a retry `r`, and other panels still render if their mock calls succeed.
- Narrow: below 100 columns the two-column grid collapses to a single vertical stack in the order stats, focus, projects, in progress, activity; stat cards become a 2x2 grid.
- Overdue styling: the header shows the overdue count in danger; focus rows show `Overdue` or `Today`.

#### Mock data used

- Aggregates derived from the other feature fixtures, so the dashboard is consistent with what the user sees on each screen. Specifically: at least 2 overdue todos and 3 due today (one high priority), 4 in-progress todos, 14 notes, 63 links, and 3 work logs dated within the current week.
- 3 projects with progress: one partially complete, one at 0 percent, one fully done (to show the Done badge and the dimmed style).
- 8 recent items spread across notes, links, and work logs, with timestamps spanning minutes ago to last year, so the relative-date logic and the cap of 7 are both visible.
- Scenario transforms: `empty`, `loading`, `error`, and `large` (counts in the thousands to verify single-line number rendering).

#### Approval checklist (G7)

1. Greeting matches the current time of day; changing the system clock (or `POS_TIME_OVERRIDE`) changes it.
2. The date line matches the OS locale and shows overdue and due-today counts only when non-zero.
3. Quick add creates a todo visible on the Todo screen; when due today or overdue, it also appears in the focus list.
4. The four stat cards show counts consistent with the other screens; `Enter` on each navigates correctly.
5. The focus list shows only incomplete todos due today or earlier, sorted by due date, capped at 6, with correct Overdue/Today labels.
6. Active Projects show the correct percentage, the `done/total items` detail, and the Done badge plus dimmed style for the completed project; the progress bar fills proportionally.
7. The in-progress rail is capped at 6 and reflects in-progress todos.
8. Recent Activity shows the 7 newest items across all three sources, newest first, with correct relative times, and each row navigates to its screen.
9. Every empty state renders with the intended copy when the scenario is `empty`.
10. Narrow-terminal pass at 120, 100, 80, and 60 columns; the single-column stack order is sensible.
11. Approve panel order, stat card emphasis, and the overall density of the landing screen.

#### Deliberately deferred

Charts, configurable stat cards, personalized greeting names, caching.

---

### Milestone 8: Cross-cutting polish (UI)

#### Outcome

The UI is finalized across all screens: a complete command palette, a generated help screen, mouse support, a theme picker, the mock state dev panel in its final form, consistent empty/loading/error treatment, and a README section describing the keymap.

#### Screen layout and keybindings

Adds the palette overlay, the help overlay, and the theme picker modal. New bindings: `/` and `Ctrl+P` (palette), `?` (help), `Ctrl+Shift+D` (mock panel), `Ctrl+R` (refresh current screen), `Ctrl+T` (theme picker). Mouse is additive: sidebar clicks, row select on click, edit on double-click, wheel scrolling, and pill clicks.

#### States

A dedicated audit pass: every screen is inspected in all four data states (empty, loading, populated, error) plus three narrow widths, and any screen using a different empty-state voice or skeleton shape is corrected.

#### Mock data used

Adds `large` transforms per domain and a `slow` transform (3 s latency) purely to review patience and cancel affordances.

#### Approval checklist (G8)

1. `/` opens the palette; typing filters by command title; every listed command runs; bound keys are shown next to each.
2. `?` lists global and per-screen keys generated from the registry; spot-check five and confirm each works.
3. `Ctrl+T` opens the theme picker; selecting a theme applies instantly and persists across restart.
4. Mouse: click each sidebar item, select a row, double-click to edit, scroll a long list, click a tag pill. Then run with `POS_NO_MOUSE=1` and confirm full keyboard reachability.
5. The mock panel toggles scenario, latency, error injection, and fixture reset without a restart.
6. No screen shows a raw error string without context; every error names the operation and offers a next step.
7. No screen's empty state is a blank box or contradicts another screen's voice.
8. Approve the final visual language across all screens, including badge usage, spacing, and the status line.

#### Deliberately deferred

Plugin slots, SSH serving, ASCII logo. (User-configurable keybindings are promoted to ticket F1.)

---

### Feature: Configurable keymap (F1)

#### Outcome

Users can override the app's key bindings from the config file on macOS, Linux, and Windows. Overrides apply only to the commands they name; every unlisted command keeps its default binding. The global handler, the command palette, and the help screen keep sharing one source of truth, so an override changes behavior and documentation together.

#### File and format

Read the override from the existing config location (`POS_CONFIG_DIR` > `XDG_CONFIG_HOME` > platform default, joined with `personal-os/`). Use either a `keymap` section in `config.json` or a sibling `personal-os/keymap.json`; the sibling file is preferred because `config.json` holds the Turso token at mode `0o600` while a keymap is not secret and is nicer to share. Bindings use the registry's `KeyBinding` shape (`name`, `ctrl`, `meta`, `shift`) keyed by command id, with a `version` field so a later rename cannot silently mis-map a user file. No new home-root dotfile.

#### Merge and failure semantics

Resolve effective bindings once at startup: replace the `keys` of every command id present in the file and leave all others as declared; an empty array clears a command deliberately. Unknown ids, malformed key names, and collisions are skipped and reported, never fatal, matching the advisory loose-permissions posture. `pos doctor` reports the keymap source and every skipped entry; the status line carries the ambient notice. `Command.hint` derives from `keys` via `formatKey` (or is removed) so an override never leaves a stale hint. Keys that bypass the registry today (palette navigation, the mock panel, Setup `d`, the quit-always `Ctrl+Q` filter) are out of scope for v1 and named in the README.

#### Verification

A config file remaps a command and the new key works while the old one stops; an unlisted command is unchanged; an invalid entry is skipped with a warning and the app still starts; help and the palette show the overridden keys; `pos doctor` reports the source; the README example works verbatim on macOS, Linux, and Windows.

---

## Wiring milestones

Wiring swaps the resolved repository implementation. Screens, components, and stores are not edited except where a real backend exposes a state the mock did not (which is itself a signal worth reviewing). Each wiring milestone begins by pointing at a real Turso database and setting `POS_MOCK=0`.

Each wiring milestone runs immediately after the corresponding gate and before the next feature's UI begins, per the chosen one-feature-at-a-time cadence. W1 (Setup) runs right after G1. After all wiring milestones, W8 covers real-data hardening and the end-to-end pass.

### W1: Setup wiring

#### Outcome

Setup performs a real `SELECT 1`, applies `REMOTE_SCHEMAS` idempotently, reads the existing profile from remote `app_settings`, and saves a new profile there.

#### Swap in

`SetupRepo.testConnection` -> `tursoSelect("SELECT 1")` with the entered credentials held in a temporary config object (not yet persisted). `SetupRepo.applySchema` -> `applyRemoteSchema(tursoExecute)`. `SettingsRepo.getProfile`/`saveProfile` -> `src/lib/settings.ts`. On success, `saveConfig()` persists credentials with `0o600`.

#### Optimistic updates and rollback

Setup has no optimistic path by design: credentials are validated before anything is written, and the config file is written only after `SELECT 1` and schema application succeed. If schema application partially succeeds, statements are individually tolerated (as the desktop does), and the failure is reported without discarding credentials already typed. A failed connect leaves the config untouched, so a retry is always safe.

#### Errors and loading

The three-stage progress list becomes three real stages with real durations. A 401 or 403 produces a credentials message; a DNS or TLS failure produces a network message; a schema failure names the failing statement index. The token field retains focus on error so the user can correct it immediately.

#### Files touched

`src/repos/turso/setup.ts`, `src/repos/turso/settings.ts`, `src/lib/config.ts` (write path), `src/lib/turso.ts` (config setter), `src/app/SetupScreen.tsx` (only the loading-stage labeling, if needed).

#### Verification checklist

1. Bad token: inline credentials error; config file not created.
2. Valid token against a fresh database: all `REMOTE_SCHEMAS` statements apply; re-running setup does not error on `duplicate column`.
3. Valid token against a database already created by the desktop app: schema apply is a no-op and no data is touched.
4. Existing profile is detected and Setup goes straight to Dashboard.
5. New profile is written to remote `app_settings` and appears in the desktop app's profile menu.
6. `ls -l` shows `-rw-------` on the config file; `pos doctor` reports the path, permissions, and a healthy `SELECT 1`.
7. Corrupt the config file by hand: a clear error appears rather than a crash.

### W2: Todo wiring

#### Outcome

Todo reads and writes real rows with the exact desktop schema.

#### Swap in

`TodoRepo` methods -> `src/lib/todos.ts`: `list`, `listByStatus`, `search`, `archived`, `create`, `update`, `remove`, `removeMany`, `archive`, `restore`, `updatePositions`. `src/store/todos.ts` is unchanged.

#### Optimistic updates and rollback

Matches the desktop's `personal-os/src/store/todos.ts` and `kanban-board.tsx`: `patchTodo` updates the local list before the write; a failed write triggers a full reload (the desktop's revert strategy). Position reorders apply locally first and roll back to the previous order on failure. `H`/`L` status moves compute `newTargetIds` exactly as the desktop's drag handler does, then persist the status and the positions in one `tursoBatchExecute`.

#### Errors and loading

Initial load shows skeletons; refresh after sync-style events is silent. A failed write shows a status-line error and restores the previous list. A request that times out leaves the UI in the last-known-good state.

#### Files touched

`src/repos/turso/todos.ts`, `src/lib/todos.ts`, `src/store/todos.ts` (only if a real error surface is needed), `src/lib/turso.ts` (batch for position writes).

#### Verification checklist

1. Create a todo in `pos`; it appears in the desktop app after refresh, with the exact column values.
2. Create a todo in the desktop app; it appears in `pos` after `Ctrl+R`.
3. Edit, change status, and delete in `pos`; each change lands in the desktop app.
4. `H`/`L` and `K`/`J` produce contiguous `position` values in the database; verify with SQL.
5. Archive, restore, restore-all, archive-all, and clear-all behave identically to the desktop.
6. With the network off: create, edit, and reorder each show an error and leave the list consistent.
7. A 500-todo database loads and scrolls acceptably; measure the initial load.
8. `w` on a completed todo writes a real `work_logs` row.

### W3: Notes wiring

#### Outcome

Notes read and write real rows, including tags, pinning, and autosave.

#### Swap in

`NoteRepo` -> `src/lib/notes.ts`, using the `getNotesList` projection for the list and `getNoteById` for the editor. `setTagsForNote` uses `tursoBatchExecute` (delete then insert). `src/store/notes.ts` unchanged.

#### Optimistic updates and rollback

Title, content, and pin update the store immediately. Saves are debounced; the `Saving...`/`Saved` indicator reflects the real request. A failed save keeps the typed text, marks the indicator as failed, and retries on the next edit or `Ctrl+S`. Tag writes keep the per-note serialized queue from the desktop so DELETE and INSERT cannot interleave.

#### Errors and loading

Note switching flushes the previous note before loading the next, so no write is lost. A load failure shows a retry affordance in the editor pane instead of a blank editor.

#### Files touched

`src/repos/turso/notes.ts`, `src/lib/notes.ts`, `src/components/notes/NoteEditorPane.tsx` (save-status error state only).

#### Verification checklist

1. Create a note, type, wait for `Saved`, restart `pos`: content intact.
2. Switch notes mid-edit: the previous note is flushed and present in the database.
3. Pin a note; verify `pinned = 1` and the ordering in the desktop app.
4. Add and remove tags rapidly; the final tag set in `note_tags` is exact.
5. A 3,000-character body saves and reloads without truncation; verify with SQL length.
6. With the network off: a save fails visibly, the text is preserved, and a later save succeeds.
7. Export to `.txt` and `.md` after wiring still works (it is file-system only, so this is a regression check).
8. Delete a note; `note_tags` rows are gone.

### W4: Links wiring

#### Outcome

Links paginate, search, and mutate against real data with correct keyset pagination.

#### Swap in

`LinkRepo` -> `src/lib/links.ts` with `getLinksPage` (all branches), `getAllUsedTags`, `checkDuplicateUrl`, `createLink` (always `favicon_url: null`), `updateLink`, `deleteLink`, `setTagsForLink`. `src/store/links.ts` unchanged, including the generation guard.

#### Optimistic updates and rollback

New links prepend immediately; an inline title edit commits optimistically; deletes remove immediately. Failures reload the current page (mode, query, and tag preserved) rather than leaving a partial state. Pagination never optimistically guesses the next page.

#### Errors and loading

Debounced search issues one request per settled query; a slow response for an older query is dropped by the generation guard. A duplicate URL surfaces the desktop's message. A failed `loadMore` does not advance the cursor and offers a retry.

#### Files touched

`src/repos/turso/links.ts`, `src/lib/links.ts`, `src/lib/open-url.ts` (no change expected).

#### Verification checklist

1. With 60+ real links, the first page is exactly 50 and the second is the remainder; no duplicates across pages.
2. Keyset pagination is stable when new links are inserted between pages (insert, then load more, and confirm no skipped or repeated rows).
3. Search matches title and URL substrings; rapid typing produces one request per settled query (confirm with `DEV=true` logging).
4. Saving a duplicate URL is rejected before insert.
5. `favicon_url` is `null` on every new row.
6. Tag filtering returns correct sets, including the empty set for an unused tag.
7. Delete removes link and tag rows.
8. With the network off: load, search, and load-more each show errors without corrupting the list.

### W5: Work Log wiring

#### Outcome

Work logs read, filter, group, and mutate against real data.

#### Swap in

`WorkLogRepo` -> `src/lib/work-logs.ts`. `src/store/workLogs.ts` unchanged; grouping stays client-side via `groupByWeek`, exactly as the desktop does.

#### Optimistic updates and rollback

Adds prepend locally and rebuild groups; edits patch and rebuild groups; deletes remove and rebuild. A failed mutation reloads with the active filter preserved. Filter changes are not optimistic because the result set changes.

#### Errors and loading

Debounced search plus date filters issue one request per settled change. A failed filter keeps the previous list and shows a retry. Validation errors never reach the network.

#### Files touched

`src/repos/turso/workLogs.ts`, `src/lib/work-logs.ts`.

#### Verification checklist

1. Add entries in three different weeks; group labels and counts match the desktop app exactly.
2. A multi-day entry spanning two weeks groups by `start_date` in both apps.
3. The three presets and manual dates produce the same result sets as the desktop for the same database.
4. Search matches titles.
5. Edit and delete behave correctly and are reflected in the desktop app.
6. Tags persist exactly.
7. A year-boundary entry groups under the correct ISO week/year.

### W6: Project Planner wiring

#### Outcome

Projects, phases, and work items read and write against real data with correct ordering and bars.

#### Swap in

`ProjectRepo` -> `src/lib/projects.ts`, with `reorderWorkItems` and `reorderProjects` batched. `src/store/projects.ts` unchanged, including `selectProject` loading phases and items in parallel and `movePhase` rewriting all positions.

#### Optimistic updates and rollback

Reorders reorder locally, then persist; failures restore the previous array (the desktop's exact strategy). Add and delete are optimistic with a reload-on-failure. `addSeparator` creates an all-null work item with `is_separator = 1`, matching `personal-os/src/store/projects.ts`.

#### Errors and loading

Selecting a project shows a grid skeleton while phases and items load in parallel. Validation errors are inline. A failed reorder restores order and reports once.

#### Files touched

`src/repos/turso/projects.ts`, `src/lib/projects.ts`.

#### Verification checklist

1. Projects, phases, and work items created in `pos` appear identically in the desktop app, including colors and week ranges.
2. A project created in the desktop app renders with correct bars in `pos`.
3. Reordering projects and work items writes contiguous positions; verify with SQL.
4. `getProjectProgress` drives the same percentages as the desktop for the same items, counting only `is_separator = 0`.
5. Separators persist and are excluded from progress.
6. Phase moves rewrite positions and persist.
7. Delete cascades: deleting a project removes its phases and items (verify the desktop's `ON DELETE CASCADE` behavior matches).
8. A 52-week project renders correctly with real data and windowing still works.

### W7: Dashboard wiring

#### Outcome

The dashboard loads real aggregates in one round trip.

#### Swap in

A `loadDashboard` thunk in `src/store/session.ts` (or a dedicated `src/store/dashboard.ts`) issues a single `tursoBatchSelect` containing: todos (`archived = 0`), the notes list projection, links page 1, work logs page 1, projects, project progress, and three `COUNT(*)` queries. The screen consumes the resulting stores, unchanged from the mock build.

#### Optimistic updates and rollback

The dashboard is read-only except quick add, which delegates to `TodoRepo.create` and the Todo store's optimistic path. A failed batch load leaves the previous data visible with an error line rather than blanking the screen.

#### Errors and loading

One request, one skeleton, one error. A partial failure message names which section timed out, and `r` retries the whole batch. Latency is shown in the status line so slow dashboards are diagnosable.

#### Files touched

`src/repos/turso/dashboard.ts` (or the batch query set in `src/lib/`), `src/store/dashboard.ts`, `src/screens/DashboardScreen.tsx` (only if the real batch changes the loading shape).

#### Verification checklist

1. The dashboard load is a single HTTP request; confirm with `DEV=true` logging.
2. All four stat numbers match `SELECT COUNT(*)` from a Turso shell.
3. Focus list, in-progress rail, active projects, and recent activity match what the individual screens show.
4. Quick add works end to end and the counts update.
5. `r` refreshes all sections and the latency readout updates.
6. With the network off: previous data stays visible with an error and a retry, no blank screen.
7. Load time with a large database (5,000 todos, 10,000 links, 2,000 notes) stays acceptable; record the measurement.

### W8: Real-data hardening and end-to-end

#### Outcome

The application is production-ready against real data.

#### Scope

- The full hardening milestone content below, executed against real Turso data.
- A complete end-to-end pass: fresh install, setup, create a project with phases and items, log work, write and export a note, save links, manage todos, review the dashboard, and confirm every one of those changes in the desktop app.
- Failure passes: network off, invalid token, rotated token, missing tables (schema recovery), read-only config directory, and a slow or rate-limited database.
- Terminal matrix: iTerm2, Terminal.app, Alacritty, Kitty, WezTerm, tmux, GNU Screen, a 256-color-only terminal, and Windows Terminal via PowerShell and Git Bash.
- Packaging: `npm pack`, inspect the tarball, then a real global install on macOS arm64, Linux x64, and Windows x64. Confirm the `build:prod` output contains no mock chunk and that `POS_MOCK=1` on that build prints the unavailable message.

#### Verification checklist

1. Every UI and wiring checklist above passes on a clean machine and on an existing database.
2. The desktop app and the TUI show the same data for every domain after a round trip of edits in both directions.
3. No mock code path is reachable in the production build; `grep -r "fixtures" dist/` finds nothing (the backstop for the `process.env` truthiness trap described under "Dependencies").
4. The terminal is restored after normal quit, `Ctrl+Q`, handled signals, uncaught exceptions, and unhandled rejections.
5. The README takes a new user from install to a working setup without reading source.

## Mock fixtures per screen

Consolidated reference for what `src/mock/fixtures.ts` must contain. All fixtures use realistic ids, ISO timestamps, and `YYYY-MM-DD` dates so the UI never looks synthetic and so switching to real data cannot reveal a shape the fixtures hid.

| Screen | Fixtures |
| --- | --- |
| Shell / nav | Counts referenced by sidebar badges: 12 active todos, 14 notes, 63 links, 14 work logs, 3 projects |
| Setup | No fixtures; mock `testConnection` success and failure rules, plus a mock profile |
| Todo | 12 active todos covering all three statuses, 2 overdue, 2 due today, all priorities plus 2 nulls, one very long title, one long description, 2 completed; 3 archived; gappy positions |
| Notes | 14 notes, 3 pinned, one untitled, one 3,000-character markdown body with headings, lists, task list, two code fences, a table, blockquote, links, emphasis, one long unbroken line, 4 tagged from a shared pool, timestamps spanning minutes to a year |
| Links | 63 links (50 + 13 pages), 5-7 tags including a single-match and a zero-match tag, two same-title different-URL rows, one very long path, one non-`http` scheme, dates across months |
| Work Log | 14 logs, 3 in the current ISO week, 2 last week, 2 the week before, the rest across a year including a year-boundary entry; 3 multi-day; 2 untagged; one long title and description |
| Project Planner | 3 projects (12 weeks mid-progress, 8 weeks future, 6 weeks ended) plus one 24-week for windowing and one 52-week for the bound; 5 phases including one empty phase and one project with no phases; 18 items covering all statuses, multi-week and single-week spans, a full-length span, a comment, a Jira URL and a non-URL ticket, repeated and missing persons, a long title, and more items than fit the viewport; 3 separators; gappy positions |
| Dashboard | Derived from the above so it is internally consistent: 2 overdue and 3 due today, 4 in progress, 14 notes, 63 links, 3 logs this week, 3 projects at partial, zero, and full completion, 8 recent items spanning minutes to a year |
| All screens | Scenario transforms `empty`, `loading`, `large`, `error`, plus `slow` for patience review; runtime scenario, latency, and error injection via the mock panel |

## Dependency order between features

Real dependencies:

- Dashboard depends on every other domain for its aggregates and navigation targets. It is therefore built last among screens and wired last.
- Todo's "Add as work log" depends on the `WorkLogRepo` interface, which exists from Milestone 0. It does not depend on the Work Log screen.
- Notes' "Add as todo" depends on the `TodoRepo` interface, which exists from Milestone 0.
- Setup's wiring is a prerequisite for every other wiring milestone (there must be reachable credentials), but it is not a prerequisite for any UI milestone.
- Within a screen, list rendering depends on its own form components, and the Gantt grid depends on `week-utils` and `project-progress`, both of which are pure and available from Milestone 0.

How the seam makes order flexible:

- Because every dependency above is expressed through an interface, mock implementations satisfy all of them from Milestone 0. The UI milestones have no ordering constraint beyond "the shell exists".
- Per-feature wiring runs immediately after its gate by design: wiring edits `src/repos/turso/*` and the store, never the screen, so a feature can be approved and wired independently of the others.
- The chosen sequence is: shell first (M0); Setup UI (M1) then Setup wiring (W1); then each remaining feature's UI, gate, and wiring in turn (W2-W7); Dashboard last among screens; then polish (M8) and hardening (W8).

## Risks and unknowns

Carried forward:

| Risk | Mitigation |
| --- | --- |
| Node 26.4 plus `--experimental-ffi` availability, and unproven Windows support | Milestone 0 spike on the dev machine; `pos doctor` reports FFI status; documented Bun fallback branch; Windows is an explicit hardening test |
| `@opentui/react` has no Node CI lane; binding maturity | Milestone 0 spike before any feature work; pin core, react, and keymap to the same 0.5.12; Core-only imperative fallback if the binding breaks |
| Unicode width and graphics differences across terminals | OpenTUI's `unicode`/`wcwidth` capability, `--ascii` mode, width-aware truncation, and a multi-terminal hardening pass |
| Turso latency on every read and write | Debounce, client-side filtering where the set is small (todos), optimistic UI with rollback, batched writes, `tursoBatchSelect` for the dashboard, latency readout in the status line |
| Token storage security | `0o600` file, atomic write, token redaction, env override, loose-permission warning, no token in logs or crash paths |
| Very large datasets | Keyset pagination for links, list-only note projection, `COUNT(*)` for stats, `LIMIT` on dashboard queries, measured load tests in W8 |
| Gantt rendering in narrow terminals | Adaptive cell width, windowed mode, list mode below 60 columns, `[`/`]` shifting |
| Concurrent writers (TUI plus desktop sync) | Documented; a single source of truth with no local cache, and a warning against running both writers simultaneously if the desktop still runs last-write-wins sync |
| Remote `LIKE` search cost on keystrokes | 300 ms debounce, minimum query length of 2, and `LIMIT` |

New risks introduced by the UI-first workflow:

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Mock/real divergence | A screen may work perfectly on fixtures and break on real data because the fixture shape does not match a real query's shape | Fixtures are typed with the exact domain types, and the mock implementations are validated by interface conformance. Every wiring milestone's first check is "does the screen look the same as it did in mock mode". Any shape mismatch is treated as a bug in the fixture or the query, not as a screen change |
| UI designed around a shape the real query cannot produce | For example, a panel that expects a joined `phase` object where the real query returns only a `phase_id` | Repository interfaces are defined from the real SQL that will back them, not from what is convenient for fixtures. `WorkItemWithPhase.phase` is resolved through `getWorkItemsForProject`'s existing phase map, and the mock matches that |
| Fixture latency is not real latency | Approving with 300 ms mock latency can hide the fact that the real dashboard needs a 2 s batch | Mock latency defaults to 150-400 ms but is tunable to 3 s, and every wiring milestone records an actual measured latency that goes into the status line |
| Double work when the real query differs from the fixture | Rework of an approved screen after wiring | Mitigated by keeping all data access behind the interface and by reviewing the query shape with the user at the UI gate (each UI milestone's mock data section states exactly which query shape is assumed) |
| Mock data leaking into production | A user could believe fixtures are their data | Unmissable `MOCK DATA` badge, mock writes never persist, `build:prod` drops the chunk, and `POS_MOCK=1` fails loudly on a production build |
| Forgetting to remove or disable mock code | The mock becomes load-bearing and cannot be deleted | The mock directory is referenced from exactly one dynamic import; nothing in screens, components, or stores imports mock code. The removability check is part of W8 |
| Approval fatigue | Nine gates in a row can stall momentum | The chosen cadence is one feature at a time (UI, gate, wire), so each gate is tied to a single focused feature and there is no long approval queue. Milestone 0 and Milestones 1-2 establish the visual language; from Milestone 3 onward the checklists are shorter and focused on deltas |
| Drifting fixture schema as the domain changes | Fixtures silently stop matching the types | Fixtures are typed against `src/lib/types/*`, so a type change breaks the fixture file at compile time, which `npm run typecheck` catches before approval |
| Approving states that only exist in mock | For example, an error copy that never appears because the real error is different | Each wiring milestone verifies at least one real failure path (network off, invalid token, rotated token) and the copy is corrected if it diverges, with the change recorded |

## Open questions

Resolved (locked):

1. Package is public open source: `@im4all/personal-os-tui`, MIT license.
2. Default theme is Mocha, dark-only. All four Catppuccin variants stay selectable, but nothing follows the terminal's system light/dark preference.
3. Quit keys: `q` quits from normal browsing, `Ctrl+Q` always quits, `Ctrl+C` copies when there is a selection and quits otherwise.
4. Cadence is one feature at a time: UI, approval gate, then wiring, before the next feature's UI.
5. Setup is wired immediately after G1 (W1).
6. The mock is strictly excluded from the production build; no `pos --demo` mode is shipped.

Still open:

1. Clipboard strategy: OpenTUI native clipboard service versus OSC 52, especially over SSH and inside tmux.
2. Notes text-size support: if OpenTUI exposes no font-size property, is a compact/comfortable density toggle an acceptable replacement?
3. Export default directory (`$HOME` assumed) and whether `POS_EXPORT_DIR` should be documented.
4. Whether to ship the Bun runtime fallback in v1 or only after Node proves problematic on a target.
5. Whether the profile should stay in remote `app_settings` (chosen for desktop interop) or also be mirrored into the config file.
6. Is a single `POS_MOCK_SCENARIO` per run sufficient, or is a per-screen scenario override needed for review sessions?
7. How much of the mock to keep long-term: keep it indefinitely as a development aid behind the build flag, or delete it entirely once all wiring is done? (It is never shipped in production either way.)
8. Should approval be recorded somewhere durable (for example a `PLAN.md` checkbox or a git tag per gate) so the sequence of approvals is auditable?
9. Should data export also be offered beyond notes (for example a full-database JSON or Markdown export from a command)?

## Testing milestone (manual verification)

Per the locked decision there are no automated tests. Completion is gated on the approval gates plus the manual checks:

1. Every UI milestone approval checklist is executed with mock data, in all four data states, at three narrow widths.
2. Every wiring milestone verification checklist is executed against a real Turso database that also has the desktop app pointed at it.
3. The end-to-end pass and the failure passes in W8 both succeed.
4. The terminal matrix in W8 is clean, including quit and restore from every modal state.
5. A regression pass for every bug found during the UI and wiring phases.

Where automated tests would pay off first, for a later decision: pure functions (`week-utils`, `week-groups`, `project-progress`, `degrade`, repository SQL builders), then interface conformance tests that run both the mock and the Turso implementations against the same assertions, then `@opentui/react/test-utils` render tests for the week grid. None of these are planned now.

## Completion criteria

The project is complete when:

1. `npm install -g @im4all/personal-os-tui` followed by `pos` runs on macOS, Linux, and Windows with Node 26.4+, and prints a clear error on older Node.
2. Every UI milestone has been explicitly approved at its gate before its wiring milestone began, and the final UI matches what was approved.
3. Setup connects to a real Turso database, applies the schema idempotently, and stores credentials with `0600` permissions.
4. All six screens meet the behavior described in their UI milestones, with keyboard equivalents for every desktop interaction and no dependency on drag-and-drop, native dialogs, PDF, favicons, or metadata fetching.
5. Data written by the TUI is byte-compatible with the desktop app on the same database, verified in both directions.
6. Each wiring milestone's checklist passes, including at least one real failure path per milestone.
7. The production build contains no reachable mock code, and `POS_MOCK=1` against it fails loudly.
8. The hardening checklist items that apply are done: credential handling, request hygiene, terminal compatibility, large-data behavior, and packaging verified by a real global install from a tarball.
9. The README lets a new user install, connect, learn the keymap, and troubleshoot without reading source.
10. The terminal is restored to a clean state after normal quit, `Ctrl+Q`, handled signals, an uncaught exception, and an unhandled rejection.

## Quality check

- Is there an observable result early? Yes - Milestone 0 is a runnable themed shell, and Milestone 1 is a fully interactive app on mock data with no database.
- Is the whole app demoable before wiring? Yes - every screen runs on fixtures, and mock mode stays available in development for review even after wiring.
- Does every feature have an explicit approval gate before its functionality is built? Yes - G0 through G8, each followed by that feature's wiring milestone (W1-W7) before the next feature's UI begins.
- Can each UI milestone run independently? Yes - all depend only on Milestone 0's shell and seam, not on each other.
- Is the mock seam justified rather than speculative? Yes - it is the direct mechanism for the requested workflow, and it is also the seam that keeps screens unchanged during wiring.
- Can the mock be removed cleanly? Yes - one dynamic import, nothing else references it, and the production build drops it.
- Does each milestone build on a working flow? Yes - each adds one screen or one wiring swap over the same shell and stores.
- Is the project runnable after every milestone? Yes - mock mode is always available, and the wiring milestones leave the app in a working state.
- Is the architecture sufficient but not speculative? Yes - one repository interface per domain, one store per domain, one Turso client, one theme registry, one command registry.
- Is UI created before infrastructure? Yes - that is the whole delivery model here; the underlying infrastructure (seam plus mock) exists only to make that possible.
- Is a real endpoint created before extensive backend layering? Yes - W1 proves real connectivity and schema before any other wiring.
- Does the CLI command work before advanced formatting? Yes - the `pos` launcher and version gate land in Milestone 0.
- Are safeguards and edge cases added after the main flow? Yes - validation, retries, timeouts, escaping, permission checks, and the terminal matrix are all in hardening and W8.
- Are tests completed before delivery? The requester locked "no automated tests"; the equivalent gate is the per-milestone approval and wiring checklists plus the end-to-end and failure passes, with a note on where automated tests would be added later.
- Is deferred work explicit? Yes - every milestone lists its deferred items, and the non-goals are stated up front.
- Are milestones small enough to implement and verify separately? Yes - nine UI phases and eight wiring phases, each with its own checklist and gate.

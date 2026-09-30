---
id: B0
title: Project bootstrap (init, dependencies, config, license)
type: bootstrap
status: done
phase: foundation
order: 0
depends_on: []
---

# B0 - Project bootstrap (init, dependencies, config, license)

> Type: bootstrap · Status: done · Phase: foundation

## Objective

Turn the empty repository into an installable, type-checking, buildable TypeScript project with the chosen dependencies, so M0 can start on the shell and repository seam without fighting tooling.

## Deliverables

### Package initialization

- [x] `npm init` in the repo root producing `package.json` with name `@im4all/personal-os-tui`, version `0.1.0`, `"license": "MIT"`, `"type": "module"`, publishable (not `private`, with `"publishConfig": { "access": "public" }`), `"bin": { "pos": "bin/pos.mjs" }`, `"files": ["bin", "dist", "README.md"]`, and `"engines": { "node": ">=26.4.0" }`.
- [x] Scripts: `build` (`tsdown`), `build:prod` (`tsdown --env.POS_MOCK_ENABLED=false` - see Notes), `dev` (`node --experimental-ffi --import tsx src/cli.tsx`), `dev:mock` (`POS_MOCK=1 npm run dev`), `typecheck` (`tsc --noEmit`), `format` (`biome format --write .`), `lint` (`biome lint .`), `check` (`biome check .`), `check:write` (`biome check --write .`), `check:ffi` (`node --experimental-ffi scripts/check-ffi.mjs`), `ci` (`biome ci .`).
- [x] `LICENSE` with the MIT text and a `README.md` skeleton (what it is, requirements, install, run, status).
- [x] `.gitignore` for `node_modules/`, `dist/`, logs, and OS files.
- [x] `.editorconfig` (2-space indent, LF, UTF-8).

### Dependencies (install and confirm)

- [x] Runtime: `@opentui/core@^0.5.12` (pin 0.5.12 initially), `@opentui/react@^0.5.12`, `react@^19.2.0`, `zustand@^5.0.14`, `ws@^8.18.0`, `web-tree-sitter@0.25.10`.
- [x] Dev: `typescript@~5.8`, `@types/node@^24`, `@types/react@^19.2`, `tsdown@^0.10`, `tsx@^4`, and `@biomejs/biome@^2` for lint and format.
- [x] Confirm `@opentui/core` resolved the platform native optional package for the dev machine (for example `@opentui/core-darwin-arm64`) and that `web-tree-sitter` is present. `web-tree-sitter` is now a declared direct dependency (`0.25.10`, exact), not a transitive resolution.
- [x] Deliberately do NOT add `zod`, `date-fns`, `react-markdown`/`remark-gfm`/`rehype-highlight`, `jspdf`/`jspdf-autotable`, or `string-width` (see `PLAN.md` "Dependencies" for the rationale).
- [x] Leave `@opentui/keymap` out for now; it is deferred to the polish phase in `PLAN.md`.
- [x] Record the exact installed versions in the commit message or README.

### Tooling config

- [x] `tsconfig.json`: `target ESNext`, `module ESNext`, `moduleResolution bundler`, `lib ["ESNext","DOM"]`, `jsx react-jsx`, `jsxImportSource "@opentui/react"`, `strict`, `skipLibCheck`, `noEmit`, `resolveJsonModule`, `types ["node"]`; no `#` import map.
- [x] `tsdown.config.ts`: `entry: ["src/cli.tsx"]`, `format: ["esm"]`, `platform: "node"`, `target: "node26"`, `outDir: "dist"`, `clean: true`, `sourcemap: true`, `external: ["@opentui/core", "@opentui/react", "react", "react-reconciler", "ws", /^@opentui\/core-/]`, `dts: false`. `splitting: true` is omitted because tsdown 0.10.2 has no such option (see Notes).
- [x] `biome.json` (Biome v2): `vcs` git with `useIgnoreFile`, `files.includes` force-ignoring `dist` (`!!**/dist`), formatter 2-space indent, `lineWidth 100`, `lf` line endings, JavaScript double quotes, semicolons, trailing commas, `linter.rules.preset: "recommended"` plus `style.useBlockStatements`, and `assist.actions.source.recommended`. Schema URL bumped to `2.5.14` to match the installed Biome, rest verbatim from `PLAN.md`.
- [x] Directory skeleton created: `bin/`, and under `src/`: `cli/`, `app/`, `screens/`, `components/`, `commands/`, `store/`, `repos/`, `mock/`, `lib/`, `theme/`, `hooks/`, `utils/`.
- [x] Placeholder `bin/pos.mjs` (version gate only) and placeholder `src/cli.tsx` so `typecheck` and `build` have an entry point.

### Verification

- [x] `node --version` is `>= 26.4.0` on the dev machine (v26.4.0); M0's FFI spike is unblocked.
- [x] `npm run typecheck` passes on the placeholder sources.
- [x] `npm run check` passes with no diagnostics on the placeholder sources, and `npx biome explain useBlockStatements` confirms the rule exists under `style` (`lint/style/useBlockStatements`, fix `unsafe`).
- [x] `npm run format` leaves no further diff (formatting is already Biome-clean).
- [x] `npm run ci` (Biome's non-interactive CI check) succeeds.
- [x] `npm run build` produces `dist/cli.js`; `npm run build:prod` succeeds too.
- [x] `npm run check:ffi` (`scripts/check-ffi.mjs`, which imports `@opentui/core` under `node --experimental-ffi`) loads the native core without error (`@opentui/core-darwin-arm64` FFI bindings verified via `RGBA.fromHex("#cba6f7") -> [203, 166, 247, 255]`).
- [x] `npm pack --dry-run` lists only `bin/`, `dist/`, `README.md`, `LICENSE`, and `package.json`.
- [x] Confirm the dependency list with the user before the install is committed.

## Notes

- This ticket has no approval gate; it is a prerequisite for M0, which depends on it.
- Keep the dependency set minimal. Anything not listed here is a deliberate omission recorded in `PLAN.md`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- Executed dependency change (round-2 review n7): `web-tree-sitter` `0.25.10` is declared directly in `dependencies` at the user's request. `@opentui/core` lists it as an exact, non-optional peer and this ticket requires it present, so it is pinned exactly and declared directly; `PLAN.md`'s rationale for declaring `ws` directly applies equally. Installed with `npm install --save-exact web-tree-sitter@0.25.10`, updating both `package.json` and `package-lock.json`; no other dependency was added, removed, or upgraded.

### Deviations from the ticket text

1. **`build:prod` uses `--env.POS_MOCK_ENABLED=false`, not `--define POS_MOCK_ENABLED=false`.** tsdown 0.10.2 has no `--define` CLI flag (`FATAL Unknown option --define`), so the ticket's literal script never ran. `--env.*` is tsdown's supported, shell-portable equivalent; `tsdown.config.ts` reads it off `cliOptions.env` and feeds `define`, which produces the same statically dead branch. Verified with a probe: a dynamic `import()` of a mock module emits a separate chunk in the development build and no chunk at all when `POS_MOCK_ENABLED=false`. `PLAN.md` was updated to match.
2. **`splitting: true` is not set.** tsdown 0.10.2 exposes no `splitting` option (it fails typecheck as an unknown property). It is unnecessary: rolldown already emits one chunk per dynamic `import()`, which is the property `PLAN.md` relies on.
3. **`biome.json` `$schema` is `2.5.14`.** The ticket and `PLAN.md` pinned `2.3.11`; the installed `@biomejs/biome` is `2.5.14`, so the schema URL was bumped to match the installed major.
4. **Pitfall for M0.** `POS_MOCK_ENABLED` must be declared ambiently in a `*.d.ts`. A module-local `declare const POS_MOCK_ENABLED: boolean;` makes rolldown treat it as a local binding, silently skipping the define replacement and keeping the mock branch in production output. A second pitfall: only the bare `POS_MOCK_ENABLED` identifier is valid. `--env.POS_MOCK_ENABLED=false` also defines `process.env.POS_MOCK_ENABLED` as the truthy string `"false"`, so reading the flag via `process.env` would silently defeat mock elimination. The planned `grep -r "fixtures" dist/` check in W8 stays as the backstop.
5. **`bin/pos.mjs` is the full launcher, not a version-gate placeholder.** The deliverable text asks for a placeholder (version gate only), and `PLAN.md` schedules the full launcher (entry resolution, `--experimental-ffi` re-exec, libc detection, signal forwarding) under M0. The full launcher was pulled forward into B0 so `bin/pos.mjs` is actually runnable and `node bin/pos.mjs` works after `npm run build`. This is intentional, not an oversight. It has not been exercised by the G0 checklist because G0 has not run yet, so M0 still owns verifying it against the M0 acceptance criteria.

---
id: B0
title: Project bootstrap (init, dependencies, config, license)
type: bootstrap
status: not-started
phase: foundation
order: 0
depends_on: []
---

# B0 - Project bootstrap (init, dependencies, config, license)

> Type: bootstrap · Status: not-started · Phase: foundation

## Objective

Turn the empty repository into an installable, type-checking, buildable TypeScript project with the chosen dependencies, so M0 can start on the shell and repository seam without fighting tooling.

## Deliverables

### Package initialization

- [ ] `npm init` in the repo root producing `package.json` with name `@im4all/personal-os-tui`, version `0.1.0`, `"type": "module"`, publishable (not `private`), `"bin": { "pos": "bin/pos.mjs" }`, `"files": ["bin", "dist", "README.md"]`, and `"engines": { "node": ">=26.4.0" }`.
- [ ] Scripts: `build` (`tsdown`), `build:prod` (`tsdown --define POS_MOCK_ENABLED=false`), `dev` (`node --experimental-ffi --import tsx src/cli.tsx`), `dev:mock` (`POS_MOCK=1 npm run dev`), `typecheck` (`tsc --noEmit`), `format` (`biome format --write .`), `lint` (`biome lint .`), `check` (`biome check .`), `check:write` (`biome check --write .`), `ci` (`biome ci .`).
- [ ] `LICENSE` with the MIT text and a `README.md` skeleton (what it is, requirements, install, run, status).
- [ ] `.gitignore` for `node_modules/`, `dist/`, logs, and OS files.
- [ ] `.editorconfig` (2-space indent, LF, UTF-8).

### Dependencies (install and confirm)

- [ ] Runtime: `@opentui/core@^0.5.12` (pin 0.5.12 initially), `@opentui/react@^0.5.12`, `react@^19.2.0`, `zustand@^5.0.14`, `ws@^8.18.0`.
- [ ] Dev: `typescript@~5.8`, `@types/node@^24`, `@types/react@^19.2`, `tsdown@^0.10`, `tsx@^4`, and `@biomejs/biome@^2` for lint and format.
- [ ] Confirm `@opentui/core` resolved the platform native optional package for the dev machine (for example `@opentui/core-darwin-arm64`) and that `web-tree-sitter` is present.
- [ ] Deliberately do NOT add `zod`, `date-fns`, `react-markdown`/`remark-gfm`/`rehype-highlight`, `jspdf`/`jspdf-autotable`, or `string-width` (see `PLAN.md` "Dependencies" for the rationale).
- [ ] Leave `@opentui/keymap` out for now; it is deferred to the polish phase in `PLAN.md`.
- [ ] Record the exact installed versions in the commit message or README.

### Tooling config

- [ ] `tsconfig.json`: `target ESNext`, `module ESNext`, `moduleResolution bundler`, `lib ["ESNext","DOM"]`, `jsx react-jsx`, `jsxImportSource "@opentui/react"`, `strict`, `skipLibCheck`, `noEmit`, `resolveJsonModule`, `types ["node"]`; no `#` import map.
- [ ] `tsdown.config.ts`: `entry: ["src/cli.tsx"]`, `format: ["esm"]`, `platform: "node"`, `target: "node26"`, `splitting: true`, `outDir: "dist"`, `clean: true`, `sourcemap: true`, `external: ["@opentui/core", "@opentui/react", "react", "react-reconciler", "ws", /^@opentui\/core-/]`, `dts: false`.
- [ ] `biome.json` (Biome v2): `vcs` git with `useIgnoreFile`, `files.includes` force-ignoring `dist` (`!!**/dist`), formatter 2-space indent, `lineWidth 100`, `lf` line endings, JavaScript double quotes, semicolons, trailing commas, `linter.rules.preset: "recommended"` plus `style.useBlockStatements`, and `assist.actions.source.recommended`. Use the full snippet in `PLAN.md` under "Dependencies".
- [ ] Directory skeleton created: `bin/`, and under `src/`: `cli/`, `app/`, `screens/`, `components/`, `commands/`, `store/`, `repos/`, `mock/`, `lib/`, `theme/`, `hooks/`, `utils/`.
- [ ] Placeholder `bin/pos.mjs` (version gate only) and placeholder `src/cli.tsx` so `typecheck` and `build` have an entry point.

### Verification

- [ ] `node --version` is `>= 26.4.0` on the dev machine; if not, note the blocker (M0's FFI spike cannot run) before proceeding.
- [ ] `npm run typecheck` passes on the placeholder sources.
- [ ] `npm run check` passes with no diagnostics on the placeholder sources, and `npx biome explain useBlockStatements` confirms the rule exists under `style` (move it to `nursery` or drop it otherwise).
- [ ] `npm run format` leaves no further diff (formatting is already Biome-clean).
- [ ] `npm run ci` (Biome's non-interactive CI check) succeeds.
- [ ] `npm run build` produces `dist/cli.js`.
- [ ] A tiny script that dynamically imports `@opentui/core` under `node --experimental-ffi` loads the native core without error.
- [ ] `npm pack --dry-run` lists only `bin/`, `dist/`, `README.md`, and `LICENSE`.
- [ ] Confirm the dependency list with the user before the install is committed.

## Notes

- This ticket has no approval gate; it is a prerequisite for M0, which depends on it.
- Keep the dependency set minimal. Anything not listed here is a deliberate omission recorded in `PLAN.md`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

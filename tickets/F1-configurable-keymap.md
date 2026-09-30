---
id: F1
title: Configurable keymap from the config file
type: feature
status: not-started
phase: polish
order: 26
depends_on: [G8]
---

# F1 - Configurable keymap from the config file

> Type: feature · Status: not-started · Phase: polish

## Objective

Users can override the app's key bindings from a config file on macOS, Linux, and Windows. Overrides apply only to the commands they name; every unlisted command keeps its default binding. The global handler, the command palette, and the help screen keep sharing one source of truth, so an override changes behavior and documentation together.

## Deliverables

- [ ] A keymap override read at startup from the existing config location (`configDir()`: `POS_CONFIG_DIR` > `XDG_CONFIG_HOME` > platform default), never from a new home-root dotfile.
- [ ] A resolver that merges overrides onto the registry defaults: a listed command id replaces that command's bindings; unlisted commands are untouched.
- [ ] Validation: an unknown command id, a malformed key name, and a binding that collides with another command are reported and skipped, never fatal. Invalid entries leave the app fully usable.
- [ ] `pos doctor` prints the resolved keymap source and any skipped entries.
- [ ] A startup or status-line notice when entries were skipped, in the same advisory spirit as the loose-permissions warning.
- [ ] Help and the command palette render the effective (overridden) keys, with no drift from the handler.
- [ ] `Command.hint` no longer duplicates key text; hints derive from `keys` via `formatKey` (or are removed), so overriding a key never leaves a stale hint.
- [ ] Document the remappable set: registry commands only, and name the keys that are not registry-driven as out of scope.
- [ ] A `keymap` schema version so a later command rename cannot silently mis-map a user file.
- [ ] A README section describing the file, the format, and a worked example.

## Design notes

### File location

Reuse the existing config location. `src/lib/config.ts` already resolves `POS_CONFIG_DIR` > `XDG_CONFIG_HOME` > platform default (`~/.config`, or `%APPDATA%` on Windows) joined with `personal-os/`. Add the keymap either as a `keymap` section in `config.json` or as a sibling `personal-os/keymap.json` in the same directory. A sibling file is preferred: `config.json` holds the Turso token and is written `0o600`, while a keymap is not secret and is nicer to share or keep in a dotfiles repository. Do not introduce a `.pos-config` at the home root; it breaks the existing convention and has no clean Windows equivalent.

### Override format (illustrative)

```json
{
  "version": 1,
  "keys": {
    "global.quit": [{ "name": "q" }, { "name": "q", "ctrl": true }],
    "nav.todo": [{ "name": "2", "meta": true }]
  }
}
```

Bindings use the same `KeyBinding` shape the registry already declares (`name`, `ctrl`, `meta`, `shift`).

### Merge semantics

Build the effective binding list once at startup: for each command id present in the file, replace its `keys`; leave every other command's `keys` as declared. An empty array clears a command's bindings deliberately. `findCommandForKey`, `commandKeys`, `formatKey`, the palette, and help all read the effective list.

### Failure mode

Never crash the TUI for a bad keymap. Skip the bad entry, keep the default, and report it. `pos doctor` is the detailed surface; the status line is the ambient one.

### Out of scope for v1

Keys that bypass the registry today and therefore cannot be overridden without moving them into it: palette navigation (`up`/`down`/`Ctrl+n`/`Ctrl+p`), the mock dev panel (`1-5`, `r`, `-`/`+`), Setup's `d` demo key, and the quit-always `Ctrl+Q` filter in `App.tsx`. The README must say so explicitly, or a follow-up ticket moves them into the registry.

## Files touched

- `src/lib/config.ts`, `src/lib/config.types.ts` - read and validate the keymap section or file
- `src/commands/registry.ts` - effective bindings, merge, and hint derivation
- `src/commands/HelpScreen.tsx`, `src/commands/CommandPalette.tsx` - render effective keys
- `src/app/App.tsx` - pass the resolved keymap into the registry at bootstrap
- `src/cli.tsx`, `src/cli/doctor.ts` - load the keymap and report skipped entries
- `README.md` - the keymap file format and example

## Approval

Reviewed as part of the end-to-end pass in [W8](W8-real-data-hardening.md). No separate gate: this ticket changes configuration behavior, not the visual language, and G8 already approves the keymap's presentation.

## Deferred

- Moving non-registry keys (palette navigation, mock panel, Setup `d`) into the registry.
- Per-scope or modal-specific override syntax.
- A live keymap editor in the app.

## Notes

- Follows [G8](G8-polish-ui-approval.md) so every screen's keys exist before the override schema is frozen; a user-facing keymap file is a compatibility surface, so it should settle once.
- Depends on the registry seam from M0: because the handler, palette, and help already read `Command.keys`, overriding them there updates all three together.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.

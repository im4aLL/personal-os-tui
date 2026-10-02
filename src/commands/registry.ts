// Commands as data: the global key handler, the palette, and help all read
// this registry, so the three cannot drift. Every command with a global
// binding declares machine-readable `keys`; the handler matches them with
// `findCommandForKey` and help renders them with `formatKey`.
import type { KeymapBinding, KeymapSkip } from "../lib/config.types";
import type { RepoMode } from "../repos/resolve.types";
import type {
  Command,
  HelpLine,
  HelpSection,
  KeyBinding,
  KeyPress,
  ScreenKeyGroup,
} from "./registry.types";

const MOCK_ENABLED: boolean = typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED;

/** Rows the palette shows at once. Shared with App's nav clamp so the render
 * slice and the keyboard cap cannot drift. */
export const PALETTE_PAGE_SIZE = 10;

/** Build flag for dev-only UI (mock panel, mock commands). Runtime gate
 * only; mock code exclusion from production relies on the dynamic import
 * boundary in `src/repos/index.ts`, not on this flag. */
export function isMockEnabled(): boolean {
  return MOCK_ENABLED;
}

export const NAV_COMMANDS: Command[] = [
  {
    id: "nav.dashboard",
    title: "Go to Dashboard",
    group: "nav",
    keys: [{ name: "1", meta: true }],
    run: (ctx) => ctx.navigate("dashboard"),
  },
  {
    id: "nav.todo",
    title: "Go to Todo",
    group: "nav",
    keys: [{ name: "2", meta: true }],
    run: (ctx) => ctx.navigate("todo"),
  },
  {
    id: "nav.links",
    title: "Go to Save Links",
    group: "nav",
    keys: [{ name: "3", meta: true }],
    run: (ctx) => ctx.navigate("links"),
  },
  {
    id: "nav.projects",
    title: "Go to Project Planner",
    group: "nav",
    keys: [{ name: "4", meta: true }],
    run: (ctx) => ctx.navigate("projects"),
  },
  {
    id: "nav.work-log",
    title: "Go to Work Log",
    group: "nav",
    keys: [{ name: "5", meta: true }],
    run: (ctx) => ctx.navigate("work-log"),
  },
  {
    id: "nav.notes",
    title: "Go to Notes",
    group: "nav",
    keys: [{ name: "6", meta: true }],
    run: (ctx) => ctx.navigate("notes"),
  },
];

// Ctrl+P is the universal palette key. `/` is a fallback binding that the
// Notes and Todo screen scopes preempt to focus list search (App resolves the
// screen scope before globals), so it is not universally reachable and help
// does not advertise it as the palette key.
const paletteCommand: Command = {
  id: "global.palette",
  title: "Open command palette",
  group: "global",
  keys: [{ name: "/" }, { name: "p", ctrl: true }],
  run: (ctx) => ctx.openPalette(),
};

const helpCommand: Command = {
  id: "global.help",
  title: "Show help and keymap",
  group: "global",
  keys: [{ name: "?" }],
  run: (ctx) => ctx.openHelp(),
};

const themeCommand: Command = {
  id: "global.theme",
  title: "Cycle theme",
  group: "global",
  keys: [{ name: "t" }],
  run: (ctx) => ctx.cycleTheme(),
};

const themePickerCommand: Command = {
  id: "global.theme-picker",
  title: "Choose theme",
  group: "global",
  keys: [{ name: "t", ctrl: true }],
  run: (ctx) => ctx.openThemePicker(),
};

const refreshCommand: Command = {
  id: "global.refresh",
  title: "Refresh current screen",
  group: "global",
  keys: [{ name: "r", ctrl: true }],
  run: (ctx) => ctx.refresh(),
};

const sidebarCommand: Command = {
  id: "global.sidebar",
  title: "Toggle sidebar",
  group: "global",
  keys: [{ name: "\\", ctrl: true }],
  run: (ctx) => ctx.toggleSidebar(),
};

// Dev-only panel entry. Two bindings share one command: the documented
// Ctrl+Shift+D plus a plain Ctrl+D fallback. Terminals without kitty or
// modifyOtherKeys report Ctrl+Shift+D as the single byte 0x04, so the raw
// parser sees name "d" with ctrl true and shift false - the shift:true
// binding alone is unreachable there. An undeclared shift is
// ignored by matchesKey, so the fallback matches everywhere while the
// primary keeps the Ctrl+Shift+D label in help.
const mockPanelCommand: Command = {
  id: "global.mock-panel",
  title: "Open mock state panel",
  group: "global",
  keys: [
    { name: "d", ctrl: true, shift: true },
    { name: "d", ctrl: true },
  ],
  devOnly: true,
  mockOnly: true,
  run: (ctx) => ctx.openMockPanel(),
};

const dismissCommand: Command = {
  id: "global.dismiss",
  title: "Close dialog",
  group: "global",
  keys: [{ name: "escape" }],
  run: (ctx) => ctx.closeModal(),
};

const quitCommand: Command = {
  id: "global.quit",
  title: "Quit",
  group: "global",
  // Ctrl+C reaches this command while browsing when there is no terminal text
  // selection (App copies a selection before the registry). A renderer without
  // the OSC52 helper always falls through, so browsing still quits there.
  keys: [{ name: "q" }, { name: "q", ctrl: true }, { name: "c", ctrl: true }],
  run: (ctx) => ctx.quit(),
};

// Palette-only entry that opens Setup. First run it onboards; once onboarding
// is complete the same screen opens in edit mode so credentials and the
// profile can be changed. No keys so it never hijacks typing.
const setupCommand: Command = {
  id: "global.setup",
  title: "Open setup",
  group: "global",
  keys: [],
  run: (ctx) => ctx.showSetup(),
};

// Always-shipped globals (no mock strings). The mock panel entry joins them
// only behind the inline mock guard below so production drops its strings.
const globalBaseCommands: Command[] = [
  paletteCommand,
  helpCommand,
  themeCommand,
  themePickerCommand,
  refreshCommand,
  sidebarCommand,
  dismissCommand,
  quitCommand,
  setupCommand,
];

// Single source for the mock-enabled global set: base plus the dev-only
// panel entry. Referenced only behind the inline mock guard below, so the
// production fold drops the reference and tree-shakes this const with its
// mock strings.
const MOCK_GLOBAL_COMMANDS: Command[] = [
  paletteCommand,
  helpCommand,
  themeCommand,
  themePickerCommand,
  refreshCommand,
  sidebarCommand,
  mockPanelCommand,
  dismissCommand,
  quitCommand,
  setupCommand,
];

// Inline `typeof` guard (not MOCK_ENABLED): the bundler folds the condition
// to a literal and drops the dead branch, removing the mock panel strings
// from the production main chunk. Runtime visibility still goes through
// isCommandVisible/isMockEnabled.
export const GLOBAL_COMMANDS: Command[] = (
  typeof POS_MOCK_ENABLED === "undefined"
    ? true
    : POS_MOCK_ENABLED
)
  ? MOCK_GLOBAL_COMMANDS
  : globalBaseCommands;

// Single source for the dev-only mock commands. Same DCE shape as above:
// the inline guard folds in production, the dead reference drops, and this
// const tree-shakes out with every mock title below.
const MOCK_COMMANDS_DATA: Command[] = [
  {
    id: "mock.scenario-default",
    title: "Mock scenario: default",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("default"),
  },
  {
    id: "mock.scenario-empty",
    title: "Mock scenario: empty",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("empty"),
  },
  {
    id: "mock.scenario-loading",
    title: "Mock scenario: loading",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("loading"),
  },
  {
    id: "mock.scenario-slow",
    title: "Mock scenario: slow",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("slow"),
  },
  {
    id: "mock.scenario-error",
    title: "Mock scenario: error",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("error"),
  },
  {
    id: "mock.scenario-large",
    title: "Mock scenario: large",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("large"),
  },
  {
    id: "mock.reset",
    title: "Reset mock data",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.resetMockData(),
  },
];

// Inline `typeof` guard for the same DCE reason: production folds this to
// `[]` and drops every mock title above from the main chunk.
export const MOCK_COMMANDS: Command[] = (
  typeof POS_MOCK_ENABLED === "undefined"
    ? true
    : POS_MOCK_ENABLED
)
  ? MOCK_COMMANDS_DATA
  : [];

export const commands: Command[] = [...NAV_COMMANDS, ...GLOBAL_COMMANDS, ...MOCK_COMMANDS];

/** True when the command is visible/runnable in this build. */
export function isCommandVisible(command: Command): boolean {
  return command.devOnly !== true || MOCK_ENABLED;
}

/** A binding matches when the name and every declared modifier agree.
 * An undeclared `shift` is ignored; undeclared `ctrl`/`meta` must be off. */
export function matchesKey(key: KeyPress, binding: KeyBinding): boolean {
  if (key.name.toLowerCase() !== binding.name.toLowerCase()) {
    return false;
  }
  if (key.ctrl !== (binding.ctrl ?? false)) {
    return false;
  }
  if (key.meta || key.option === true) {
    if (binding.meta !== true) {
      return false;
    }
  } else if (binding.meta === true) {
    return false;
  }
  if (binding.shift !== undefined && key.shift !== binding.shift) {
    return false;
  }
  return true;
}

/** First visible command bound to this key, if any. */
export function findCommandForKey(key: KeyPress): Command | undefined {
  for (const command of commands) {
    if (!isCommandVisible(command)) {
      continue;
    }
    if (command.keys.some((binding) => matchesKey(key, binding))) {
      return command;
    }
  }
  return undefined;
}

/** Bindings declared for one command id (empty when unknown). */
export function commandKeys(id: string): KeyBinding[] {
  return commands.find((command) => command.id === id)?.keys ?? [];
}

/** Declared bindings captured once, so `applyKeymap` is idempotent: it can
 * restore defaults before applying a fresh override set on every call. */
const DEFAULT_KEYS = new Map<string, KeyBinding[]>(
  commands.map((command) => [command.id, command.keys.map((binding) => ({ ...binding }))]),
);

/** Signatures a binding occupies for collision purposes. Mirrors `matchesKey`:
 * `ctrl`/`meta` are exact, while an undeclared `shift` ignores the shift axis,
 * so it overlaps both the plain and the shifted press. */
function bindingSignatures(binding: KeymapBinding): string[] {
  const parts: string[] = [];
  if (binding.ctrl === true) {
    parts.push("ctrl");
  }
  if (binding.meta === true) {
    parts.push("meta");
  }
  parts.push(binding.name.toLowerCase());
  const base = parts.join("+");
  if (binding.shift === true) {
    return [`shift+${base}`];
  }
  if (binding.shift === false) {
    return [base];
  }
  return [base, `shift+${base}`];
}

/** Clones of the declared bindings captured at module load. Callers that only
 * want to resolve (for example `pos doctor`) use this instead of mutating the
 * shared command objects. */
export function registryDefaults(): Map<string, KeyBinding[]> {
  const clone = new Map<string, KeyBinding[]>();
  for (const [commandId, bindings] of DEFAULT_KEYS) {
    clone.set(
      commandId,
      bindings.map((binding) => ({ ...binding })),
    );
  }
  return clone;
}

/** Pure resolution of overrides against a default binding set; never touches the
 * live command objects. Starts from every default, substitutes each listed
 * command's proposal, then rejects the first colliding listed command and
 * rebuilds before continuing. Each rejection is recorded during resolution and
 * described only once the set is stable, so a partner that was itself rejected
 * is named as a proposed binding. Repeats until the set is stable. Returns the
 * final effective set, the rejected entries, and the listed ids whose override
 * survived.
 *
 * Semantics: a listed command replaces its bindings, an empty array deliberately
 * clears them, an unknown id is skipped, and a command entry that ends up
 * colliding is rejected keeping its default, recording the other command id. */
export function resolveKeymap(
  defaults: Map<string, KeyBinding[]>,
  overrides: Record<string, KeymapBinding[]>,
): { effective: Map<string, KeyBinding[]>; skipped: KeymapSkip[]; applied: string[] } {
  const skipped: KeymapSkip[] = [];

  // Effective set: every default, with each listed command taking its proposal.
  const effective = new Map<string, KeyBinding[]>();
  for (const [commandId, bindings] of defaults) {
    effective.set(
      commandId,
      bindings.map((binding) => ({ ...binding })),
    );
  }

  // Partition overrides into known listed commands (kept in file key order) and
  // unknown ids. An unknown id has no defaults to fall back to.
  const listed: string[] = [];
  for (const commandId of Object.keys(overrides)) {
    if (!defaults.has(commandId)) {
      skipped.push({ commandId, reason: "unknown command id" });
      continue;
    }
    listed.push(commandId);
    effective.set(
      commandId,
      (overrides[commandId] ?? []).map((binding) => ({ ...binding })),
    );
  }

  const rejected = new Set<string>();
  // Recorded during resolution, described once the set is stable so a reason
  // can distinguish a partner that was itself rejected from one that survives.
  const rejections: { commandId: string; binding: KeyBinding; other: string }[] = [];

  /** First proposed binding that another command also holds in this set. */
  const findCollision = (
    commandId: string,
    proposed: KeyBinding[],
    bySignature: Map<string, Set<string>>,
  ): { binding: KeyBinding; other: string } | null => {
    for (const binding of proposed) {
      for (const signature of bindingSignatures(binding)) {
        const owners = bySignature.get(signature);
        if (owners === undefined) {
          continue;
        }
        for (const owner of owners) {
          if (owner !== commandId) {
            return { binding, other: owner };
          }
        }
      }
    }
    return null;
  };

  // Each pass rejects at most one listed command, then rebuilds; it stops once a
  // pass rejects nothing, so it terminates with a collision-free set.
  for (;;) {
    // (a) Current signature -> owning commands, from the whole effective set.
    const bySignature = new Map<string, Set<string>>();
    for (const [commandId, bindings] of effective) {
      for (const binding of bindings) {
        for (const signature of bindingSignatures(binding)) {
          let owners = bySignature.get(signature);
          if (owners === undefined) {
            owners = new Set<string>();
            bySignature.set(signature, owners);
          }
          owners.add(commandId);
        }
      }
    }

    // (b) Reject the first colliding listed command, in file order.
    let rejectedOne = false;
    for (const commandId of listed) {
      if (rejected.has(commandId)) {
        continue;
      }
      const collision = findCollision(commandId, overrides[commandId] ?? [], bySignature);
      if (collision === null) {
        continue;
      }
      // Keep the default; this command's proposal is out of the final set.
      const fallback = defaults.get(commandId) ?? [];
      effective.set(
        commandId,
        fallback.map((binding) => ({ ...binding })),
      );
      rejected.add(commandId);
      rejections.push({ commandId, binding: collision.binding, other: collision.other });
      rejectedOne = true;
      // Rebuild immediately so the next pass sees the post-rejection set.
      break;
    }

    // (c) Stable: nothing was rejected this pass, so nothing can cascade.
    if (!rejectedOne) {
      break;
    }
  }

  // Describe rejections now that the final set is known. A partner that was
  // itself rejected no longer holds its proposal, so name it as such.
  for (const rejection of rejections) {
    const reason = rejected.has(rejection.other)
      ? `binding collides with a proposed binding of ${rejection.other}`
      : `binding collides with ${rejection.other}`;
    skipped.push({
      commandId: rejection.commandId,
      binding: formatKey(rejection.binding),
      reason,
    });
  }

  return { effective, skipped, applied: listed.filter((commandId) => !rejected.has(commandId)) };
}

/** Apply user overrides onto the shared command objects and return the rejected
 * entries. A thin wrapper over `resolveKeymap`: it resolves against the captured
 * defaults, then assigns the effective bindings to the command objects that
 * `commands`, `NAV_COMMANDS`, and `GLOBAL_COMMANDS` share, so the handler,
 * palette, and help all follow. Idempotent: every call starts from the same
 * captured defaults. */
export function applyKeymap(overrides: Record<string, KeymapBinding[]>): KeymapSkip[] {
  const { effective, skipped } = resolveKeymap(DEFAULT_KEYS, overrides);
  for (const command of commands) {
    const bindings = effective.get(command.id);
    if (bindings !== undefined) {
      command.keys = bindings.map((binding) => ({ ...binding }));
    }
  }
  return skipped;
}

const KEY_LABELS: Record<string, string> = {
  escape: "esc",
  return: "enter",
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  space: "space",
  tab: "tab",
  pageup: "pageup",
  pagedown: "pagedown",
  home: "home",
  end: "end",
};

/** Display form of one binding, e.g. ctrl+shift+d. Modifiers and named keys are
 * lowercase; a single-letter binding keeps its exact binding case (`t` stays
 * `t`, `J` stays `J`). */
export function formatKey(binding: KeyBinding): string {
  const parts: string[] = [];
  if (binding.ctrl === true) {
    parts.push("ctrl");
  }
  if (binding.meta === true) {
    parts.push("alt");
  }
  if (binding.shift === true) {
    parts.push("shift");
  }
  const lower = binding.name.toLowerCase();
  parts.push(KEY_LABELS[lower] ?? binding.name);
  return parts.join("+");
}

/** Subsequence fuzzy match for the palette filter. */
export function matchesQuery(command: Command, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return true;
  }
  const haystack = `${command.title} ${command.id}`.toLowerCase();
  let cursor = 0;
  for (const char of needle) {
    cursor = haystack.indexOf(char, cursor);
    if (cursor === -1) {
      return false;
    }
    cursor += 1;
  }
  return true;
}

/** Runtime availability: build visibility plus the mock-mode gate. Mock
 * scenario/reset commands (group "mock") and mock-only commands such as the
 * dev panel only apply while the session runs on mock data. */
function isCommandAvailable(command: Command, repoMode: RepoMode): boolean {
  if (!isCommandVisible(command)) {
    return false;
  }
  if (command.group === "mock" || command.mockOnly === true) {
    return repoMode === "mock";
  }
  return true;
}

/** Palette filter: runtime availability and the fuzzy query. Other commands are
 * not gated on session state: Setup stays reachable after onboarding so an
 * existing config and profile can be edited. */
export function filterAvailableCommands(query: string, repoMode: RepoMode): Command[] {
  return commands.filter(
    (command) => isCommandAvailable(command, repoMode) && matchesQuery(command, query),
  );
}

// Per-screen keys. Screens own their scopes imperatively (they need live
// selection/editor state), so this is documentation, not dispatch. The screen
// footers render their primary browsing keys from the same rows via
// `screenHint`, so help and the footer agree for those. Two footer-only
// exceptions are intentional: Projects splits its own per-zone `HINTS` (e.g.
// `v` list/grid toggle), and Todo appends a contextual `w work log` only when
// a completed todo is selected. Neither has a row here, so help omits them by
// design.
export const SCREEN_KEYMAPS: ScreenKeyGroup[] = [
  {
    screen: "dashboard",
    title: "Dashboard",
    rows: [
      { keys: "tab", title: "panel" },
      { keys: "j/k", title: "move" },
      { keys: "1-4", title: "card" },
      { keys: "enter", title: "open" },
      { keys: "n", title: "add" },
      { keys: "r", title: "refresh" },
      { keys: "h/l", title: "stat card" },
      { keys: "g/G", title: "first/last" },
      { keys: "ctrl+d/u", title: "half page" },
    ],
  },
  {
    screen: "todo",
    title: "Todo",
    rows: [
      { keys: "n", title: "new" },
      { keys: "enter", title: "edit" },
      { keys: "m", title: "cycle status" },
      { keys: "H/L", title: "move column" },
      { keys: "K/J", title: "reorder" },
      { keys: "/", title: "search" },
      { keys: "d", title: "delete" },
      { keys: "a", title: "archived" },
      { keys: "A", title: "archive done" },
      { keys: "X", title: "clear done" },
      { keys: "h/l", title: "focus column" },
      { keys: "g/G", title: "first/last" },
      { keys: "ctrl+d/u", title: "half page" },
    ],
  },
  {
    screen: "links",
    title: "Save Links",
    rows: [
      { keys: "enter", title: "open" },
      { keys: "e", title: "edit title" },
      { keys: "c", title: "copy" },
      { keys: "d", title: "delete" },
      { keys: "n", title: "save" },
      { keys: "/", title: "search" },
      { keys: "tab", title: "tags" },
      { keys: "esc", title: "clear" },
      { keys: "h/l", title: "tags" },
      { keys: "g/G", title: "first/last" },
      { keys: "ctrl+d/u", title: "half page" },
    ],
  },
  {
    screen: "projects",
    title: "Project Planner",
    rows: [
      { keys: "1/2", title: "list / grid" },
      { keys: "tab", title: "zone" },
      { keys: "j/k", title: "select" },
      { keys: "enter", title: "open / edit" },
      { keys: "n", title: "new" },
      { keys: "e", title: "edit" },
      { keys: "d", title: "delete" },
      { keys: "p", title: "phases" },
      { keys: "K/J", title: "reorder" },
      { keys: "s", title: "separator" },
      { keys: "o", title: "jira" },
      { keys: "c", title: "comment" },
      { keys: "[ ]", title: "window" },
      { keys: "h/l", title: "zone" },
      { keys: "g/G", title: "first/last" },
      { keys: "ctrl+d/u", title: "half page" },
    ],
  },
  {
    screen: "work-log",
    title: "Work Log",
    rows: [
      { keys: "j/k", title: "select" },
      { keys: "enter", title: "edit" },
      { keys: "n", title: "add" },
      { keys: "d", title: "delete" },
      { keys: "/", title: "search" },
      { keys: "f", title: "date" },
      { keys: "1-3", title: "preset" },
      { keys: "c", title: "clear" },
      { keys: "g/G", title: "first/last" },
      { keys: "ctrl+d/u", title: "half page" },
    ],
  },
  {
    screen: "notes",
    title: "Notes",
    rows: [
      { keys: "n", title: "new" },
      { keys: "p", title: "preview" },
      { keys: "b", title: "pin" },
      { keys: "v", title: "privacy" },
      { keys: "x", title: "export" },
      { keys: "d", title: "delete" },
      { keys: "/", title: "search" },
      { keys: "enter", title: "open" },
      { keys: "ctrl+s", title: "save" },
      { keys: "ctrl+enter", title: "todo" },
      { keys: "g/G", title: "first/last" },
      { keys: "ctrl+d/u", title: "half page" },
    ],
  },
];

/** Footer hint for a screen's primary browsing keys, from `SCREEN_KEYMAPS`. */
export function screenHint(screen: string): string {
  const group = SCREEN_KEYMAPS.find((entry) => entry.screen === screen);
  if (group === undefined) {
    return "";
  }
  return group.rows.map((row) => `${row.keys} ${row.title}`).join("  ");
}

/** Flat help model: Navigate, Global, then one section per screen. The help
 * overlay renders this with a native scrollbox. Global command rows apply two
 * exceptions, both derived from the effective bindings so an override cannot
 * drop the row: the palette prefers its universally reachable Ctrl binding
 * (because `/` is preempted by Notes/Todo list search) and falls back to the
 * generic rows when none exists, and the mock panel labels the first non-shift
 * fallback (listing any remaining non-shift bindings plainly) while a Shift
 * primary exists; otherwise every effective binding is listed normally. The runtime
 * repo mode hides mock-only rows in turso mode, matching the palette. */
export function helpSections(repoMode: RepoMode): HelpSection[] {
  const commandRows = (source: Command[]): HelpLine[] =>
    source
      .filter((command) => isCommandAvailable(command, repoMode))
      .flatMap((command) => {
        // Palette: prefer the universally reachable Ctrl binding, but if the
        // override removed it, fall through to the real effective bindings so
        // the command never disappears from help.
        if (command.id === "global.palette") {
          const universal = command.keys.find((binding) => binding.ctrl === true);
          if (universal !== undefined) {
            return [{ key: formatKey(universal), title: command.title }];
          }
        }
        // Mock panel: while a Shift primary exists, list every reachable
        // non-shift binding, labeling the first `(fallback)` and the rest as
        // normal rows. With no primary, render every effective binding as a
        // normal row. Derived by modifier, not by index, so an override cannot
        // mislabel a binding.
        if (command.id === "global.mock-panel") {
          const primary = command.keys.find((binding) => binding.shift === true);
          if (primary !== undefined) {
            const fallbacks = command.keys.filter((binding) => binding.shift !== true);
            if (fallbacks.length > 0) {
              return fallbacks.map((binding, index) => ({
                key: index === 0 ? `${formatKey(binding)} (fallback)` : formatKey(binding),
                title: command.title,
              }));
            }
          }
        }
        return command.keys.map((binding) => ({
          key: formatKey(binding),
          title: command.title,
        }));
      });

  return [
    { label: "Navigate", lines: commandRows(NAV_COMMANDS) },
    { label: "Global", lines: commandRows(GLOBAL_COMMANDS) },
    ...SCREEN_KEYMAPS.map((group) => ({
      label: group.title,
      lines: group.rows.map((row) => ({ key: row.keys, title: row.title })),
    })),
  ];
}

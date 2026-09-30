// Commands as data: the global key handler, the palette, and help all read
// this registry, so the three cannot drift. Every command with a global
// binding declares machine-readable `keys`; the handler matches them with
// `findCommandForKey` and help renders them with `formatKey`.
import type { Command, KeyBinding, KeyPress } from "./registry.types";

const MOCK_ENABLED: boolean = typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED;

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
    hint: "Alt+1",
    group: "nav",
    keys: [{ name: "1", meta: true }],
    run: (ctx) => ctx.navigate("dashboard"),
  },
  {
    id: "nav.todo",
    title: "Go to Todo",
    hint: "Alt+2",
    group: "nav",
    keys: [{ name: "2", meta: true }],
    run: (ctx) => ctx.navigate("todo"),
  },
  {
    id: "nav.links",
    title: "Go to Save Links",
    hint: "Alt+3",
    group: "nav",
    keys: [{ name: "3", meta: true }],
    run: (ctx) => ctx.navigate("links"),
  },
  {
    id: "nav.projects",
    title: "Go to Project Planner",
    hint: "Alt+4",
    group: "nav",
    keys: [{ name: "4", meta: true }],
    run: (ctx) => ctx.navigate("projects"),
  },
  {
    id: "nav.work-log",
    title: "Go to Work Log",
    hint: "Alt+5",
    group: "nav",
    keys: [{ name: "5", meta: true }],
    run: (ctx) => ctx.navigate("work-log"),
  },
  {
    id: "nav.notes",
    title: "Go to Notes",
    hint: "Alt+6",
    group: "nav",
    keys: [{ name: "6", meta: true }],
    run: (ctx) => ctx.navigate("notes"),
  },
];

const paletteCommand: Command = {
  id: "global.palette",
  title: "Open command palette",
  hint: "/ or Ctrl+P",
  group: "global",
  keys: [{ name: "/" }, { name: "p", ctrl: true }],
  run: (ctx) => ctx.openPalette(),
};

const helpCommand: Command = {
  id: "global.help",
  title: "Show help and keymap",
  hint: "?",
  group: "global",
  keys: [{ name: "?" }],
  run: (ctx) => ctx.openHelp(),
};

const themeCommand: Command = {
  id: "global.theme",
  title: "Cycle theme",
  hint: "t",
  group: "global",
  keys: [{ name: "t" }],
  run: (ctx) => ctx.cycleTheme(),
};

const sidebarCommand: Command = {
  id: "global.sidebar",
  title: "Toggle sidebar",
  hint: "Ctrl+\\",
  group: "global",
  keys: [{ name: "\\", ctrl: true }],
  run: (ctx) => ctx.toggleSidebar(),
};

// Dev-only panel entry. Two bindings share one command: the documented
// Ctrl+Shift+D plus a plain Ctrl+D fallback. Terminals without kitty or
// modifyOtherKeys report Ctrl+Shift+D as the single byte 0x04, so the raw
// parser sees name "d" with ctrl true and shift false - the shift:true
// binding alone is unreachable there (see M6). An undeclared shift is
// ignored by matchesKey, so the fallback matches everywhere while the
// primary keeps the Ctrl+Shift+D label in help.
const mockPanelCommand: Command = {
  id: "global.mock-panel",
  title: "Open mock state panel",
  hint: "Ctrl+Shift+D",
  group: "global",
  keys: [
    { name: "d", ctrl: true, shift: true },
    { name: "d", ctrl: true },
  ],
  devOnly: true,
  run: (ctx) => ctx.openMockPanel(),
};

const dismissCommand: Command = {
  id: "global.dismiss",
  title: "Close dialog",
  hint: "Esc",
  group: "global",
  keys: [{ name: "escape" }],
  run: (ctx) => ctx.closeModal(),
};

const quitCommand: Command = {
  id: "global.quit",
  title: "Quit",
  hint: "q or Ctrl+Q",
  group: "global",
  keys: [{ name: "q" }, { name: "q", ctrl: true }, { name: "c", ctrl: true }],
  run: (ctx) => ctx.quit(),
};

// Palette-only entry that re-opens Setup after it was dismissed with mock
// data (H2). No keys so it never hijacks typing; reachable via palette.
const setupCommand: Command = {
  id: "global.setup",
  title: "Open setup",
  hint: "",
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
    hint: "",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("default"),
  },
  {
    id: "mock.scenario-empty",
    title: "Mock scenario: empty",
    hint: "",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("empty"),
  },
  {
    id: "mock.scenario-loading",
    title: "Mock scenario: loading",
    hint: "",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("loading"),
  },
  {
    id: "mock.scenario-error",
    title: "Mock scenario: error",
    hint: "",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("error"),
  },
  {
    id: "mock.scenario-large",
    title: "Mock scenario: large",
    hint: "",
    group: "mock",
    keys: [],
    devOnly: true,
    run: (ctx) => ctx.setScenario("large"),
  },
  {
    id: "mock.reset",
    title: "Reset mock data",
    hint: "",
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

const KEY_LABELS: Record<string, string> = {
  escape: "Esc",
  return: "Enter",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  space: "Space",
  tab: "Tab",
};

/** Display form of one binding, e.g. Ctrl+Shift+D. */
export function formatKey(binding: KeyBinding): string {
  const parts: string[] = [];
  if (binding.ctrl === true) {
    parts.push("Ctrl");
  }
  if (binding.meta === true) {
    parts.push("Alt");
  }
  if (binding.shift === true) {
    parts.push("Shift");
  }
  const lower = binding.name.toLowerCase();
  parts.push(
    KEY_LABELS[lower] ?? (binding.name.length === 1 ? binding.name.toUpperCase() : binding.name),
  );
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

export function filterCommands(query: string): Command[] {
  return commands.filter((command) => isCommandVisible(command) && matchesQuery(command, query));
}

/** True when the command can run given the session state. The setup entry
 * is a silent no-op once the config is complete (App renders Setup only on
 * !configComplete), so the palette hides it there instead of presenting a
 * dead entry. Build visibility still goes through isCommandVisible. */
export function isCommandAvailable(command: Command, configComplete: boolean): boolean {
  if (command.id === "global.setup" && configComplete) {
    return false;
  }
  return isCommandVisible(command);
}

/** Palette filter: build visibility plus session availability. */
export function filterAvailableCommands(query: string, configComplete: boolean): Command[] {
  return commands.filter(
    (command) => isCommandAvailable(command, configComplete) && matchesQuery(command, query),
  );
}

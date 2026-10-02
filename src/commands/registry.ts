// Commands as data: the global key handler, the palette, and help all read
// this registry, so the three cannot drift. Every command with a global
// binding declares machine-readable `keys`; the handler matches them with
// `findCommandForKey` and help renders them with `formatKey`.
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
// binding alone is unreachable there (see M6). An undeclared shift is
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
 * overlay renders this with a native scrollbox. Global command rows apply the
 * two documented exceptions: the mock panel lists its universally reachable
 * fallback binding, and the palette lists Ctrl+P because `/` is preempted by
 * Notes/Todo list search. The runtime repo mode hides mock-only rows in turso
 * mode, matching the palette. */
export function helpSections(repoMode: RepoMode): HelpSection[] {
  const commandRows = (source: Command[]): HelpLine[] =>
    source
      .filter((command) => isCommandAvailable(command, repoMode))
      .flatMap((command) => {
        if (command.id === "global.mock-panel") {
          const fallback = command.keys[1] ?? command.keys[0];
          return fallback === undefined
            ? []
            : [{ key: `${formatKey(fallback)} (fallback)`, title: command.title }];
        }
        if (command.id === "global.palette") {
          const universal = command.keys.find((binding) => binding.ctrl === true);
          return universal === undefined
            ? []
            : [{ key: formatKey(universal), title: command.title }];
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

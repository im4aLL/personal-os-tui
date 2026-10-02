import type { MockScenario } from "../mock/scenario.types";
import type { Screen } from "../store/ui.types";

export type CommandGroup = "nav" | "global" | "mock";

/** Machine-readable key binding for a command. The global key handler
 * matches these; unset modifiers must be absent on the event, while an
 * unset `shift` is ignored (terminals disagree on reporting shift for
 * printable keys, and shifted symbols like `?` imply it). */
export interface KeyBinding {
  name: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

/** Structural key press; compatible with the renderer's ParsedKey. */
export interface KeyPress {
  name: string;
  ctrl: boolean;
  meta: boolean;
  option?: boolean;
  shift: boolean;
}

export interface CommandContext {
  navigate: (screen: Screen) => void;
  cycleTheme: () => void;
  openThemePicker: () => void;
  toggleSidebar: () => void;
  refresh: () => void;
  openPalette: () => void;
  openHelp: () => void;
  closeModal: () => void;
  openMockPanel: () => void;
  showSetup: () => void;
  setScenario: (scenario: MockScenario) => void;
  resetMockData: () => void;
  quit: () => void;
}

/** A row that is handled by a screen's own keyboard scope but documented
 * centrally so the help screen and the screen footer share one source. Screen
 * scopes stay imperative (they need live screen state); these rows describe
 * them, and the footers below are rendered from the same data. */
export interface ScreenKeyRow {
  /** Display form of the binding(s), e.g. "j/k" or "ctrl+s". */
  keys: string;
  /** Short action label, e.g. "move selection". */
  title: string;
}

export interface ScreenKeyGroup {
  screen: string;
  title: string;
  rows: ScreenKeyRow[];
}

export interface Command {
  id: string;
  title: string;
  group: CommandGroup;
  /** Empty for palette-only commands with no global binding. */
  keys: KeyBinding[];
  /** True for dev-only commands, hidden when the mock build flag is off. */
  devOnly?: boolean;
  /** True for commands that only apply while the session runs on mock data,
   * e.g. the mock state panel; the palette hides them in turso mode. */
  mockOnly?: boolean;
  run: (ctx: CommandContext) => void;
}

/** One key/action row in the generated help overlay. */
export interface HelpLine {
  key: string;
  title: string;
}

/** A labelled group of help rows (Navigate, Global, or one per screen). */
export interface HelpSection {
  label: string;
  lines: HelpLine[];
}

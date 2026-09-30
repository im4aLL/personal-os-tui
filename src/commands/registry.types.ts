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
  toggleSidebar: () => void;
  openPalette: () => void;
  openHelp: () => void;
  closeModal: () => void;
  openMockPanel: () => void;
  showSetup: () => void;
  setScenario: (scenario: MockScenario) => void;
  resetMockData: () => void;
  quit: () => void;
}

export interface Command {
  id: string;
  title: string;
  hint: string;
  group: CommandGroup;
  /** Empty for palette-only commands with no global binding. */
  keys: KeyBinding[];
  /** True for dev-only commands, hidden when the mock build flag is off. */
  devOnly?: boolean;
  run: (ctx: CommandContext) => void;
}

import type { SettingsRepo, SetupRepo } from "../repos/types";
import type { Screen } from "../store/ui.types";

export interface AppBootstrap {
  onRequestQuit: () => void;
  /** Setup seam for the first-run flow (mock or turso per resolution). */
  setup: SetupRepo;
  settings: SettingsRepo;
}

export interface ScreenContentProps {
  screen: Screen;
}

export interface ShellProps {
  quit: () => void;
  setup: SetupRepo;
  settings: SettingsRepo;
}

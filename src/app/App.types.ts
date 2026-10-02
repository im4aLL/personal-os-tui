import type { SettingsRepo, SetupRepo } from "../repos/types";
import type { Screen } from "../store/ui.types";

export interface AppBootstrap {
  /** Request app shutdown. Awaits any pending writes (for example a debounced
   * note autosave) before the renderer is destroyed. */
  onRequestQuit: () => Promise<void>;
  /** Setup seam for the first-run flow (mock or turso per resolution). */
  setup: SetupRepo;
  settings: SettingsRepo;
}

export interface ScreenContentProps {
  screen: Screen;
}

export interface ShellProps {
  quit: () => Promise<void>;
  setup: SetupRepo;
  settings: SettingsRepo;
}

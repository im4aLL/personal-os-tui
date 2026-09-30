import type { Screen } from "../store/ui.types";

export interface AppBootstrap {
  onRequestQuit: () => void;
}

export interface ScreenContentProps {
  screen: Screen;
}

export interface ShellProps {
  quit: () => void;
}

import type { Screen } from "../store/ui.types";

export interface SidebarProps {
  screen: Screen;
  rail: boolean;
  /** Mouse navigation; additive to Alt+1..6 and the palette. */
  onSelect?: (screen: Screen) => void;
}

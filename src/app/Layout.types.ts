import type { ReactNode } from "react";
import type { Screen } from "../store/ui.types";

export interface LayoutProps {
  screen: Screen;
  sidebarHidden: boolean;
  sidebarRail: boolean;
  /** Forwarded to the sidebar so a mouse click navigates like Alt+1..6. */
  onNavigate?: (screen: Screen) => void;
  children: ReactNode;
}

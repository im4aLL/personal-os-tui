import type { ReactNode } from "react";
import type { Screen } from "../store/ui.types";

export interface LayoutProps {
  screen: Screen;
  sidebarHidden: boolean;
  sidebarRail: boolean;
  children: ReactNode;
}

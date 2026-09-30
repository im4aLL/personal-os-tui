import type { ColorInput } from "@opentui/core";
import type { ReactNode } from "react";
import type { ColorCaps } from "./degrade.types";
import type { Theme } from "./types";

export interface ThemeContextValue {
  theme: Theme;
  caps: ColorCaps;
  /** Map a theme hex to a renderer-safe color for fg/bg props. */
  color: (hex: string) => ColorInput;
}

export interface ThemeProviderProps {
  themeId: string;
  children: ReactNode;
}

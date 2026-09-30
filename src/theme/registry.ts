// Data-driven theme registry. Adding a palette later is a data-only change:
// append one object with the same 26 keys.
import { frappe, latte, macchiato, mocha } from "./catppuccin";
import type { Theme, ThemePalette, ThemeTokens } from "./types";

export function deriveTokens(palette: ThemePalette): ThemeTokens {
  return {
    bg: palette.base,
    bgPanel: palette.mantle,
    bgAlt: palette.surface0,
    bgRaised: palette.surface1,
    bgHover: palette.surface2,
    border: palette.surface1,
    borderMuted: palette.surface0,
    borderFocus: palette.mauve,
    fg: palette.text,
    fgMuted: palette.subtext0,
    fgSubtle: palette.overlay1,
    fgDisabled: palette.overlay0,
    accent: palette.mauve,
    accentAlt: palette.blue,
    success: palette.green,
    warning: palette.yellow,
    danger: palette.red,
    info: palette.sky,
    link: palette.sapphire,
    selectionBg: palette.surface2,
    selectionFg: palette.text,
    cursor: palette.rosewater,
    statusBg: palette.crust,
    statusFg: palette.subtext0,
    headerBg: palette.mantle,
    sidebarBg: palette.crust,
    sidebarActiveBg: palette.surface0,
    sidebarActiveFg: palette.text,
    priorityHigh: palette.red,
    priorityMedium: palette.peach,
    priorityLow: palette.blue,
    phaseFallback: palette.overlay1,
  };
}

function makeTheme(id: string, label: string, dark: boolean, palette: ThemePalette): Theme {
  return { id, label, dark, palette, tokens: deriveTokens(palette) };
}

const themes: Record<string, Theme> = {
  latte: makeTheme("latte", "Latte", false, latte),
  frappe: makeTheme("frappe", "Frappe", true, frappe),
  macchiato: makeTheme("macchiato", "Macchiato", true, macchiato),
  mocha: makeTheme("mocha", "Mocha", true, mocha),
};

export const defaultThemeId = "mocha";

/** Cycle order for the `t` key: Latte, Frappe, Macchiato, Mocha. */
export const themeOrder: string[] = ["latte", "frappe", "macchiato", "mocha"];

export function listThemes(): Theme[] {
  return themeOrder.map((id) => themes[id]);
}

export function getTheme(id: string | undefined): Theme {
  if (id !== undefined && themes[id] !== undefined) {
    return themes[id];
  }
  return themes[defaultThemeId];
}

export function nextThemeId(current: string): string {
  const index = themeOrder.indexOf(current);
  if (index === -1) {
    return defaultThemeId;
  }
  return themeOrder[(index + 1) % themeOrder.length];
}

// Theme shape: 26 raw Catppuccin colors plus the semantic tokens the UI consumes.
export interface ThemePalette {
  base: string;
  mantle: string;
  crust: string;
  surface0: string;
  surface1: string;
  surface2: string;
  overlay0: string;
  overlay1: string;
  overlay2: string;
  text: string;
  subtext0: string;
  subtext1: string;
  rosewater: string;
  flamingo: string;
  pink: string;
  mauve: string;
  red: string;
  maroon: string;
  peach: string;
  yellow: string;
  green: string;
  teal: string;
  sky: string;
  sapphire: string;
  blue: string;
  lavender: string;
}

export interface ThemeTokens {
  bg: string;
  bgPanel: string;
  bgAlt: string;
  bgRaised: string;
  bgHover: string;
  border: string;
  borderMuted: string;
  borderFocus: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  fgDisabled: string;
  accent: string;
  accentAlt: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  link: string;
  selectionBg: string;
  selectionFg: string;
  cursor: string;
  statusBg: string;
  statusFg: string;
  headerBg: string;
  sidebarBg: string;
  sidebarActiveBg: string;
  sidebarActiveFg: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  phaseFallback: string;
}

export interface Theme {
  id: string;
  label: string;
  dark: boolean;
  palette: ThemePalette;
  tokens: ThemeTokens;
}

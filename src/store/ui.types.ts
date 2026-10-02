export type Screen = "dashboard" | "todo" | "links" | "projects" | "work-log" | "notes";

export type ModalKind = "none" | "command-palette" | "help" | "mock-panel" | "theme-picker";

export interface UiState {
  screen: Screen;
  modal: ModalKind;
  sidebarCollapsed: boolean;
  /** When true, every note row except the selected one is masked. */
  notesPrivacyMode: boolean;
  paletteQuery: string;
  paletteIndex: number;
  /** Highlighted row in the theme picker modal (Ctrl+T). */
  themePickerIndex: number;
  /** True after the user dismisses the first-run Setup (e.g. mock demo). */
  setupDismissed: boolean;
  /** Explicit request to show Setup again from the palette (edit mode), even
   * once onboarding is complete. Cleared by dismissSetup. */
  setupOpen: boolean;
  /** Id of the control that owns the keyboard, or null for form-level keys.
   * Text inputs set this while focused so the global key handler in App can
   * defer to them instead of hijacking typing (PLAN: global defers via
   * `ui.focusedField`). Setup owns its ids (`setup-url`, ...). */
  focusedField: string | null;
  /** True while the `:` ex-line prompt owns the status line. */
  exOpen: boolean;
  /** Text typed after `:` while the prompt is open. */
  exQuery: string;
  /** Inline result of the last rejected ex command, shown on the status line
   * until the next key. Null when there is nothing to report. */
  exError: string | null;
  setScreen: (screen: Screen) => void;
  openModal: (modal: Exclude<ModalKind, "none">) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setNotesPrivacyMode: (enabled: boolean) => void;
  setPaletteQuery: (query: string) => void;
  setPaletteIndex: (index: number) => void;
  setThemePickerIndex: (index: number) => void;
  setFocusedField: (field: string | null) => void;
  openEx: () => void;
  closeEx: () => void;
  setExQuery: (query: string) => void;
  setExError: (error: string) => void;
  clearExError: () => void;
  dismissSetup: () => void;
  showSetupScreen: () => void;
}

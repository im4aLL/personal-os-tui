export type Screen = "dashboard" | "todo" | "links" | "projects" | "work-log" | "notes";

export type ModalKind = "none" | "command-palette" | "help" | "mock-panel";

export interface UiState {
  screen: Screen;
  modal: ModalKind;
  sidebarCollapsed: boolean;
  paletteQuery: string;
  paletteIndex: number;
  setupDismissed: boolean;
  /** Id of the control that owns the keyboard, or null for form-level keys.
   * Text inputs set this while focused so the global key handler in App can
   * defer to them instead of hijacking typing (PLAN: global defers via
   * `ui.focusedField`). Setup owns its ids (`setup-url`, ...). */
  focusedField: string | null;
  setScreen: (screen: Screen) => void;
  openModal: (modal: Exclude<ModalKind, "none">) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPaletteQuery: (query: string) => void;
  setPaletteIndex: (index: number) => void;
  setFocusedField: (field: string | null) => void;
  dismissSetup: () => void;
  showSetupScreen: () => void;
}

export type Screen = "dashboard" | "todo" | "links" | "projects" | "work-log" | "notes";

export type ModalKind = "none" | "command-palette" | "help" | "mock-panel";

export interface UiState {
  screen: Screen;
  modal: ModalKind;
  sidebarCollapsed: boolean;
  paletteQuery: string;
  paletteIndex: number;
  setupDismissed: boolean;
  setScreen: (screen: Screen) => void;
  openModal: (modal: Exclude<ModalKind, "none">) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPaletteQuery: (query: string) => void;
  setPaletteIndex: (index: number) => void;
  dismissSetup: () => void;
  showSetupScreen: () => void;
}

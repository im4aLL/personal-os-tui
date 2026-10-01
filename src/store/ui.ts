// UI store: screen, modal, sidebar. No data fetching lives here in M0.
import { create } from "zustand";
import type { ModalKind, Screen, UiState } from "./ui.types";

export const SCREEN_ORDER: Screen[] = [
  "dashboard",
  "todo",
  "links",
  "projects",
  "work-log",
  "notes",
];

export const SCREEN_TITLES: Record<Screen, string> = {
  dashboard: "Dashboard",
  todo: "Todo",
  links: "Save Links",
  projects: "Project Planner",
  "work-log": "Work Log",
  notes: "Notes",
};

export const SCREEN_SHORT_LABELS: Record<Screen, string> = {
  dashboard: "Da",
  todo: "To",
  links: "Li",
  projects: "Pr",
  "work-log": "Wo",
  notes: "No",
};

export const useUi = create<UiState>((set) => {
  return {
    screen: "dashboard",
    modal: "none",
    sidebarCollapsed: false,
    paletteQuery: "",
    paletteIndex: 0,
    setupDismissed: false,
    focusedField: null,
    setScreen: (screen: Screen) => {
      set({ screen, modal: "none" });
    },
    openModal: (modal: Exclude<ModalKind, "none">) => {
      set({ modal });
    },
    closeModal: () => {
      set({ modal: "none" });
    },
    toggleSidebar: () => {
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    },
    setSidebarCollapsed: (sidebarCollapsed: boolean) => {
      set({ sidebarCollapsed });
    },
    setPaletteQuery: (paletteQuery: string) => {
      set({ paletteQuery, paletteIndex: 0 });
    },
    setPaletteIndex: (paletteIndex: number) => {
      set({ paletteIndex });
    },
    setFocusedField: (focusedField: string | null) => {
      set({ focusedField });
    },
    dismissSetup: () => {
      // Releasing focus: a dismissed Setup must never keep the global
      // handler deferred (e.g. Alt+1..6 away from a focused setup field).
      set({ setupDismissed: true, modal: "none", focusedField: null });
    },
    showSetupScreen: () => {
      set({ setupDismissed: false, modal: "none", focusedField: null });
    },
  };
});

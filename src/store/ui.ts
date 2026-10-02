// UI store: screen, modal, sidebar. No data fetching lives here.
import { create } from "zustand";
import { saveUiPreferences } from "../lib/config";
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
    notesPrivacyMode: false,
    paletteQuery: "",
    paletteIndex: 0,
    themePickerIndex: 0,
    setupDismissed: false,
    setupOpen: false,
    focusedField: null,
    exOpen: false,
    exQuery: "",
    exError: null,
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
    setNotesPrivacyMode: (notesPrivacyMode: boolean) => {
      set({ notesPrivacyMode });
      void saveUiPreferences({ notesPrivacyMode }).catch(() => {});
    },
    setPaletteQuery: (paletteQuery: string) => {
      set({ paletteQuery, paletteIndex: 0 });
    },
    setPaletteIndex: (paletteIndex: number) => {
      set({ paletteIndex });
    },
    setThemePickerIndex: (themePickerIndex: number) => {
      set({ themePickerIndex });
    },
    setFocusedField: (focusedField: string | null) => {
      set({ focusedField });
    },
    openEx: () => {
      set({ exOpen: true, exQuery: "", exError: null });
    },
    closeEx: () => {
      set({ exOpen: false, exQuery: "" });
    },
    setExQuery: (exQuery: string) => {
      set({ exQuery });
    },
    setExError: (exError: string) => {
      set({ exError });
    },
    clearExError: () => {
      set({ exError: null });
    },
    dismissSetup: () => {
      // Releasing focus: a dismissed Setup must never keep the global
      // handler deferred (e.g. Alt+1..6 away from a focused setup field).
      set({ setupDismissed: true, setupOpen: false, modal: "none", focusedField: null });
    },
    showSetupScreen: () => {
      set({ setupOpen: true, setupDismissed: false, modal: "none", focusedField: null });
    },
  };
});

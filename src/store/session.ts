// Session store: profile, theme, repository mode, mock state.
// Mirrors the desktop session shape; per-domain stores arrive per feature.
//
// Mock scenario/latency live here as plain values, but this module never
// imports `src/mock/**` by path: the bundle carries a `MockUiState` created
// inside the dynamic mock boundary (see `src/repos/index.ts`), so the mock
// chunk stays droppable in production builds. Without it the session keeps
// inert defaults and every mock mutation is a no-op.
import { create } from "zustand";
import type { MockScenario } from "../mock/scenario.types";
import { nextThemeId } from "../theme/registry";
import type { InitSessionValues, SessionState } from "./session.types";

export const useSession = create<SessionState>((set, get) => {
  return {
    profileName: "Alex Johnson",
    themeId: "mocha",
    repoMode: "mock",
    repoReason: "",
    configComplete: false,
    fromEnv: false,
    loosePermissions: false,
    scenario: "default",
    scenarios: [],
    latencyMs: 0,
    mockUi: null,
    resetMockData: null,
    setThemeId: (themeId: string) => {
      set({ themeId });
    },
    cycleTheme: () => {
      set((state) => ({ themeId: nextThemeId(state.themeId) }));
    },
    setScenario: (scenario: MockScenario) => {
      const api = get().mockUi;
      if (api === null) {
        return;
      }
      set({ scenario: api.setScenario(scenario) });
    },
    setLatencyMs: (latencyMs: number) => {
      const api = get().mockUi;
      if (api === null) {
        return;
      }
      set({ latencyMs: api.setLatencyMs(latencyMs) });
    },
  };
});

/** Seed session from bootstrap values (config + resolved repo bundle). */
export function initSession(values: InitSessionValues): void {
  useSession.setState({
    themeId: values.themeId,
    repoMode: values.repoMode,
    repoReason: values.repoReason,
    configComplete: values.configComplete,
    fromEnv: values.fromEnv,
    loosePermissions: values.loosePermissions,
    scenario: values.mockUi?.scenario ?? "default",
    scenarios: values.mockUi?.scenarios ?? [],
    latencyMs: values.mockUi?.latencyMs ?? 0,
    mockUi: values.mockUi,
    resetMockData: values.resetMockData,
  });
}

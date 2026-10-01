import type { MockScenario } from "../mock/scenario.types";
import type { MockUiState } from "../repos/index.types";
import type { RepoMode } from "../repos/resolve.types";

export interface SessionState {
  profileName: string;
  themeId: string;
  repoMode: RepoMode;
  repoReason: string;
  configComplete: boolean;
  fromEnv: boolean;
  loosePermissions: boolean;
  /** Bootstrap connectivity probe for the header dot, not live per-request
   * health: null = unknown (probe skipped or timed out), true = reachable at
   * bootstrap, false = bootstrap probe failed. Mock mode ignores it. */
  connectionOk: boolean | null;
  scenario: MockScenario;
  scenarios: MockScenario[];
  latencyMs: number;
  mockUi: MockUiState | null;
  resetMockData: (() => void) | null;
  cycleTheme: () => void;
  setProfileName: (name: string) => void;
  setConfigComplete: (complete: boolean) => void;
  setConnectionOk: (ok: boolean | null) => void;
  setScenario: (scenario: MockScenario) => void;
  setLatencyMs: (ms: number) => void;
}

/** Bootstrap values passed to `initSession`. */
export interface InitSessionValues {
  themeId: string;
  repoMode: RepoMode;
  repoReason: string;
  configComplete: boolean;
  fromEnv: boolean;
  loosePermissions: boolean;
  resetMockData: () => void;
  mockUi: MockUiState | null;
}

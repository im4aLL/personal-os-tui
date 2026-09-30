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
  scenario: MockScenario;
  scenarios: MockScenario[];
  latencyMs: number;
  mockUi: MockUiState | null;
  resetMockData: (() => void) | null;
  cycleTheme: () => void;
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

import type { LoadedConfig } from "../lib/config.types";
import type { MockScenario } from "../mock/scenario.types";
import type { RepoMode } from "./resolve.types";
import type { ReposBundle, SetupRepo } from "./types";

/** Mock-only UI state (scenario, latency). Created inside the dynamic mock
 * boundary and carried on the bundle so no store, screen, or component ever
 * imports mock code by path. Null in turso mode and in production builds,
 * where the session falls back to inert defaults. */
export interface MockUiState {
  scenario: MockScenario;
  latencyMs: number;
  scenarios: MockScenario[];
  /** Persist the scenario to the mock env and return the canonical value. */
  setScenario: (scenario: MockScenario) => MockScenario;
  /** Persist the latency to the mock env and return the canonical value. */
  setLatencyMs: (ms: number) => number;
}

export interface RepoBundle extends ReposBundle {
  mode: RepoMode;
  reason: string;
  loaded: LoadedConfig;
  mockUi: MockUiState | null;
  /** Reseeds mock data; a no-op in turso mode. Kept on the bundle so no
   * screen, store, or component ever imports mock code by path. */
  resetMockData: () => void;
}

/** The setup-only view of the bundle, for flows that never touch data repos. */
export interface SetupBundle {
  mode: RepoMode;
  reason: string;
  loaded: LoadedConfig;
  setup: SetupRepo;
}

export interface GetReposOptions {
  mockFlag: boolean;
  tursoFlag: boolean;
}

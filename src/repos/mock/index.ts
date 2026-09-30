// Mock bundle factory plus fixture reset for the MockStatePanel.
import { createFixtures } from "../../mock/fixtures";
import { currentLatencyMs, resolveLatencyMs } from "../../mock/latency";
import { currentScenario, mockScenarios } from "../../mock/scenario";
import type { MockScenario } from "../../mock/scenario.types";
import type { MockUiState } from "../index.types";
import type { ReposBundle } from "../types";
import { mockLinkRepo, resetLinkFixtures } from "./links";
import { mockNoteRepo, resetNoteFixtures } from "./notes";
import { mockProjectRepo, resetProjectFixtures } from "./projects";
import { mockSettingsRepo, resetSettingsFixtures } from "./settings";
import { mockSetupRepo } from "./setup";
import { mockTodoRepo, resetTodoFixtures } from "./todos";
import { mockWorkLogRepo, resetWorkLogFixtures } from "./workLogs";

export function createMockRepos(): ReposBundle {
  return {
    repos: {
      todos: mockTodoRepo,
      notes: mockNoteRepo,
      links: mockLinkRepo,
      workLogs: mockWorkLogRepo,
      projects: mockProjectRepo,
      settings: mockSettingsRepo,
    },
    setup: mockSetupRepo,
  };
}

/** Seed + mutate the mock UI state. This is the only path through which the
 * session learns mock scenario/latency values, so `src/mock/**` stays
 * reachable solely via the dynamic import in `src/repos/index.ts` and is
 * dropped from production builds. */
export function createMockUiState(): MockUiState {
  return {
    scenario: currentScenario(),
    latencyMs: currentLatencyMs(),
    scenarios: [...mockScenarios],
    setScenario: (scenario: MockScenario) => {
      process.env.POS_MOCK_SCENARIO = scenario;
      return currentScenario();
    },
    setLatencyMs: (ms: number) => {
      process.env.POS_MOCK_LATENCY = String(resolveLatencyMs(String(ms)));
      return currentLatencyMs();
    },
  };
}

export function resetMockData(): void {
  const fixtures = createFixtures();
  resetTodoFixtures(fixtures);
  resetNoteFixtures(fixtures);
  resetLinkFixtures(fixtures);
  resetWorkLogFixtures(fixtures);
  resetProjectFixtures(fixtures);
  resetSettingsFixtures();
}

// Mock scenarios, from POS_MOCK_SCENARIO=default|empty|loading|error|large.
import type { MockScenario } from "./scenario.types";

export const mockScenarios: MockScenario[] = ["default", "empty", "loading", "error", "large"];

export function parseScenario(raw: string | undefined): MockScenario {
  if (raw === "empty" || raw === "loading" || raw === "error" || raw === "large") {
    return raw;
  }
  return "default";
}

export function currentScenario(): MockScenario {
  return parseScenario(process.env.POS_MOCK_SCENARIO);
}

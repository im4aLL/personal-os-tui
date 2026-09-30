// Shared mock plumbing: latency, error injection, and scenario transforms.
// Every mock repo method goes through `mockCall` so loading, skeleton, and
// error states stay reviewable without touching feature code.
//
// Deliberate asymmetry: there is no `src/repos/turso/guard.ts`. The turso
// side throws `not wired yet` stubs per method, so shared plumbing would
// have nothing to wrap; this file exists only to serve the mock boundary.
import { currentLatencyMs, delay } from "../../mock/latency";
import { currentScenario } from "../../mock/scenario";

export async function mockCall<T>(fn: () => T): Promise<T> {
  const scenario = currentScenario();
  if (scenario === "loading") {
    // Effectively stuck: the UI shows skeletons until the scenario changes.
    await delay(30_000);
  } else {
    await delay(currentLatencyMs());
  }
  if (currentScenario() === "error") {
    throw new Error("mock error injection (POS_MOCK_SCENARIO=error)");
  }
  return fn();
}

/** Apply the empty/large scenarios to a list result. */
export function applyListScenario<T>(rows: T[], clone: (row: T, index: number) => T): T[] {
  const scenario = currentScenario();
  if (scenario === "empty") {
    return [];
  }
  if (scenario === "large" && rows.length > 0) {
    const out = [...rows];
    for (let i = 0; i < 200; i++) {
      out.push(clone(rows[i % rows.length], i));
    }
    return out;
  }
  return [...rows];
}

export function isEmptyScenario(): boolean {
  return currentScenario() === "empty";
}

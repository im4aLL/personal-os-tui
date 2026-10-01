// Shared mock plumbing: latency, error injection, and scenario transforms.
// Every mock repo method goes through `mockCall` so loading, skeleton, and
// error states stay reviewable without touching feature code.
//
// Deliberate asymmetry: there is no `src/repos/turso/guard.ts`. The turso
// side throws `not wired yet` stubs per method, so shared plumbing would
// have nothing to wrap; this file exists only to serve the mock boundary.
import { currentLatencyMs, delay } from "../../mock/latency";
import { currentScenario } from "../../mock/scenario";

/** Shared `large` default: the total row count a list reaches by repeating its
 * fixture rows. PLAN's per-domain counts (M2-M7) replace this once each
 * feature's fixtures land; until then every list gets the same reviewable size. */
const LARGE_SCENARIO_ROWS = 200;

export async function mockCall<T>(fn: () => T): Promise<T> {
  const scenario = currentScenario();
  if (scenario === "loading") {
    // Sticky-ish delay so the UI shows skeletons long enough to review.
    // PLAN documents `loading` as 1500 ms for the shared guard.
    await delay(1500);
  } else {
    await delay(currentLatencyMs());
  }
  if (currentScenario() === "error") {
    throw new Error("mock error injection (POS_MOCK_SCENARIO=error)");
  }
  return fn();
}

/** Apply the empty/large scenarios to a list result. `largeTotal` is the
 * target row count for the `large` scenario (default `LARGE_SCENARIO_ROWS`);
 * rows repeat until the list reaches it, so a domain with a small fixture set
 * can request its own reviewable size (M2 todos use 150). */
export function applyListScenario<T>(
  rows: T[],
  clone: (row: T, index: number) => T,
  largeTotal: number = LARGE_SCENARIO_ROWS,
): T[] {
  const scenario = currentScenario();
  if (scenario === "empty") {
    return [];
  }
  if (scenario === "large" && rows.length > 0) {
    const out = [...rows];
    let index = 0;
    while (out.length < largeTotal) {
      out.push(clone(rows[index % rows.length], index));
      index += 1;
    }
    return out;
  }
  return [...rows];
}

export function isEmptyScenario(): boolean {
  return currentScenario() === "empty";
}

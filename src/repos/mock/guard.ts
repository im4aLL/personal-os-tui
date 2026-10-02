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
 * fixture rows, so every list gets the same reviewable size. */
const LARGE_SCENARIO_ROWS = 200;

/** Extra delay for the `slow` scenario, on top of the configured latency, so
 * 3 s is the floor even when POS_MOCK_LATENCY is 0. */
const SLOW_SCENARIO_MS = 3000;

export async function mockCall<T>(fn: () => T): Promise<T> {
  const scenario = currentScenario();
  if (scenario === "loading") {
    // Sticky-ish delay so the UI shows skeletons long enough to review.
    await delay(1500);
  } else if (scenario === "slow") {
    // `slow` exists only to review patience and cancel affordances; 3 s is
    // long enough for every call to reach for the keyboard.
    await delay(currentLatencyMs() + SLOW_SCENARIO_MS);
  } else {
    await delay(currentLatencyMs());
  }
  // Two independent error paths: the `error` scenario throws for every call,
  // while the dev-panel toggle lets any other scenario also fail (so a screen
  // can stay in `large` while writes are rejected).
  if (scenario === "error" || currentErrorInjection()) {
    throw new Error("mock error injection (Pos mock scenario=error or POS_MOCK_ERROR=1)");
  }
  return fn();
}

/** Dev-panel error toggle, independent of the scenario so a screen can be
 * held in `large` (or any shape) while every write and read fails. Defaults
 * off; set by the mock bundle from `POS_MOCK_ERROR`. */
export function currentErrorInjection(): boolean {
  return process.env.POS_MOCK_ERROR === "1";
}

/** Apply the empty/large scenarios to a list result. `largeTotal` is the
 * target row count for the `large` scenario (default `LARGE_SCENARIO_ROWS`);
 * rows repeat until the list reaches it, so a domain with a small fixture set
 * can request its own reviewable size (todos use 150). */
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

/** Error for a mutation miss in the mock repos. `large` clones are read-only:
 * their ids carry a `-large-<n>` suffix and map back to no source row, so a
 * write against one would otherwise throw a raw `mock <domain> not found`
 * that leaks the synthetic id. Name the operation and a next step instead. */
export function mockMutationError(domain: string, id: string): Error {
  if (id.includes("-large-")) {
    return new Error(
      `${domain} rows in the large scenario are read-only - switch scenario or press r to reset`,
    );
  }
  return new Error(`mock ${domain} not found: ${id}`);
}

/** Reject a destructive mutation against a `large` clone. The clone's id maps
 * back to no source row, so without this the filter is a silent no-op; throw
 * the friendly read-only error instead. A plain miss on a base id is left to
 * the caller's existing silent no-op, so deleting a non-existent base row does
 * not regress. Accepts one id or a batch; a batch throws before any mutation. */
export function assertNotLargeClone(domain: string, ids: string | string[]): void {
  const list = Array.isArray(ids) ? ids : [ids];
  for (const id of list) {
    if (id.includes("-large-")) {
      throw mockMutationError(domain, id);
    }
  }
}

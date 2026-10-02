import type { DashboardCounts } from "../repos/types";

export interface DashboardState {
  /** True while the single batched dashboard request is in flight. */
  loading: boolean;
  /** Last batch failure, with the failing section named; cleared on success. */
  error: string | null;
  /** Wall-clock duration of the last batch, or null before one runs. */
  latencyMs: number | null;
  /** Counts from the last successful snapshot, retained across failures. */
  counts: DashboardCounts | null;
  /** Load every dashboard section in one request and distribute the result. */
  loadDashboard: () => Promise<void>;
}

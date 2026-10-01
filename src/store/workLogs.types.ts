import type { WeekGroup } from "../lib/week-groups.types";
import type { WorkLog, WorkLogFilter } from "../repos/types";

/** The mutable fields of a work log: what an edit may patch optimistically. */
export type WorkLogPatch = Partial<
  Pick<WorkLog, "title" | "description" | "startDate" | "endDate" | "tags">
>;

export interface WorkLogsState {
  /** The filtered list, newest first, as returned by the repository. */
  logs: WorkLog[];
  /** `logs` bucketed into ISO weeks; kept in sync by every mutation. */
  groups: WeekGroup[];
  /** Distinct tag names across the tag pool, sorted ascending. */
  allTags: string[];
  /** True while a first load runs (skeletons); a filter change never sets it. */
  loading: boolean;
  filter: WorkLogFilter;
  /** Last load/filter failure; a filter failure keeps the previous list. */
  error: string | null;

  /** First load with the skeleton state; resets the filter to all entries. */
  loadWorkLogs: () => Promise<void>;
  /** Silent reload of the active filter: no loading flag, used after a write. */
  refreshWorkLogs: () => Promise<void>;
  /** Apply a filter and reload; keeps the previous list on failure. */
  applyFilter: (filter: WorkLogFilter) => Promise<void>;
  /** Repeat the last failed load/filter. */
  retry: () => Promise<void>;
  addWorkLog: (log: WorkLog) => void;
  patchWorkLog: (id: string, patch: WorkLogPatch) => void;
  removeWorkLog: (id: string) => void;
  /** Re-read the used-tag pool (after a create or tag change). */
  reloadTags: () => Promise<void>;
}

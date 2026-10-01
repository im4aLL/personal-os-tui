import type { WorkLog } from "../repos/types";

/** One ISO-week bucket of work logs: a stable key for React keys, the display
 * label ("This week", "Last week", "Week of Jul 7"), and its entries in the
 * order they arrived (already newest first from the repository). */
export interface WeekGroup {
  label: string;
  weekKey: string;
  logs: WorkLog[];
}

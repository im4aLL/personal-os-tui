import type { Screen } from "../store/ui.types";

/** The five focus targets, in Tab/Shift+Tab order. `stats` holds the four
 * cards; the rest are list panels. */
export type DashboardFocus = "stats" | "focus" | "projects" | "in-progress" | "activity";

export type ActivityKind = "note" | "link" | "work";

/** One row of the Recent Activity panel. */
export interface ActivityItem {
  key: string;
  kind: ActivityKind;
  title: string;
  meta: string;
  /** ISO datetime used for the newest-first sort and the relative label. */
  date: string;
}

/** One stat card. `value` is null when its source store errored, so the card
 * shows a placeholder instead of a wrong number. */
export interface StatCard {
  label: string;
  target: Screen;
  value: number | null;
  loading: boolean;
  error: boolean;
}

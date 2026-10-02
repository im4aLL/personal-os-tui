import type { WeekHeader } from "../../lib/week-utils.types";

export interface WeekGridHeaderProps {
  /** Visible week columns, already sliced to the window. */
  headers: WeekHeader[];
  /** Total project weeks, for the window indicator. */
  totalWeeks: number;
  /** 0-based index of the first visible week. */
  windowStart: number;
  /** Grid content width in columns. */
  width: number;
  taskWidth: number;
  resWidth: number;
  weekColumnWidth: number;
  /** Total width in columns reserved for all visible week columns, including
   * the one-column gaps between them. */
  weekAreaWidth: number;
  /** True when the grid owns the keyboard (bold column labels). */
  focused: boolean;
  /** Renders two dim header bars instead of the real labels. */
  loading: boolean;
}

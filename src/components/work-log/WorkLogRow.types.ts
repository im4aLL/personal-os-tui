import type { WorkLog } from "../../repos/types";

export interface WorkLogRowProps {
  log: WorkLog;
  /** Draws the `> ` marker and emphasizes the title. */
  selected: boolean;
  /** Content width available for this row, in columns. */
  width: number;
  /** Below 90 columns: the description and tags collapse to one metadata line. */
  narrow: boolean;
  /** Below 60 columns: the date range moves into the metadata line. */
  veryNarrow: boolean;
  /** Mouse: primary click selects this row; a double-click activates it. */
  onSelect?: () => void;
  onActivate?: () => void;
}

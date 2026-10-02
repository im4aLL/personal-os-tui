import type { Todo } from "../../repos/types";

export interface TodoRowProps {
  todo: Todo;
  /** Draws the `> ` marker and emphasizes the title. */
  selected: boolean;
  /** Ignored: rows always render badges on a second line. Kept for callers. */
  compact?: boolean;
  /** Content width available for this row, in columns. */
  width: number;
  /** Mouse: primary click selects this row; a double-click activates it. */
  onSelect?: () => void;
  onActivate?: () => void;
}

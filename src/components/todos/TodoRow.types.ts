import type { Todo } from "../../repos/types";

export interface TodoRowProps {
  todo: Todo;
  /** Draws the `> ` marker and emphasizes the title. */
  selected: boolean;
  /** Below 70 columns: badges move to a second line so the title keeps room. */
  compact: boolean;
  /** Content width available for this row, in columns. */
  width: number;
}

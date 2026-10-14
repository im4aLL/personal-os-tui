import type { Todo } from "../../repos/types";

export interface ArchivedTodosDialogProps {
  todos: Todo[];
  /** Index of the highlighted row. */
  selectedIndex: number;
  loading: boolean;
  /** Maximum rows rendered (windowed around the selection). */
  maxRows: number;
  /** Mouse: a primary click selects a row, a second within the double-click
   * window restores it (the same action as `r`). */
  onSelect?: (index: number) => void;
  onActivate?: (todo: Todo) => void;
}

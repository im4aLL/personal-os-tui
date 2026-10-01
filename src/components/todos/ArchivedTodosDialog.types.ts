import type { Todo } from "../../repos/types";

export interface ArchivedTodosDialogProps {
  todos: Todo[];
  /** Index of the highlighted row. */
  selectedIndex: number;
  loading: boolean;
  /** Maximum rows rendered (windowed around the selection). */
  maxRows: number;
}

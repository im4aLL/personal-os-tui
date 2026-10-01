import type { Todo, TodoStatus } from "../../repos/types";

export interface KanbanColumnProps {
  status: TodoStatus;
  label: string;
  /** The already-windowed rows to render. */
  items: Todo[];
  /** Total rows in the column after filtering (drives the header count). */
  count: number;
  selectedId: string | null;
  compact: boolean;
  columnWidth: number;
  /** True in the wide layout: the column grows to fill its share of the row. */
  flex: boolean;
}

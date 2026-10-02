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
  /** Inner text width available to each row, in columns. */
  columnWidth: number;
  /** True when this column is the focused one (border/title emphasis). */
  focused: boolean;
  /** `box` draws a bordered column (wide grid); `plain` draws rows only. */
  variant: "box" | "plain";
}

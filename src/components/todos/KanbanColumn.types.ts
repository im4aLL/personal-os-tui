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
  /** Mouse: select/activate a todo row without a keyboard. */
  onSelectTodo?: (todo: Todo) => void;
  onActivateTodo?: (todo: Todo) => void;
  /** Mouse wheel over this column: -1 up, +1 down. */
  onWheel?: (delta: number) => void;
}

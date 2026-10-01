import type { Todo } from "../repos/types";

export interface TodosState {
  todos: Todo[];
  loading: boolean;
  /** Last load/refresh failure; cleared by a successful load. */
  error: string | null;
  /** Load with the skeleton state (initial mount, scenario change, revert). */
  loadTodos: () => Promise<void>;
  /** Silent reload: no loading flag, used after a successful write. */
  refreshTodos: () => Promise<void>;
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  addTodos: (todos: Todo[]) => void;
  patchTodo: (id: string, patch: Partial<Todo>) => void;
  removeTodo: (id: string) => void;
  removeTodos: (ids: string[]) => void;
  /** Assign fresh 0-based positions to `orderedIds` (all from one column)
   * while preserving their interleaving with todos from other columns. */
  reorderTodos: (orderedIds: string[]) => void;
}

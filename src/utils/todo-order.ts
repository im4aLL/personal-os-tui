import type { Todo, TodoStatus } from "../repos/types";

/** Top position for a todo entering `status`: one below the smallest position
 * already in that column, so position ordering (`position ASC`) puts it first.
 * An empty column starts at 0. Pass the unfiltered list so a search filter
 * cannot skew the result. */
export function topPositionFor(todos: Todo[], status: TodoStatus): number {
  let min: number | null = null;
  for (const todo of todos) {
    if (todo.status !== status) {
      continue;
    }
    if (min === null || todo.position < min) {
      min = todo.position;
    }
  }
  return min === null ? 0 : min - 1;
}

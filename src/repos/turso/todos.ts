// Turso stubs (M0). Each method throws until its wiring milestone lands.
// The file set mirrors src/repos/mock/* one-for-one.
import type {
  CreateTodoInput,
  PositionUpdate,
  Todo,
  TodoRepo,
  TodoStatus,
  UpdateTodoInput,
} from "../types";

function notWired(what: string): Error {
  return new Error(`turso ${what} is not wired yet`);
}

export const tursoTodoRepo: TodoRepo = {
  list(): Promise<Todo[]> {
    throw notWired("todos.list");
  },
  listByStatus(_status: TodoStatus): Promise<Todo[]> {
    throw notWired("todos.listByStatus");
  },
  search(_query: string): Promise<Todo[]> {
    throw notWired("todos.search");
  },
  archived(): Promise<Todo[]> {
    throw notWired("todos.archived");
  },
  create(_input: CreateTodoInput): Promise<Todo> {
    throw notWired("todos.create");
  },
  update(_id: string, _input: UpdateTodoInput): Promise<void> {
    throw notWired("todos.update");
  },
  remove(_id: string): Promise<void> {
    throw notWired("todos.remove");
  },
  removeMany(_ids: string[]): Promise<void> {
    throw notWired("todos.removeMany");
  },
  archive(_ids: string[]): Promise<void> {
    throw notWired("todos.archive");
  },
  restore(_ids: string[]): Promise<void> {
    throw notWired("todos.restore");
  },
  updatePositions(_updates: PositionUpdate[]): Promise<void> {
    throw notWired("todos.updatePositions");
  },
};

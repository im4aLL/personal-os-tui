// Real TodoRepo: remote rows through src/lib/todos.ts. Mapping and batching
// only; the SQL and status/column translation live in the lib layer.
import {
  archiveTodos,
  createTodo,
  deleteTodo,
  deleteTodos,
  getArchivedTodos,
  getTodos,
  getTodosByStatus,
  restoreTodos,
  searchTodos,
  updateTodo,
  updateTodoPositions,
} from "../../lib/todos";
import type {
  CreateTodoInput,
  PositionUpdate,
  Todo,
  TodoRepo,
  TodoStatus,
  UpdateTodoInput,
} from "../types";

export const tursoTodoRepo: TodoRepo = {
  async list(): Promise<Todo[]> {
    return getTodos();
  },
  async listByStatus(status: TodoStatus): Promise<Todo[]> {
    return getTodosByStatus(status);
  },
  async search(query: string): Promise<Todo[]> {
    return searchTodos(query);
  },
  async archived(): Promise<Todo[]> {
    return getArchivedTodos();
  },
  async create(input: CreateTodoInput): Promise<Todo> {
    return createTodo(input);
  },
  async update(id: string, input: UpdateTodoInput): Promise<void> {
    await updateTodo(id, input);
  },
  async remove(id: string): Promise<void> {
    await deleteTodo(id);
  },
  async removeMany(ids: string[]): Promise<void> {
    await deleteTodos(ids);
  },
  async archive(ids: string[]): Promise<void> {
    await archiveTodos(ids);
  },
  async restore(ids: string[]): Promise<void> {
    await restoreTodos(ids);
  },
  async updatePositions(updates: PositionUpdate[]): Promise<void> {
    await updateTodoPositions(updates);
  },
};

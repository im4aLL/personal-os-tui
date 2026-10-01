// Todo store: local list state plus load/refresh over the repository seam.
// Mirrors the desktop `personal-os/src/store/todos.ts`. Mutations are local
// only; the Todo screen performs the repo write and patches here, reverting by
// reloading on failure. Runtime only; the state shape lives in
// `todos.types.ts`.
import { create } from "zustand";
import type { Todo } from "../repos/types";
import { messageOf } from "../utils/error";
import { getRepos } from "./repos";
import type { TodosState } from "./todos.types";

export const useTodos = create<TodosState>((set) => ({
  todos: [],
  loading: true,
  error: null,

  loadTodos: async () => {
    set({ loading: true, error: null });
    try {
      const todos = await getRepos().todos.list();
      set({ todos, loading: false });
    } catch (error) {
      set({ loading: false, error: messageOf(error) });
    }
  },

  refreshTodos: async () => {
    try {
      const todos = await getRepos().todos.list();
      set({ todos });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  setTodos: (todos) => set({ todos }),
  addTodo: (todo) => set((state) => ({ todos: [...state.todos, todo] })),
  addTodos: (todos) => set((state) => ({ todos: [...state.todos, ...todos] })),
  patchTodo: (id, patch) =>
    set((state) => ({
      todos: state.todos.map((todo) => (todo.id === id ? { ...todo, ...patch } : todo)),
    })),
  removeTodo: (id) => set((state) => ({ todos: state.todos.filter((todo) => todo.id !== id) })),
  removeTodos: (ids) =>
    set((state) => {
      const doomed = new Set(ids);
      return { todos: state.todos.filter((todo) => !doomed.has(todo.id)) };
    }),

  reorderTodos: (orderedIds) =>
    set((state) => {
      const ordered = new Set(orderedIds);
      const reordered = orderedIds
        .map((id, index) => {
          const todo = state.todos.find((item) => item.id === id);
          return todo ? { ...todo, position: index } : null;
        })
        .filter((todo): todo is Todo => todo !== null);

      let cursor = 0;
      const todos = state.todos.map((todo) => (ordered.has(todo.id) ? reordered[cursor++] : todo));
      return { todos };
    }),
}));

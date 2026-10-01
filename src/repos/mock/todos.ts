// In-memory TodoRepo seeded from fixtures. Honors ids, ordering by position,
// and the same archived/active split as the real queries.
import { randomUUID } from "node:crypto";
import { createFixtures } from "../../mock/fixtures";
import type { Fixtures } from "../../mock/fixtures.types";
import type {
  CreateTodoInput,
  PositionUpdate,
  Todo,
  TodoRepo,
  TodoStatus,
  UpdateTodoInput,
} from "../types";
import { applyListScenario, isEmptyScenario, mockCall } from "./guard";

/** M2 fixtures: `large` renders 150 todos even though the active fixture set
 * is 12, enough to prove column scrolling. */
const LARGE_TODO_TOTAL = 150;

let rows: Todo[] = createFixtures().todos;

export function resetTodoFixtures(fixtures: Fixtures): void {
  rows = [...fixtures.todos];
}

function stamp(): string {
  return new Date().toISOString();
}

function sortedActive(): Todo[] {
  return rows.filter((todo) => !todo.archived).sort((a, b) => a.position - b.position);
}

// `large` is a read-only scrolling mode: each cloned row's id becomes
// `<id>-large-<n>`, which maps back to no source row, so mutating a clone
// (update/remove/reorder) throws "mock todo not found". The fixtures review
// scrolls `large`; it is not an edit surface.
export const mockTodoRepo: TodoRepo = {
  list(): Promise<Todo[]> {
    return mockCall(() =>
      applyListScenario(
        sortedActive(),
        (row, index) => ({
          ...row,
          id: `${row.id}-large-${index}`,
        }),
        LARGE_TODO_TOTAL,
      ),
    );
  },

  listByStatus(status: TodoStatus): Promise<Todo[]> {
    return mockCall(() =>
      applyListScenario(
        sortedActive().filter((todo) => todo.status === status),
        (row, index) => ({ ...row, id: `${row.id}-large-${index}` }),
        LARGE_TODO_TOTAL,
      ),
    );
  },

  search(query: string): Promise<Todo[]> {
    return mockCall(() => {
      if (isEmptyScenario()) {
        return [];
      }
      const needle = query.trim().toLowerCase();
      return sortedActive().filter((todo) => {
        if (todo.title.toLowerCase().includes(needle)) {
          return true;
        }
        return todo.description?.toLowerCase().includes(needle) ?? false;
      });
    });
  },

  archived(): Promise<Todo[]> {
    return mockCall(() => rows.filter((todo) => todo.archived));
  },

  create(input: CreateTodoInput): Promise<Todo> {
    return mockCall(() => {
      const now = stamp();
      const todo: Todo = {
        id: randomUUID(),
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? null,
        dueDate: input.dueDate ?? null,
        position: rows.length,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      rows.push(todo);
      return todo;
    });
  },

  update(id: string, input: UpdateTodoInput): Promise<void> {
    return mockCall(() => {
      const todo = rows.find((row) => row.id === id);
      if (todo === undefined) {
        throw new Error(`mock todo not found: ${id}`);
      }
      Object.assign(todo, { ...input, id: todo.id, updatedAt: stamp() });
    });
  },

  remove(id: string): Promise<void> {
    return mockCall(() => {
      rows = rows.filter((row) => row.id !== id);
    });
  },

  removeMany(ids: string[]): Promise<void> {
    return mockCall(() => {
      const doomed = new Set(ids);
      rows = rows.filter((row) => !doomed.has(row.id));
    });
  },

  archive(ids: string[]): Promise<void> {
    return mockCall(() => {
      const targets = new Set(ids);
      for (const row of rows) {
        if (targets.has(row.id)) {
          row.archived = true;
          row.updatedAt = stamp();
        }
      }
    });
  },

  restore(ids: string[]): Promise<void> {
    return mockCall(() => {
      const targets = new Set(ids);
      for (const row of rows) {
        if (targets.has(row.id)) {
          row.archived = false;
          row.updatedAt = stamp();
        }
      }
    });
  },

  updatePositions(updates: PositionUpdate[]): Promise<void> {
    return mockCall(() => {
      const positions = new Map(updates.map((item) => [item.id, item.position]));
      for (const row of rows) {
        const next = positions.get(row.id);
        if (next !== undefined) {
          row.position = next;
          row.updatedAt = stamp();
        }
      }
    });
  },
};

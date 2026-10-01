// Remote todos access: the desktop SQL with `?` placeholders, returning domain
// `Todo` values. The Turso repo delegates here; the mock mirrors the ordering
// and archived semantics. The database stores snake_case columns and the
// `in_progress` status spelling, so every read and write translates at this
// boundary.
import { randomUUID } from "node:crypto";
import type {
  CreateTodoInput,
  PositionUpdate,
  Todo,
  TodoStatus,
  UpdateTodoInput,
} from "../repos/types";
import { tursoBatchExecute, tursoExecute, tursoSelect } from "./turso";

interface TodoRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: Todo["priority"];
  due_date: string | null;
  position: number;
  archived: number;
  created_at: string;
  updated_at: string;
}

function statusToDb(status: TodoStatus): string {
  return status === "in-progress" ? "in_progress" : status;
}

function statusFromDb(status: string): TodoStatus {
  return status === "in_progress" ? "in-progress" : (status as TodoStatus);
}

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: statusFromDb(row.status),
    priority: row.priority,
    dueDate: row.due_date,
    position: row.position,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTodos(): Promise<Todo[]> {
  const rows = await tursoSelect<TodoRow>(
    "SELECT * FROM todos WHERE archived = 0 ORDER BY position ASC, created_at ASC",
  );
  return rows.map(toTodo);
}

export async function getTodosByStatus(status: TodoStatus): Promise<Todo[]> {
  const rows = await tursoSelect<TodoRow>(
    "SELECT * FROM todos WHERE status = ? AND archived = 0 ORDER BY position ASC, created_at ASC",
    [statusToDb(status)],
  );
  return rows.map(toTodo);
}

export async function searchTodos(query: string): Promise<Todo[]> {
  const like = `%${query}%`;
  const rows = await tursoSelect<TodoRow>(
    "SELECT * FROM todos WHERE (title LIKE ? OR description LIKE ?) AND archived = 0 ORDER BY position ASC, created_at ASC",
    [like, like],
  );
  return rows.map(toTodo);
}

export async function getArchivedTodos(): Promise<Todo[]> {
  const rows = await tursoSelect<TodoRow>(
    "SELECT * FROM todos WHERE archived = 1 ORDER BY updated_at DESC",
  );
  return rows.map(toTodo);
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const now = new Date().toISOString();
  const todo: Todo = {
    id: randomUUID(),
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "todo",
    priority: input.priority ?? null,
    dueDate: input.dueDate ?? null,
    position: input.position ?? 0,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  await tursoExecute(
    `INSERT INTO todos (id, title, description, status, priority, due_date, position, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      todo.id,
      todo.title,
      todo.description,
      statusToDb(todo.status),
      todo.priority,
      todo.dueDate,
      todo.position,
      todo.archived ? 1 : 0,
      todo.createdAt,
      todo.updatedAt,
    ],
  );

  return todo;
}

/** The column and DB representation for one updatable field. A key present in
 * the input with an `undefined` value writes NULL (`value ?? null`), matching
 * the desktop's `input[f] ?? null`. Unknown runtime keys throw instead of
 * emitting invalid SQL. */
function updateAssignment(field: string, raw: unknown): { column: string; value: unknown } {
  const value = raw ?? null;
  switch (field) {
    case "title":
      return { column: "title", value };
    case "description":
      return { column: "description", value };
    case "status":
      return {
        column: "status",
        value: value === null ? null : statusToDb(value as TodoStatus),
      };
    case "priority":
      return { column: "priority", value };
    case "dueDate":
      return { column: "due_date", value };
    case "position":
      return { column: "position", value };
    case "archived":
      return { column: "archived", value: value === null ? null : value ? 1 : 0 };
    default:
      throw new Error(`unsupported todo update field: ${field}`);
  }
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];

  for (const field of Object.keys(input)) {
    const { column, value } = updateAssignment(field, input[field as keyof UpdateTodoInput]);
    sets.push(`${column} = ?`);
    args.push(value);
  }

  sets.push("updated_at = ?");
  args.push(new Date().toISOString(), id);

  await tursoExecute(`UPDATE todos SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function deleteTodo(id: string): Promise<void> {
  await deleteTodos([id]);
}

export async function deleteTodos(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const statements = ids.map((id) => ({ sql: "DELETE FROM todos WHERE id = ?", args: [id] }));
  await tursoBatchExecute(statements);
}

export async function archiveTodos(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const statements = ids.map((id) => ({
    sql: "UPDATE todos SET archived = 1, updated_at = ? WHERE id = ?",
    args: [now, id],
  }));
  await tursoBatchExecute(statements);
}

export async function restoreTodos(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const statements = ids.map((id) => ({
    sql: "UPDATE todos SET archived = 0, updated_at = ? WHERE id = ?",
    args: [now, id],
  }));
  await tursoBatchExecute(statements);
}

export async function updateTodoPositions(updates: PositionUpdate[]): Promise<void> {
  if (updates.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const statements = updates.map(({ id, position, status }) =>
    status === undefined
      ? {
          sql: "UPDATE todos SET position = ?, updated_at = ? WHERE id = ?",
          args: [position, now, id],
        }
      : {
          sql: "UPDATE todos SET position = ?, status = ?, updated_at = ? WHERE id = ?",
          args: [position, statusToDb(status), now, id],
        },
  );
  await tursoBatchExecute(statements);
}

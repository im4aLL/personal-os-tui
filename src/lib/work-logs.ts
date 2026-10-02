// Remote work log access: the desktop SQL with `?` placeholders, returning
// domain `WorkLog` values. The Turso repo delegates here; the mock mirrors the
// ordering and tag semantics. Filters and `ORDER BY start_date DESC,
// created_at DESC` match the desktop `getWorkLogs`. Tags live in
// `work_log_tags` and are read back as one batched `IN (...)` query, the same
// result set the desktop builds from its attach-all pass.
import { randomUUID } from "node:crypto";
import type {
  CreateWorkLogInput,
  UpdateWorkLogInput,
  WorkLog,
  WorkLogFilter,
} from "../repos/types";
import { tursoBatchExecute, tursoExecute, tursoSelect } from "./turso";

interface WorkLogRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

// The shared column projection for list reads. Tags are deliberately excluded;
// `getWorkLogs` loads them for the whole page in one query.
export const WORK_LOG_COLUMNS =
  "id, title, description, start_date, end_date, created_at, updated_at";

export function toWorkLog(row: WorkLogRow): WorkLog {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: [],
  };
}

// -- Queries -----------------------------------------------------------------

/** Attach each log's tag names in one batched `IN (...)` query. `?` has no
 * positional binding, so the id list becomes one placeholder per id. Ordered by
 * `created_at ASC` so the tag order matches the mock and the desktop. */
async function attachTagsToLogs(logs: WorkLog[]): Promise<WorkLog[]> {
  if (logs.length === 0) {
    return [];
  }
  const placeholders = logs.map(() => "?").join(", ");
  const rows = await tursoSelect<{ work_log_id: string; name: string }>(
    `SELECT work_log_id, name FROM work_log_tags WHERE work_log_id IN (${placeholders}) ORDER BY created_at ASC`,
    logs.map((log) => log.id),
  );

  const tagMap = new Map<string, string[]>();
  for (const row of rows) {
    const list = tagMap.get(row.work_log_id) ?? [];
    list.push(row.name);
    tagMap.set(row.work_log_id, list);
  }

  return logs.map((log) => ({ ...log, tags: tagMap.get(log.id) ?? [] }));
}

export async function getWorkLogs(filter?: WorkLogFilter): Promise<WorkLog[]> {
  const clauses: string[] = [];
  const args: unknown[] = [];

  const trimmedQuery = filter?.query?.trim();
  if (trimmedQuery !== undefined && trimmedQuery !== "") {
    clauses.push("title LIKE ?");
    args.push(`%${trimmedQuery}%`);
  }
  if (filter?.dateFrom) {
    clauses.push("end_date >= ?");
    args.push(filter.dateFrom);
  }
  if (filter?.dateTo) {
    clauses.push("start_date <= ?");
    args.push(filter.dateTo);
  }

  let sql = `SELECT ${WORK_LOG_COLUMNS} FROM work_logs`;
  if (clauses.length > 0) {
    sql += ` WHERE ${clauses.join(" AND ")}`;
  }
  sql += " ORDER BY start_date DESC, created_at DESC";

  const rows = await tursoSelect<WorkLogRow>(sql, args);
  return attachTagsToLogs(rows.map(toWorkLog));
}

export async function getAllUsedTags(): Promise<string[]> {
  const rows = await tursoSelect<{ name: string }>(
    "SELECT DISTINCT name FROM work_log_tags ORDER BY name ASC",
  );
  return rows.map((row) => row.name);
}

// -- Mutations ---------------------------------------------------------------

/** Insert a work log and its tag rows in one batch, sharing a single `now` so
 * the entry and its tags line up. One `work_log_tags` row is inserted per given
 * tag name, verbatim (no dedupe), matching the desktop and the mock. */
export async function createWorkLog(input: CreateWorkLogInput): Promise<WorkLog> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const log: WorkLog = {
    id,
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    createdAt: now,
    updatedAt: now,
    tags: input.tags,
  };

  await tursoBatchExecute([
    {
      sql: `INSERT INTO work_logs (id, title, description, start_date, end_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        log.id,
        log.title,
        log.description,
        log.startDate,
        log.endDate,
        log.createdAt,
        log.updatedAt,
      ],
    },
    ...input.tags.map((name) => ({
      sql: "INSERT INTO work_log_tags (id, work_log_id, name, created_at) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), log.id, name, now],
    })),
  ]);

  return log;
}

/** The column for one updatable scalar field. A key present in the input with
 * an `undefined` value writes NULL (`value ?? null`), matching the notes
 * `updateAssignment` pattern. Unknown runtime keys throw instead of emitting
 * invalid SQL. */
function updateAssignment(field: string, raw: unknown): { column: string; value: unknown } {
  const value = raw ?? null;
  switch (field) {
    case "title":
      return { column: "title", value };
    case "description":
      return { column: "description", value };
    case "startDate":
      return { column: "start_date", value };
    case "endDate":
      return { column: "end_date", value };
    default:
      throw new Error(`unsupported work log update field: ${field}`);
  }
}

/** One batch that replaces a work log's full tag set: DELETE then one INSERT per
 * tag. Does not bump `updated_at`, matching the desktop `setTagsForWorkLog`.
 * The save path awaits a single call, so unlike the notes/links editors there is
 * no serialized tag-write queue here. */
async function setTagsForWorkLog(workLogId: string, tags: string[]): Promise<void> {
  const now = new Date().toISOString();
  await tursoBatchExecute([
    { sql: "DELETE FROM work_log_tags WHERE work_log_id = ?", args: [workLogId] },
    ...tags.map((name) => ({
      sql: "INSERT INTO work_log_tags (id, work_log_id, name, created_at) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), workLogId, name, now],
    })),
  ]);
}

/** Update the scalar fields present in `input`, advancing `updated_at` once.
 * When `input.tags` is present, the full tag set is replaced as a separate
 * batch, mirroring the desktop save path that calls `updateWorkLog` and
 * `setTagsForWorkLog` back to back. */
export async function updateWorkLog(id: string, input: UpdateWorkLogInput): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];

  for (const field of Object.keys(input)) {
    // `tags` is not a scalar column; it is written through setTagsForWorkLog.
    if (field === "tags") {
      continue;
    }
    const { column, value } = updateAssignment(field, input[field as keyof UpdateWorkLogInput]);
    sets.push(`${column} = ?`);
    args.push(value);
  }

  if (sets.length > 0) {
    sets.push("updated_at = ?");
    args.push(new Date().toISOString(), id);
    await tursoExecute(`UPDATE work_logs SET ${sets.join(", ")} WHERE id = ?`, args);
  }

  if (input.tags !== undefined) {
    await setTagsForWorkLog(id, input.tags);
  }
}

/** Delete a work log and its tags in one batch (tags first), so a mid-batch
 * failure never leaves orphaned `work_log_tags` rows behind. */
export async function deleteWorkLog(id: string): Promise<void> {
  await tursoBatchExecute([
    { sql: "DELETE FROM work_log_tags WHERE work_log_id = ?", args: [id] },
    { sql: "DELETE FROM work_logs WHERE id = ?", args: [id] },
  ]);
}

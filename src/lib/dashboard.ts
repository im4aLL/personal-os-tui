// Batched dashboard reads: every dashboard section loads in one Turso HTTP
// pipeline request. The SQL and the row mappers belong to the domain modules,
// so this file only composes them and maps a batch failure to a friendly
// section name. Runtime only; the snapshot shape lives in `src/repos/types.ts`.
import type { DashboardSnapshot, ProjectProgress } from "../repos/types";
import { mondayOfWeekISO, todayISO } from "../utils/date";
import { encodeCursor, LINKS_PAGE_SIZE, toLink } from "./links";
import { NOTE_COLUMNS, toNote } from "./notes";
import { toProject } from "./projects";
import { toTodo } from "./todos";
import { tursoBatchSelect } from "./turso";
import type { TursoStatement } from "./turso.types";
import { toWorkLog, WORK_LOG_COLUMNS } from "./work-logs";

// Friendly names for the batch statements, by index. A failed statement's
// index (carried by the transport error) maps to the section the user sees.
const DASHBOARD_SECTIONS: readonly string[] = [
  "todos",
  "notes",
  "links",
  "work logs",
  "projects",
  "progress",
  "notes count",
  "links count",
  "logged-this-week",
];

// The batch returns column-keyed records; each domain mapper expects its own
// snake_case row shape. `Parameters` keeps those row interfaces private.
type TodoRow = Parameters<typeof toTodo>[0];
type NoteRow = Parameters<typeof toNote>[0];
type LinkRow = Parameters<typeof toLink>[0];
type WorkLogRow = Parameters<typeof toWorkLog>[0];
type ProjectRow = Parameters<typeof toProject>[0];

function countOf(rows: Record<string, unknown>[]): number {
  const row = rows[0];
  return row === undefined ? 0 : Number(row.count ?? 0);
}

/** The section named by a transport statement error, or null when the failure
 * was not statement-specific (network, timeout, credentials). */
function sectionOf(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = /statement (\d+):/.exec(message);
  if (match === null) {
    return null;
  }
  const index = Number.parseInt(match[1], 10) - 1;
  if (index < 0 || index >= DASHBOARD_SECTIONS.length) {
    return null;
  }
  return DASHBOARD_SECTIONS[index];
}

/** Load every dashboard section in one `/v2/pipeline` request. */
export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const weekStart = mondayOfWeekISO(0);
  const today = todayISO();

  const statements: TursoStatement[] = [
    // 0: active todos, the same ordering `getTodos` uses.
    { sql: "SELECT * FROM todos WHERE archived = 0 ORDER BY position ASC, created_at ASC" },
    // 1: the notes list projection (tags are not read here).
    { sql: `SELECT ${NOTE_COLUMNS} FROM notes ORDER BY pinned DESC, updated_at DESC` },
    // 2: links page 1, the `getLinksPage` "all" branch with no cursor.
    {
      sql: `SELECT l.id, l.url, l.title, l.created_at FROM links l
            WHERE 1 = 1
            ORDER BY l.created_at DESC, l.id DESC
            LIMIT ?`,
      args: [LINKS_PAGE_SIZE],
    },
    // 3: work logs, the same ordering `getWorkLogs` uses (tags not read).
    {
      sql: `SELECT ${WORK_LOG_COLUMNS} FROM work_logs ORDER BY start_date DESC, created_at DESC`,
    },
    // 4: projects ordered by position.
    { sql: "SELECT * FROM projects ORDER BY position ASC" },
    // 5: project progress, identical to `getProjectProgress`.
    {
      sql: `SELECT project_id,
                   COUNT(*) AS total,
                   COUNT(CASE WHEN status = 'done' THEN 1 END) AS done
            FROM work_items
            WHERE is_separator = 0
            GROUP BY project_id`,
    },
    // 6-8: the three aggregates. Total counts are authoritative; the loaded
    // lists are not (the links page is capped at LINKS_PAGE_SIZE).
    { sql: "SELECT COUNT(*) AS count FROM notes" },
    { sql: "SELECT COUNT(*) AS count FROM links" },
    {
      sql: "SELECT COUNT(*) AS count FROM work_logs WHERE start_date >= ? AND start_date <= ?",
      args: [weekStart, today],
    },
  ];

  let results: Record<string, unknown>[][];
  try {
    results = await tursoBatchSelect(statements);
  } catch (error) {
    const section = sectionOf(error) ?? "dashboard";
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${section} failed to load: ${message}`);
  }

  const todos = (results[0] ?? []).map((row) => toTodo(row as unknown as TodoRow));
  // Notes, links, and work logs carry no tags here: the dashboard renders
  // titles and dates only, so the batch omits the tag joins.
  const notes = (results[1] ?? []).map((row) => toNote(row as unknown as NoteRow));
  const links = (results[2] ?? []).map((row) => toLink(row as unknown as LinkRow));
  const workLogs = (results[3] ?? []).map((row) => toWorkLog(row as unknown as WorkLogRow));
  const projects = (results[4] ?? []).map((row) => toProject(row as unknown as ProjectRow));
  const progress: ProjectProgress[] = (results[5] ?? []).map((row) => ({
    projectId: String(row.project_id),
    total: Number(row.total ?? 0),
    done: Number(row.done ?? 0),
  }));

  // A short page has no next key; a full page encodes the last row's keyset
  // position, exactly like `getLinksPage`.
  const last = links[links.length - 1];
  const linksNextCursor =
    links.length < LINKS_PAGE_SIZE || last === undefined
      ? null
      : encodeCursor({ created_at: last.createdAt, id: last.id });
  const linksTotal = countOf(results[7] ?? []);

  return {
    todos,
    notes,
    links,
    linksNextCursor,
    linksTotal,
    workLogs,
    projects,
    progress,
    counts: {
      notes: countOf(results[6] ?? []),
      links: linksTotal,
      loggedThisWeek: countOf(results[8] ?? []),
    },
  };
}

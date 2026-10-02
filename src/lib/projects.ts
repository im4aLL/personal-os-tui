// Remote project access: the desktop SQL with `?` placeholders, returning
// domain `Project`, `ProjectPhase`, and `WorkItem` values. The Turso repo
// delegates here; the mock mirrors the ordering and cascade semantics. The
// database stores snake_case columns and booleans as `INTEGER 0|1`, so every
// read and write translates at this boundary.
import { randomUUID } from "node:crypto";
import type {
  CreatePhaseInput,
  CreateProjectInput,
  CreateWorkItemInput,
  Project,
  ProjectPhase,
  ProjectProgress,
  UpdatePhaseInput,
  UpdateProjectInput,
  UpdateWorkItemInput,
  WorkItem,
  WorkItemStatus,
  WorkItemWithPhase,
} from "../repos/types";
import { tursoBatchExecute, tursoExecute, tursoSelect } from "./turso";

interface ProjectRow {
  id: string;
  name: string;
  start_date: string;
  week_count: number;
  position: number;
  created_at: string;
  updated_at: string;
}

interface PhaseRow {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

interface WorkItemRow {
  id: string;
  project_id: string;
  phase_id: string | null;
  title: string;
  person: string | null;
  comment: string | null;
  jira_ticket: string | null;
  status: WorkItemStatus;
  start_week: number;
  end_week: number;
  position: number;
  is_separator: number;
  created_at: string;
  updated_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    weekCount: row.week_count,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPhase(row: PhaseRow): ProjectPhase {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    position: row.position,
    createdAt: row.created_at,
  };
}

function toWorkItem(row: WorkItemRow): WorkItem {
  return {
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id,
    title: row.title,
    person: row.person,
    comment: row.comment,
    jiraTicket: row.jira_ticket,
    status: row.status,
    startWeek: row.start_week,
    endWeek: row.end_week,
    position: row.position,
    isSeparator: row.is_separator === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// -- Queries -----------------------------------------------------------------

export async function getProjects(): Promise<Project[]> {
  const rows = await tursoSelect<ProjectRow>("SELECT * FROM projects ORDER BY position ASC");
  return rows.map(toProject);
}

export async function getPhasesForProject(projectId: string): Promise<ProjectPhase[]> {
  const rows = await tursoSelect<PhaseRow>(
    "SELECT * FROM project_phases WHERE project_id = ? ORDER BY position ASC",
    [projectId],
  );
  return rows.map(toPhase);
}

export async function getWorkItemsForProject(projectId: string): Promise<WorkItemWithPhase[]> {
  const rows = await tursoSelect<WorkItemRow>(
    "SELECT * FROM work_items WHERE project_id = ? ORDER BY position ASC",
    [projectId],
  );
  const phases = await getPhasesForProject(projectId);
  const phaseMap = new Map(phases.map((phase) => [phase.id, phase]));

  return rows.map((row) => ({
    ...toWorkItem(row),
    // A null `phase_id` or a since-deleted phase resolves to no phase, so the
    // grid falls back to gray (matching the desktop and the mock).
    phase: row.phase_id ? (phaseMap.get(row.phase_id) ?? null) : null,
  }));
}

export async function getProjectProgress(): Promise<ProjectProgress[]> {
  const rows = await tursoSelect<{ project_id: string; total: number; done: number }>(
    `SELECT project_id,
            COUNT(*) AS total,
            COUNT(CASE WHEN status = 'done' THEN 1 END) AS done
     FROM work_items
     WHERE is_separator = 0
     GROUP BY project_id`,
  );
  return rows.map((row) => ({ projectId: row.project_id, total: row.total, done: row.done }));
}

// -- Projects ----------------------------------------------------------------

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const [{ count }] = await tursoSelect<{ count: number }>(
    "SELECT COUNT(*) as count FROM projects",
  );
  const position = count;
  const project: Project = {
    id,
    name: input.name,
    startDate: input.startDate,
    weekCount: input.weekCount,
    position,
    createdAt: now,
    updatedAt: now,
  };

  await tursoExecute(
    "INSERT INTO projects (id,name,start_date,week_count,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    [id, input.name, input.startDate, input.weekCount, position, now, now],
  );
  return project;
}

/** The column for one updatable project field. A key present in the input with
 * an `undefined` value writes NULL (`value ?? null`), matching the desktop.
 * Unknown runtime keys throw instead of emitting invalid SQL. */
function projectUpdateAssignment(field: string, raw: unknown): { column: string; value: unknown } {
  const value = raw ?? null;
  switch (field) {
    case "name":
      return { column: "name", value };
    case "startDate":
      return { column: "start_date", value };
    case "weekCount":
      return { column: "week_count", value };
    default:
      throw new Error(`unsupported project update field: ${field}`);
  }
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];

  for (const field of Object.keys(input)) {
    const { column, value } = projectUpdateAssignment(
      field,
      input[field as keyof UpdateProjectInput],
    );
    sets.push(`${column} = ?`);
    args.push(value);
  }

  sets.push("updated_at = ?");
  args.push(new Date().toISOString(), id);

  await tursoExecute(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`, args);
}

/** Delete a project and its children in one batch, children first so a
 * FK-enforced database is also satisfied. The schema declares `ON DELETE
 * CASCADE`, but SQLite/libSQL only enforces it when foreign-key enforcement is
 * on (and a legacy table may predate the FK clause), so this repo's convention
 * is belt-and-suspenders child deletes, matching `deleteNote`/`deleteLink`. Work
 * items go before phases so a `phase_id` reference cannot block the phase
 * delete when FKs are enforced. The desktop remote mirror issues a plain DELETE
 * and relies on cascade. */
export async function deleteProject(id: string): Promise<void> {
  await tursoBatchExecute([
    { sql: "DELETE FROM work_items WHERE project_id = ?", args: [id] },
    { sql: "DELETE FROM project_phases WHERE project_id = ?", args: [id] },
    { sql: "DELETE FROM projects WHERE id = ?", args: [id] },
  ]);
}

// -- Phases ------------------------------------------------------------------

export async function createPhase(
  projectId: string,
  input: CreatePhaseInput,
): Promise<ProjectPhase> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const [{ count }] = await tursoSelect<{ count: number }>(
    "SELECT COUNT(*) as count FROM project_phases WHERE project_id = ?",
    [projectId],
  );
  const position = count;
  const phase: ProjectPhase = {
    id,
    projectId,
    name: input.name,
    color: input.color,
    position,
    createdAt: now,
  };

  await tursoExecute(
    "INSERT INTO project_phases (id,project_id,name,color,position,created_at) VALUES (?,?,?,?,?,?)",
    [id, projectId, input.name, input.color, position, now],
  );
  return phase;
}

/** Phases have no `updated_at` column, so the update never stamps one. */
function phaseUpdateAssignment(field: string, raw: unknown): { column: string; value: unknown } {
  const value = raw ?? null;
  switch (field) {
    case "name":
      return { column: "name", value };
    case "color":
      return { column: "color", value };
    case "position":
      return { column: "position", value };
    default:
      throw new Error(`unsupported phase update field: ${field}`);
  }
}

export async function updatePhase(id: string, input: UpdatePhaseInput): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];

  for (const field of Object.keys(input)) {
    const { column, value } = phaseUpdateAssignment(field, input[field as keyof UpdatePhaseInput]);
    sets.push(`${column} = ?`);
    args.push(value);
  }

  // An empty update would emit invalid `SET` SQL; there is no `updated_at` to
  // stamp either, so it is a no-op.
  if (sets.length === 0) {
    return;
  }

  args.push(id);
  await tursoExecute(`UPDATE project_phases SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function deletePhase(id: string): Promise<void> {
  await tursoExecute("DELETE FROM project_phases WHERE id = ?", [id]);
}

// -- Work items --------------------------------------------------------------

export async function createWorkItem(
  projectId: string,
  input: CreateWorkItemInput,
): Promise<WorkItemWithPhase> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const phaseId = input.phaseId;
  const item: WorkItem = {
    id,
    projectId,
    phaseId,
    title: input.title,
    person: input.person,
    comment: input.comment,
    jiraTicket: input.jiraTicket,
    status: input.status,
    startWeek: input.startWeek,
    endWeek: input.endWeek,
    position: input.position,
    isSeparator: input.isSeparator,
    createdAt: now,
    updatedAt: now,
  };

  await tursoExecute(
    `INSERT INTO work_items (id,project_id,phase_id,title,person,comment,jira_ticket,status,start_week,end_week,position,is_separator,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      projectId,
      phaseId,
      input.title,
      input.person,
      input.comment,
      input.jiraTicket,
      input.status,
      input.startWeek,
      input.endWeek,
      input.position,
      input.isSeparator ? 1 : 0,
      now,
      now,
    ],
  );

  // Resolve the returned phase from the project's phases, matching the desktop.
  const phase =
    phaseId === null
      ? null
      : ((await getPhasesForProject(projectId)).find((row) => row.id === phaseId) ?? null);
  return { ...item, phase };
}

/** The column for one updatable work item field. `isSeparator` converts to the
 * stored `INTEGER 0|1`; unknown runtime keys throw. */
function workItemUpdateAssignment(field: string, raw: unknown): { column: string; value: unknown } {
  const value = raw ?? null;
  switch (field) {
    case "phaseId":
      return { column: "phase_id", value };
    case "title":
      return { column: "title", value };
    case "person":
      return { column: "person", value };
    case "comment":
      return { column: "comment", value };
    case "jiraTicket":
      return { column: "jira_ticket", value };
    case "status":
      return { column: "status", value };
    case "startWeek":
      return { column: "start_week", value };
    case "endWeek":
      return { column: "end_week", value };
    case "position":
      return { column: "position", value };
    case "isSeparator":
      return { column: "is_separator", value: value === null ? null : value ? 1 : 0 };
    default:
      throw new Error(`unsupported work item update field: ${field}`);
  }
}

export async function updateWorkItem(id: string, input: UpdateWorkItemInput): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];

  for (const field of Object.keys(input)) {
    const { column, value } = workItemUpdateAssignment(
      field,
      input[field as keyof UpdateWorkItemInput],
    );
    sets.push(`${column} = ?`);
    args.push(value);
  }

  sets.push("updated_at = ?");
  args.push(new Date().toISOString(), id);

  await tursoExecute(`UPDATE work_items SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function deleteWorkItem(id: string): Promise<void> {
  await tursoExecute("DELETE FROM work_items WHERE id = ?", [id]);
}

/** One batch that rewrites every item's position from its index, sharing a
 * single `now`, scoped by `project_id` so a stray id cannot reposition another
 * project's item. The desktop SQL matches by id only, but the mock guards
 * `item.projectId === projectId`; scoping keeps the two implementations
 * consistent. */
export async function reorderWorkItems(projectId: string, orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const statements = orderedIds.map((id, index) => ({
    sql: "UPDATE work_items SET position = ?, updated_at = ? WHERE id = ? AND project_id = ?",
    args: [index, now, id, projectId],
  }));
  await tursoBatchExecute(statements);
}

/** One batch that rewrites every project's position from its index, sharing a
 * single `now`. */
export async function reorderProjects(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const statements = orderedIds.map((id, index) => ({
    sql: "UPDATE projects SET position = ?, updated_at = ? WHERE id = ?",
    args: [index, now, id],
  }));
  await tursoBatchExecute(statements);
}

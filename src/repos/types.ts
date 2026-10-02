// Repository interfaces: the seam between stores/screens and data.
// Stores depend only on these; mock and turso implementations are swaps.
// Method shapes mirror the desktop app's `personal-os/src/lib/*.ts` so the
// Turso side stays a mechanical wrapper.
export type TodoStatus = "todo" | "in-progress" | "completed";
export type TodoPriority = "high" | "medium" | "low";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority | null;
  dueDate: string | null;
  position: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string | null;
  status?: TodoStatus;
  priority?: TodoPriority | null;
  dueDate?: string | null;
  position?: number;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  status?: TodoStatus;
  priority?: TodoPriority | null;
  dueDate?: string | null;
  position?: number;
  archived?: boolean;
}

export interface PositionUpdate {
  id: string;
  position: number;
  /** Set only on a column move, so the moved row's status and the target
   * column's positions persist in one batch. */
  status?: TodoStatus;
}

export interface TodoRepo {
  list(): Promise<Todo[]>;
  listByStatus(status: TodoStatus): Promise<Todo[]>;
  search(query: string): Promise<Todo[]>;
  archived(): Promise<Todo[]>;
  create(input: CreateTodoInput): Promise<Todo>;
  update(id: string, input: UpdateTodoInput): Promise<void>;
  remove(id: string): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
  archive(ids: string[]): Promise<void>;
  restore(ids: string[]): Promise<void>;
  updatePositions(updates: PositionUpdate[]): Promise<void>;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  pinned?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  pinned?: boolean;
}

export interface NoteRepo {
  list(): Promise<Note[]>;
  getById(id: string): Promise<Note | null>;
  search(query: string): Promise<Note[]>;
  create(input: CreateNoteInput): Promise<Note>;
  update(id: string, input: UpdateNoteInput): Promise<void>;
  remove(id: string): Promise<void>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  /** Distinct tag names across all notes, sorted ascending. */
  allTags(): Promise<string[]>;
  /** Replace a note's full tag set (does not touch `updatedAt`). */
  setTags(id: string, tags: string[]): Promise<void>;
}

export interface Link {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

export interface GetLinksPageParams {
  limit?: number;
  cursor?: string | null;
  query?: string;
  tag?: string | null;
}

export interface LinksPage {
  links: Link[];
  nextCursor: string | null;
  /** Total rows matching the current filter, when the repo can report it. */
  total?: number;
}

export interface CreateLinkInput {
  url: string;
  title: string;
  tags?: string[];
}

export interface UpdateLinkInput {
  url?: string;
  title?: string;
  tags?: string[];
}

export interface LinkRepo {
  list(params: GetLinksPageParams): Promise<LinksPage>;
  tags(): Promise<string[]>;
  checkDuplicateUrl(url: string): Promise<boolean>;
  create(input: CreateLinkInput): Promise<Link>;
  update(id: string, input: UpdateLinkInput): Promise<void>;
  /** Replace a link's full tag set (mirrors the desktop `setTagsForLink`). */
  setTags(id: string, tags: string[]): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface WorkLog {
  id: string;
  title: string;
  description: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface WorkLogFilter {
  /** Case-insensitive substring over the title; trimmed, empty means all. */
  query?: string;
  /** Keeps logs whose `endDate` is on or after this date (overlap). */
  dateFrom?: string;
  /** Keeps logs whose `startDate` is on or before this date (overlap). */
  dateTo?: string;
}

export interface CreateWorkLogInput {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  tags: string[];
}

export interface UpdateWorkLogInput {
  title?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface WorkLogRepo {
  list(filter?: WorkLogFilter): Promise<WorkLog[]>;
  tags(): Promise<string[]>;
  create(input: CreateWorkLogInput): Promise<WorkLog>;
  update(id: string, input: UpdateWorkLogInput): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface Project {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  weekCount: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  color: string; // hex e.g. "#93C5FD"
  position: number;
  createdAt: string;
}

export type WorkItemStatus = "pending" | "in_progress" | "done";

export interface WorkItem {
  id: string;
  projectId: string;
  phaseId: string | null;
  title: string;
  person: string | null;
  comment: string | null;
  jiraTicket: string | null;
  status: WorkItemStatus;
  startWeek: number;
  endWeek: number;
  position: number;
  isSeparator: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItemWithPhase extends WorkItem {
  phase: ProjectPhase | null;
}

export interface ProjectProgress {
  projectId: string;
  total: number;
  done: number;
}

export interface CreateProjectInput {
  name: string;
  startDate: string;
  weekCount: number;
}

export type UpdateProjectInput = Partial<Pick<Project, "name" | "startDate" | "weekCount">>;

export interface CreatePhaseInput {
  name: string;
  color: string;
}

export type UpdatePhaseInput = Partial<Pick<ProjectPhase, "name" | "color" | "position">>;

export interface CreateWorkItemInput {
  phaseId: string | null;
  title: string;
  person: string | null;
  comment: string | null;
  jiraTicket: string | null;
  status: WorkItemStatus;
  startWeek: number;
  endWeek: number;
  position: number;
  isSeparator: boolean;
}

export type UpdateWorkItemInput = Partial<CreateWorkItemInput>;

export interface ProjectRepo {
  list(): Promise<Project[]>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<void>;
  remove(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
  phases(projectId: string): Promise<ProjectPhase[]>;
  createPhase(projectId: string, input: CreatePhaseInput): Promise<ProjectPhase>;
  updatePhase(id: string, input: UpdatePhaseInput): Promise<void>;
  removePhase(id: string): Promise<void>;
  workItems(projectId: string): Promise<WorkItemWithPhase[]>;
  createWorkItem(projectId: string, input: CreateWorkItemInput): Promise<WorkItemWithPhase>;
  updateWorkItem(id: string, input: UpdateWorkItemInput): Promise<void>;
  removeWorkItem(id: string): Promise<void>;
  reorderWorkItems(projectId: string, orderedIds: string[]): Promise<void>;
  progress(): Promise<ProjectProgress[]>;
}

export interface Profile {
  name: string;
  email: string;
}

export interface SettingsRepo {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;
}

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
  kind?: "credentials" | "network" | "other";
}

export interface ApplySchemaResult {
  applied: number;
  ensured?: number;
}

export interface SetupRepo {
  testConnection(url: string, token: string): Promise<ConnectionTestResult>;
  applySchema(): Promise<ApplySchemaResult>;
}

/** The dashboard's three `COUNT(*)` aggregates: notes total, links total, and
 * work logs whose `start_date` falls in the current week through today. */
export interface DashboardCounts {
  notes: number;
  links: number;
  loggedThisWeek: number;
}

/** Everything the Dashboard needs, loaded in one round trip. */
export interface DashboardSnapshot {
  todos: Todo[];
  notes: Note[];
  links: Link[];
  linksNextCursor: string | null;
  linksTotal: number;
  workLogs: WorkLog[];
  projects: Project[];
  progress: ProjectProgress[];
  counts: DashboardCounts;
}

export interface DashboardRepo {
  load(): Promise<DashboardSnapshot>;
}

/** The full bundle handed to the app at bootstrap. */
export interface Repos {
  todos: TodoRepo;
  notes: NoteRepo;
  links: LinkRepo;
  workLogs: WorkLogRepo;
  projects: ProjectRepo;
  settings: SettingsRepo;
  dashboard: DashboardRepo;
}

/** A resolved repos implementation: the six domain repos plus setup. */
export interface ReposBundle {
  repos: Repos;
  setup: SetupRepo;
}

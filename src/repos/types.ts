// Repository interfaces: the seam between stores/screens and data.
// Stores depend only on these; mock and turso implementations are swaps.
// Method shapes mirror the desktop app's `personal-os/src/lib/*.ts` so the
// Turso side stays a mechanical wrapper.
export type TodoStatus = "todo" | "in-progress" | "completed";
export type TodoPriority = "high" | "medium" | "low";

export interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate: string | null;
  position: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string | null;
}

export interface UpdateTodoInput {
  title?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string | null;
  position?: number;
  archived?: boolean;
}

export interface PositionUpdate {
  id: string;
  position: number;
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
  create(input: CreateLinkInput): Promise<Link>;
  update(id: string, input: UpdateLinkInput): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface WorkLog {
  id: string;
  title: string;
  body: string;
  date: string;
  tags: string[];
  createdAt: string;
}

export interface WorkLogFilter {
  query?: string;
  tag?: string | null;
  from?: string;
  to?: string;
}

export interface CreateWorkLogInput {
  title: string;
  body?: string;
  date?: string;
  tags?: string[];
}

export interface UpdateWorkLogInput {
  title?: string;
  body?: string;
  date?: string;
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
  description: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  position?: number;
}

export interface ProjectRepo {
  list(): Promise<Project[]>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<void>;
  remove(id: string): Promise<void>;
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
}

export interface ApplySchemaResult {
  applied: number;
}

export interface SetupRepo {
  testConnection(url: string, token: string): Promise<ConnectionTestResult>;
  applySchema(): Promise<ApplySchemaResult>;
}

/** The full bundle handed to the app at bootstrap. */
export interface Repos {
  todos: TodoRepo;
  notes: NoteRepo;
  links: LinkRepo;
  workLogs: WorkLogRepo;
  projects: ProjectRepo;
  settings: SettingsRepo;
}

/** A resolved repos implementation: the six domain repos plus setup. */
export interface ReposBundle {
  repos: Repos;
  setup: SetupRepo;
}

import type { Link, Note, Project, Todo, WorkLog } from "../repos/types";

export interface Fixtures {
  todos: Todo[];
  notes: Note[];
  links: Link[];
  workLogs: WorkLog[];
  projects: Project[];
}

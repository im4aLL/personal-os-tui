import type { Link, Note, Project, Todo, WorkLog } from "../repos/types";

export interface Fixtures {
  todos: Todo[];
  notes: Note[];
  links: Link[];
  /** Full tag pool, including orphan tags with no attached link (mirrors the
   * desktop `link_tags` table). */
  linkTags: string[];
  workLogs: WorkLog[];
  projects: Project[];
}

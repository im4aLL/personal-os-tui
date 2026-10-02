/** Item-count progress for one project: total non-separator work items and how
 * many are done. Mirrors the desktop `ProjectProgressStat`. */
export interface ProjectProgressStat {
  total: number;
  done: number;
}

/** A project's completion summary: a 0-100 percentage, whether it is finished,
 * and a human detail label for the project row or header. */
export interface ProjectCompletion {
  pct: number;
  isDone: boolean;
  detail: string;
}

// Project completion: item-count progress when work item stats are available,
// otherwise whole-project time progress. Ported from the desktop
// `personal-os/src/lib/project-progress.ts` with this repo's camelCase fields.
// Runtime only; the result shapes live in `project-progress.types.ts`.
import type { Project } from "../repos/types";
import type { ProjectCompletion, ProjectProgressStat } from "./project-progress.types";
import { getCurrentWeek, getProjectTimeProgress } from "./week-utils";

/** Completion for a project. Prefers the item count when `stat` has items;
 * falls back to time elapsed so a project with no items still shows progress. */
export function getProjectCompletion(
  project: Project,
  stat?: ProjectProgressStat,
): ProjectCompletion {
  if (stat !== undefined && stat.total > 0) {
    const pct = Math.min(100, Math.round((stat.done / stat.total) * 100));
    const isDone = stat.done >= stat.total;
    return { pct, isDone, detail: `${stat.done}/${stat.total} items` };
  }

  const pct = getProjectTimeProgress(project.startDate, project.weekCount);
  const currentWeek = getCurrentWeek(project.startDate, project.weekCount);
  const detail =
    currentWeek !== null
      ? `Week ${currentWeek}/${project.weekCount}`
      : pct >= 100
        ? "Ended"
        : "Not started";
  return { pct, isDone: false, detail };
}

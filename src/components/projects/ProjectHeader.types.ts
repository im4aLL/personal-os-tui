import type { ProjectProgressStat } from "../../lib/project-progress.types";
import type { Project, ProjectPhase, WorkItemWithPhase } from "../../repos/types";

export interface ProjectHeaderProps {
  project: Project;
  phases: ProjectPhase[];
  /** The selected project's work items, for the `No phase` legend entry. */
  workItems: WorkItemWithPhase[];
  /** Non-separator item progress for the progress bar. */
  stat?: ProjectProgressStat;
  /** True when the header owns the keyboard. */
  focused: boolean;
  /** Header content width in columns. */
  width: number;
}

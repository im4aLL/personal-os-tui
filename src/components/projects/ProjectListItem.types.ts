import type { ProjectProgressStat } from "../../lib/project-progress.types";
import type { Project } from "../../repos/types";

export interface ProjectListItemProps {
  project: Project;
  /** Draws the `> ` marker and emphasizes the name. */
  selected: boolean;
  /** True when the project list owns the keyboard (adds a subtle background). */
  focused: boolean;
  /** Content width available for this row, in columns. */
  width: number;
  /** Non-separator item progress, shown as a percentage when present. */
  stat?: ProjectProgressStat;
}

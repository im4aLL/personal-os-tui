import type { ProjectProgressStat } from "../../lib/project-progress.types";
import type { Project } from "../../repos/types";

export interface ProjectListPaneProps {
  projects: Project[];
  selectedId: string | null;
  /** True when this pane owns the keyboard (accent title). */
  focused: boolean;
  loading: boolean;
  /** Non-separator item progress keyed by project id. */
  progress: Record<string, ProjectProgressStat>;
  /** Inner row width in columns; the pane adds its own 4-column frame. */
  width: number;
  /** Max project rows to render; the pane windows around the selection. */
  maxItems: number;
}

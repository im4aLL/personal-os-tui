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
  /** Pane width in columns (the row column inside it is `width - 2`). */
  width: number;
  /** Max project rows to render; the pane windows around the selection. */
  maxItems: number;
}

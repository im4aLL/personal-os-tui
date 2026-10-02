import type { WorkItemWithPhase } from "../../repos/types";

export interface WeekGridProps {
  /** Work items already sliced to the visible vertical window. */
  workItems: WorkItemWithPhase[];
  selectedId: string | null;
  /** True when the grid owns the keyboard. */
  focused: boolean;
  /** Renders the Task | Res | Weeks | Status table instead of the Gantt grid. */
  listMode: boolean;
  /** Renders five skeleton rows instead of the items. */
  loading: boolean;
  /** Grid content width in columns. */
  width: number;
  /** Grid-mode geometry (ignored in list mode). */
  taskWidth: number;
  resWidth: number;
  weekColumnWidth: number;
  /** Total width in columns reserved for all visible week columns, including
   * the one-column gaps between them. */
  weekAreaWidth: number;
  /** 0-based index of the first visible week. */
  windowStart: number;
  /** Number of visible week columns. */
  visibleWeeks: number;
  /** Mouse: select/activate a work item row without a keyboard. */
  onSelectItem?: (id: string) => void;
  onActivateItem?: (id: string) => void;
  /** Mouse wheel over the grid/list: -1 up, +1 down. */
  onWheel?: (delta: number) => void;
}

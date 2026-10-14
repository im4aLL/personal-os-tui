import type { ProjectPhase, WorkItemWithPhase } from "../../repos/types";

export type PhaseManagerMode = "list" | "add" | "rename";

export interface PhaseManagerProps {
  phases: ProjectPhase[];
  /** Selected project's work items, for the per-phase item counts. */
  workItems: WorkItemWithPhase[];
  /** Index of the highlighted phase in list mode. */
  cursor: number;
  mode: PhaseManagerMode;
  /** Draft name for the add row. */
  addName: string;
  /** Preset color assigned to the new phase. */
  addColor: string;
  /** Draft name while renaming the cursor phase. */
  renameName: string;
  /** Preset palette the recolor key cycles through. */
  colors: string[];
  onAddNameChange: (value: string) => void;
  onRenameNameChange: (value: string) => void;
  /** Mouse: primary clicks on a row, its swatch, its move arrows, or its
   * delete affordance. The keyboard paths stay authoritative; both call the
   * same screen handlers. */
  onSelect?: (index: number) => void;
  onRecolor?: (index: number) => void;
  onMove?: (index: number, direction: "up" | "down") => void;
  onDelete?: (index: number) => void;
}

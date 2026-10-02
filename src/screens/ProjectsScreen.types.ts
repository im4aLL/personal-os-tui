import type { PhaseManagerMode } from "../components/projects/PhaseManager.types";
import type { ProjectFormField, ProjectFormValues } from "../components/projects/ProjectForm.types";
import type {
  WorkItemFormField,
  WorkItemFormValues,
} from "../components/projects/WorkItemForm.types";
import type { Project, WorkItemWithPhase } from "../repos/types";

/** Which region owns the keyboard. */
export type ProjectFocusZone = "list" | "header" | "grid";

/** Transient save/delete/reorder feedback banner. */
export interface Notice {
  text: string;
  kind: "success" | "danger";
}

export interface ProjectFormState {
  open: boolean;
  /** Non-null when editing an existing project; pre-fills every field. */
  editing: Project | null;
  values: ProjectFormValues;
  field: ProjectFormField;
  /** Inline validation or write-failure message. */
  error: string | null;
  saving: boolean;
}

export interface WorkItemFormState {
  open: boolean;
  /** Non-null when editing an existing work item; pre-fills every field. */
  editing: WorkItemWithPhase | null;
  values: WorkItemFormValues;
  field: WorkItemFormField;
  /** Inline validation or write-failure message. */
  error: string | null;
  saving: boolean;
}

export interface PhaseManagerState {
  open: boolean;
  cursor: number;
  mode: PhaseManagerMode;
  addName: string;
  addColor: string;
  renameName: string;
}

/** The pending destructive action behind the confirm dialog. */
export type ProjectConfirm =
  | { kind: "project"; id: string; title: string }
  | { kind: "item"; id: string; title: string };

/** The read-only comment modal contents. */
export interface CommentState {
  title: string;
  text: string;
}

/** Grid geometry derived once per render and passed to the presentational
 * header and body so their week columns stay aligned. */
export interface GridGeometry {
  /** Inner row width of the list pane, in columns (the pane adds its frame). */
  listWidth: number;
  /** Inner content width of the workspace panel, in columns. */
  gridWidth: number;
  taskWidth: number;
  resWidth: number;
  /** Total width reserved for all visible week columns, including the
   * one-column gaps between them. */
  weekAreaWidth: number;
  visibleWeeks: number;
  weekColumnWidth: number;
  windowed: boolean;
}

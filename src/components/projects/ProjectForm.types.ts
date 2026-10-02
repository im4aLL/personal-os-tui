import type { Project } from "../../repos/types";

export type ProjectFormField = "name" | "start" | "weeks";

export interface ProjectFormValues {
  name: string;
  startDate: string;
  weekCount: string;
}

export interface ProjectFormProps {
  /** Non-null when editing; the screen pre-fills every field from it. */
  editing: Project | null;
  focusedField: ProjectFormField;
  values: ProjectFormValues;
  /** Inline validation or write-failure message. */
  error: string | null;
  saving: boolean;
  onPatch: (patch: Partial<ProjectFormValues>) => void;
}

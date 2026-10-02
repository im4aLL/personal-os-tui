import type { TextareaRenderable } from "@opentui/core";
import type { Ref } from "react";
import type { WorkItemStatus, WorkItemWithPhase } from "../../repos/types";

export type WorkItemFormField =
  | "title"
  | "person"
  | "jira"
  | "start"
  | "end"
  | "status"
  | "phase"
  | "comment";

export interface WorkItemFormValues {
  title: string;
  person: string;
  jiraTicket: string;
  status: WorkItemStatus;
  /** `""` means no phase. */
  phaseId: string;
  startWeek: string;
  endWeek: string;
}

export interface WorkItemFormChoice {
  value: string;
  label: string;
}

export interface WorkItemFormProps {
  /** Non-null when editing; the screen pre-fills every field from it. */
  editing: WorkItemWithPhase | null;
  focusedField: WorkItemFormField;
  values: WorkItemFormValues;
  /** `No phase` followed by the project's phases. */
  phaseOptions: WorkItemFormChoice[];
  /** Inline validation or write-failure message. */
  error: string | null;
  saving: boolean;
  /** Reads the live comment text (`plainText`) on submit. */
  commentRef: Ref<TextareaRenderable>;
  onPatch: (patch: Partial<WorkItemFormValues>) => void;
  onCommentChange?: () => void;
}

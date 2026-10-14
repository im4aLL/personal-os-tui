import type { TextareaRenderable } from "@opentui/core";
import type { Ref } from "react";
import type { WorkLog } from "../../repos/types";

export type WorkLogFormField = "title" | "description" | "start" | "end" | "tags";

export interface WorkLogFormValues {
  title: string;
  startDate: string;
  endDate: string;
  tags: string[];
}

export interface WorkLogFormProps {
  /** Non-null when editing; the screen pre-fills every field from it. */
  editing: WorkLog | null;
  focusedField: WorkLogFormField;
  values: WorkLogFormValues;
  tagInput: string;
  suggestions: string[];
  suggestionIndex: number;
  /** Inline validation or write-failure message. */
  error: string | null;
  saving: boolean;
  /** Reads the live description text (`plainText`) on submit. */
  descriptionRef: Ref<TextareaRenderable>;
  onPatch: (patch: Partial<WorkLogFormValues>) => void;
  onTagInputChange: (value: string) => void;
  onDescriptionChange?: () => void;
  /** Mouse: focus the clicked field. */
  onFocusField?: (field: WorkLogFormField) => void;
  /** Mouse: click on the submit button (same path as Enter). */
  onSubmit?: () => void;
  /** Mouse: apply a suggestion or remove an applied tag. */
  onAcceptSuggestion?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
}

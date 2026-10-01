import type { TextareaRenderable } from "@opentui/core";
import type { Ref } from "react";
import type { Todo, TodoStatus } from "../../repos/types";

export type PriorityChoice = "none" | "low" | "medium" | "high";

export type TodoFormField = "title" | "description" | "priority" | "due" | "status";

export interface TodoFormValues {
  title: string;
  priority: PriorityChoice;
  dueDate: string;
  status: TodoStatus;
}

export interface TodoFormProps {
  /** Non-null when editing; status renders only in this mode. */
  editing: Todo | null;
  focusedField: TodoFormField;
  values: TodoFormValues;
  /** Inline validation or write-failure message. */
  error: string | null;
  saving: boolean;
  /** Reads the live description text (`plainText`) on submit. */
  descriptionRef: Ref<TextareaRenderable>;
  onPatch: (patch: Partial<TodoFormValues>) => void;
  onDescriptionChange?: () => void;
}

import type { TodoFormField, TodoFormValues } from "../components/todos/TodoForm.types";
import type { Todo } from "../repos/types";

export interface TodoFormState {
  open: boolean;
  /** Non-null when editing an existing todo. */
  editing: Todo | null;
  values: TodoFormValues;
  field: TodoFormField;
  /** Inline validation or write-failure message. */
  error: string | null;
  saving: boolean;
}

export type ConfirmKind = "delete" | "archive-completed" | "clear-completed" | "delete-archived";

export interface TodoConfirmState {
  kind: ConfirmKind;
  ids: string[];
  title: string;
  body: string;
  confirmLabel: string;
  destructive: boolean;
}

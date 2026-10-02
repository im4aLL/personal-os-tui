import type { TextareaRenderable } from "@opentui/core";
import type { Ref } from "react";
import type { TodoFormField, TodoFormValues } from "../components/todos/TodoForm.types";
import type { Todo, TodoStatus } from "../repos/types";

/** The Todo form's open/editing state, shared by the Todo and Dashboard
 * screens. Mirrors the previous `TodoScreen.types.ts` shape. */
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

export interface UseTodoFormOptions {
  /** Called after a create succeeds; the screen applies its selection/focus
   * side effects (the controller itself stays screen-agnostic). */
  onCreated?: (todo: Todo) => void;
}

export interface UseTodoFormResult {
  form: TodoFormState;
  /** Pass to `TodoForm`; the controller reads its `plainText` on submit. */
  descriptionRef: Ref<TextareaRenderable>;
  openCreate: (status: TodoStatus) => void;
  openEdit: (todo: Todo) => void;
  close: () => void;
  patch: (patch: Partial<TodoFormValues>) => void;
  clearError: () => void;
  cycleField: (delta: 1 | -1) => void;
  submit: () => Promise<void>;
}

// Shared Todo form controller: open create/edit, Tab field cycling, validation,
// the repository write, and the local store patch. The Todo screen and the
// Dashboard quick-add share it so the behavior cannot drift; a screen passes
// `onCreated` for its own selection/focus side effects. Runtime only; the state
// shape lives in `useTodoForm.types.ts`.
import type { TextareaRenderable } from "@opentui/core";
import { useRef, useState } from "react";
import type { TodoFormField, TodoFormValues } from "../components/todos/TodoForm.types";
import type { Todo, TodoStatus } from "../repos/types";
import { getRepos } from "../store/repos";
import { useTodos } from "../store/todos";
import { isValidISODate } from "../utils/date";
import { messageOf } from "../utils/error";
import { topPositionFor } from "../utils/todo-order";
import type { TodoFormState, UseTodoFormOptions, UseTodoFormResult } from "./useTodoForm.types";

const CREATE_FIELDS: TodoFormField[] = ["title", "description", "priority", "due"];
const EDIT_FIELDS: TodoFormField[] = ["title", "description", "priority", "due", "status"];

const EMPTY_FORM: TodoFormState = {
  open: false,
  editing: null,
  values: { title: "", priority: "none", dueDate: "", status: "todo" },
  field: "title",
  error: null,
  saving: false,
};

/** Top position for a todo entering `status`: one below the smallest position
 * already in that column, so position ordering puts it first. An empty column
 * starts at 0. Reads the unfiltered store so a search filter cannot skew it. */
function storeTopPositionFor(status: TodoStatus): number {
  return topPositionFor(useTodos.getState().todos, status);
}

export function useTodoForm(options: UseTodoFormOptions = {}): UseTodoFormResult {
  const [form, setForm] = useState<TodoFormState>(EMPTY_FORM);
  const descriptionRef = useRef<TextareaRenderable | null>(null);

  function openCreate(status: TodoStatus): void {
    setForm({
      open: true,
      editing: null,
      values: { title: "", priority: "none", dueDate: "", status },
      field: "title",
      error: null,
      saving: false,
    });
  }

  function openEdit(todo: Todo): void {
    setForm({
      open: true,
      editing: todo,
      values: {
        title: todo.title,
        priority: todo.priority ?? "none",
        dueDate: todo.dueDate ?? "",
        status: todo.status,
      },
      field: "title",
      error: null,
      saving: false,
    });
  }

  function close(): void {
    setForm(EMPTY_FORM);
  }

  function patch(next: Partial<TodoFormValues>): void {
    setForm((current) => ({
      ...current,
      values: { ...current.values, ...next },
      error: null,
    }));
  }

  function clearError(): void {
    setForm((current) => (current.error === null ? current : { ...current, error: null }));
  }

  function cycleField(delta: 1 | -1): void {
    setForm((current) => {
      const fields = current.editing === null ? CREATE_FIELDS : EDIT_FIELDS;
      const index = fields.indexOf(current.field);
      const next = index === -1 ? 0 : (index + delta + fields.length) % fields.length;
      return { ...current, field: fields[next] };
    });
  }

  /** Mouse: focus the clicked field, mirroring one `cycleField` step. */
  function focusField(field: TodoFormField): void {
    setForm((current) => (current.field === field ? current : { ...current, field }));
  }

  async function submit(): Promise<void> {
    if (!form.open || form.saving) {
      return;
    }
    const values = form.values;
    const title = values.title.trim();
    if (title === "") {
      setForm((current) => ({ ...current, error: "Title is required", field: "title" }));
      return;
    }
    const due = values.dueDate.trim();
    if (due !== "" && !isValidISODate(due)) {
      setForm((current) => ({ ...current, error: "Use YYYY-MM-DD", field: "due" }));
      return;
    }
    const description = (descriptionRef.current?.plainText ?? "").trim();
    const priority = values.priority === "none" ? null : values.priority;
    setForm((current) => ({ ...current, saving: true, error: null }));
    try {
      if (form.editing !== null) {
        const id = form.editing.id;
        // An update lands at the top of its (possibly new) column.
        const patch = {
          title,
          description: description === "" ? null : description,
          priority,
          dueDate: due === "" ? null : due,
          status: values.status,
          position: storeTopPositionFor(values.status),
        };
        await getRepos().todos.update(id, patch);
        useTodos.getState().patchTodo(id, patch);
      } else {
        const created = await getRepos().todos.create({
          title,
          description: description === "" ? null : description,
          priority,
          dueDate: due === "" ? null : due,
          status: values.status,
          position: storeTopPositionFor(values.status),
        });
        useTodos.getState().addTodo(created);
        options.onCreated?.(created);
      }
      setForm(EMPTY_FORM);
    } catch (error) {
      setForm((current) => ({ ...current, saving: false, error: messageOf(error) }));
    }
  }

  return {
    form,
    descriptionRef,
    openCreate,
    openEdit,
    close,
    patch,
    clearError,
    cycleField,
    focusField,
    submit,
  };
}

import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import type { TodoStatus } from "../../repos/types";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../ui/Button";
import { DateField } from "../ui/DateField";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { TextArea } from "../ui/TextArea";
import { TextField } from "../ui/TextField";
import type { PriorityChoice, TodoFormProps } from "./TodoForm.types";

const PRIORITY_OPTIONS: { value: PriorityChoice; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUS_OPTIONS: { value: TodoStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

// Create/edit modal. Presentational: the screen owns field focus, Tab order,
// validation, and the repo write, so its keyboard scope drives this form.
export function TodoForm(props: TodoFormProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();
  const modalWidth = Math.min(64, Math.max(32, width - 4));
  const fieldWidth = modalWidth - 6;
  const editing = props.editing !== null;
  const submitLabel = props.saving ? "Saving..." : editing ? "Save changes" : "Create";

  const priorityIndex = Math.max(
    0,
    PRIORITY_OPTIONS.findIndex((option) => option.value === props.values.priority),
  );
  const statusIndex = Math.max(
    0,
    STATUS_OPTIONS.findIndex((option) => option.value === props.values.status),
  );

  return (
    <Modal title={editing ? "Edit Todo" : "Add Todo"} width={modalWidth}>
      {/* gap 0: the form is tall (title, description, priority, due, status,
          button), so a compact stack keeps every field visible on short
          terminals; each Field's label provides the separation. */}
      <box flexDirection="column" gap={0}>
        <Field label="Title">
          <TextField
            value={props.values.title}
            onChange={(value) => props.onPatch({ title: value })}
            focused={props.focusedField === "title"}
            placeholder="What needs to be done?"
            width={fieldWidth}
          />
        </Field>

        <Field label="Description (optional)">
          <TextArea
            initialValue={props.editing?.description ?? ""}
            focused={props.focusedField === "description"}
            placeholder="Add more details..."
            height={3}
            textareaRef={props.descriptionRef}
            onChange={props.onDescriptionChange}
          />
        </Field>

        <Field label="Priority (optional)">
          <Select
            options={PRIORITY_OPTIONS}
            selectedIndex={priorityIndex}
            focused={props.focusedField === "priority"}
            onChange={(_index, value) =>
              props.onPatch({ priority: (value as PriorityChoice) ?? "none" })
            }
          />
        </Field>

        <Field label="Due date (optional)">
          <DateField
            value={props.values.dueDate}
            onChange={(value) => props.onPatch({ dueDate: value })}
            focused={props.focusedField === "due"}
            width={fieldWidth}
          />
        </Field>

        {editing ? (
          <Field label="Status">
            <Select
              options={STATUS_OPTIONS}
              selectedIndex={statusIndex}
              focused={props.focusedField === "status"}
              onChange={(_index, value) =>
                props.onPatch({ status: (value as TodoStatus) ?? "todo" })
              }
            />
          </Field>
        ) : null}

        {props.error !== null ? <text fg={color(tokens.danger)}>{props.error}</text> : null}

        <Button primary={true} focused={false} disabled={props.saving} label={submitLabel} />
        <text fg={color(tokens.fgSubtle)}>
          {`Tab next field  Enter ${editing ? "save" : "create"}  Ctrl+Enter from description  Esc cancel`}
        </text>
      </box>
    </Modal>
  );
}

import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import type { WorkItemStatus } from "../../repos/types";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { TextArea } from "../ui/TextArea";
import { TextField } from "../ui/TextField";
import type { WorkItemFormProps } from "./WorkItemForm.types";

const STATUS_OPTIONS: { value: WorkItemStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

// Create/edit work item modal. Presentational: the screen owns field focus, Tab
// order, validation, and the repo write. The comment is uncontrolled (the
// screen reads `plainText` on submit).
export function WorkItemForm(props: WorkItemFormProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();
  const modalWidth = Math.min(68, Math.max(36, width - 4));
  const fieldWidth = modalWidth - 6;
  const halfWidth = Math.max(8, Math.floor((fieldWidth - 2) / 2));
  const editing = props.editing !== null;
  const submitLabel = props.saving ? "Saving..." : editing ? "Save changes" : "Add work item";

  const statusIndex = Math.max(
    0,
    STATUS_OPTIONS.findIndex((option) => option.value === props.values.status),
  );
  const phaseIndex = Math.max(
    0,
    props.phaseOptions.findIndex((option) => option.value === props.values.phaseId),
  );

  return (
    <Modal title={editing ? "Edit work item" : "New work item"} width={modalWidth}>
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

        <Field label="Person (optional)">
          <TextField
            value={props.values.person}
            onChange={(value) => props.onPatch({ person: value })}
            focused={props.focusedField === "person"}
            placeholder="Who owns it?"
            width={fieldWidth}
          />
        </Field>

        <Field label="Jira ticket (optional)">
          <TextField
            value={props.values.jiraTicket}
            onChange={(value) => props.onPatch({ jiraTicket: value })}
            focused={props.focusedField === "jira"}
            placeholder="URL or ticket key"
            width={fieldWidth}
          />
        </Field>

        <box flexDirection="row" gap={2}>
          <Field label="Start week">
            <TextField
              value={props.values.startWeek}
              onChange={(value) => props.onPatch({ startWeek: value })}
              focused={props.focusedField === "start"}
              placeholder="1"
              width={halfWidth}
            />
          </Field>
          <Field label="End week">
            <TextField
              value={props.values.endWeek}
              onChange={(value) => props.onPatch({ endWeek: value })}
              focused={props.focusedField === "end"}
              placeholder="1"
              width={halfWidth}
            />
          </Field>
        </box>

        <Field label="Status">
          <Select
            options={STATUS_OPTIONS}
            selectedIndex={statusIndex}
            focused={props.focusedField === "status"}
            onChange={(_index, value) =>
              props.onPatch({ status: (value as WorkItemStatus) ?? "pending" })
            }
          />
        </Field>

        <Field label="Phase">
          <Select
            options={props.phaseOptions}
            selectedIndex={phaseIndex}
            focused={props.focusedField === "phase"}
            onChange={(_index, value) => props.onPatch({ phaseId: value ?? "" })}
          />
        </Field>

        <Field label="Comment (optional)">
          <TextArea
            initialValue={props.editing?.comment ?? ""}
            focused={props.focusedField === "comment"}
            placeholder="Notes..."
            height={2}
            textareaRef={props.commentRef}
            onChange={props.onCommentChange}
          />
        </Field>

        {props.error !== null ? <text fg={color(tokens.danger)}>{props.error}</text> : null}

        <Button primary={true} focused={false} disabled={props.saving} label={submitLabel} />
        <text fg={color(tokens.fgSubtle)}>
          {"Tab next field  Enter save  Ctrl+Enter from comment  Esc cancel"}
        </text>
      </box>
    </Modal>
  );
}

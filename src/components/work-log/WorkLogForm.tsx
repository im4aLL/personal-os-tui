import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../ui/Button";
import { DateField } from "../ui/DateField";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { TagInput } from "../ui/TagInput";
import { TextArea } from "../ui/TextArea";
import { TextField } from "../ui/TextField";
import type { WorkLogFormProps } from "./WorkLogForm.types";

// Add/edit work-log modal. Presentational: the screen owns field focus, Tab
// order, validation, and the repo write, so its keyboard scope drives this
// form. The description is uncontrolled (the screen reads `plainText` on
// submit); every field is pre-filled from `editing` when editing.
export function WorkLogForm(props: WorkLogFormProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();
  const modalWidth = Math.min(72, Math.max(36, width - 4));
  const fieldWidth = modalWidth - 6;
  const veryNarrow = width < 60;
  const dateWidth = veryNarrow ? fieldWidth : Math.max(12, Math.floor((fieldWidth - 2) / 2));
  const editing = props.editing !== null;
  const submitLabel = props.saving ? "Saving..." : editing ? "Save changes" : "Add entry";

  const startDate = (
    <DateField
      value={props.values.startDate}
      onChange={(value) => props.onPatch({ startDate: value })}
      focused={props.focusedField === "start"}
      width={dateWidth}
    />
  );
  const endDate = (
    <DateField
      value={props.values.endDate}
      onChange={(value) => props.onPatch({ endDate: value })}
      focused={props.focusedField === "end"}
      width={dateWidth}
    />
  );

  return (
    <Modal title={editing ? "Edit entry" : "Add entry"} width={modalWidth}>
      <box flexDirection="column" gap={0}>
        <Field label="Title">
          <TextField
            value={props.values.title}
            onChange={(value) => props.onPatch({ title: value })}
            focused={props.focusedField === "title"}
            placeholder="What did you work on?"
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

        {veryNarrow ? (
          <>
            <Field label="Start date">{startDate}</Field>
            <Field label="End date">{endDate}</Field>
          </>
        ) : (
          <box flexDirection="row" gap={2}>
            <Field label="Start date">{startDate}</Field>
            <Field label="End date">{endDate}</Field>
          </box>
        )}

        <Field label="Tags (optional)">
          <TagInput
            tags={props.values.tags}
            inputValue={props.tagInput}
            focused={props.focusedField === "tags"}
            suggestions={props.suggestions}
            suggestionIndex={props.suggestionIndex}
            width={fieldWidth}
            onInputChange={props.onTagInputChange}
          />
        </Field>

        {props.error !== null ? <text fg={color(tokens.danger)}>{props.error}</text> : null}

        <Button primary={true} focused={false} disabled={props.saving} label={submitLabel} />
        <text fg={color(tokens.fgSubtle)}>
          {"Tab next field  Enter save  Ctrl+Enter from description  Esc cancel"}
        </text>
      </box>
    </Modal>
  );
}

import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../ui/Button";
import { DateField } from "../ui/DateField";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { TextField } from "../ui/TextField";
import type { ProjectFormProps } from "./ProjectForm.types";

// Create/edit project modal. Presentational: the screen owns field focus, Tab
// order, validation, and the repo write, so its keyboard scope drives this form.
export function ProjectForm(props: ProjectFormProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();
  const modalWidth = Math.min(64, Math.max(34, width - 4));
  const fieldWidth = modalWidth - 6;
  const editing = props.editing !== null;
  const submitLabel = props.saving ? "Saving..." : editing ? "Save changes" : "Create project";

  return (
    <Modal title={editing ? "Edit project" : "New project"} width={modalWidth}>
      <box flexDirection="column" gap={0}>
        <Field label="Name">
          <TextField
            value={props.values.name}
            onChange={(value) => props.onPatch({ name: value })}
            focused={props.focusedField === "name"}
            placeholder="Project name"
            width={fieldWidth}
          />
        </Field>

        <Field label="Start date">
          <DateField
            value={props.values.startDate}
            onChange={(value) => props.onPatch({ startDate: value })}
            focused={props.focusedField === "start"}
            width={fieldWidth}
          />
        </Field>

        <Field label="Weeks (4-52)">
          <TextField
            value={props.values.weekCount}
            onChange={(value) => props.onPatch({ weekCount: value })}
            focused={props.focusedField === "weeks"}
            placeholder="12"
            width={fieldWidth}
          />
        </Field>

        {props.error !== null ? <text fg={color(tokens.danger)}>{props.error}</text> : null}

        <Button primary={true} focused={false} disabled={props.saving} label={submitLabel} />
        <text fg={color(tokens.fgSubtle)}>{"Tab next field  Enter save  Esc cancel"}</text>
      </box>
    </Modal>
  );
}

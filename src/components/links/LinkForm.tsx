import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { TagInput } from "../ui/TagInput";
import { TextField } from "../ui/TextField";
import type { LinkFormProps } from "./LinkForm.types";

// Save-link modal. Presentational: the screen owns field focus, Tab order,
// validation, duplicate detection, and the repo write, so its keyboard scope
// drives this form.
export function LinkForm(props: LinkFormProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();
  const modalWidth = Math.min(72, Math.max(36, width - 4));
  const fieldWidth = modalWidth - 6;
  const submitLabel = props.saving ? "Saving..." : "Save link";

  return (
    <Modal title="Save link" width={modalWidth}>
      <box flexDirection="column" gap={0}>
        <Field label="URL">
          <TextField
            value={props.values.url}
            onChange={(value) => props.onPatch({ url: value })}
            focused={props.focusedField === "url"}
            placeholder="https://example.com/article"
            width={fieldWidth}
          />
        </Field>

        <Field label="Title (optional)">
          <TextField
            value={props.values.title}
            onChange={(value) => props.onPatch({ title: value })}
            focused={props.focusedField === "title"}
            placeholder="Blank uses the domain"
            width={fieldWidth}
          />
        </Field>

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
          {"tab next field  enter save  ctrl+enter save from tags  esc cancel"}
        </text>
      </box>
    </Modal>
  );
}

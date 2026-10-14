import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";
import type { ConfirmDialogProps } from "./ConfirmDialog.types";
import { Modal } from "./Modal";

// OpenTUI has no native confirm/dialog primitive, so this stays a Modal
// composition. Keys (Enter/y confirm, Esc/n cancel) are owned by the screen
// that renders it; the buttons are the mouse path to the same handlers.
export function ConfirmDialog(props: ConfirmDialogProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  return (
    <Modal title={props.title}>
      <box flexDirection="column" gap={1}>
        <text fg={color(tokens.fgMuted)}>{props.body}</text>
        <box flexDirection="row" gap={2}>
          <Button label="Cancel" onPress={props.onCancel} />
          <Button
            label={props.confirmLabel}
            primary={props.destructive !== true}
            destructive={props.destructive === true}
            onPress={props.onConfirm}
          />
        </box>
        <text fg={color(tokens.fgSubtle)}>{"enter confirm  esc cancel"}</text>
      </box>
    </Modal>
  );
}

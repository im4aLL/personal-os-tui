import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ConfirmDialogProps } from "./ConfirmDialog.types";
import { Modal } from "./Modal";

// OpenTUI has no native confirm/dialog primitive, so this stays a Modal
// composition. Keys (Enter/y confirm, Esc/n cancel) are owned by the screen
// that renders it, so this component is presentational only.
export function ConfirmDialog(props: ConfirmDialogProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  return (
    <Modal title={props.title}>
      <box flexDirection="column" gap={1}>
        <text fg={color(tokens.fgMuted)}>{props.body}</text>
        <text fg={color(props.destructive === true ? tokens.danger : tokens.accent)}>
          {props.confirmLabel}
        </text>
        <text fg={color(tokens.fgSubtle)}>{"enter confirm  esc cancel"}</text>
      </box>
    </Modal>
  );
}

import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { FieldProps } from "./Field.types";

// OpenTUI has no native labeled-field primitive (the input docs
// https://opentui.com/docs/components/input/ compose Box + Text label + Input
// manually for its login form), so this stays a box+text composition.
// Labeled control layout: label above the control, error below it. Labels always sit above fields, so wide and narrow
// terminals share one columnar form.
export function Field(props: FieldProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  return (
    <box flexDirection="column" gap={0}>
      <text fg={color(tokens.fgMuted)}>{props.label}</text>
      {props.children}
      {props.error ? <text fg={color(tokens.danger)}>{props.error}</text> : null}
    </box>
  );
}

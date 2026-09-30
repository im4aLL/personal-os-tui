import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider";
import type { ConnectionDotProps } from "./ConnectionDot.types";

export function ConnectionDot(props: ConnectionDotProps): ReactNode {
  const { theme, color } = useTheme();
  const dot = props.ok ? theme.tokens.success : theme.tokens.danger;
  return (
    <box flexDirection="row">
      <text fg={color(dot)}>{"* "}</text>
      <text fg={color(theme.tokens.fgMuted)}>{props.label}</text>
    </box>
  );
}

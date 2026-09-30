import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider";
import type { ConnectionDotProps } from "./ConnectionDot.types";

export function ConnectionDot(props: ConnectionDotProps): ReactNode {
  const { theme, color } = useTheme();
  const dots = {
    ok: theme.tokens.success,
    error: theme.tokens.danger,
    stub: theme.tokens.warning,
  };
  return (
    <box flexDirection="row">
      <text fg={color(dots[props.tone])}>{"* "}</text>
      <text fg={color(theme.tokens.fgMuted)}>{props.label}</text>
    </box>
  );
}

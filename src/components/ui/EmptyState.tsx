import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { EmptyStateProps } from "./EmptyState.types";

// OpenTUI has no native empty-state primitive, so this stays a box+text composition.
export function EmptyState(props: EmptyStateProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
      <text fg={color(tokens.fgMuted)}>{props.title}</text>
      {props.hint !== undefined ? <text fg={color(tokens.fgSubtle)}>{props.hint}</text> : null}
    </box>
  );
}

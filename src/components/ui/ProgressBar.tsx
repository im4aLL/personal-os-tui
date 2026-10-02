import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ProgressBarProps } from "./ProgressBar.types";

// OpenTUI has no native progress-bar primitive, so this stays a text
// composition: a run of `#` for the filled part, `-` for the remainder, then a
// label. Full bars use the success color; the rest use the accent color.
export function ProgressBar(props: ProgressBarProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const ratio = Math.max(0, Math.min(1, props.ratio));
  const width = Math.max(1, props.width);
  const filled = Math.round(ratio * width);
  const isFull = ratio >= 1;
  const label = props.label ?? `${Math.round(ratio * 100)}%`;

  return (
    <box flexDirection="row" flexShrink={0}>
      <text fg={color(isFull ? tokens.success : tokens.accent)}>{"#".repeat(filled)}</text>
      <text fg={color(tokens.borderMuted)}>{"-".repeat(Math.max(0, width - filled))}</text>
      <text fg={color(tokens.fgSubtle)}>{` ${label}`}</text>
    </box>
  );
}

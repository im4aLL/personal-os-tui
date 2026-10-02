import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ProgressBarProps } from "./ProgressBar.types";

// OpenTUI has no native progress-bar primitive, so this stays a text
// composition: a run of `#` for the filled part, `-` for the remainder, then a
// label. Full bars use the success color; the rest use the accent color.
//
// The three runs are inline spans of one `<text>` rather than sibling text
// renderables: at 0% and 100% a run is empty, and an empty sibling collapses
// the flex row, which shifts the label onto the previous line.
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
      <text wrapMode="none">
        <span fg={color(isFull ? tokens.success : tokens.accent)}>{"#".repeat(filled)}</span>
        <span fg={color(tokens.borderMuted)}>{"-".repeat(Math.max(0, width - filled))}</span>
        <span fg={color(tokens.fgSubtle)}>{` ${label}`}</span>
      </text>
    </box>
  );
}

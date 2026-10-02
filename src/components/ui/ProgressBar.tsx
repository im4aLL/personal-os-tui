import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { clampRatio, progressBarEmpty, progressBarFill } from "../../utils/bar";
import type { ProgressBarProps } from "./ProgressBar.types";

// OpenTUI has no native progress-bar primitive, so this stays a text
// composition: a run of the filled glyph for the filled part, the empty glyph
// for the remainder, then a label. Full bars use the success color; the rest
// use the accent color.
//
// The glyphs come from `utils/bar`, the one place to change the bar style
// across the app.
//
// The three runs are inline spans of one `<text>` rather than sibling text
// renderables: at 0% and 100% a run is empty, and an empty sibling collapses
// the flex row, which shifts the label onto the previous line.
export function ProgressBar(props: ProgressBarProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const ratio = clampRatio(props.ratio);
  const isFull = ratio >= 1;
  const label = props.label ?? `${Math.round(ratio * 100)}%`;

  return (
    <box flexDirection="row" flexShrink={0}>
      <text wrapMode="none">
        <span fg={color(isFull ? tokens.success : tokens.accent)}>
          {progressBarFill(ratio, props.width)}
        </span>
        <span fg={color(tokens.borderMuted)}>{progressBarEmpty(ratio, props.width)}</span>
        <span fg={color(tokens.fgSubtle)}>{` ${label}`}</span>
      </text>
    </box>
  );
}

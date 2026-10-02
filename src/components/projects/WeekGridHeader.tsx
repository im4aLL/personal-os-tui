import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { truncate } from "../../utils/text";
import type { WeekGridHeaderProps } from "./WeekGridHeader.types";

/** Center `text` in a column of exactly `width`, truncating when it does not
 * fit so a date and its `Week N` name land in the same column position. */
function centerInColumn(text: string, width: number): string {
  if (width <= 0) {
    return "";
  }
  const fitted = truncate(text, width);
  const left = Math.floor((width - fitted.length) / 2);
  return fitted.padStart(left + fitted.length).padEnd(width);
}

// Two header rows over the week grid. Row 1 labels the task and resource
// columns and the start date of each visible week; row 2 repeats each visible
// week as `Week N`. The current week is bold and accented in both rows. When
// the window is narrower than the project, a right-aligned indicator shows the
// visible range and the `[ ]` shift keys. Presentational only.
export function WeekGridHeader(props: WeekGridHeaderProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;

  if (props.loading) {
    return (
      <box flexDirection="column" flexShrink={0}>
        <text fg={color(tokens.bgHover)}>{"█".repeat(Math.min(props.width, 48))}</text>
        <text fg={color(tokens.bgHover)}>{"█".repeat(Math.min(props.width, 40))}</text>
      </box>
    );
  }

  const labelAttrs = props.focused ? TextAttributes.BOLD : undefined;
  const taskLabel = truncate("Task", props.taskWidth).padEnd(props.taskWidth);
  const resLabel = truncate("Res", props.resWidth).padEnd(props.resWidth);
  const blank = " ".repeat(props.taskWidth + props.resWidth + 2);

  // The last visible week absorbs any leftover columns, matching the body, so
  // the header labels stay aligned with the week bars.
  const lastWeekWidth =
    props.headers.length === 0
      ? props.weekColumnWidth
      : Math.max(
          props.weekColumnWidth,
          props.weekAreaWidth - (props.headers.length - 1) * (props.weekColumnWidth + 1),
        );
  const weekWidthAt = (index: number): number =>
    index === props.headers.length - 1 ? lastWeekWidth : props.weekColumnWidth;

  const remaining = Math.max(
    0,
    props.width - props.taskWidth - props.resWidth - 2 - props.weekAreaWidth,
  );
  const windowed = props.headers.length < props.totalWeeks;
  let indicator = "";
  if (windowed && remaining > 1) {
    const first = props.windowStart + 1;
    const last = props.windowStart + props.headers.length;
    const long = ` weeks ${first}-${last} of ${props.totalWeeks}  [ ]`;
    const short = ` ${first}-${last}/${props.totalWeeks} [ ]`;
    indicator = truncate(remaining >= long.length ? long : short, remaining);
  }

  return (
    <box flexDirection="column" flexShrink={0}>
      <box flexDirection="row" height={1}>
        <text fg={color(tokens.fgMuted)} attributes={labelAttrs}>
          {taskLabel}
        </text>
        <text> </text>
        <text fg={color(tokens.fgMuted)} attributes={labelAttrs}>
          {resLabel}
        </text>
        <text> </text>
        {props.headers.map((header, index) => (
          <text
            key={header.weekNum}
            wrapMode="none"
            fg={color(header.isCurrent ? tokens.accent : tokens.fgMuted)}
            attributes={header.isCurrent ? TextAttributes.BOLD : undefined}
          >
            {centerInColumn(header.date, weekWidthAt(index))}
          </text>
        ))}
        {indicator === "" ? null : <text fg={color(tokens.fgSubtle)}>{indicator}</text>}
      </box>
      <box flexDirection="row" height={1}>
        <text fg={color(tokens.fgSubtle)}>{blank}</text>
        {props.headers.map((header, index) => (
          <text
            key={header.weekNum}
            wrapMode="none"
            fg={color(header.isCurrent ? tokens.accent : tokens.fgSubtle)}
            attributes={header.isCurrent ? TextAttributes.BOLD : undefined}
          >
            {centerInColumn(`Week ${header.weekNum}`, weekWidthAt(index))}
          </text>
        ))}
      </box>
    </box>
  );
}

import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { formatMonthDay } from "../../lib/week-utils";
import { useTheme } from "../../theme/ThemeProvider";
import { rowMarker } from "../../utils/marker";
import { rowClickHandler } from "../../utils/mouse";
import { truncate } from "../../utils/text";
import type { ProjectListItemProps } from "./ProjectListItem.types";

const MARKER = 2;

// One project row: an active marker when selected, the name, then a compact
// `{n}w {M/D}` line (plus a completion percentage when progress is known).
// Presentational only; the screen owns selection and keys.
export function ProjectListItem(props: ProjectListItemProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { project, selected, focused } = props;
  const marker = rowMarker(selected);
  const pct =
    props.stat !== undefined && props.stat.total > 0
      ? `  ${Math.round((props.stat.done / props.stat.total) * 100)}%`
      : "";
  const meta = `${project.weekCount}w ${formatMonthDay(project.startDate)}${pct}`;
  const room = Math.max(4, props.width - MARKER);
  const nameColor = selected ? tokens.accent : tokens.fg;

  return (
    <box
      flexDirection="column"
      flexShrink={0}
      backgroundColor={selected && focused ? color(tokens.bgAlt) : undefined}
      onMouseDown={rowClickHandler(project.id, props.onSelect, props.onActivate)}
    >
      <box flexDirection="row" height={1}>
        <text fg={color(selected ? tokens.accent : tokens.fgSubtle)}>{marker}</text>
        <text
          wrapMode="none"
          fg={color(nameColor)}
          attributes={selected ? TextAttributes.BOLD : undefined}
        >
          {truncate(project.name, room)}
        </text>
      </box>
      <box flexDirection="row" height={1}>
        <text fg={color(tokens.fgSubtle)}>{"  "}</text>
        <text wrapMode="none" fg={color(selected ? tokens.fgMuted : tokens.fgSubtle)}>
          {truncate(meta, room)}
        </text>
      </box>
    </box>
  );
}

import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import type { WorkItemStatus, WorkItemWithPhase } from "../../repos/types";
import { mixWithBase } from "../../theme/degrade";
import { useTheme } from "../../theme/ThemeProvider";
import { rowMarker } from "../../utils/marker";
import { truncate } from "../../utils/text";
import type { WeekGridProps } from "./WeekGrid.types";

// Gantt-row status shades, matching the desktop `STATUS_OPACITY`.
const STATUS_RATIO: Record<WorkItemStatus, number> = { pending: 0.4, in_progress: 0.75, done: 1 };
const STATUS_LABEL: Record<WorkItemStatus, string> = {
  pending: "pending",
  in_progress: "in prog",
  done: "done",
};
/** Stable keys for the five loading skeleton rows (never index-based). */
const SKELETON_ROWS = ["s1", "s2", "s3", "s4", "s5"];
/** Fixed one-column gap rendered between grid columns. */
const GAP = " ";

interface GridRowProps {
  item: WorkItemWithPhase;
  selected: boolean;
  focused: boolean;
  taskWidth: number;
  resWidth: number;
  weekColumnWidth: number;
  windowStart: number;
  visibleWeeks: number;
  weekAreaWidth: number;
}

function GridRow(props: GridRowProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { item } = props;
  const selected = props.selected;
  const phaseColor = item.phase?.color ?? tokens.phaseFallback;
  const fill = item.status === "done" ? "=" : "#";
  const barColor = mixWithBase(phaseColor, tokens.bg, STATUS_RATIO[item.status]);
  const taskRoom = Math.max(1, props.taskWidth - 2);

  let attrs: number | undefined;
  if (item.status === "done") {
    attrs = TextAttributes.STRIKETHROUGH;
  }
  if (selected && props.focused) {
    attrs = (attrs ?? 0) | TextAttributes.BOLD;
  }
  const titleColor = selected && props.focused ? tokens.fg : tokens.fgMuted;

  return (
    <box
      flexDirection="row"
      height={1}
      flexShrink={0}
      backgroundColor={selected && props.focused ? color(tokens.bgHover) : undefined}
    >
      <text fg={color(selected ? tokens.accent : tokens.fgSubtle)}>{rowMarker(selected)}</text>
      <text wrapMode="none" fg={color(titleColor)} attributes={attrs}>
        {truncate(item.title, taskRoom).padEnd(taskRoom)}
      </text>
      <text>{GAP}</text>
      <text wrapMode="none" fg={color(tokens.fgMuted)}>
        {truncate(item.person ?? "", props.resWidth).padEnd(props.resWidth)}
      </text>
      <text>{GAP}</text>
      {Array.from({ length: props.visibleWeeks }, (_, index) => {
        const weekNum = props.windowStart + index + 1;
        const covered = weekNum >= item.startWeek && weekNum <= item.endWeek;
        // The last visible week absorbs any leftover columns so the row spans
        // the full grid width; the others keep their fixed width and gap.
        const width =
          index === props.visibleWeeks - 1
            ? Math.max(
                props.weekColumnWidth,
                props.weekAreaWidth - index * (props.weekColumnWidth + 1),
              )
            : props.weekColumnWidth;
        const bar = covered ? fill.repeat(width) : " ".repeat(width);
        return (
          <text key={`week-${weekNum}`} fg={color(barColor)}>
            {bar}
          </text>
        );
      })}
    </box>
  );
}

function ListHeader(props: { width: number }): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const task = Math.max(8, Math.floor(props.width * 0.4));
  const res = Math.max(3, Math.floor(props.width * 0.14));
  const status = 8;
  const weeks = Math.max(6, props.width - task - res - status - 3);
  const label = `${"Task".padEnd(task)} ${"Res".padEnd(res)} ${"Weeks".padEnd(weeks)} Status`;
  return (
    <box flexDirection="row" height={1} flexShrink={0}>
      <text fg={color(tokens.fgMuted)} attributes={TextAttributes.BOLD} wrapMode="none">
        {label}
      </text>
    </box>
  );
}

function ListRow(props: {
  item: WorkItemWithPhase;
  selected: boolean;
  focused: boolean;
  width: number;
}): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { item } = props;
  const task = Math.max(8, Math.floor(props.width * 0.4));
  const res = Math.max(3, Math.floor(props.width * 0.14));
  const status = 8;
  const weeks = Math.max(6, props.width - task - res - status - 3);
  const taskRoom = Math.max(1, task - 2);
  const statusColor =
    item.status === "done"
      ? tokens.success
      : item.status === "in_progress"
        ? tokens.accent
        : tokens.fgMuted;
  let attrs: number | undefined;
  if (item.status === "done") {
    attrs = TextAttributes.STRIKETHROUGH;
  }

  return (
    <box
      flexDirection="row"
      height={1}
      flexShrink={0}
      backgroundColor={props.selected && props.focused ? color(tokens.bgHover) : undefined}
    >
      <text fg={color(props.selected ? tokens.accent : tokens.fgSubtle)}>
        {rowMarker(props.selected)}
      </text>
      <text wrapMode="none" fg={color(tokens.fgMuted)} attributes={attrs}>
        {truncate(item.title, taskRoom).padEnd(taskRoom)}
      </text>
      <text>{GAP}</text>
      <text wrapMode="none" fg={color(tokens.fgMuted)}>
        {truncate(item.person ?? "", res).padEnd(res)}
      </text>
      <text>{GAP}</text>
      <text wrapMode="none" fg={color(tokens.fgSubtle)}>
        {`${item.startWeek}-${item.endWeek}`.padEnd(weeks)}
      </text>
      <text>{GAP}</text>
      <text wrapMode="none" fg={color(statusColor)}>
        {STATUS_LABEL[item.status].padEnd(status)}
      </text>
    </box>
  );
}

function SeparatorRow(props: { width: number; selected: boolean }): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  return (
    <box flexDirection="row" height={1} flexShrink={0}>
      <text fg={color(props.selected ? tokens.accent : tokens.borderMuted)} wrapMode="none">
        {"-".repeat(Math.max(0, props.width))}
      </text>
    </box>
  );
}

// The grid body: one row per work item (or a full-width rule for separators, or
// the list-mode table). The screen windows `workItems` vertically and passes
// the visible week window, so this component is presentational only.
export function WeekGrid(props: WeekGridProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;

  if (props.loading) {
    return (
      <box flexDirection="column" flexShrink={0}>
        {SKELETON_ROWS.map((row) => (
          <text key={row} fg={color(tokens.bgHover)}>
            {"█".repeat(Math.min(Math.max(8, props.width - 2), 44))}
          </text>
        ))}
      </box>
    );
  }

  if (props.workItems.length === 0) {
    return (
      <box flexDirection="column" flexShrink={0} paddingTop={1}>
        <text fg={color(tokens.fgMuted)}>{"No items yet, press n to add"}</text>
      </box>
    );
  }

  if (props.listMode) {
    return (
      <box flexDirection="column" flexShrink={0}>
        <ListHeader width={props.width} />
        {props.workItems.map((item) =>
          item.isSeparator ? (
            <SeparatorRow
              key={item.id}
              width={props.width}
              selected={item.id === props.selectedId}
            />
          ) : (
            <ListRow
              key={item.id}
              item={item}
              selected={item.id === props.selectedId}
              focused={props.focused}
              width={props.width}
            />
          ),
        )}
      </box>
    );
  }

  return (
    <box flexDirection="column" flexShrink={0}>
      {props.workItems.map((item) =>
        item.isSeparator ? (
          <SeparatorRow key={item.id} width={props.width} selected={item.id === props.selectedId} />
        ) : (
          <GridRow
            key={item.id}
            item={item}
            selected={item.id === props.selectedId}
            focused={props.focused}
            taskWidth={props.taskWidth}
            resWidth={props.resWidth}
            weekColumnWidth={props.weekColumnWidth}
            weekAreaWidth={props.weekAreaWidth}
            windowStart={props.windowStart}
            visibleWeeks={props.visibleWeeks}
          />
        ),
      )}
    </box>
  );
}

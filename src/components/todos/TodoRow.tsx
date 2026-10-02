import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import type { Todo } from "../../repos/types";
import { useTheme } from "../../theme/ThemeProvider";
import { formatDueLabel, isOverdue } from "../../utils/date";
import type { TodoRowProps } from "./TodoRow.types";

/** ASCII truncation; `...` when there is room, else a hard slice. */
function truncate(text: string, room: number): string {
  if (text.length <= room) {
    return text;
  }
  if (room <= 3) {
    return text.slice(0, Math.max(0, room));
  }
  return `${text.slice(0, room - 3)}...`;
}

/** Right-pad with spaces to a minimum width; longer text is left untouched. */
function padEnd(text: string, width: number): string {
  return text.length >= width ? text : text.padEnd(width);
}

/** Left-pad with spaces to a minimum width; longer text is left untouched. */
function padStart(text: string, width: number): string {
  return text.length >= width ? text : text.padStart(width);
}

const PRIORITY_LABEL: Record<NonNullable<Todo["priority"]>, string> = {
  high: "high",
  medium: "medium",
  low: "low",
};

// Wide enough for the longest label ("medium"); the due date fills the rest of
// the line and is right-aligned, so the meta columns line up across rows.
const PRIORITY_COL = 6;

export function TodoRow(props: TodoRowProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { todo, selected } = props;
  const completed = todo.status === "completed";
  const marker = selected ? "> " : "  ";
  const markerColor = selected ? tokens.accent : tokens.fgSubtle;

  const priority = todo.priority;
  const priorityColor =
    priority === "high"
      ? tokens.priorityHigh
      : priority === "medium"
        ? tokens.priorityMedium
        : tokens.priorityLow;
  const dueLabel = todo.dueDate === null ? null : formatDueLabel(todo.dueDate, completed);
  const dueColor =
    todo.dueDate !== null && isOverdue(todo.dueDate, completed) ? tokens.danger : tokens.fgMuted;

  const titleColor = completed ? tokens.fgMuted : selected ? tokens.accent : tokens.fg;
  const titleAttrs = selected ? TextAttributes.BOLD : undefined;

  const title = truncate(todo.title, Math.max(4, props.width - 2));
  const hasMeta = priority !== null || dueLabel !== null;
  const metaRoom = Math.max(6, props.width - 2);
  const dueRoom = Math.max(4, metaRoom - PRIORITY_COL - 1);

  return (
    <box flexDirection="column" width={props.width} flexShrink={0}>
      <text wrapMode="none">
        <span fg={color(markerColor)}>{marker}</span>
        <span fg={color(titleColor)} attributes={titleAttrs}>
          {title}
        </span>
      </text>
      {hasMeta ? (
        <text wrapMode="none">
          <span fg={color(tokens.fgSubtle)}>{"  "}</span>
          <span fg={color(priority !== null ? priorityColor : tokens.fgSubtle)}>
            {padEnd(priority === null ? "" : PRIORITY_LABEL[priority], PRIORITY_COL)}
          </span>
          <span fg={color(dueLabel === null ? tokens.fgSubtle : dueColor)}>
            {` ${padStart(dueLabel ?? "", dueRoom)}`}
          </span>
        </text>
      ) : null}
    </box>
  );
}

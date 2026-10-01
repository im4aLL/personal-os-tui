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

const PRIORITY_LABEL: Record<NonNullable<Todo["priority"]>, string> = {
  high: "high",
  medium: "medium",
  low: "low",
};

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

  const titleColor = completed ? tokens.fgMuted : selected ? tokens.fg : tokens.fgMuted;
  const titleAttrs = selected ? TextAttributes.BOLD : undefined;

  const title = truncate(todo.title, Math.max(4, props.width - 2));
  return (
    <box flexDirection="column">
      <text wrapMode="none">
        <span fg={color(markerColor)}>{marker}</span>
        <span fg={color(titleColor)} attributes={titleAttrs}>
          {title}
        </span>
      </text>
      {priority === null && dueLabel === null ? null : (
        <text wrapMode="none">
          <span fg={color(tokens.fgSubtle)}>{"  "}</span>
          {priority === null ? null : (
            <span fg={color(priorityColor)}>{`${PRIORITY_LABEL[priority]}  `}</span>
          )}
          {dueLabel === null ? null : <span fg={color(dueColor)}>{dueLabel}</span>}
        </text>
      )}
    </box>
  );
}

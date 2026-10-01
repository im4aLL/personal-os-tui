import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { KanbanColumnProps } from "./KanbanColumn.types";
import { TodoRow } from "./TodoRow";

// One status column: an uppercase header with the filtered count, then the
// windowed rows. Purely presentational; the screen owns selection, filtering,
// windowing, and keys.
export function KanbanColumn(props: KanbanColumnProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const headerColor =
    props.status === "in-progress"
      ? tokens.accent
      : props.status === "completed"
        ? tokens.success
        : tokens.fgMuted;

  return (
    <box
      flexDirection="column"
      flexGrow={props.flex ? 1 : 0}
      flexBasis={props.flex ? 0 : "auto"}
      flexShrink={1}
      gap={1}
    >
      <text wrapMode="none">
        <span fg={color(headerColor)} attributes={TextAttributes.BOLD}>
          {props.label.toUpperCase()}
        </span>
        <span fg={color(tokens.fgMuted)}>{` (${props.count})`}</span>
      </text>
      {props.items.length === 0 ? (
        <text fg={color(tokens.fgSubtle)}>{"No todos"}</text>
      ) : (
        props.items.map((todo) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            selected={todo.id === props.selectedId}
            compact={props.compact}
            width={props.columnWidth}
          />
        ))
      )}
    </box>
  );
}

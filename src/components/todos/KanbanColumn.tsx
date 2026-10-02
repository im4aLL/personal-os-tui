import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { KanbanColumnProps } from "./KanbanColumn.types";
import { TodoRow } from "./TodoRow";

// One status column. In the wide layout it is a bordered box with the status
// and count embedded in the top border (matching the dashboard panels) so the
// three columns form an even grid. In the stacked layout the screen renders the
// status tabs, so the column is a plain list. Purely presentational; the screen
// owns selection, filtering, windowing, and keys.
export function KanbanColumn(props: KanbanColumnProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const headerColor =
    props.status === "in-progress"
      ? tokens.accent
      : props.status === "completed"
        ? tokens.success
        : tokens.fgMuted;

  // A dashed rule between items, matching the Save Links list: two cells of
  // indent then hyphens across the column's inner width.
  const dividerColor = color(tokens.borderMuted);
  const rows: ReactNode[] = [];
  if (props.items.length === 0) {
    rows.push(
      <text key="empty" fg={color(tokens.fgSubtle)} wrapMode="none">
        {"No todos"}
      </text>,
    );
  } else {
    props.items.forEach((todo, index) => {
      if (index > 0) {
        rows.push(
          <text key={`divider-${todo.id}`} fg={dividerColor} wrapMode="none">
            {`  ${"-".repeat(Math.max(0, props.columnWidth - 2))}`}
          </text>,
        );
      }
      rows.push(
        <TodoRow
          key={todo.id}
          todo={todo}
          selected={todo.id === props.selectedId}
          compact={props.compact}
          width={props.columnWidth}
        />,
      );
    });
  }

  if (props.variant === "plain") {
    return (
      <box flexDirection="column" flexGrow={1} minHeight={0}>
        {rows}
      </box>
    );
  }

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      flexBasis={0}
      flexShrink={1}
      minHeight={0}
      border
      borderStyle="single"
      borderColor={color(props.focused ? tokens.borderFocus : tokens.borderMuted)}
      title={` ${props.label} (${props.count}) `}
      titleColor={color(props.focused ? tokens.accent : headerColor)}
      paddingLeft={1}
      paddingRight={1}
    >
      {rows}
    </box>
  );
}

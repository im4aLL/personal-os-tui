import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { todayISO } from "../../utils/date";
import { rowMarker } from "../../utils/marker";
import { windowSlice } from "../../utils/window";
import { Modal } from "../ui/Modal";
import type { ArchivedTodosDialogProps } from "./ArchivedTodosDialog.types";

/** Short local date for a stale `updatedAt` ISO datetime (`YYYY-MM-DD...`). */
function staleDate(updatedAt: string): string {
  const date = updatedAt.slice(0, 10);
  return date === todayISO() ? "today" : date;
}

// Modal archived list. The screen loads the data and owns the keys (j/k/r/R/d/
// Esc/a); this component only renders the windowed rows and the hint.
export function ArchivedTodosDialog(props: ArchivedTodosDialogProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { todos, selectedIndex } = props;

  const visible = windowSlice(todos, selectedIndex, props.maxRows);

  return (
    <Modal title={`Archived todos (${todos.length})`} width={72}>
      <box flexDirection="column" gap={0}>
        {props.loading ? (
          <text fg={color(tokens.fgSubtle)}>{"Loading..."}</text>
        ) : todos.length === 0 ? (
          <text fg={color(tokens.fgSubtle)}>{"No archived todos"}</text>
        ) : (
          visible.map((todo) => {
            const index = todos.indexOf(todo);
            const selected = index === selectedIndex;
            return (
              <text key={todo.id} wrapMode="none">
                <span fg={color(selected ? tokens.accent : tokens.fgSubtle)}>
                  {rowMarker(selected)}
                </span>
                <span fg={color(selected ? tokens.fg : tokens.fgMuted)}>
                  {todo.title.length > 40 ? `${todo.title.slice(0, 37)}...` : todo.title}
                </span>
                <span fg={color(tokens.fgSubtle)}>{`  ${staleDate(todo.updatedAt)}`}</span>
              </text>
            );
          })
        )}
        <text fg={color(tokens.fgSubtle)}>{"r restore  R restore all  d delete  a/esc close"}</text>
      </box>
    </Modal>
  );
}

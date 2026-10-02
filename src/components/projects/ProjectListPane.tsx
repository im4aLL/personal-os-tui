import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { wheelDelta } from "../../utils/mouse";
import { truncate } from "../../utils/text";
import { windowSlice } from "../../utils/window";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { ProjectListItem } from "./ProjectListItem";
import type { ProjectListPaneProps } from "./ProjectListPane.types";

/** A pane's frame: two border cells plus one padding cell on each side. */
const FRAME = 4;

// The left pane: a bordered panel titled with the project count, holding the
// windowed project rows (dashed rules between them), a loading skeleton, or the
// empty state. Presentational only; the screen owns selection and keys.
export function ProjectListPane(props: ProjectListPaneProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const innerWidth = Math.max(8, props.width);
  const selectedIndex = props.projects.findIndex((project) => project.id === props.selectedId);
  const visible = windowSlice(props.projects, selectedIndex, Math.max(1, props.maxItems));

  const rows: ReactNode[] = [];
  if (!props.loading && props.projects.length > 0) {
    visible.forEach((project, index) => {
      if (index > 0) {
        rows.push(
          <text key={`divider-${project.id}`} fg={color(tokens.borderMuted)} wrapMode="none">
            {`  ${"-".repeat(Math.max(0, innerWidth - 2))}`}
          </text>,
        );
      }
      rows.push(
        <ProjectListItem
          key={project.id}
          project={project}
          selected={project.id === props.selectedId}
          focused={props.focused}
          width={innerWidth}
          stat={props.progress[project.id]}
          onSelect={() => props.onSelectProject?.(project.id)}
          onActivate={() => props.onActivateProject?.(project.id)}
        />,
      );
    });
  }

  return (
    <box
      flexDirection="column"
      width={props.width + FRAME}
      flexShrink={0}
      minHeight={0}
      border
      borderStyle="single"
      borderColor={color(props.focused ? tokens.borderFocus : tokens.borderMuted)}
      title={` ${truncate(`Projects (${props.projects.length})`, Math.max(4, props.width - 1))} `}
      titleColor={color(props.focused ? tokens.accent : tokens.fgMuted)}
      paddingLeft={1}
      paddingRight={1}
      onMouseScroll={(event) => {
        const delta = wheelDelta(event);
        if (delta !== 0) {
          props.onWheel?.(delta);
        }
      }}
    >
      {props.loading ? (
        <Skeleton lines={3} widths={[16, 12, 14]} />
      ) : props.projects.length === 0 ? (
        <EmptyState title="No projects yet" hint="n to add your first project" />
      ) : (
        rows
      )}
    </box>
  );
}

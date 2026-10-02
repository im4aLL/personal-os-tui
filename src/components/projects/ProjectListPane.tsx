import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { windowSlice } from "../../utils/window";
import { ProjectListItem } from "./ProjectListItem";
import type { ProjectListPaneProps } from "./ProjectListPane.types";

// Loading placeholder: three dim bars, one per expected project row.
function SkeletonBars(props: { width: number }): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const widths = [16, 12, 14];
  return (
    <box flexDirection="column" flexShrink={0}>
      {widths.map((len) => (
        <text key={len} fg={color(tokens.bgHover)}>
          {"█".repeat(Math.max(4, Math.min(len, props.width)))}
        </text>
      ))}
    </box>
  );
}

// The left pane: title with the `n add` hint, the project rows (windowed around
// the selection), a loading skeleton, or the empty state. Presentational only.
export function ProjectListPane(props: ProjectListPaneProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const innerWidth = Math.max(8, props.width - 2);
  const selectedIndex = props.projects.findIndex((project) => project.id === props.selectedId);
  const visible = windowSlice(props.projects, selectedIndex, Math.max(1, props.maxItems));

  return (
    <box flexDirection="column" width={props.width} flexShrink={0} paddingRight={1}>
      <box flexDirection="row" height={1} flexShrink={0}>
        <text
          fg={color(props.focused ? tokens.accent : tokens.fg)}
          attributes={TextAttributes.BOLD}
        >
          {"Projects"}
        </text>
        <box flexGrow={1} />
        <text fg={color(tokens.fgSubtle)}>{"n add"}</text>
      </box>

      {props.loading ? (
        <SkeletonBars width={innerWidth} />
      ) : props.projects.length === 0 ? (
        <box flexDirection="column" paddingTop={1}>
          <text fg={color(tokens.fgMuted)}>{"No projects yet"}</text>
          <text fg={color(tokens.fgSubtle)}>{"Press n to plan your first project"}</text>
        </box>
      ) : (
        visible.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            selected={project.id === props.selectedId}
            focused={props.focused}
            width={innerWidth}
            stat={props.progress[project.id]}
          />
        ))
      )}
    </box>
  );
}

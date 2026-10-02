import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { getProjectCompletion } from "../../lib/project-progress";
import { getProjectDateRange } from "../../lib/week-utils";
import { useTheme } from "../../theme/ThemeProvider";
import { truncate } from "../../utils/text";
import { ProgressBar } from "../ui/ProgressBar";
import type { ProjectHeaderProps } from "./ProjectHeader.types";

/** Phase legend is hidden entirely when the project has no phases; a `No phase`
 * entry appears only when phases exist and some item has no phase. */
export function ProjectHeader(props: ProjectHeaderProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { project } = props;
  const completion = getProjectCompletion(project, props.stat);
  const range = `${getProjectDateRange(project.startDate, project.weekCount)} - ${project.weekCount} weeks`;
  const nameRoom = Math.max(6, props.width - range.length - 3);
  const barWidth = Math.max(8, Math.min(20, Math.floor(props.width / 3)));
  const showNoPhase = props.workItems.some((item) => !item.isSeparator && item.phase === null);
  const showLegend = props.phases.length > 0;

  return (
    <box flexDirection="column" flexShrink={0}>
      <box flexDirection="row" height={1}>
        <text
          wrapMode="none"
          fg={color(props.focused ? tokens.accent : tokens.fg)}
          attributes={TextAttributes.BOLD}
        >
          {truncate(project.name, nameRoom)}
        </text>
        <text fg={color(tokens.fgSubtle)}>{`  ${range}`}</text>
      </box>
      <box flexDirection="row" height={1}>
        <ProgressBar ratio={completion.pct / 100} width={barWidth} label={`${completion.pct}%`} />
        <text fg={color(completion.isDone ? tokens.success : tokens.fgSubtle)}>
          {` ${completion.detail}`}
        </text>
      </box>
      {showLegend ? (
        <box flexDirection="row" height={1} gap={1}>
          {props.phases.map((phase) => (
            <text key={phase.id} wrapMode="none" fg={color(phase.color)}>
              {`(*) ${phase.name}`}
            </text>
          ))}
          {showNoPhase ? (
            <text wrapMode="none" fg={color(tokens.phaseFallback)}>
              {"(*) No phase"}
            </text>
          ) : null}
        </box>
      ) : null}
    </box>
  );
}

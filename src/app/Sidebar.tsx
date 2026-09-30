import type { ReactNode } from "react";
import { SCREEN_ORDER, SCREEN_SHORT_LABELS, SCREEN_TITLES } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import type { SidebarProps } from "./Sidebar.types";

/** Fit a label into the 14 usable columns, truncating with ".." like the plan. */
function fitLabel(label: string): string {
  if (label.length <= 14) {
    return label;
  }
  return `${label.slice(0, 12)}..`;
}

export function Sidebar(props: SidebarProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;

  if (props.rail) {
    return (
      <box
        flexDirection="column"
        backgroundColor={color(tokens.sidebarBg)}
        width={2}
        paddingTop={1}
      >
        {SCREEN_ORDER.map((item) => {
          const active = item === props.screen;
          return (
            <box key={item} backgroundColor={active ? color(tokens.sidebarActiveBg) : undefined}>
              <text fg={color(active ? tokens.sidebarActiveFg : tokens.fgMuted)}>
                {SCREEN_SHORT_LABELS[item]}
              </text>
            </box>
          );
        })}
      </box>
    );
  }

  return (
    <box
      flexDirection="column"
      backgroundColor={color(tokens.sidebarBg)}
      width={18}
      paddingTop={1}
      flexShrink={0}
    >
      <box flexDirection="column">
        {SCREEN_ORDER.map((item) => {
          const active = item === props.screen;
          return (
            <box
              key={item}
              flexDirection="row"
              backgroundColor={active ? color(tokens.sidebarActiveBg) : undefined}
              paddingLeft={1}
              paddingRight={1}
            >
              <text fg={color(active ? tokens.sidebarActiveFg : tokens.fgMuted)}>
                {`${active ? "> " : "  "}${fitLabel(SCREEN_TITLES[item])}`}
              </text>
            </box>
          );
        })}
      </box>
      <box flexGrow={1}>
        <text fg={color(tokens.sidebarBg)}> </text>
      </box>
    </box>
  );
}

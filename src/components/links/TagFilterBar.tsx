import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { TagFilterBarProps } from "./TagFilterBar.types";

// Tag filter pills with an `all` pill first. Keyboard-driven: the screen owns
// Tab/Shift+Tab, Enter, and the fitted `pills` list, so this renders the row
// and its focus/applied emphasis only. Pills that do not fit are dropped with a
// trailing ellipsis; the screen never focuses a dropped pill.
export function TagFilterBar(props: TagFilterBarProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;

  return (
    <box flexDirection="row" height={1} flexShrink={0}>
      {props.pills.map((pill, index) => {
        const focused = props.focused && index === props.focusedIndex;
        const applied = pill.tag === props.appliedTag;
        return (
          <text key={pill.id} wrapMode="none">
            {index === 0 ? null : <span fg={color(tokens.fgSubtle)}> </span>}
            <span
              fg={color(focused ? tokens.accent : applied ? tokens.accentAlt : tokens.fgMuted)}
              attributes={focused || applied ? TextAttributes.BOLD : undefined}
            >
              {pill.label}
            </span>
          </text>
        );
      })}
      {props.truncated ? (
        <text wrapMode="none" fg={color(tokens.fgSubtle)}>
          {" ..."}
        </text>
      ) : null}
    </box>
  );
}

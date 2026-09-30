import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ButtonProps } from "./Button.types";

export function Button(props: ButtonProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const primary = props.primary === true;
  return (
    <box
      border={true}
      borderColor={color(primary ? tokens.borderFocus : tokens.border)}
      backgroundColor={color(primary ? tokens.sidebarActiveBg : tokens.bgPanel)}
      paddingLeft={2}
      paddingRight={2}
    >
      <text fg={color(primary ? tokens.sidebarActiveFg : tokens.fg)}>{props.label}</text>
      {props.children}
    </box>
  );
}

import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ButtonProps } from "./Button.types";

// OpenTUI has no native button primitive, so this stays a box+text
// composition styled as an outline button: a bordered box whose label is the
// only content. No state sets a background, so the button occupies and weighs
// the same whether it is disabled, idle, or active; emphasis comes from the
// border color, the label color, and bold. Focus shows through the border
// color, never a character marker, so the label never shifts.
export function Button(props: ButtonProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const primary = props.primary === true;
  const focused = props.focused === true;
  const disabled = props.disabled === true;

  const borderColor = disabled ? tokens.borderMuted : focused ? tokens.borderFocus : tokens.border;
  const foreground = disabled ? tokens.fgDisabled : primary ? tokens.accent : tokens.fg;
  const bold = !disabled && (primary || focused);

  return (
    <box
      border={true}
      borderColor={color(borderColor)}
      paddingLeft={1}
      paddingRight={1}
      alignSelf="flex-start"
    >
      <text fg={color(foreground)} attributes={bold ? TextAttributes.BOLD : undefined}>
        {props.label}
      </text>
      {props.children}
    </box>
  );
}

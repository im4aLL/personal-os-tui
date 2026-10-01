import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { TextFieldProps } from "./TextField.types";

// Single-line input with a bordered wrapper. OpenTUI has no labeled-input
// primitive (see https://opentui.com/docs/components/input/ - the "login form"
// example composes Box + Text label + Input manually, which is what Field +
// TextField do here), and the core `<input>` has no secure mode: its options
// type (InputRenderableOptions in
// node_modules/@opentui/core/renderables/Input.d.ts) offers value, min/max
// length, and placeholder but no secure/password/mask flag, and rendering the
// live buffer while focused would put the secret on screen, so a secure field
// always renders an asterisk mask and never an `<input>`; the mask is
// truncated to the field width and never wraps. Editing a secure field (keys
// and paste) is driven by the screen that owns the keyboard (SetupScreen),
// which keeps the real value in its own state and appends/deletes there.
export function TextField(props: TextFieldProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const width = props.width ?? 44;
  const borderColor = props.focused ? tokens.borderFocus : tokens.border;

  if (props.secure === true) {
    const room = Math.max(1, width - 4);
    const masked = "*".repeat(Math.min(props.value.length, room));
    return (
      <box
        border={true}
        borderColor={color(borderColor)}
        paddingLeft={1}
        paddingRight={1}
        width={width}
      >
        {masked === "" ? (
          <text fg={color(tokens.fgDisabled)}>{props.placeholder ?? ""}</text>
        ) : (
          <text fg={color(tokens.fg)}>{masked}</text>
        )}
      </box>
    );
  }

  return (
    <box
      border={true}
      borderColor={color(borderColor)}
      paddingLeft={1}
      paddingRight={1}
      width={width}
    >
      <input
        focused={props.focused}
        value={props.value}
        placeholder={props.placeholder ?? ""}
        onInput={(value) => props.onChange(value)}
        backgroundColor={color(tokens.bgPanel)}
        focusedBackgroundColor={color(tokens.bgPanel)}
        textColor={color(tokens.fg)}
        focusedTextColor={color(tokens.fg)}
        placeholderColor={color(tokens.fgDisabled)}
        cursorColor={color(tokens.cursor)}
        selectionBg={color(tokens.selectionBg)}
        selectionFg={color(tokens.selectionFg)}
      />
    </box>
  );
}

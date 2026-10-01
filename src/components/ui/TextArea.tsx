import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { TextAreaProps } from "./TextArea.types";

// Themed wrapper around the OpenTUI `<textarea>` primitive. The primitive is
// uncontrolled (it exposes `plainText` via its renderable), so the owning form
// reads the live text through `textareaRef` on submit; `onChange` only signals
// that content changed (used to clear validation errors).
export function TextArea(props: TextAreaProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const borderColor = props.focused ? tokens.borderFocus : tokens.border;
  const bordered = props.bordered ?? true;
  const fill = props.fill === true;
  return (
    <box
      border={bordered}
      borderColor={bordered ? color(borderColor) : undefined}
      paddingLeft={bordered ? 1 : 0}
      paddingRight={bordered ? 1 : 0}
      flexGrow={fill ? 1 : undefined}
      flexShrink={fill ? 1 : undefined}
      minHeight={fill ? 0 : undefined}
    >
      <textarea
        ref={props.textareaRef}
        initialValue={props.initialValue ?? ""}
        focused={props.focused}
        placeholder={props.placeholder ?? ""}
        height={fill ? "100%" : (props.height ?? 4)}
        backgroundColor={color(tokens.bgPanel)}
        focusedBackgroundColor={color(tokens.bgPanel)}
        textColor={color(tokens.fg)}
        focusedTextColor={color(tokens.fg)}
        placeholderColor={color(tokens.fgDisabled)}
        cursorColor={color(tokens.cursor)}
        selectionBg={color(tokens.selectionBg)}
        selectionFg={color(tokens.selectionFg)}
        onContentChange={() => props.onChange?.()}
        onKeyDown={(key) => props.onKeyDown?.(key)}
      />
    </box>
  );
}

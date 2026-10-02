import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { TagInputProps } from "./TagInput.types";

// Tag chips plus an editable input and a keyboard-driven suggestion strip. The
// screen owns the keyboard (Enter adds, Backspace on an empty input removes the
// last, Up/Down move the highlight), so this component only renders. Shared by
// the Notes editor and the Save link form.
export function TagInput(props: TagInputProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const showSuggestions = props.focused && props.suggestions.length > 0;

  return (
    <box flexDirection="column" flexShrink={0}>
      {props.tags.length === 0 ? null : (
        <text wrapMode="word">
          {props.tags.map((tag) => (
            <span key={tag} fg={color(tokens.accentAlt)}>{`[${tag}] `}</span>
          ))}
        </text>
      )}
      <box flexDirection="row" gap={1}>
        <text fg={color(tokens.fgSubtle)}>{"Tags"}</text>
        <input
          focused={props.focused}
          value={props.inputValue}
          placeholder="Add tag..."
          onInput={(value) => props.onInputChange(value)}
          flexGrow={1}
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
      {showSuggestions ? (
        <text wrapMode="none">
          <span fg={color(tokens.fgSubtle)}>{"  "}</span>
          {props.suggestions.map((name, index) => (
            <span
              key={name}
              fg={color(index === props.suggestionIndex ? tokens.fg : tokens.fgSubtle)}
            >
              {index === props.suggestionIndex ? `[${name}] ` : `${name} `}
            </span>
          ))}
        </text>
      ) : null}
    </box>
  );
}

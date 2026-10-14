import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { isPrimaryClick, pressHandler } from "../../utils/mouse";
import type { TagInputProps } from "./TagInput.types";

// Tag chips plus an editable input and a keyboard-driven suggestion strip. The
// screen owns the keyboard (Enter adds, Backspace on an empty input removes the
// last, Up/Down move the highlight), so this component only renders. Shared by
// the Notes editor and the Save link form.
//
// Mouse is additive: a primary click on the field requests focus, on a chip
// removes that tag, and on a suggestion applies it. Chips and suggestions are
// individual `<text>` renderables (not `<span>`s) because only Renderables take
// part in mouse hit testing.
export function TagInput(props: TagInputProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const showSuggestions = props.focused && props.suggestions.length > 0;

  return (
    <box
      flexDirection="column"
      flexShrink={0}
      onMouseDown={(event) => {
        if (isPrimaryClick(event)) {
          props.onFocusRequest?.();
        }
      }}
    >
      {props.tags.length === 0 ? null : (
        <box flexDirection="row" flexWrap="wrap" gap={1}>
          {props.tags.map((tag) => (
            <text
              key={tag}
              fg={color(tokens.accentAlt)}
              selectable={false}
              onMouseDown={
                props.onRemoveTag !== undefined
                  ? pressHandler(() => props.onRemoveTag?.(tag))
                  : undefined
              }
            >
              {`[${tag}]`}
            </text>
          ))}
        </box>
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
        <box flexDirection="row" flexWrap="wrap" gap={1} paddingLeft={2}>
          {props.suggestions.map((name, index) => (
            <text
              key={name}
              fg={color(index === props.suggestionIndex ? tokens.fg : tokens.fgSubtle)}
              selectable={false}
              onMouseDown={
                props.onAcceptSuggestion !== undefined
                  ? pressHandler(() => props.onAcceptSuggestion?.(name))
                  : undefined
              }
            >
              {index === props.suggestionIndex ? `[${name}]` : name}
            </text>
          ))}
        </box>
      ) : null}
    </box>
  );
}

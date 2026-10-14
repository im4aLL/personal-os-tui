import type { SelectOption as CoreSelectOption, MouseEvent } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { isPrimaryClick, optionRowFromPress } from "../../utils/mouse";
import type { SelectProps } from "./Select.types";

// Thin themed wrapper around the OpenTUI `<select>` primitive (the same
// primitive List uses). The owner sets `focused` so arrow keys move the
// highlight; `onChange` maps to SELECTION_CHANGED, so the value updates as
// the highlight moves. Height tracks the option count: a bare `<select>`
// measures zero under yoga.
//
// The primitive has no mouse handling, so a primary press picks the row under
// the pointer. Every select in the app is sized to its option count and shows
// one line per option (`showDescription` off), so the pressed row maps directly
// to an option with no scroll offset to account for.
export function Select(props: SelectProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const options: CoreSelectOption[] = props.options.map((option) => ({
    name: option.label,
    description: "",
    value: option.value,
  }));

  const press = (event: MouseEvent): void => {
    if (!isPrimaryClick(event)) {
      return;
    }
    props.onFocusRequest?.();
    const index = optionRowFromPress(event);
    const option = props.options[index];
    if (option === undefined || index === props.selectedIndex) {
      return;
    }
    props.onChange(index, option.value);
  };

  return (
    <select
      options={options}
      selectedIndex={props.selectedIndex}
      focused={props.focused}
      height={Math.max(1, props.options.length)}
      showDescription={false}
      backgroundColor={color(tokens.bgPanel)}
      textColor={color(tokens.fg)}
      focusedBackgroundColor={color(tokens.bgPanel)}
      focusedTextColor={color(tokens.fg)}
      selectedBackgroundColor={color(tokens.selectionBg)}
      selectedTextColor={color(tokens.selectionFg)}
      descriptionColor={color(tokens.fgSubtle)}
      selectedDescriptionColor={color(tokens.selectionFg)}
      onMouseDown={press}
      onChange={(index) => props.onChange(index, props.options[index]?.value ?? null)}
    />
  );
}

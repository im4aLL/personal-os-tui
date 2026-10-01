import type { SelectOption as CoreSelectOption } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { SelectProps } from "./Select.types";

// Thin themed wrapper around the OpenTUI `<select>` primitive (the same
// primitive List uses). The owner sets `focused` so arrow keys move the
// highlight; `onChange` maps to SELECTION_CHANGED, so the value updates as
// the highlight moves. Height tracks the option count: a bare `<select>`
// measures zero under yoga.
export function Select(props: SelectProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const options: CoreSelectOption[] = props.options.map((option) => ({
    name: option.label,
    description: "",
    value: option.value,
  }));
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
      onChange={(index) => props.onChange(index, props.options[index]?.value ?? null)}
    />
  );
}

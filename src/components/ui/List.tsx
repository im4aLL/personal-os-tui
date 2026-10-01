import type { SelectOption } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ListProps } from "./List.types";

// Thin themed wrapper around the OpenTUI `<select>` primitive: ListItem maps
// 1:1 onto SelectOption (id -> value, label -> name, detail -> description).
// The list stays unfocused so a focused `<input>` keeps the keyboard while the
// owner drives `selected` itself (the command palette moves selection from the
// single global key handler in App).
export function List(props: ListProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const options: SelectOption[] = props.items.map((item) => ({
    name: item.label,
    description: item.detail ?? "",
    value: item.id,
  }));
  // A bare `<select>` measures zero height under yoga, so size it to its rows:
  // one row per option, two when descriptions render (each option takes
  // name + description lines, matching SelectRenderable's linesPerItem).
  const showDescription = props.items.some((item) => item.detail !== undefined);
  return (
    <select
      options={options}
      selectedIndex={props.selected ?? 0}
      focused={false}
      height={props.items.length * (showDescription ? 2 : 1)}
      showDescription={showDescription}
      backgroundColor={color(tokens.bgPanel)}
      textColor={color(tokens.fg)}
      selectedBackgroundColor={color(tokens.sidebarActiveBg)}
      selectedTextColor={color(tokens.sidebarActiveFg)}
      descriptionColor={color(tokens.fgSubtle)}
      selectedDescriptionColor={color(tokens.sidebarActiveFg)}
      onSelect={(index) => props.onSelect?.(index, props.items[index] ?? null)}
    />
  );
}

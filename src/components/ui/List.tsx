import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ListProps } from "./List.types";

export function List(props: ListProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const selected = props.selected ?? 0;
  return (
    <box flexDirection="column">
      {props.items.map((item, index) => {
        const active = index === selected;
        return (
          <box key={item.id} backgroundColor={active ? color(tokens.sidebarActiveBg) : undefined}>
            <text fg={color(active ? tokens.sidebarActiveFg : tokens.fg)}>
              {`${active ? "> " : "  "}${item.label}`}
            </text>
            {item.detail !== undefined ? (
              <text fg={color(tokens.fgSubtle)}>{`  ${item.detail}`}</text>
            ) : null}
          </box>
        );
      })}
    </box>
  );
}

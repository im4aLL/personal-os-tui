import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { truncate } from "../../utils/text";
import type { WeekGroupHeaderProps } from "./WeekGroupHeader.types";

// Group header: the label, an accurate count badge ("3 entries" / "1 entry"),
// and a trailing rule that fills the remaining width. Presentational only.
export function WeekGroupHeader(props: WeekGroupHeaderProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const badge = `${props.count} ${props.count === 1 ? "entry" : "entries"}`;
  const label = truncate(props.label, Math.max(4, props.width - badge.length - 6));
  const rule = "-".repeat(Math.max(0, props.width - label.length - badge.length - 4));

  return (
    <box flexDirection="row" height={1} flexShrink={0}>
      <text fg={color(tokens.fgMuted)} attributes={TextAttributes.BOLD}>
        {label}
      </text>
      <text fg={color(tokens.fgSubtle)}>{`  ${badge}  `}</text>
      <text fg={color(tokens.borderMuted)} wrapMode="none">
        {rule}
      </text>
    </box>
  );
}

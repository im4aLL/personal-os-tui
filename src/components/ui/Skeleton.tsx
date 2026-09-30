import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { BlockProps, SkeletonProps } from "./Skeleton.types";

function Block(props: BlockProps): ReactNode {
  const { theme, color } = useTheme();
  return <text fg={color(theme.tokens.bgHover)}>{"█".repeat(props.width)}</text>;
}

export function Skeleton(props: SkeletonProps): ReactNode {
  const { width } = useTerminalDimensions();
  // Clamp to the narrowest plausible content area (full sidebar plus content
  // and box padding) so fixed call-site widths can never overflow and wrap
  // at small terminal widths.
  const cap = Math.max(8, width - 24);
  const lines = props.lines ?? 4;
  const widths = props.widths ?? [42, 36, 28, 20];
  const rows: ReactNode[] = [];
  for (let i = 0; i < lines; i++) {
    rows.push(<Block key={i} width={Math.min(widths[i % widths.length], cap)} />);
  }
  return (
    <box flexDirection="column" gap={1} padding={1}>
      {rows}
    </box>
  );
}

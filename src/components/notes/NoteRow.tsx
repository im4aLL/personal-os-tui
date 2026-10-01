import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { relativeTime } from "../../utils/date";
import { noteDisplayTitle, truncate } from "../../utils/notes";
import type { NoteRowProps } from "./NoteRow.types";

// Fixed mask widths (not derived from content) so toggling privacy never
// changes the row geometry and the list cannot jitter.
const MASK_TITLE_WIDTH = 14;
const MASK_DATE_WIDTH = 7;

export function NoteRow(props: NoteRowProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { note, selected, masked } = props;
  const marker = selected ? "> " : "  ";
  const title = masked
    ? "*".repeat(MASK_TITLE_WIDTH)
    : truncate(noteDisplayTitle(note), Math.max(4, props.width - 2));
  const date = masked ? "*".repeat(MASK_DATE_WIDTH) : relativeTime(note.updatedAt);
  const titleColor = selected ? tokens.fg : tokens.fgMuted;

  return (
    <box flexDirection="column">
      <text wrapMode="none">
        <span fg={color(selected ? tokens.accent : tokens.fgSubtle)}>{marker}</span>
        {note.pinned && !masked ? <span fg={color(tokens.warning)}>{"^ "}</span> : null}
        <span fg={color(titleColor)} attributes={selected ? TextAttributes.BOLD : undefined}>
          {title}
        </span>
      </text>
      <text wrapMode="none">
        <span fg={color(tokens.fgSubtle)}>{"  "}</span>
        <span fg={color(tokens.fgSubtle)}>{date}</span>
      </text>
    </box>
  );
}

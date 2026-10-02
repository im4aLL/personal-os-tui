import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { formatWorkLogRange } from "../../utils/date";
import { truncate } from "../../utils/text";
import type { WorkLogRowProps } from "./WorkLogRow.types";

const MARKER = 2;
/** Fixed width reserved for the right-aligned date range (title line).
 * 26 fits a worst-case cross-year range like "Dec 30, 2025 - Jan 2, 2026". */
const DATE_WIDTH = 26;

function tagLabel(tags: string[]): string {
  return tags.map((tag) => `[ ${tag} ]`).join(" ");
}

// One work-log row: title (+ right-aligned date range when wide), then either
// the description plus tags (wide) or a single collapsed metadata line
// (narrow). Every breakpoint renders the same fixed height (title, metadata,
// divider) so the screen can window the flattened list. Presentational only;
// the screen owns selection and keys.
export function WorkLogRow(props: WorkLogRowProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { log, selected } = props;
  const marker = selected ? "> " : "  ";
  const dateLabel = formatWorkLogRange(log.startDate, log.endDate);
  const tags = tagLabel(log.tags);
  const description = log.description ?? "";

  // Below 60 columns the date range is dropped from the title line and folded
  // into the metadata line instead.
  const dateInTitle = !props.veryNarrow;
  const titleRoom = Math.max(4, props.width - MARKER - (dateInTitle ? DATE_WIDTH : 0));
  const metaRoom = Math.max(4, props.width - MARKER - 2);
  const titleColor = selected ? tokens.accent : tokens.fg;

  const meta = props.narrow
    ? [dateInTitle ? "" : dateLabel, description, tags].filter((part) => part !== "").join("  ")
    : description;
  const descriptionRoom = tags === "" ? metaRoom : Math.max(8, metaRoom - tags.length - 2);

  return (
    <box
      flexDirection="column"
      flexShrink={0}
      backgroundColor={selected ? color(tokens.bgAlt) : undefined}
    >
      {/* Title line. */}
      <box flexDirection="row" height={1}>
        <text fg={color(selected ? tokens.accent : tokens.fgSubtle)}>{marker}</text>
        <box flexGrow={1} flexShrink={1} minWidth={0}>
          <text
            wrapMode="none"
            fg={color(titleColor)}
            attributes={selected ? TextAttributes.BOLD : undefined}
          >
            {truncate(log.title, titleRoom)}
          </text>
        </box>
        {dateInTitle ? (
          <text wrapMode="none" fg={color(tokens.fgSubtle)}>
            {truncate(dateLabel, DATE_WIDTH).padStart(DATE_WIDTH)}
          </text>
        ) : null}
      </box>

      {/* Metadata line: wide splits description and tags; narrow collapses
          them (and the date range below 60 columns) into one line. */}
      <box flexDirection="row" height={1}>
        <text fg={color(tokens.fgSubtle)}>{"  "}</text>
        {props.narrow ? (
          <text wrapMode="none" fg={color(tokens.fgMuted)}>
            {truncate(meta, metaRoom)}
          </text>
        ) : (
          <>
            <text wrapMode="none" fg={color(tokens.fgMuted)}>
              {truncate(description, descriptionRoom)}
            </text>
            {tags === "" ? null : <text fg={color(tokens.fgSubtle)}>{"  "}</text>}
            {tags === "" ? null : (
              <text wrapMode="none" fg={color(tokens.accentAlt)}>
                {tags}
              </text>
            )}
          </>
        )}
      </box>

      <text fg={color(tokens.borderMuted)}>
        {`${" ".repeat(MARKER)}${"-".repeat(Math.max(0, props.width - MARKER))}`}
      </text>
    </box>
  );
}

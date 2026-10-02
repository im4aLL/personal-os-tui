import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { linkDateLabel, linkDisplayUrl } from "../../utils/links";
import { rowMarker } from "../../utils/marker";
import { rowClickHandler } from "../../utils/mouse";
import { truncate, truncateMiddle } from "../../utils/text";
import type { LinkRowProps } from "./LinkRow.types";

const MARKER = 2;
/** Fixed width reserved for the right-aligned date column (wide rows only). */
const DATE_WIDTH = 12;

function tagLabel(tags: string[]): string {
  return tags.map((tag) => `[ ${tag} ]`).join(" ");
}

// One list row: title (+ date when wide), the URL label, and tags. Rows are a
// fixed height per breakpoint (wide 3, narrow 4) so the screen can window
// them. Presentational only; the screen owns selection, editing, and keys.
export function LinkRow(props: LinkRowProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { link, selected } = props;
  const marker = rowMarker(selected);
  const titleRoom = Math.max(4, props.width - MARKER - (props.narrow ? 0 : DATE_WIDTH));
  const titleColor = selected ? tokens.accent : tokens.fg;
  const label = linkDisplayUrl(link.url);
  const tags = tagLabel(link.tags);
  const metaRoom = Math.max(4, props.width - MARKER);
  const dateLabel = props.narrow ? "" : linkDateLabel(link.createdAt).padStart(DATE_WIDTH);

  return (
    <box
      flexDirection="column"
      flexShrink={0}
      backgroundColor={selected ? color(tokens.bgAlt) : undefined}
      onMouseDown={rowClickHandler(link.id, props.onSelect, props.onActivate)}
    >
      {/* Title line. The editing input occupies the same flex box as the
          truncated title, and the date stays a fixed column, so entering edit
          mode cannot shift the layout. */}
      <box flexDirection="row" height={1}>
        <text fg={color(selected ? tokens.accent : tokens.fgSubtle)}>{marker}</text>
        <box flexGrow={1} flexShrink={1} minWidth={0}>
          {props.editing ? (
            <input
              focused={true}
              value={props.editValue}
              onInput={(value) => props.onEditChange(value)}
              width={titleRoom}
              backgroundColor={color(tokens.bgAlt)}
              focusedBackgroundColor={color(tokens.bgAlt)}
              textColor={color(tokens.fg)}
              focusedTextColor={color(tokens.fg)}
              cursorColor={color(tokens.cursor)}
              selectionBg={color(tokens.selectionBg)}
              selectionFg={color(tokens.selectionFg)}
            />
          ) : (
            <text
              wrapMode="none"
              fg={color(titleColor)}
              attributes={selected ? TextAttributes.BOLD : undefined}
            >
              {truncate(link.title, titleRoom)}
            </text>
          )}
        </box>
        {props.narrow ? null : (
          <text wrapMode="none" fg={color(tokens.fgSubtle)}>
            {dateLabel}
          </text>
        )}
      </box>

      {/* URL line. Wide rows append tags here; narrow rows give tags their own
          line below. Below 60 columns the label truncates from the middle so
          the domain stays visible. */}
      {props.narrow ? (
        <box flexDirection="row" height={1}>
          <text fg={color(tokens.fgSubtle)}>{"  "}</text>
          <text wrapMode="none" fg={color(tokens.link)}>
            {props.veryNarrow ? truncateMiddle(label, metaRoom) : truncate(label, metaRoom)}
          </text>
        </box>
      ) : (
        <box flexDirection="row" height={1}>
          <text fg={color(tokens.fgSubtle)}>{"  "}</text>
          <text wrapMode="none" fg={color(tokens.link)}>
            {truncate(
              label,
              tags.length === 0 ? metaRoom : Math.max(8, metaRoom - tags.length - 2),
            )}
          </text>
          {tags.length === 0 ? null : <text fg={color(tokens.fgSubtle)}>{"  "}</text>}
          {tags.length === 0 ? null : (
            <text wrapMode="none" fg={color(tokens.accentAlt)}>
              {tags}
            </text>
          )}
        </box>
      )}

      {props.narrow ? (
        <box flexDirection="row" height={1}>
          <text fg={color(tokens.fgSubtle)}>{"  "}</text>
          <text wrapMode="none" fg={color(tokens.accentAlt)}>
            {tags}
          </text>
        </box>
      ) : null}

      <text fg={color(tokens.borderMuted)}>
        {`${" ".repeat(MARKER)}${"-".repeat(Math.max(0, props.width - MARKER))}`}
      </text>
    </box>
  );
}

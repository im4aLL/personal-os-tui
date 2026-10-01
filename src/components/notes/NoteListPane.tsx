import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Skeleton } from "../ui/Skeleton";
import type { NoteListPaneProps } from "./NoteListPane.types";
import { NoteRow } from "./NoteRow";

// Left pane: header, search field, and the windowed rows. Purely
// presentational; the screen owns selection, filtering, windowing, and keys.
export function NoteListPane(props: NoteListPaneProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const searching = props.search.trim() !== "";

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      flexBasis={0}
      backgroundColor={color(tokens.bgPanel)}
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" height={1} flexShrink={0}>
        <text wrapMode="none">
          <span fg={color(tokens.fg)} attributes={TextAttributes.BOLD}>
            {"Notes"}
          </span>
          <span fg={color(tokens.fgMuted)}>{`  ${props.count}`}</span>
        </text>
        <box flexGrow={1} />
        <text wrapMode="none">
          <span fg={color(tokens.accent)}>{"+ new"}</span>
          <span fg={color(tokens.fgSubtle)}>{"  "}</span>
          <span fg={color(props.privacyMode ? tokens.warning : tokens.fgSubtle)}>{"@ mask"}</span>
        </text>
      </box>

      <box flexShrink={0} paddingTop={1} paddingBottom={1}>
        <input
          focused={props.searchFocused}
          value={props.search}
          placeholder="Search notes..."
          onInput={(value) => props.onSearchChange(value)}
          width="100%"
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

      <box flexDirection="column" flexGrow={1} flexShrink={1} gap={1}>
        {props.loading ? (
          <Skeleton lines={3} widths={[24, 18, 21]} />
        ) : props.items.length === 0 ? (
          <box flexDirection="column" gap={1} paddingTop={1}>
            {searching ? (
              <text fg={color(tokens.fgSubtle)}>{"No notes match your search"}</text>
            ) : (
              <>
                <text fg={color(tokens.fgSubtle)}>{"No notes yet."}</text>
                <text fg={color(tokens.fgSubtle)}>{"n to add your first note"}</text>
              </>
            )}
          </box>
        ) : (
          props.items.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              selected={note.id === props.selectedId}
              masked={props.privacyMode && note.id !== props.selectedId}
              width={props.width}
            />
          ))
        )}
      </box>
    </box>
  );
}

import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { truncate } from "../../utils/text";
import { Skeleton } from "../ui/Skeleton";
import type { NoteListPaneProps } from "./NoteListPane.types";
import { NoteRow } from "./NoteRow";

// Left pane: a bordered panel titled with the filtered count, holding the search
// field and the windowed rows (dashed rules between them). Purely presentational;
// the screen owns selection, filtering, windowing, and keys.
export function NoteListPane(props: NoteListPaneProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const searching = props.search.trim() !== "";
  const innerWidth = Math.max(8, props.width - 4);

  const rows: ReactNode[] = [];
  if (!props.loading && props.items.length > 0) {
    props.items.forEach((note, index) => {
      if (index > 0) {
        rows.push(
          <text key={`divider-${note.id}`} fg={color(tokens.borderMuted)} wrapMode="none">
            {`  ${"-".repeat(Math.max(0, innerWidth - 2))}`}
          </text>,
        );
      }
      rows.push(
        <NoteRow
          key={note.id}
          note={note}
          selected={note.id === props.selectedId}
          masked={props.privacyMode && note.id !== props.selectedId}
          width={innerWidth}
        />,
      );
    });
  }

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      minHeight={0}
      border
      borderStyle="single"
      borderColor={color(props.focused ? tokens.borderFocus : tokens.borderMuted)}
      title={` ${truncate(`Notes (${props.count})`, Math.max(4, innerWidth))} `}
      titleColor={color(props.focused ? tokens.accent : tokens.fgMuted)}
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexShrink={0} paddingTop={1} paddingBottom={1}>
        <input
          focused={props.searchFocused}
          value={props.search}
          placeholder="Search notes..."
          onInput={(value) => props.onSearchChange(value)}
          width="100%"
          backgroundColor={color(tokens.bg)}
          focusedBackgroundColor={color(tokens.bg)}
          textColor={color(tokens.fg)}
          focusedTextColor={color(tokens.fg)}
          placeholderColor={color(tokens.fgDisabled)}
          cursorColor={color(tokens.cursor)}
          selectionBg={color(tokens.selectionBg)}
          selectionFg={color(tokens.selectionFg)}
        />
      </box>

      <box flexDirection="column" flexGrow={1} flexShrink={1} minHeight={0}>
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
          rows
        )}
      </box>
    </box>
  );
}

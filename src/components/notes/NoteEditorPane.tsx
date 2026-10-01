import { SyntaxStyle } from "@opentui/core";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { EmptyState } from "../ui/EmptyState";
import { TextArea } from "../ui/TextArea";
import type { NoteEditorPaneProps } from "./NoteEditorPane.types";
import { NoteToolbar } from "./NoteToolbar";
import { TagInput } from "./TagInput";

/** Body placeholder while the selected note loads. */
function EditorSkeleton(): ReactNode {
  const { theme, color } = useTheme();
  const widths = [26, 34, 30, 22];
  return (
    <box flexDirection="column" gap={1} paddingTop={1}>
      {widths.map((width) => (
        <text key={width} fg={color(theme.tokens.bgHover)}>
          {"█".repeat(width)}
        </text>
      ))}
    </box>
  );
}

// Right pane: toolbar, title, tags, and the edit body or the markdown preview.
// Purely presentational; the screen owns the keys, autosave, and repo writes.
export function NoteEditorPane(props: NoteEditorPaneProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;

  // Fenced code highlights in theme colors. Rebuilt per theme and destroyed on
  // cleanup so no native style handle leaks across theme switches.
  const syntaxStyle = useMemo(() => {
    const p = theme.palette;
    return SyntaxStyle.fromStyles({
      default: { fg: p.text },
      "markup.heading": { fg: p.mauve, bold: true },
      "markup.heading.1": { fg: p.mauve, bold: true },
      "markup.heading.2": { fg: p.blue, bold: true },
      "markup.strong": { fg: p.text, bold: true },
      "markup.bold": { fg: p.text, bold: true },
      "markup.italic": { fg: p.text, italic: true },
      "markup.list": { fg: p.peach },
      "markup.quote": { fg: p.subtext0, italic: true },
      "markup.raw": { fg: p.green },
      "markup.raw.block": { fg: p.green },
      "markup.link": { fg: p.sapphire, underline: true },
      "markup.link.url": { fg: p.sapphire, underline: true },
      keyword: { fg: p.mauve, bold: true },
      "keyword.operator": { fg: p.sky },
      string: { fg: p.green },
      comment: { fg: p.overlay1, italic: true },
      number: { fg: p.peach },
      boolean: { fg: p.peach },
      constant: { fg: p.peach },
      function: { fg: p.blue },
      "function.call": { fg: p.blue },
      type: { fg: p.yellow },
      constructor: { fg: p.yellow },
      variable: { fg: p.text },
      property: { fg: p.sky },
      operator: { fg: p.sky },
      punctuation: { fg: p.overlay2 },
    });
  }, [theme]);

  useEffect(() => {
    return () => {
      syntaxStyle.destroy();
    };
  }, [syntaxStyle]);

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      flexShrink={1}
      minHeight={0}
      paddingLeft={1}
      paddingRight={1}
    >
      {props.note === null ? (
        <EmptyState title="No note selected" hint="Pick a note from the list or create a new one" />
      ) : (
        <>
          <NoteToolbar
            mode={props.mode}
            saveStatus={props.saveStatus}
            pinned={props.note.pinned}
            privacyMode={props.privacyMode}
            width={props.width}
          />
          {props.loading ? (
            <EditorSkeleton />
          ) : props.error !== null ? (
            <box flexDirection="column" gap={1} paddingTop={1}>
              <text fg={color(tokens.danger)}>{"Could not load this note"}</text>
              <text fg={color(tokens.fgSubtle)}>{`${props.error}  (r to retry)`}</text>
            </box>
          ) : (
            <>
              <box flexShrink={0} paddingTop={1}>
                <input
                  focused={props.focusedField === "title"}
                  value={props.title}
                  placeholder="Untitled"
                  onInput={(value) => props.onTitleChange(value)}
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
              <TagInput
                tags={props.tags}
                inputValue={props.tagInput}
                focused={props.focusedField === "tags"}
                suggestions={props.suggestions}
                suggestionIndex={props.suggestionIndex}
                width={props.width}
                onInputChange={props.onTagInputChange}
              />
              {props.mode === "edit" ? (
                <box
                  flexDirection="column"
                  flexGrow={1}
                  flexShrink={1}
                  minHeight={0}
                  paddingTop={1}
                >
                  <TextArea
                    key={props.bodyKey}
                    initialValue={props.content}
                    focused={props.focusedField === "body"}
                    placeholder="Start writing in markdown..."
                    fill={true}
                    bordered={false}
                    textareaRef={props.bodyRef}
                    onChange={props.onBodyChange}
                  />
                </box>
              ) : (
                <scrollbox flexGrow={1} flexShrink={1} minHeight={0} scrollY={true} paddingTop={1}>
                  {props.content.trim() === "" ? (
                    <text fg={color(tokens.fgSubtle)}>{"Nothing to preview yet."}</text>
                  ) : (
                    <markdown
                      content={props.content}
                      syntaxStyle={syntaxStyle}
                      fg={color(tokens.fg)}
                      bg={color(tokens.bgPanel)}
                      tableOptions={{ style: "grid", widthMode: "full" }}
                      width="100%"
                    />
                  )}
                </scrollbox>
              )}
            </>
          )}
        </>
      )}
    </box>
  );
}

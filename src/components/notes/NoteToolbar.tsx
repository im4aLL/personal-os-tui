import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { isPrimaryClick } from "../../utils/mouse";
import { truncate } from "../../utils/text";
import type { NoteEditorMode, NoteToolbarProps } from "./NoteToolbar.types";

// Editor toolbar: Edit/Preview state, the save indicator, and the action hints.
// The Edit/Preview labels are clickable (primary button) in addition to the
// screen's `p` key; the screen owns the actual mode switch.
//
// Degradation: the full row is shown when it fits. Otherwise the action hints
// (already listed in the screen's status line) drop first so the save state,
// including a persistent failed save, stays visible; a final truncation only
// kicks in when even the mode/save pair cannot fit.
export function NoteToolbar(props: NoteToolbarProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const editing = props.mode === "edit";
  const saveText =
    props.saveStatus === "saving"
      ? "Saving..."
      : props.saveStatus === "saved"
        ? "Saved"
        : props.saveStatus === "error"
          ? "Save failed  ctrl+s to retry"
          : "";
  const saveColor =
    props.saveStatus === "saved"
      ? tokens.success
      : props.saveStatus === "error"
        ? tokens.danger
        : tokens.fgMuted;

  const modeText = editing ? "[ Edit ] | Preview" : "Edit | [ Preview ]";
  const actions = `${props.pinned ? "b unpin" : "b pin"}  v privacy  x export  d delete`;
  const room = Math.max(8, props.width);

  const row = (children: ReactNode): ReactNode => (
    <box flexDirection="row" height={1} flexShrink={0}>
      {children}
    </box>
  );

  /** One clickable mode label; the active mode is bold and accent-colored. */
  const modeSegment = (label: string, active: boolean, value: NoteEditorMode): ReactNode => (
    <text
      wrapMode="none"
      fg={color(active ? tokens.accent : tokens.fgMuted)}
      attributes={active ? TextAttributes.BOLD : undefined}
      onMouseDown={(event) => {
        if (isPrimaryClick(event)) {
          props.onSelectMode?.(value);
        }
      }}
    >
      {label}
    </text>
  );

  const modeSpans = (
    <>
      {modeSegment("[ Edit ]", editing, "edit")}
      <text wrapMode="none" fg={color(tokens.fgSubtle)}>
        {" | "}
      </text>
      {modeSegment("[ Preview ]", !editing, "preview")}
    </>
  );

  const plain = `${modeText}   ${saveText === "" ? "" : `${saveText}   `}${actions}`;
  if (plain.length <= room) {
    return row(
      <>
        {modeSpans}
        {saveText === "" ? (
          <text wrapMode="none" fg={color(tokens.fgSubtle)}>
            {"   "}
          </text>
        ) : (
          <text wrapMode="none" fg={color(saveColor)}>{`   ${saveText}   `}</text>
        )}
        <text wrapMode="none" fg={color(tokens.fgSubtle)}>
          {actions}
        </text>
      </>,
    );
  }

  const minimal = saveText === "" ? modeText : `${modeText}  ${saveText}`;
  if (minimal.length <= room) {
    return row(
      <>
        {modeSpans}
        {saveText === "" ? null : (
          <text wrapMode="none" fg={color(saveColor)}>{`  ${saveText}`}</text>
        )}
      </>,
    );
  }

  return row(
    <text
      wrapMode="none"
      fg={color(props.saveStatus === "error" ? tokens.danger : tokens.fgSubtle)}
    >
      {truncate(minimal, room)}
    </text>,
  );
}

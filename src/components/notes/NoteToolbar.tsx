import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { truncate } from "../../utils/notes";
import type { NoteToolbarProps } from "./NoteToolbar.types";

// Editor toolbar: Edit/Preview state, the save indicator, and the action hints.
// Purely presentational; the screen owns the keys.
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
          ? "Save failed  Ctrl+S to retry"
          : "";
  const saveColor =
    props.saveStatus === "saved"
      ? tokens.success
      : props.saveStatus === "error"
        ? tokens.danger
        : tokens.fgMuted;

  const modeText = editing ? "[ Edit ] | Preview" : "Edit | [ Preview ]";
  const actions = `${props.pinned ? "b unpin" : "b pin"}  v privacy  x export  d delete`;
  const room = Math.max(8, props.width - 2);

  const modeSpans = (
    <>
      <span
        fg={color(editing ? tokens.accent : tokens.fgMuted)}
        attributes={editing ? TextAttributes.BOLD : undefined}
      >
        {"[ Edit ]"}
      </span>
      <span fg={color(tokens.fgSubtle)}>{" | "}</span>
      <span
        fg={color(!editing ? tokens.accent : tokens.fgMuted)}
        attributes={!editing ? TextAttributes.BOLD : undefined}
      >
        {"[ Preview ]"}
      </span>
    </>
  );

  const row = (children: ReactNode): ReactNode => (
    <box flexDirection="row" height={1} flexShrink={0} paddingLeft={1} paddingRight={1}>
      <text wrapMode="none">{children}</text>
    </box>
  );

  const plain = `${modeText}   ${saveText === "" ? "" : `${saveText}   `}${actions}`;
  if (plain.length <= room) {
    return row(
      <>
        {modeSpans}
        {saveText === "" ? (
          <span fg={color(tokens.fgSubtle)}>{"   "}</span>
        ) : (
          <span fg={color(saveColor)}>{`   ${saveText}   `}</span>
        )}
        <span fg={color(tokens.fgSubtle)}>{actions}</span>
      </>,
    );
  }

  const minimal = saveText === "" ? modeText : `${modeText}  ${saveText}`;
  if (minimal.length <= room) {
    return row(
      <>
        {modeSpans}
        {saveText === "" ? null : <span fg={color(saveColor)}>{`  ${saveText}`}</span>}
      </>,
    );
  }

  return row(
    <span fg={color(props.saveStatus === "error" ? tokens.danger : tokens.fgSubtle)}>
      {truncate(minimal, room)}
    </span>,
  );
}

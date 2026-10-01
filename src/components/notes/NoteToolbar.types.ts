export type NoteEditorMode = "edit" | "preview";

/** `error` is sticky: it clears on the next edit or the next successful flush. */
export type NoteSaveStatus = "idle" | "saving" | "saved" | "error";

export interface NoteToolbarProps {
  mode: NoteEditorMode;
  saveStatus: NoteSaveStatus;
  pinned: boolean;
  privacyMode: boolean;
  /** Content width available for the toolbar, in columns. */
  width: number;
}

import type { TextareaRenderable } from "@opentui/core";
import type { Ref } from "react";
import type { Note } from "../../repos/types";
import type { NoteEditorMode, NoteSaveStatus } from "./NoteToolbar.types";

export type NoteEditorField = "title" | "tags" | "body";

export interface NoteEditorPaneProps {
  /** Null when nothing is selected: the pane shows its empty state. */
  note: Note | null;
  /** True while the selected note is being fetched. */
  loading: boolean;
  /** Fetch failure for the selected note; renders a retry affordance. */
  error: string | null;
  mode: NoteEditorMode;
  saveStatus: NoteSaveStatus;
  /** True when the editor panel owns the keyboard (border/title emphasis). */
  focused: boolean;
  focusedField: NoteEditorField | null;
  privacyMode: boolean;
  title: string;
  content: string;
  tags: string[];
  tagInput: string;
  suggestions: string[];
  suggestionIndex: number;
  /** Changes when a note finishes loading so the uncontrolled body remounts. */
  bodyKey: string;
  /** Content width available for the toolbar and body, in columns. */
  width: number;
  bodyRef: Ref<TextareaRenderable>;
  onTitleChange: (value: string) => void;
  onTagInputChange: (value: string) => void;
  /** Fires after any body edit; the screen reads the live text from `bodyRef`. */
  onBodyChange: () => void;
  onRetry: () => void;
}

export type NoteNoticeKind = "success" | "danger";

export interface NoteNotice {
  text: string;
  kind: NoteNoticeKind;
}

export interface NoteConfirmState {
  noteId: string;
  title: string;
  body: string;
  confirmLabel: string;
  destructive: boolean;
}

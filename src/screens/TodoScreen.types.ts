export type ConfirmKind = "delete" | "archive-completed" | "clear-completed" | "delete-archived";

export interface TodoConfirmState {
  kind: ConfirmKind;
  ids: string[];
  title: string;
  body: string;
  confirmLabel: string;
  destructive: boolean;
}

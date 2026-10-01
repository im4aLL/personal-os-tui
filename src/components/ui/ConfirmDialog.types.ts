export interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  /** Renders the confirm action in the danger color (delete, clear). */
  destructive?: boolean;
}

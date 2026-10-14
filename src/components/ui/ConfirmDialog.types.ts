export interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  /** Renders the confirm action in the danger color (delete, clear). */
  destructive?: boolean;
  /** Mouse: primary click on the confirm button. The owning screen's keys stay
   * authoritative (Enter/y confirm, Esc/n cancel); both paths call the same
   * handler. */
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  /** Renders the confirm action in the danger color (delete, clear). */
  destructive?: boolean;
  /** Keys are handled by the owning screen; these callbacks are part of the
   * contract for a future pointer affordance and are not invoked here. */
  onConfirm: () => void;
  onCancel: () => void;
}

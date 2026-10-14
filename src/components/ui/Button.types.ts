import type { ReactNode } from "react";

export interface ButtonProps {
  label: string;
  primary?: boolean;
  /** Renders the label in the danger color (confirm dialogs). */
  destructive?: boolean;
  /** Keyboard focus ring: bold label plus a focus-colored border. */
  focused?: boolean;
  /** Dimmed and non-actionable (the Setup Connect button until valid). */
  disabled?: boolean;
  /** Mouse: activate on a primary click. Ignored while `disabled`. */
  onPress?: () => void;
  children?: ReactNode;
}

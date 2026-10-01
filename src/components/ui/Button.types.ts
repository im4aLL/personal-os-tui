import type { ReactNode } from "react";

export interface ButtonProps {
  label: string;
  primary?: boolean;
  /** Keyboard focus ring: bold label plus a focus-colored border. */
  focused?: boolean;
  /** Dimmed and non-actionable (the Setup Connect button until valid). */
  disabled?: boolean;
  children?: ReactNode;
}

import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  /** Validation message rendered below the control in the danger color. */
  error?: string | null;
  children: ReactNode;
}

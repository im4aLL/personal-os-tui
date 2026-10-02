import type { ReactNode } from "react";

export interface ModalProps {
  title: string;
  width?: number;
  /** Fixed panel height in rows. Omit to shrink to content. */
  height?: number;
  children: ReactNode;
}

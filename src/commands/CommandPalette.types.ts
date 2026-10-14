import type { Command } from "./registry.types";

export interface CommandPaletteProps {
  /** Mouse: run the command behind the clicked row (the pointer path to the
   * keyboard Enter). The palette closes the modal before running. */
  onRun?: (command: Command) => void;
}

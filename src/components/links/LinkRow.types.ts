import type { Link } from "../../repos/types";

export interface LinkRowProps {
  link: Link;
  /** Draws the `> ` marker and emphasizes the title. */
  selected: boolean;
  /** Content width available for this row, in columns. */
  width: number;
  /** Below 90 columns: tags move under the title and the date is dropped. */
  narrow: boolean;
  /** Below 60 columns: the URL line truncates from the middle. */
  veryNarrow: boolean;
  /** Inline title edit mode; the title box becomes a focused input. */
  editing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  /** Mouse: primary click selects this row; a double-click activates it. */
  onSelect?: () => void;
  onActivate?: () => void;
}

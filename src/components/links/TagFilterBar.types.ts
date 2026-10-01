import type { LinkTagPill } from "./tag-pills.types";

export interface TagFilterBarProps {
  /** Pills that fit the row, `all` first; the screen fits and owns the cursor. */
  pills: LinkTagPill[];
  /** True when tags were dropped at the width limit, so `...` is rendered. */
  truncated: boolean;
  /** Cursor index into `pills`. */
  focusedIndex: number;
  /** True when the pill row owns Enter; false lets the list keep its keys. */
  focused: boolean;
  /** Applied tag, or null for the clear-all pill. */
  appliedTag: string | null;
}

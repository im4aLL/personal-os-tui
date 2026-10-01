import type { WorkLogFormField, WorkLogFormValues } from "../components/work-log/WorkLogForm.types";
import type { WorkLog } from "../repos/types";

export interface WorkLogFormState {
  open: boolean;
  /** Non-null when editing an existing entry; pre-fills every field. */
  editing: WorkLog | null;
  values: WorkLogFormValues;
  field: WorkLogFormField;
  tagInput: string;
  suggestionIndex: number;
  /** Inline validation or write-failure message. */
  error: string | null;
  saving: boolean;
}

export interface WorkLogConfirmState {
  id: string;
  title: string;
}

/** Transient save/delete feedback banner shown above the list. */
export interface Notice {
  text: string;
  kind: "success" | "danger";
}

/** Which date field owns the keyboard, if any. */
export type WorkLogDateFocus = "none" | "from" | "to";

/** One renderable line item in the grouped list: a group header (1 row) or an
 * entry row (3 rows). The screen windows this flattened list. */
export type WorkLogFlatItem =
  | { kind: "header"; weekKey: string; label: string; count: number }
  | { kind: "row"; log: WorkLog };

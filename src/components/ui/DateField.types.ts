export interface DateFieldProps {
  /** `YYYY-MM-DD` value; empty means no due date. */
  value: string;
  /** True when this field owns the keyboard. Only one field is focused. */
  focused: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number;
  /** Render without the outer border/padding, so the field reads like a bare
   * input (used by the compact date-range toolbar). */
  borderless?: boolean;
  /** Hide the "YYYY-MM-DD" format hint under the field. */
  hideHint?: boolean;
}

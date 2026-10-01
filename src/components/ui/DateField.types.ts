export interface DateFieldProps {
  /** `YYYY-MM-DD` value; empty means no due date. */
  value: string;
  /** True when this field owns the keyboard. Only one field is focused. */
  focused: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number;
}

export interface DateRangeBarProps {
  /** `YYYY-MM-DD` value; empty means no From bound. */
  from: string;
  /** `YYYY-MM-DD` value; empty means no To bound. */
  to: string;
  fromFocused: boolean;
  toFocused: boolean;
  /** Below 60 columns the From/To fields stack vertically. */
  veryNarrow: boolean;
  /** Content width available for the toolbar, in columns. */
  width: number;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

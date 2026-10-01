export interface TagInputProps {
  tags: string[];
  inputValue: string;
  /** True when the tag field owns the keyboard. */
  focused: boolean;
  /** Suggestion names not already applied, in display order. */
  suggestions: string[];
  suggestionIndex: number;
  /** Content width available for the tag row, in columns. */
  width: number;
  onInputChange: (value: string) => void;
}

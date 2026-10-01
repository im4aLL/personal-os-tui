export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  selectedIndex: number;
  /** True when this field owns the keyboard. Only one field is focused. */
  focused: boolean;
  /** Fires whenever the highlighted option changes (arrow keys), so the value
   * follows the selection without an Enter press. */
  onChange: (index: number, value: string | null) => void;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  selectedIndex: number;
  /** True when this field owns the keyboard. Only one field is focused. */
  focused: boolean;
  /** Mouse: a primary click on a row asks the screen to focus this field and
   * selects that option. */
  onFocusRequest?: () => void;
  /** Fires whenever the highlighted option changes (arrow keys or a mouse
   * click), so the value follows the selection without an Enter press. */
  onChange: (index: number, value: string | null) => void;
}

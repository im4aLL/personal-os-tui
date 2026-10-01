interface TextFieldBaseProps {
  value: string;
  /** True when this field owns the keyboard. Only one field is focused. */
  focused: boolean;
  placeholder?: string;
  /** Visible field width in columns, including the border. */
  width?: number;
  /** Drop the outer border and padding so the field reads like a bare input
   * (used by the compact date-range toolbar). */
  borderless?: boolean;
}

/** Editable field: renders an `<input>` and reports every change. */
export interface EditableTextFieldProps extends TextFieldBaseProps {
  secure?: false;
  onChange: (value: string) => void;
}

/** Secure field: renders an always-masked, non-wrapping mask and no editable
 * control, so the owning screen drives keyboard input and paste itself. It
 * has no `onChange` because the field never edits the value. */
export interface SecureTextFieldProps extends TextFieldBaseProps {
  secure: true;
}

export type TextFieldProps = EditableTextFieldProps | SecureTextFieldProps;

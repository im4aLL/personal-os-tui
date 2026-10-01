import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { isValidISODate } from "../../utils/date";
import type { DateFieldProps } from "./DateField.types";
import { TextField } from "./TextField";

// Thin `YYYY-MM-DD` wrapper over TextField plus a light format hint. An
// invalid non-empty value renders in the danger color; the owning form blocks
// submit on it.
export function DateField(props: DateFieldProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const value = props.value.trim();
  const invalid = value !== "" && !isValidISODate(value);
  const hint = invalid ? "Use YYYY-MM-DD" : "YYYY-MM-DD (optional)";
  return (
    <box flexDirection="column" gap={0}>
      <TextField
        value={props.value}
        onChange={props.onChange}
        focused={props.focused}
        placeholder={props.placeholder ?? "YYYY-MM-DD"}
        width={props.width}
      />
      <text fg={color(invalid ? tokens.danger : tokens.fgSubtle)}>{hint}</text>
    </box>
  );
}

import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { truncate } from "../../utils/text";
import { DateField } from "../ui/DateField";
import type { DateRangeBarProps } from "./DateRangeBar.types";

const PRESET_HINT = "1 this wk  2 last wk  3 this mo  c clear";

function BoundedField(props: {
  label: string;
  value: string;
  focused: boolean;
  width: number;
  onChange: (value: string) => void;
}): ReactNode {
  const { theme, color } = useTheme();
  return (
    <box flexDirection="row" gap={1} alignItems="flex-start" flexShrink={0}>
      <text fg={color(theme.tokens.fgMuted)}>{props.label}</text>
      <DateField
        value={props.value}
        onChange={props.onChange}
        focused={props.focused}
        width={props.width}
        borderless={true}
        hideHint={true}
      />
    </box>
  );
}

// Date-range toolbar: the preset hint sits on the left and the borderless
// From/To fields on the right. Below 60 columns the presets take their own
// line and the fields stack. Presentational only; the screen owns focus, Tab,
// and the preset keys.
export function DateRangeBar(props: DateRangeBarProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const fieldWidth = props.veryNarrow
    ? Math.max(13, props.width - 6)
    : Math.max(13, Math.min(14, Math.floor((props.width - 55) / 2)));

  const from = (
    <BoundedField
      label="From"
      value={props.from}
      focused={props.fromFocused}
      width={fieldWidth}
      onChange={props.onFromChange}
    />
  );
  const to = (
    <BoundedField
      label="To"
      value={props.to}
      focused={props.toFocused}
      width={fieldWidth}
      onChange={props.onToChange}
    />
  );

  if (props.veryNarrow) {
    return (
      <box flexDirection="column" flexShrink={0}>
        <text fg={color(tokens.fgSubtle)} wrapMode="none">
          {truncate(PRESET_HINT, Math.max(8, props.width))}
        </text>
        {from}
        {to}
      </box>
    );
  }

  // "From " + field + gap + "To " + field.
  const fieldsWidth = fieldWidth * 2 + 9;
  const presetWidth = Math.max(8, props.width - fieldsWidth - 1);

  return (
    <box flexDirection="row" gap={1} alignItems="flex-start" flexShrink={0}>
      <text fg={color(tokens.fgSubtle)} wrapMode="none">
        {truncate(PRESET_HINT, presetWidth)}
      </text>
      <box flexGrow={1} />
      {from}
      {to}
    </box>
  );
}

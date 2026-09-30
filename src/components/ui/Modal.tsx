import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ModalProps } from "./Modal.types";

export function Modal(props: ModalProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  return (
    <box
      position="absolute"
      left={0}
      right={0}
      top={0}
      bottom={0}
      alignItems="center"
      justifyContent="center"
    >
      <box
        border={true}
        borderColor={color(tokens.borderFocus)}
        backgroundColor={color(tokens.bgPanel)}
        title={props.title}
        titleColor={color(tokens.fg)}
        width={props.width ?? 60}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        flexDirection="column"
      >
        {props.children}
      </box>
    </box>
  );
}

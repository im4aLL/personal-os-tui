import type { ColorInput } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider";

// Wide-terminal wordmark: an outlined "Personal OS". Lines keep their leading
// spaces so the glyphs stay aligned; trailing spaces are trimmed.
const FULL_WORDMARK = [
  "  ____                                 _    ___  ____",
  " |  _ \\ ___ _ __ ___  ___  _ __   __ _| |  / _ \\/ ___|",
  " | |_) / _ \\ '__/ __|/ _ \\| '_ \\ / _` | | | | | \\___ \\",
  " |  __/  __/ |  \\__ \\ (_) | | | | (_| | | | |_| |___) |",
  " |_|   \\___|_|  |___/\\___/|_| |_|\\__,_|_|  \\___/|____/",
];

// Medium-terminal wordmark: the POS monogram in solid blocks.
const COMPACT_WORDMARK = [
  "██████   ██████  ███████",
  "██   ██ ██    ██ ██",
  "██████  ██    ██ ███████",
  "██      ██    ██      ██",
  "██       ██████  ███████",
];

// Cells kept free on each side so a wordmark never touches the terminal edge.
const WORDMARK_MARGIN = 4;

function blockWidth(lines: string[]): number {
  return Math.max(...lines.map((line) => line.length));
}

function Wordmark(props: { lines: string[]; color: ColorInput }): ReactNode {
  return (
    <box flexDirection="column" alignItems="flex-start">
      {props.lines.map((line) => (
        <text key={line} fg={props.color}>
          {line}
        </text>
      ))}
    </box>
  );
}

/** Launch splash: a centered branded wordmark over the whole screen. It is
 * purely presentational; the shell owns the dismissal key so keyboard handling
 * stays in one place. The wordmark steps down from the outlined logo, to the
 * POS monogram, to a plain label as the terminal narrows. */
export function SplashScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();

  const fitsFull = width >= blockWidth(FULL_WORDMARK) + WORDMARK_MARGIN;
  const fitsCompact = width >= blockWidth(COMPACT_WORDMARK) + WORDMARK_MARGIN;
  const wordmark = fitsFull ? FULL_WORDMARK : fitsCompact ? COMPACT_WORDMARK : null;

  return (
    <box
      position="absolute"
      left={0}
      right={0}
      top={0}
      bottom={0}
      backgroundColor={color(tokens.bg)}
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap={1}
    >
      {wordmark === null ? (
        <text fg={color(tokens.warning)}>{"Personal OS"}</text>
      ) : (
        <Wordmark lines={wordmark} color={color(tokens.warning)} />
      )}
      {fitsCompact && !fitsFull ? <text fg={color(tokens.fgMuted)}>{"Personal OS"}</text> : null}
      <text fg={color(tokens.fgSubtle)}>{"press any key"}</text>
    </box>
  );
}

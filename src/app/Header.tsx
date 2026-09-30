import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useSession } from "../store/session";
import { SCREEN_TITLES } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { ConnectionDot } from "./ConnectionDot";
import type { ConnectionDotTone } from "./ConnectionDot.types";
import type { HeaderProps } from "./Header.types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Header(props: HeaderProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const repoMode = useSession((state) => state.repoMode);
  const profileName = useSession((state) => state.profileName);
  const scenario = useSession((state) => state.scenario);
  const { width } = useTerminalDimensions();
  const compact = width < 80;
  // Mock mode is backed by in-memory fixtures, so it can honestly report ok.
  // Turso repos are `not wired yet` stubs until W1, so the dot reports stub.
  const mockError = repoMode === "mock" && scenario === "error";
  const connectionTone: ConnectionDotTone =
    repoMode === "mock" ? (mockError ? "error" : "ok") : "stub";
  const connectionLabel = connectionTone;

  return (
    <box
      flexDirection="row"
      alignItems="center"
      backgroundColor={color(tokens.headerBg)}
      paddingLeft={1}
      paddingRight={1}
      gap={1}
      flexGrow={1}
    >
      <text fg={color(tokens.fg)}>{SCREEN_TITLES[props.screen]}</text>
      {repoMode === "mock" ? (
        <box backgroundColor={color(tokens.warning)} paddingLeft={1} paddingRight={1}>
          <text fg={color(tokens.bg)}>{"MOCK DATA"}</text>
        </box>
      ) : null}
      <box flexGrow={1}>
        <text fg={color(tokens.headerBg)}> </text>
      </box>
      {compact ? null : <text fg={color(tokens.fgSubtle)}>{theme.label}</text>}
      <ConnectionDot tone={connectionTone} label={connectionLabel} />
      <text fg={color(tokens.fgMuted)}>
        {compact ? initials(profileName) : `${initials(profileName)}  ${profileName}`}
      </text>
    </box>
  );
}

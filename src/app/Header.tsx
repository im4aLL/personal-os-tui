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
  const connectionOk = useSession((state) => state.connectionOk);
  const { width } = useTerminalDimensions();
  const compact = width < 80;
  // Mock mode is backed by in-memory fixtures, so it can honestly report ok.
  // Turso mode shows the one-shot bootstrap connectivity probe only, not live
  // per-request health: null (skipped or timed out) shows stub, a successful
  // probe shows ok, a failed probe shows error.
  const mockError = repoMode === "mock" && scenario === "error";
  const connectionTone: ConnectionDotTone =
    repoMode === "mock"
      ? mockError
        ? "error"
        : "ok"
      : connectionOk === null
        ? "stub"
        : connectionOk
          ? "ok"
          : "error";
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
      {/* Inline mock guard (not a shared const): the bundler folds it and
          drops this branch - including the badge string - from production
          builds. */}
      {(typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) &&
      repoMode === "mock" ? (
        <box backgroundColor={color(tokens.warning)} paddingLeft={1} paddingRight={1}>
          {/* Warning yellow is light in the dark variants (dark text reads)
              but mid-tone in Latte (2.3:1 under near-white text), so the
              light variant sets dark text for a 3:1 badge. */}
          <text fg={color(theme.dark ? tokens.bg : tokens.fg)}>{"MOCK DATA"}</text>
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

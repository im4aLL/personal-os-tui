import type { ReactNode } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";

// M0 placeholder. The real connect/profile flow lands in M1 on the mock
// SetupRepo; the shell stays fully browsable behind it in mock mode.
// Fresh runs open here, then `d` continues with mock data (PLAN M1 Demo data
// affordance) and Alt+1..6 navigates away; the palette entry "Open setup"
// returns. The demo hint is behind the inline mock guard so production drops
// its strings; runtime reachability additionally requires mock repo mode.
export function SetupScreen(): ReactNode {
  const { theme, color } = useTheme();
  const repoMode = useSession((state) => state.repoMode);
  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      backgroundColor={color(theme.tokens.bg)}
    >
      <text fg={color(theme.tokens.fg)}>{"Welcome to Personal OS"}</text>
      <EmptyState
        title="Setup arrives in M1: Turso connect + profile."
        hint="Run with mock data for now - nothing here persists."
      />
      {(typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) &&
      repoMode === "mock" ? (
        <text fg={color(theme.tokens.fgMuted)}>
          {"Press d to continue with mock data - setup stays in the palette."}
        </text>
      ) : null}
    </box>
  );
}

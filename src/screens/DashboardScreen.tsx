import type { ReactNode } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useMockScreenState } from "../hooks/useMockScreenState";
import { useTheme } from "../theme/ThemeProvider";

export function DashboardScreen(): ReactNode {
  const { theme, color } = useTheme();
  const state = useMockScreenState();
  if (state === "loading") {
    return <Skeleton lines={5} widths={[48, 40, 44, 32, 24]} />;
  }
  if (state === "error") {
    return (
      <EmptyState
        title="Dashboard could not load."
        hint={
          (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED)
            ? "Change the mock scenario (Ctrl+Shift+D) and retry."
            : "Please retry."
        }
      />
    );
  }
  return (
    <box flexDirection="column" flexGrow={1} backgroundColor={color(theme.tokens.bg)}>
      <EmptyState
        title="Your day at a glance - no activity yet."
        hint="Todos, notes, and work logs will summarize here."
      />
    </box>
  );
}

import type { ReactNode } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useMockScreenState } from "../hooks/useMockScreenState";
import { useTheme } from "../theme/ThemeProvider";

export function WorkLogScreen(): ReactNode {
  const { theme, color } = useTheme();
  const state = useMockScreenState();
  if (state === "loading") {
    return <Skeleton lines={5} widths={[40, 46, 38, 42, 26]} />;
  }
  if (state === "error") {
    return (
      <EmptyState
        title="Work log could not load."
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
      <EmptyState title="No work logged yet." hint="Press n to log your first entry." />
    </box>
  );
}

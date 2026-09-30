import type { ReactNode } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useMockScreenState } from "../hooks/useMockScreenState";
import { useTheme } from "../theme/ThemeProvider";

export function ProjectsScreen(): ReactNode {
  const { theme, color } = useTheme();
  const state = useMockScreenState();
  if (state === "loading") {
    return <Skeleton lines={4} widths={[44, 56, 48, 36]} />;
  }
  if (state === "error") {
    return (
      <EmptyState
        title="Projects could not load."
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
      <EmptyState title="No projects yet." hint="Press n to plan your first project." />
    </box>
  );
}

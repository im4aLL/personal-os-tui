import type { ReactNode } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useMockScreenState } from "../hooks/useMockScreenState";
import { useTheme } from "../theme/ThemeProvider";

export function NotesScreen(): ReactNode {
  const { theme, color } = useTheme();
  const state = useMockScreenState();
  if (state === "loading") {
    return <Skeleton lines={4} widths={[30, 46, 42, 36]} />;
  }
  if (state === "error") {
    return (
      <EmptyState
        title="Notes could not load."
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
      <EmptyState title="No notes yet." hint="Press n to write your first note." />
    </box>
  );
}

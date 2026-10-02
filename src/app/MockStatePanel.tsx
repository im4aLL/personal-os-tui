import type { ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";
import { rowMarker } from "../utils/marker";

// Mock state dev panel (Ctrl+Shift+D): scenario, latency, error injection,
// fixture reset. Keys: 1-6 scenario, -/+ latency, e error injection, r reset,
// Esc close (all handled by the global key handler in App). The scenario list
// comes from the session (seeded inside the dynamic mock boundary), so this
// panel never imports mock code by path.
export function MockStatePanel(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const scenario = useSession((state) => state.scenario);
  const scenarios = useSession((state) => state.scenarios);
  const latencyMs = useSession((state) => state.latencyMs);
  const errorInjection = useSession((state) => state.errorInjection);

  return (
    <Modal title="Mock state (dev only)" width={54}>
      <text fg={color(tokens.fgMuted)}>{`scenario  1-${scenarios.length} to switch`}</text>
      {scenarios.map((entry, index) => {
        const active = entry === scenario;
        return (
          <text key={entry} fg={color(active ? tokens.accent : tokens.fg)}>
            {`${rowMarker(active)}${index + 1}  ${entry}`}
          </text>
        );
      })}
      <text fg={color(tokens.fgMuted)}>{`latency   ${latencyMs} ms  (-/+ adjust)`}</text>
      <text fg={color(errorInjection ? tokens.danger : tokens.fg)}>
        {`${rowMarker(errorInjection)}e  error injection ${errorInjection ? "on" : "off"}`}
      </text>
      <text fg={color(tokens.fgMuted)}>{"r  reset data"}</text>
      <text fg={color(tokens.fgSubtle)}>{"esc  close"}</text>
    </Modal>
  );
}

import type { ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";
import { rowMarker } from "../utils/marker";

// Minimal M0 dev panel (Ctrl+Shift+D): scenario, latency, reset.
// Keys: 1-5 scenario, -/+ latency, r reset, Esc close (handled globally).
// The scenario list comes from the session (seeded inside the dynamic mock
// boundary), so this panel never imports mock code by path.
export function MockStatePanel(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const scenario = useSession((state) => state.scenario);
  const scenarios = useSession((state) => state.scenarios);
  const latencyMs = useSession((state) => state.latencyMs);

  return (
    <Modal title="Mock state (dev only)" width={52}>
      <text fg={color(tokens.fgMuted)}>{"scenario  1-5 to switch"}</text>
      {scenarios.map((entry, index) => {
        const active = entry === scenario;
        return (
          <text key={entry} fg={color(active ? tokens.accent : tokens.fg)}>
            {`${rowMarker(active)}${index + 1}  ${entry}`}
          </text>
        );
      })}
      <text fg={color(tokens.fgMuted)}>{`latency   ${latencyMs} ms  (-/+ adjust)`}</text>
      <text fg={color(tokens.fgMuted)}>{"r  reset data"}</text>
      <text fg={color(tokens.fgSubtle)}>{"Esc  close"}</text>
    </Modal>
  );
}

import type { ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { rowMarker } from "../utils/marker";
import { pressHandler } from "../utils/mouse";

// Mock state dev panel (Ctrl+Shift+D): scenario, latency, error injection,
// fixture reset. Keys: 1-6 scenario, -/+ latency, e error injection, r reset,
// Esc close (all handled by the global key handler in App). The scenario list
// comes from the session (seeded inside the dynamic mock boundary), so this
// panel never imports mock code by path. Each row is also a mouse target.
export function MockStatePanel(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const scenario = useSession((state) => state.scenario);
  const scenarios = useSession((state) => state.scenarios);
  const latencyMs = useSession((state) => state.latencyMs);
  const errorInjection = useSession((state) => state.errorInjection);

  const adjustLatency = (delta: number): void => {
    const session = useSession.getState();
    session.setLatencyMs(Math.min(5000, Math.max(0, session.latencyMs + delta)));
  };

  return (
    <Modal title="Mock state (dev only)" width={54}>
      <text fg={color(tokens.fgMuted)}>{`scenario  1-${scenarios.length} to switch`}</text>
      {scenarios.map((entry, index) => {
        const active = entry === scenario;
        return (
          <text
            key={entry}
            fg={color(active ? tokens.accent : tokens.fg)}
            selectable={false}
            onMouseDown={pressHandler(() => useSession.getState().setScenario(entry))}
          >
            {`${rowMarker(active)}${index + 1}  ${entry}`}
          </text>
        );
      })}
      <box flexDirection="row" height={1}>
        <text fg={color(tokens.fgMuted)}>{`latency   ${latencyMs} ms  `}</text>
        <text
          fg={color(tokens.fg)}
          selectable={false}
          onMouseDown={pressHandler(() => adjustLatency(-200))}
        >
          {"- "}
        </text>
        <text
          fg={color(tokens.fg)}
          selectable={false}
          onMouseDown={pressHandler(() => adjustLatency(200))}
        >
          {"+"}
        </text>
      </box>
      <text
        fg={color(errorInjection ? tokens.danger : tokens.fg)}
        selectable={false}
        onMouseDown={pressHandler(() => {
          const session = useSession.getState();
          session.setErrorInjection(!session.errorInjection);
        })}
      >
        {`${rowMarker(errorInjection)}e  error injection ${errorInjection ? "on" : "off"}`}
      </text>
      <text
        fg={color(tokens.fgMuted)}
        selectable={false}
        onMouseDown={pressHandler(() => useSession.getState().resetMockData?.())}
      >
        {"r  reset data"}
      </text>
      <text
        fg={color(tokens.fgSubtle)}
        selectable={false}
        onMouseDown={pressHandler(() => useUi.getState().closeModal())}
      >
        {"esc  close"}
      </text>
    </Modal>
  );
}

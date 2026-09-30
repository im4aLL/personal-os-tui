import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";

const HINT_SEGMENTS = ["/ commands", "? help", "t theme", "q quit"];
const HINT_GAP = "  ";
const MIN_GAP = 2;

/** Fit segments into `room` columns, dropping whole trailing segments that
 * do not fit. Segments are never sliced mid-text. */
function fitSegments(segments: string[], joiner: string, room: number): string[] {
  const kept: string[] = [];
  for (const segment of segments) {
    const candidate = kept.length === 0 ? segment : `${kept.join(joiner)}${joiner}${segment}`;
    if (candidate.length > room) {
      break;
    }
    kept.push(segment);
  }
  return kept;
}

export function StatusLine(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();
  const repoMode = useSession((state) => state.repoMode);
  const scenarios = useSession((state) => state.scenarios);
  const latencyMs = useSession((state) => state.latencyMs);
  const scenario = useSession((state) => state.scenario);
  const loosePermissions = useSession((state) => state.loosePermissions);
  const fromEnv = useSession((state) => state.fromEnv);

  // Latency is a mock concept; without mock UI state the segment is absent
  // rather than a misleading "0 ms".
  const mockActive = scenarios.length > 0;
  const rightSegments = [
    `${repoMode}`,
    ...(mockActive ? [`${latencyMs} ms`] : []),
    ...(scenario !== "default" ? [scenario] : []),
    ...(fromEnv ? ["env creds"] : []),
    ...(loosePermissions ? ["config perms loose"] : []),
  ];

  const inner = Math.max(0, width - 2);
  // The right-hand readout wins: fit it first (dropping its own trailing
  // segments when extremely narrow), then fill the remainder with hints.
  const rightFitted = fitSegments(rightSegments, " | ", inner);
  const right = rightFitted.join(" | ");
  const hintRoom = right.length === 0 ? inner : Math.max(0, inner - right.length - MIN_GAP);
  const hints = fitSegments(HINT_SEGMENTS, HINT_GAP, hintRoom).join(HINT_GAP);
  const gap =
    hints.length === 0 || right.length === 0
      ? ""
      : " ".repeat(Math.max(MIN_GAP, inner - hints.length - right.length));
  const line = `${hints}${gap}${right}`;

  return (
    <box backgroundColor={color(tokens.statusBg)} paddingLeft={1} paddingRight={1} height={1}>
      <text fg={color(tokens.statusFg)}>{line}</text>
    </box>
  );
}

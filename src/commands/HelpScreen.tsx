import type { ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { useTheme } from "../theme/ThemeProvider";
import { formatKey, GLOBAL_COMMANDS, isCommandVisible, NAV_COMMANDS } from "./registry";
import type { Command } from "./registry.types";

// Help renders every key binding from the registry, so the listed keys and
// the handled keys share one source and cannot drift.
export function HelpScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const visible = [...NAV_COMMANDS, ...GLOBAL_COMMANDS].filter(isCommandVisible);
  // One row per binding, except the mock panel: its two bindings are one
  // command (Ctrl+Shift+D primary plus a Ctrl+D fallback for terminals
  // without kitty/modifyOtherKeys). List the universally reachable fallback
  // once so every listed key works; the footnote names the preferred form.
  const rows = visible.flatMap((command: Command) => {
    if (command.id === "global.mock-panel") {
      const fallback = command.keys[1] ?? command.keys[0];
      if (fallback === undefined) {
        return [];
      }
      return [
        {
          id: `${command.id}:${formatKey(fallback)}`,
          key: `${formatKey(fallback)} (fallback)`,
          title: command.title,
        },
      ];
    }
    return command.keys.map((binding) => ({
      id: `${command.id}:${formatKey(binding)}`,
      key: formatKey(binding),
      title: command.title,
    }));
  });
  return (
    <Modal title="Help - keys" width={52}>
      <text fg={color(tokens.fgMuted)}>{"Navigate"}</text>
      {rows
        .filter((row) => row.id.startsWith("nav."))
        .map((row) => (
          <box key={row.id} flexDirection="row">
            <text fg={color(tokens.accent)}>{row.key.padEnd(12, " ")}</text>
            <text fg={color(tokens.fg)}>{row.title}</text>
          </box>
        ))}
      <text fg={color(tokens.fgMuted)}>{"Global"}</text>
      {rows
        .filter((row) => row.id.startsWith("global."))
        .map((row) => (
          <box key={row.id} flexDirection="row">
            <text fg={color(tokens.accent)}>{row.key.padEnd(12, " ")}</text>
            <text fg={color(tokens.fg)}>{row.title}</text>
          </box>
        ))}
      {(typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) ? (
        <text fg={color(tokens.fgSubtle)}>
          {"Ctrl+Shift+D may arrive as Ctrl+D on some terminals - both work."}
        </text>
      ) : null}
    </Modal>
  );
}

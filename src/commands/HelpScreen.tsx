import type { ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { useTheme } from "../theme/ThemeProvider";
import { formatKey, GLOBAL_COMMANDS, isCommandVisible, NAV_COMMANDS } from "./registry";
import type { Command } from "./registry.types";

// Help renders the reachable key bindings from the registry, so the listed
// keys and the handled keys cannot drift for the keys it shows.
export function HelpScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const visible = [...NAV_COMMANDS, ...GLOBAL_COMMANDS].filter(isCommandVisible);
  // One row per binding, with two exceptions where a listed binding would not
  // work everywhere. Mock panel: two bindings are one command (Ctrl+Shift+D
  // primary plus a Ctrl+D fallback for terminals without kitty/modifyOtherKeys),
  // so list the universally reachable fallback once. Palette: `/` is preempted
  // by the Notes/Todo list-search scope, so list the always-reachable Ctrl+P.
  // Footnotes cover the omitted forms.
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
    if (command.id === "global.palette") {
      // `/` is preempted by the Notes/Todo list-search scope, so only the
      // always-reachable Ctrl+P binding is listed; the footnote covers `/`.
      const universal = command.keys.find((binding) => binding.ctrl === true);
      if (universal === undefined) {
        return [];
      }
      return [
        {
          id: `${command.id}:${formatKey(universal)}`,
          key: formatKey(universal),
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
  // Sections render in order; every section after the first gets a blank line
  // above it, so adding a group here picks up the spacing automatically.
  const sections: { label: string; prefix: string }[] = [
    { label: "Navigate", prefix: "nav." },
    { label: "Global", prefix: "global." },
  ];
  return (
    <Modal title="Help - keys" width={52}>
      {sections.map((section, index) => (
        <box key={section.label} flexDirection="column" paddingTop={index === 0 ? 0 : 1}>
          <text fg={color(tokens.fgMuted)}>{section.label}</text>
          {rows
            .filter((row) => row.id.startsWith(section.prefix))
            .map((row) => (
              <box key={row.id} flexDirection="row">
                <text fg={color(tokens.accent)}>{row.key.padEnd(12, " ")}</text>
                <text fg={color(tokens.fg)}>{row.title}</text>
              </box>
            ))}
        </box>
      ))}
      <box flexDirection="column" paddingTop={1}>
        <text fg={color(tokens.fgSubtle)}>
          {"/ searches the current list on Notes and Todo; elsewhere it opens the palette."}
        </text>
        {(typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) ? (
          <text fg={color(tokens.fgSubtle)}>
            {"Ctrl+Shift+D may arrive as Ctrl+D on some terminals - both work."}
          </text>
        ) : null}
        <text fg={color(tokens.fgSubtle)}>{"Esc close"}</text>
      </box>
    </Modal>
  );
}

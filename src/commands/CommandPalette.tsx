import type { ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { filterAvailableCommands } from "./registry";

// First-cut palette: fuzzy filter, Enter runs, Esc closes.
// Selection movement lives in the single global key handler (App) so the
// input keeps focus for typing while navigation keys stay predictable.
export function CommandPalette(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const query = useUi((state) => state.paletteQuery);
  const selected = useUi((state) => state.paletteIndex);
  const setQuery = useUi((state) => state.setPaletteQuery);
  const configComplete = useSession((state) => state.configComplete);
  const results = filterAvailableCommands(query, configComplete).slice(0, 10);

  return (
    <Modal title="Commands" width={56}>
      <box border={true} borderColor={color(tokens.border)} paddingLeft={1} paddingRight={1}>
        <input
          focused={true}
          value={query}
          placeholder="Type a command..."
          onInput={(value) => setQuery(value)}
        />
      </box>
      <box flexDirection="column" paddingTop={1}>
        {results.length === 0 ? (
          <text fg={color(tokens.fgSubtle)}>{"No matching commands."}</text>
        ) : (
          results.map((command, index) => {
            const active = index === selected;
            return (
              <box
                key={command.id}
                flexDirection="row"
                backgroundColor={active ? color(tokens.sidebarActiveBg) : undefined}
              >
                <text fg={color(active ? tokens.sidebarActiveFg : tokens.fg)}>
                  {`${active ? "> " : "  "}${command.title}`}
                </text>
                {command.hint !== "" ? (
                  <text fg={color(tokens.fgSubtle)}>{`  ${command.hint}`}</text>
                ) : null}
              </box>
            );
          })
        )}
      </box>
      <box paddingTop={1}>
        <text fg={color(tokens.fgSubtle)}>{"Enter run   Esc close"}</text>
      </box>
    </Modal>
  );
}

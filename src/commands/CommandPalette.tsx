import type { ReactNode } from "react";
import { List } from "../components/ui/List";
import { Modal } from "../components/ui/Modal";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { filterAvailableCommands, formatKey, PALETTE_PAGE_SIZE } from "./registry";

// Command palette: fuzzy filter, Enter runs, Esc closes. Bound keys render from
// the same registry that dispatches them, so a listing can never advertise a
// binding the handler does not accept.
// Selection movement lives in the single global key handler (App) so the
// input keeps focus for typing while navigation keys stay predictable.
export function CommandPalette(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const query = useUi((state) => state.paletteQuery);
  const selected = useUi((state) => state.paletteIndex);
  const setQuery = useUi((state) => state.setPaletteQuery);
  const repoMode = useSession((state) => state.repoMode);
  const matches = filterAvailableCommands(query, repoMode);
  const results = matches.slice(0, PALETTE_PAGE_SIZE);
  const hidden = Math.max(0, matches.length - results.length);

  return (
    <Modal title="Commands" width={56}>
      <box border={true} borderColor={color(tokens.border)} paddingLeft={1} paddingRight={1}>
        <input
          focused={true}
          value={query}
          placeholder="Type a command..."
          onInput={(value) => setQuery(value)}
          backgroundColor={color(tokens.bgPanel)}
          focusedBackgroundColor={color(tokens.bgPanel)}
          textColor={color(tokens.fg)}
          focusedTextColor={color(tokens.fg)}
          placeholderColor={color(tokens.fgDisabled)}
          cursorColor={color(tokens.cursor)}
          selectionBg={color(tokens.selectionBg)}
          selectionFg={color(tokens.selectionFg)}
        />
      </box>
      <box flexDirection="column" paddingTop={1}>
        {results.length === 0 ? (
          <text fg={color(tokens.fgSubtle)}>{"No matching commands."}</text>
        ) : (
          <List
            items={results.map((command) => {
              const bound = command.keys.map((binding) => formatKey(binding)).join(", ");
              return {
                id: command.id,
                label: command.title,
                detail: bound === "" ? undefined : bound,
              };
            })}
            selected={selected}
          />
        )}
      </box>
      <box paddingTop={1}>
        <text fg={color(tokens.fgSubtle)}>{"enter run   esc close"}</text>
      </box>
      {hidden > 0 ? (
        <box>
          <text fg={color(tokens.fgMuted)}>{`+${hidden} more - keep typing to narrow`}</text>
        </box>
      ) : null}
    </Modal>
  );
}

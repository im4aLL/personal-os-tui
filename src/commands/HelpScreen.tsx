import type { ScrollBoxRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useRef } from "react";
import { Modal } from "../components/ui/Modal";
import { useKeyboardScope } from "../hooks/useKeyboardScope";
import type { RepoMode } from "../repos/resolve.types";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";
import { truncate } from "../utils/text";
import { helpSections, isMockEnabled } from "./registry";
import type { HelpSection } from "./registry.types";

/** Sections with the `:q` ex-command appended to Global. `:q` is an App
 * ex-command, not a registry binding, so it is added explicitly to keep it
 * listed beside the other global keys. */
function helpSource(repoMode: RepoMode): HelpSection[] {
  return helpSections(repoMode).map((section) =>
    section.label === "Global"
      ? {
          label: section.label,
          lines: [...section.lines, { key: ":q", title: "Quit (ex; :q! or :quit)" }],
        }
      : section,
  );
}

/** Split sections into two columns, keeping each section whole. A section
 * weighs its header plus its rows, and one blank line separates adjacent
 * sections, so the split whose column heights are closest is chosen; that
 * keeps both columns about the same length without breaking a section across
 * the gutter. */
function splitColumns(sections: HelpSection[]): [HelpSection[], HelpSection[]] {
  const weights = sections.map((section) => section.lines.length + 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0) + sections.length - 1;
  let prefix = weights[0];
  let splitIndex = 1;
  let bestDiff = Infinity;
  for (let index = 1; index < sections.length; index += 1) {
    // Left holds `index` sections: their headers/rows plus the gaps between.
    const leftHeight = prefix + (index - 1);
    const diff = Math.abs(total - 2 * leftHeight);
    if (diff < bestDiff) {
      bestDiff = diff;
      splitIndex = index;
    }
    prefix += weights[index];
  }
  return [sections.slice(0, splitIndex), sections.slice(splitIndex)];
}

// Help renders every reachable binding from the registry, split into Navigate,
// Global, and one section per screen, so the listed keys and the handled keys
// cannot drift for the keys it shows. Sections flow into two balanced columns
// inside one scrollbox, so the whole overlay scrolls as a single viewport.
export function HelpScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const repoMode = useSession((state) => state.repoMode);
  const { width, height } = useTerminalDimensions();
  const scrollRef = useRef<ScrollBoxRenderable>(null);

  // The scrollbox owns the scroll position (mouse wheel included); this scope
  // maps the keyboard to it. A line is one row, a page is one viewport.
  useKeyboardScope((key) => {
    const box = scrollRef.current;
    if (box === null) {
      return false;
    }
    if (key.name === "down" || (!key.ctrl && !key.meta && key.name === "j")) {
      box.scrollBy(1);
      return true;
    }
    if (key.name === "up" || (!key.ctrl && !key.meta && key.name === "k")) {
      box.scrollBy(-1);
      return true;
    }
    if (key.name === "pagedown") {
      box.scrollBy(1, "viewport");
      return true;
    }
    if (key.name === "pageup") {
      box.scrollBy(-1, "viewport");
      return true;
    }
    if (key.name === "home") {
      box.scrollBy(-1, "content");
      return true;
    }
    if (key.name === "end") {
      box.scrollBy(1, "content");
      return true;
    }
    return false;
  });

  const source = helpSource(repoMode);
  // Fill most of the terminal while leaving a small frame margin; cap the width
  // so the panel never touches the edges on wide terminals.
  const modalWidth = Math.max(44, Math.min(96, width - 6));
  const modalHeight = Math.max(12, height - 4);
  // The modal spends six cells on its border and padding; split the rest into
  // two equal columns with a three-cell gutter between them.
  const innerWidth = modalWidth - 6;
  const columnGap = 3;
  const twoColumnWidth = Math.max(8, Math.floor((innerWidth - columnGap) / 2));
  // Align the action column to the widest rendered key (e.g.
  // "ctrl+d (fallback)") plus a two-cell gutter, so alignment never breaks when
  // a longer binding is added. Cap it so the title keeps room.
  const keyWidth = source
    .flatMap((section) => section.lines)
    .reduce((max, line) => Math.max(max, line.key.length), 0);
  // Only split when both columns still leave a comfortable title column; on a
  // narrow terminal one full-width column reads better than two cramped ones.
  const twoColumnKeyColumn = Math.min(keyWidth + 2, Math.max(8, twoColumnWidth - 14));
  const useTwoColumns = twoColumnWidth - twoColumnKeyColumn >= 20;
  const columns = useTwoColumns ? splitColumns(source) : [source];
  const columnWidth = useTwoColumns ? twoColumnWidth : innerWidth;
  const keyColumn = useTwoColumns
    ? twoColumnKeyColumn
    : Math.min(keyWidth + 2, Math.max(8, columnWidth - 14));
  // Elide a title that outgrows the column instead of letting it wrap to a
  // second row, which would break the one-row-per-shortcut grid.
  const titleRoom = Math.max(1, columnWidth - keyColumn);

  return (
    <Modal title="Help - keys" width={modalWidth} height={modalHeight}>
      <scrollbox ref={scrollRef} flexGrow={1} flexShrink={1} minHeight={0} scrollY={true}>
        <box flexDirection="row" gap={columnGap} alignItems="flex-start">
          {columns.map((column) => (
            <box
              key={column[0]?.label ?? "column"}
              flexDirection="column"
              width={columnWidth}
              flexShrink={0}
            >
              {column.map((section, sectionIndex) => (
                <box key={section.label} flexDirection="column">
                  {sectionIndex > 0 ? <box height={1} /> : null}
                  <text fg={color(tokens.fgMuted)}>{section.label}</text>
                  {section.lines.map((line) => (
                    <box key={`${section.label}:${line.key}`} flexDirection="row">
                      <text fg={color(tokens.accent)}>
                        {truncate(line.key, keyColumn).padEnd(keyColumn, " ")}
                      </text>
                      <text fg={color(tokens.fg)}>{truncate(line.title, titleRoom)}</text>
                    </box>
                  ))}
                </box>
              ))}
            </box>
          ))}
        </box>
      </scrollbox>
      <box flexDirection="column" flexShrink={0} paddingTop={1}>
        <text fg={color(tokens.fgSubtle)}>
          {"/ searches the current list on Notes and Todo; elsewhere it opens the palette."}
        </text>
        <text fg={color(tokens.fgSubtle)}>{"browsing: up/down = j/k, left/right = h/l"}</text>
        {isMockEnabled() && repoMode === "mock" ? (
          <text fg={color(tokens.fgSubtle)}>
            {
              "ctrl+shift+d opens the mock panel; where a terminal reports it as ctrl+d, open it from the palette (browsing uses ctrl+d for half page)."
            }
          </text>
        ) : null}
        <text fg={color(tokens.fgSubtle)}>{"j/k or up/down scroll  pageup/pagedown page"}</text>
        <text fg={color(tokens.fgSubtle)}>{"home/end top/bottom  esc close"}</text>
      </box>
    </Modal>
  );
}

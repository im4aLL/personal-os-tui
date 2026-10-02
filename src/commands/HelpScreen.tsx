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

type HelpRow =
  | { kind: "header"; id: string; label: string }
  | { kind: "line"; id: string; key: string; title: string }
  | { kind: "gap"; id: string };

/** Flatten sections into rows so one scrollbox scrolls the whole overlay
 * (headers and gaps included) instead of scrolling each section separately. */
function flattenHelp(repoMode: RepoMode): HelpRow[] {
  const rows: HelpRow[] = [];
  helpSections(repoMode).forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      rows.push({ kind: "gap", id: `gap-${section.label}` });
    }
    rows.push({ kind: "header", id: `header-${section.label}`, label: section.label });
    for (const line of section.lines) {
      rows.push({
        kind: "line",
        id: `${section.label}:${line.key}`,
        key: line.key,
        title: line.title,
      });
    }
  });
  return rows;
}

// Help renders every reachable binding from the registry, split into Navigate,
// Global, and one section per screen, so the listed keys and the handled keys
// cannot drift for the keys it shows.
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

  const rows = flattenHelp(repoMode);
  // Fill most of the terminal while leaving a small frame margin; cap the width
  // so the panel never touches the edges on wide terminals.
  const modalWidth = Math.max(44, Math.min(96, width - 6));
  const modalHeight = Math.max(12, height - 4);
  // Align the action column to the widest rendered key (e.g.
  // "ctrl+shift+d (fallback)") plus a two-cell gutter, so alignment never
  // breaks when a longer binding is added. Cap it so a very wide key column
  // cannot starve the title on the narrowest modal; the modal spends six cells
  // on its border and padding, and the title keeps at least ~14.
  const keyWidth = rows.reduce(
    (max, row) => (row.kind === "line" ? Math.max(max, row.key.length) : max),
    0,
  );
  const keyColumn = Math.min(keyWidth + 2, Math.max(8, modalWidth - 20));

  return (
    <Modal title="Help - keys" width={modalWidth} height={modalHeight}>
      <scrollbox ref={scrollRef} flexGrow={1} flexShrink={1} minHeight={0} scrollY={true}>
        {rows.map((row) => {
          if (row.kind === "gap") {
            return <box key={row.id} height={1} />;
          }
          if (row.kind === "header") {
            return (
              <text key={row.id} fg={color(tokens.fgMuted)}>
                {row.label}
              </text>
            );
          }
          return (
            <box key={row.id} flexDirection="row">
              <text fg={color(tokens.accent)}>
                {truncate(row.key, keyColumn).padEnd(keyColumn, " ")}
              </text>
              <text fg={color(tokens.fg)}>{row.title}</text>
            </box>
          );
        })}
      </scrollbox>
      <box flexDirection="column" flexShrink={0} paddingTop={1}>
        <text fg={color(tokens.fgSubtle)}>
          {"/ searches the current list on Notes and Todo; elsewhere it opens the palette."}
        </text>
        {isMockEnabled() && repoMode === "mock" ? (
          <text fg={color(tokens.fgSubtle)}>
            {"ctrl+shift+d may arrive as ctrl+d on some terminals - both work."}
          </text>
        ) : null}
        <text fg={color(tokens.fgSubtle)}>{"j/k or up/down scroll  pageup/pagedown page"}</text>
        <text fg={color(tokens.fgSubtle)}>{"home/end top/bottom  esc close"}</text>
      </box>
    </Modal>
  );
}

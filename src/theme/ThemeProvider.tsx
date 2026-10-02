// React context carrying the active theme plus capability-aware color resolution.

import type { CliRenderer } from "@opentui/core";
import { CliRenderEvents } from "@opentui/core";
import { useAppContext } from "@opentui/react";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Modal } from "../components/ui/Modal";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { resolveColor } from "./degrade";
import type { ColorCaps } from "./degrade.types";
import { getTheme, listThemes } from "./registry";
import type { ThemeContextValue, ThemeProviderProps } from "./ThemeProvider.types";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function capsOf(renderer: CliRenderer | null): ColorCaps {
  const caps = renderer?.capabilities;
  if (caps == null) {
    // Optimistic default; the subscription below corrects it once known.
    return { rgb: true, ansi256: true };
  }
  return { rgb: caps.rgb, ansi256: caps.ansi256 };
}

export function ThemeProvider(props: ThemeProviderProps): ReactNode {
  const { renderer } = useAppContext();
  const [caps, setCaps] = useState<ColorCaps>(() => capsOf(renderer));
  const theme = getTheme(props.themeId);

  useEffect(() => {
    if (renderer == null) {
      return;
    }
    setCaps(capsOf(renderer));
    const onCaps = (): void => {
      setCaps(capsOf(renderer));
    };
    renderer.on(CliRenderEvents.CAPABILITIES, onCaps);
    return () => {
      renderer.off(CliRenderEvents.CAPABILITIES, onCaps);
    };
  }, [renderer]);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme,
      caps,
      color: (hex: string) => resolveColor(hex, caps),
    };
  }, [theme, caps]);

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value == null) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return value;
}

/** Theme picker modal (Ctrl+T). The global key handler in App owns movement
 * and selection, so this renders the list and the active highlight only; the
 * session setter applies the theme and persists it to config.ui.theme. */
export function ThemePicker(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const themes = listThemes();
  const index = useUi((state) => state.themePickerIndex);
  const activeId = useSession((state) => state.themeId);

  return (
    <Modal title="Theme" width={40}>
      <text fg={color(tokens.fgMuted)}>{"enter apply  j/k move  esc close"}</text>
      <box flexDirection="column" paddingTop={1}>
        {themes.map((entry, entryIndex) => {
          const focused = entryIndex === index;
          const active = entry.id === activeId;
          const marker = focused ? "> " : "  ";
          const suffix = active ? "  (active)" : "";
          return (
            <text
              key={entry.id}
              fg={color(focused ? tokens.accent : active ? tokens.accentAlt : tokens.fg)}
            >
              {`${marker}${entry.label}${suffix}`}
            </text>
          );
        })}
      </box>
    </Modal>
  );
}

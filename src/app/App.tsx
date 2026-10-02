import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { CommandPalette } from "../commands/CommandPalette";
import { HelpScreen } from "../commands/HelpScreen";
import {
  commandKeys,
  filterAvailableCommands,
  findCommandForKey,
  isMockEnabled,
  matchesKey,
  PALETTE_PAGE_SIZE,
} from "../commands/registry";
import type { CommandContext } from "../commands/registry.types";
import { resolveKeyScope } from "../hooks/useKeyboardScope";
import { DashboardScreen } from "../screens/DashboardScreen";
import { LinksScreen } from "../screens/LinksScreen";
import { NotesScreen } from "../screens/NotesScreen";
import { ProjectsScreen } from "../screens/ProjectsScreen";
import { TodoScreen } from "../screens/TodoScreen";
import { WorkLogScreen } from "../screens/WorkLogScreen";
import { useDashboard } from "../store/dashboard";
import { useLinks } from "../store/links";
import { useNotes } from "../store/notes";
import { useProjectsStore } from "../store/projects";
import { useSession } from "../store/session";
import { useTodos } from "../store/todos";
import { useUi } from "../store/ui";
import type { Screen } from "../store/ui.types";
import { useWorkLogs } from "../store/workLogs";
import { listThemes } from "../theme/registry";
import { ThemePicker, ThemeProvider } from "../theme/ThemeProvider";
import type { AppBootstrap, ScreenContentProps, ShellProps } from "./App.types";
import { Layout } from "./Layout";
import { MockStatePanel } from "./MockStatePanel";
import { SetupScreen } from "./SetupScreen";

function ScreenContent(props: ScreenContentProps): ReactNode {
  switch (props.screen) {
    case "dashboard": {
      return <DashboardScreen />;
    }
    case "todo": {
      return <TodoScreen />;
    }
    case "links": {
      return <LinksScreen />;
    }
    case "projects": {
      return <ProjectsScreen />;
    }
    case "work-log": {
      return <WorkLogScreen />;
    }
    case "notes": {
      return <NotesScreen />;
    }
  }
}

function Shell(props: ShellProps): ReactNode {
  const screen = useUi((state) => state.screen);
  const modal = useUi((state) => state.modal);
  const sidebarCollapsed = useUi((state) => state.sidebarCollapsed);
  const setupDismissed = useUi((state) => state.setupDismissed);
  const setupOpen = useUi((state) => state.setupOpen);
  const configComplete = useSession((state) => state.configComplete);
  const { width } = useTerminalDimensions();
  const renderer = useRenderer();
  const [narrowOpen, setNarrowOpen] = useState(false);

  useEffect(() => {
    if (width >= 60) {
      setNarrowOpen(false);
    }
  }, [width]);

  const ctx = useMemo<CommandContext>(() => {
    const canBrowseMock = (): boolean => {
      const session = useSession.getState();
      return isMockEnabled() && session.repoMode === "mock" && !session.configComplete;
    };
    return {
      navigate: (next: Screen) => {
        // H2: navigating away (Alt+1..6 or palette) dismisses Setup in mock
        // mode, so the shell stays browsable behind it. Prod never dismisses
        // here because isMockEnabled() is false there. An explicit edit-mode
        // Setup is always dismissible, complete config or not.
        if (canBrowseMock() || useUi.getState().setupOpen) {
          useUi.getState().dismissSetup();
        }
        useUi.getState().setScreen(next);
      },
      cycleTheme: () => {
        useSession.getState().cycleTheme();
      },
      openThemePicker: () => {
        const themes = listThemes();
        const activeIndex = themes.findIndex((entry) => entry.id === useSession.getState().themeId);
        useUi.getState().setThemePickerIndex(activeIndex === -1 ? 0 : activeIndex);
        useUi.getState().openModal("theme-picker");
      },
      toggleSidebar: () => {
        if (width < 60) {
          setNarrowOpen((open) => !open);
        } else {
          useUi.getState().toggleSidebar();
        }
      },
      refresh: () => {
        switch (useUi.getState().screen) {
          case "dashboard": {
            void useDashboard.getState().loadDashboard();
            break;
          }
          case "todo": {
            void useTodos.getState().refreshTodos();
            break;
          }
          case "links": {
            void useLinks.getState().refreshLinks();
            break;
          }
          case "projects": {
            void useProjectsStore.getState().refreshProjects();
            break;
          }
          case "work-log": {
            void useWorkLogs.getState().refreshWorkLogs();
            break;
          }
          case "notes": {
            void useNotes.getState().refreshNotes();
            break;
          }
        }
      },
      openPalette: () => {
        const ui = useUi.getState();
        ui.setPaletteQuery("");
        ui.openModal("command-palette");
      },
      openHelp: () => {
        useUi.getState().openModal("help");
      },
      closeModal: () => {
        useUi.getState().closeModal();
      },
      openMockPanel: () => {
        // Gated on the build flag and the runtime mode: the panel is
        // unreachable in production builds and in turso mode, where its
        // scenario/latency controls have nothing to act on.
        const session = useSession.getState();
        if (isMockEnabled() && session.repoMode === "mock") {
          useUi.getState().openModal("mock-panel");
        }
      },
      showSetup: () => {
        // Setup is always reachable: first run onboards, and once onboarding
        // is complete the same screen opens in edit mode for credentials and
        // profile. The palette entry is likewise never hidden.
        useUi.getState().showSetupScreen();
      },
      setScenario: (scenario) => {
        useSession.getState().setScenario(scenario);
      },
      resetMockData: () => {
        useSession.getState().resetMockData?.();
      },
      quit: props.quit,
    };
  }, [props.quit, width]);

  useKeyboard((key) => {
    const state = useUi.getState();
    // A rejected ex command lingers on the status line until the next key.
    if (!state.exOpen && state.exError !== null) {
      state.clearExError();
    }
    // Ctrl+Q quits from anywhere, even modals and text fields. (Bare `q` only
    // quits while browsing; it must keep typing in inputs.)
    const quitAlways = commandKeys("global.quit").filter(
      (binding) => binding.ctrl === true && binding.name.toLowerCase() === "q",
    );
    if (quitAlways.some((binding) => matchesKey(key, binding))) {
      ctx.quit();
      return;
    }

    // Ctrl+C copies the current terminal text selection when there is one, in
    // any context (browsing, a modal, Setup, a focused field). With nothing
    // selected it does not stop propagation: while browsing it falls through to
    // the registry's Ctrl+C quit binding, a modal branch below returns without
    // quitting, and a focused field is protected by the deferral further down.
    // A renderer without the OSC52 helper also falls through, so browsing still
    // quits there.
    if (key.ctrl && !key.meta && key.name.toLowerCase() === "c") {
      if (typeof renderer.copyToClipboardOSC52 === "function") {
        const selection = renderer.getSelection()?.getSelectedText() ?? "";
        if (selection !== "") {
          renderer.copyToClipboardOSC52(selection);
          key.stopPropagation();
          return;
        }
      }
    }

    const session = useSession.getState();
    const setupVisible = state.setupOpen || (!session.configComplete && !state.setupDismissed);

    // The `:` ex-line is its own mode, keyed wholly here so `q`, `d`, and `/`
    // type into the prompt instead of reaching a screen scope or the registry.
    // It sits after the always-on quit/copy filters and before screen-scope
    // resolution, so it outranks every browsing binding while open.
    if (state.exOpen) {
      // Every ex keystroke is owned here; stop other OpenTUI-level listeners
      // from also seeing it, matching the help modal's guard.
      key.stopPropagation();
      if (key.name === "escape") {
        state.closeEx();
        return;
      }
      if (key.name === "return" || key.name === "kpenter" || key.name === "linefeed") {
        const command = state.exQuery.trim();
        state.closeEx();
        if (command === "") {
          return;
        }
        if (command === "q" || command === "q!" || command === "quit") {
          ctx.quit();
          return;
        }
        state.setExError(`not a command: ${command}`);
        return;
      }
      if (key.name === "backspace") {
        state.setExQuery(state.exQuery.slice(0, -1));
        return;
      }
      // Printable characters only: a single-character name with no modifier.
      if (!key.ctrl && !key.meta && key.option !== true && key.name.length === 1) {
        state.setExQuery(state.exQuery + key.name);
        return;
      }
      return;
    }

    // `:` opens the ex prompt only from normal browsing: no modal, no focused
    // field, and Setup not visible (its connecting/failure steps clear focus
    // while still owning the viewport).
    if (
      state.modal === "none" &&
      state.focusedField === null &&
      !setupVisible &&
      !key.ctrl &&
      !key.meta &&
      key.option !== true &&
      (key.name === ":" || (key.name === ";" && key.shift === true))
    ) {
      state.openEx();
      return;
    }

    if (state.modal === "command-palette") {
      if (key.name === "escape") {
        state.closeModal();
        return;
      }
      const results = filterAvailableCommands(state.paletteQuery, useSession.getState().repoMode);
      if (key.name === "return") {
        const target = results[state.paletteIndex];
        state.closeModal();
        if (target !== undefined) {
          target.run(ctx);
        }
        return;
      }
      if (key.name === "down" || (key.ctrl && key.name === "n")) {
        const count = Math.min(PALETTE_PAGE_SIZE, results.length);
        // max(0, ...): with no matches count - 1 is -1, which must not leak
        // into paletteIndex (Enter on -1 just closes; nothing highlights).
        state.setPaletteIndex(Math.max(0, Math.min(count - 1, state.paletteIndex + 1)));
        return;
      }
      if (key.name === "up" || (key.ctrl && key.name === "p")) {
        state.setPaletteIndex(Math.max(0, state.paletteIndex - 1));
        return;
      }
      return;
    }

    if (state.modal === "help") {
      if (key.name === "escape") {
        state.closeModal();
        return;
      }
      // The help overlay's scrollbox owns j/k, arrows, PageUp/Down, Home/End
      // and the mouse wheel through its keyboard scope; swallow every other
      // key so global browsing bindings stay off while help is open.
      if (resolveKeyScope(key)) {
        key.stopPropagation();
      }
      return;
    }

    if (state.modal === "theme-picker") {
      const themes = listThemes();
      const count = themes.length;
      if (key.name === "escape") {
        state.closeModal();
        return;
      }
      if (key.name === "down" || (!key.ctrl && !key.meta && key.name === "j")) {
        state.setThemePickerIndex((state.themePickerIndex + 1) % count);
        return;
      }
      if (key.name === "up" || (!key.ctrl && !key.meta && key.name === "k")) {
        state.setThemePickerIndex((state.themePickerIndex - 1 + count) % count);
        return;
      }
      const digit =
        key.name.length === 1 && key.name >= "1" && key.name <= "9" ? Number(key.name) - 1 : -1;
      if (!key.ctrl && !key.meta && digit !== -1 && digit < count) {
        state.setThemePickerIndex(digit);
        return;
      }
      if (key.name === "return") {
        const target = themes[state.themePickerIndex];
        if (target !== undefined) {
          useSession.getState().selectTheme(target.id);
        }
        state.closeModal();
        return;
      }
      return;
    }

    if (state.modal === "mock-panel") {
      if (key.name === "escape") {
        state.closeModal();
        return;
      }
      const digit =
        key.name.length === 1 && key.name >= "1" && key.name <= "9" ? Number(key.name) - 1 : -1;
      if (!key.ctrl && !key.meta && digit !== -1) {
        const scenario = session.scenarios[digit];
        if (scenario !== undefined) {
          session.setScenario(scenario);
        }
        return;
      }
      if (!key.ctrl && !key.meta && key.name === "e") {
        session.setErrorInjection(!session.errorInjection);
        return;
      }
      if (!key.ctrl && !key.meta && key.name === "r") {
        session.resetMockData?.();
        return;
      }
      if (!key.ctrl && !key.meta && (key.name === "-" || key.name === "+" || key.name === "=")) {
        const delta = key.name === "-" ? -200 : 200;
        session.setLatencyMs(Math.min(5000, Math.max(0, session.latencyMs + delta)));
        return;
      }
      return;
    }

    // Screen-owned scope runs before the global registry so a screen key can
    // preempt a global one (Todo's Ctrl+D pages instead of opening the mock
    // panel). A scope that returns false lets the global keys above/below
    // proceed, and the focused-field deferral still hands plain characters to
    // a focused `<input>`/`<textarea>`.
    if (resolveKeyScope(key)) {
      key.stopPropagation();
      return;
    }

    // A focused control owns its plain keys, and so does the Setup screen as
    // a whole: while Setup is visible (or any form holds `ui.focusedField`),
    // `t`, `/`, `?`, and `q` must not cycle the theme, open the palette, or
    // quit, including the connecting/failure steps where Setup clears its
    // focus. Modified keys cannot be typed, so they still resolve: Alt+1..6
    // navigates away and dismisses Setup in mock mode (M0: `d` or Alt+1..6
    // reaches the six screens), and Ctrl+P opens the palette on top. Ctrl+Q
    // stays reachable above. Ctrl+C with a text selection was consumed by the
    // copy handler above; with no selection it falls through to here, so a
    // focused control is never quit from.
    const focusedOrSetup = state.focusedField !== null || setupVisible;
    if (focusedOrSetup && key.ctrl && !key.meta && key.name.toLowerCase() === "c") {
      return;
    }
    if (focusedOrSetup && !key.ctrl && !key.meta && key.option !== true) {
      return;
    }

    // Normal browsing: every binding comes from the command registry, so the
    // handler, the palette, and help share one source of truth.
    const target = findCommandForKey(key);
    if (target !== undefined) {
      target.run(ctx);
    }
  });

  const sidebarHidden = width < 60 ? !narrowOpen : sidebarCollapsed;
  const sidebarRail = !sidebarHidden && (sidebarCollapsed || width < 80);
  // Setup shows until the config is complete (credentials + onboarding) and
  // the user continues with mock data in mock mode, or whenever the palette
  // explicitly reopens it to edit credentials and profile. Fresh and `pos
  // reset` runs open on Setup, then `d` or Alt+1..6 reaches the six screens.
  const showSetup = setupOpen || (!configComplete && !setupDismissed);

  return (
    <Layout
      screen={screen}
      sidebarHidden={sidebarHidden}
      sidebarRail={sidebarRail}
      onNavigate={ctx.navigate}
    >
      {showSetup ? (
        <SetupScreen
          setup={props.setup}
          settings={props.settings}
          quit={props.quit}
          editing={setupOpen && configComplete}
        />
      ) : (
        <ScreenContent key={screen} screen={screen} />
      )}
      {modal === "command-palette" ? <CommandPalette /> : null}
      {modal === "help" ? <HelpScreen /> : null}
      {modal === "theme-picker" ? <ThemePicker /> : null}
      {modal === "mock-panel" &&
      (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) ? (
        <MockStatePanel />
      ) : null}
    </Layout>
  );
}

export function App(props: AppBootstrap): ReactNode {
  const themeId = useSession((state) => state.themeId);

  return (
    <ThemeProvider themeId={themeId}>
      <Shell quit={props.onRequestQuit} setup={props.setup} settings={props.settings} />
    </ThemeProvider>
  );
}

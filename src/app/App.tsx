import { useKeyboard, useTerminalDimensions } from "@opentui/react";
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
} from "../commands/registry";
import type { CommandContext } from "../commands/registry.types";
import { DashboardScreen } from "../screens/DashboardScreen";
import { LinksScreen } from "../screens/LinksScreen";
import { NotesScreen } from "../screens/NotesScreen";
import { ProjectsScreen } from "../screens/ProjectsScreen";
import { TodoScreen } from "../screens/TodoScreen";
import { WorkLogScreen } from "../screens/WorkLogScreen";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import type { Screen } from "../store/ui.types";
import { ThemeProvider } from "../theme/ThemeProvider";
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
  const configComplete = useSession((state) => state.configComplete);
  const { width } = useTerminalDimensions();
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
        // here because isMockEnabled() is false there.
        if (canBrowseMock()) {
          useUi.getState().dismissSetup();
        }
        useUi.getState().setScreen(next);
      },
      cycleTheme: () => {
        useSession.getState().cycleTheme();
      },
      toggleSidebar: () => {
        if (width < 60) {
          setNarrowOpen((open) => !open);
        } else {
          useUi.getState().toggleSidebar();
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
        // Gated: the dev panel is unreachable in production builds, where the
        // mock commands are also hidden from the palette and help.
        if (isMockEnabled()) {
          useUi.getState().openModal("mock-panel");
        }
      },
      showSetup: () => {
        // Gated: once the config is complete App renders Setup on nothing,
        // so running the palette entry there must stay a no-op. The palette
        // also hides the entry when complete (filterAvailableCommands), so
        // this guard is belt and braces for direct ctx callers.
        if (!useSession.getState().configComplete) {
          useUi.getState().showSetupScreen();
        }
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
    // Ctrl+Q quits from anywhere, even modals and text fields. Ctrl+C quits
    // only from normal browsing (handled via the registry below): while the
    // palette input is focused Ctrl+C must not quit, so copy can land there
    // later without hijacking. (Bare `q` only quits while browsing; it must
    // keep typing in inputs.)
    const quitAlways = commandKeys("global.quit").filter(
      (binding) => binding.ctrl === true && binding.name.toLowerCase() === "q",
    );
    if (quitAlways.some((binding) => matchesKey(key, binding))) {
      ctx.quit();
      return;
    }

    if (state.modal === "command-palette") {
      if (key.name === "escape") {
        state.closeModal();
        return;
      }
      const results = filterAvailableCommands(
        state.paletteQuery,
        useSession.getState().configComplete,
      );
      if (key.name === "return") {
        const target = results[state.paletteIndex];
        state.closeModal();
        if (target !== undefined) {
          target.run(ctx);
        }
        return;
      }
      if (key.name === "down" || (key.ctrl && key.name === "n")) {
        const count = Math.min(10, results.length);
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
      }
      return;
    }

    if (state.modal === "mock-panel") {
      if (key.name === "escape") {
        state.closeModal();
        return;
      }
      const session = useSession.getState();
      const digit = ["1", "2", "3", "4", "5"].indexOf(key.name);
      if (!key.ctrl && !key.meta && digit !== -1) {
        const scenario = session.scenarios[digit];
        if (scenario !== undefined) {
          session.setScenario(scenario);
        }
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

    // H2: Setup covers the content area until dismissed, but the shell stays
    // browsable in mock mode. `d` continues with mock data (PLAN M1 Demo
    // data affordance); navigation dismisses via ctx.navigate above. Palette,
    // help, theme, and quit still run on top of Setup without dismissing it.
    const session = useSession.getState();
    const setupVisible = !session.configComplete && !useUi.getState().setupDismissed;
    const canDemo = isMockEnabled() && session.repoMode === "mock" && !session.configComplete;
    if (setupVisible && canDemo && !key.ctrl && !key.meta && key.name.toLowerCase() === "d") {
      useUi.getState().dismissSetup();
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
  // the user continues with mock data in mock mode. Fresh and `pos reset`
  // runs open on Setup, then `d` or Alt+1..6 reaches the six screens; the
  // palette entry "Open setup" returns here. Never gated on repoMode alone.
  const showSetup = !configComplete && !setupDismissed;

  return (
    <Layout screen={screen} sidebarHidden={sidebarHidden} sidebarRail={sidebarRail}>
      {showSetup ? <SetupScreen /> : <ScreenContent key={screen} screen={screen} />}
      {modal === "command-palette" ? <CommandPalette /> : null}
      {modal === "help" ? <HelpScreen /> : null}
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
      <Shell quit={props.onRequestQuit} />
    </ThemeProvider>
  );
}

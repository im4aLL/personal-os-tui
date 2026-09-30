import type { ReactNode } from "react";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";
import { Header } from "./Header";
import type { LayoutProps } from "./Layout.types";
import { Sidebar } from "./Sidebar";
import { StatusLine } from "./StatusLine";

/** Dev-only error-injection banner. The guard is inline (not a shared const)
 * so production builds fold it and drop the mock scenario handling below.
 * (Belt and braces: without mock UI state the session can never hold the
 * error scenario in a production build either.) */
function MockErrorBanner(): ReactNode {
  const scenario = useSession((state) => state.scenario);
  const { theme, color } = useTheme();
  if (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) {
    if (scenario === "error") {
      const tokens = theme.tokens;
      return (
        <box backgroundColor={color(tokens.danger)} paddingLeft={1} height={1} flexShrink={0}>
          <text fg={color(tokens.bg)}>{"mock error injection (POS_MOCK_SCENARIO=error)"}</text>
        </box>
      );
    }
  }
  return null;
}

export function Layout(props: LayoutProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  // The brand cell tracks the sidebar column below it: absent when the
  // sidebar is hidden, 2 columns over the 2-character rail, else full.
  const sideWidth = props.sidebarHidden ? 0 : props.sidebarRail ? 2 : 18;

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={color(tokens.bg)}>
      <box flexDirection="row" height={1} flexShrink={0}>
        {sideWidth === 0 ? null : (
          <box
            backgroundColor={color(tokens.sidebarBg)}
            width={sideWidth}
            paddingLeft={props.sidebarRail ? 0 : 1}
            flexShrink={0}
          >
            <text fg={color(tokens.fg)}>{props.sidebarRail ? "P" : "Personal OS"}</text>
          </box>
        )}
        <Header screen={props.screen} />
      </box>
      <MockErrorBanner />
      <box flexDirection="row" flexGrow={1}>
        {props.sidebarHidden ? null : <Sidebar screen={props.screen} rail={props.sidebarRail} />}
        <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
          {props.children}
        </box>
      </box>
      <StatusLine />
    </box>
  );
}

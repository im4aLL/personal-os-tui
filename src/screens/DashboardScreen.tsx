import type { KeyEvent } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { screenHint } from "../commands/registry";
import { TodoForm } from "../components/todos/TodoForm";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Skeleton } from "../components/ui/Skeleton";
import { useKeyboardScope } from "../hooks/useKeyboardScope";
import { useTodoForm } from "../hooks/useTodoForm";
import { getProjectCompletion } from "../lib/project-progress";
import type { Link, Note, Project, Todo, WorkLog } from "../repos/types";
import { useDashboard } from "../store/dashboard";
import { useLinks } from "../store/links";
import { useNotes } from "../store/notes";
import { useProjectsStore } from "../store/projects";
import { useSession } from "../store/session";
import { useTodos } from "../store/todos";
import { useUi } from "../store/ui";
import type { Screen } from "../store/ui.types";
import { useWorkLogs } from "../store/workLogs";
import { useTheme } from "../theme/ThemeProvider";
import {
  dashboardNow,
  formatLongDate,
  mondayOfWeekISO,
  relativeTime,
  timeOfDayGreeting,
  todayISO,
} from "../utils/date";
import { operationError, RETRY_SUFFIX } from "../utils/error";
import { rowMarker } from "../utils/marker";
import { isReadOnlyRow, rowClickHandler, wheelDelta } from "../utils/mouse";
import { noteDisplayTitle } from "../utils/notes";
import { truncate } from "../utils/text";
import { windowSlice } from "../utils/window";
import type { ActivityItem, ActivityKind, DashboardFocus, StatCard } from "./DashboardScreen.types";

const WIDE_MIN = 100;
const HEADER_ROWS = 2;
// A stat card is a bordered box: top border, one value row, bottom border.
const STAT_CARD_ROWS = 3;
// Panel chrome is the rows a panel spends on framing rather than content: a
// full box costs a top and bottom border, a stacked top-rule panel costs one.
const BOX_PANEL_CHROME_ROWS = 2;
const RULE_PANEL_CHROME_ROWS = 1;
// A panel needs its chrome plus one content row before it is worth drawing.
const BOX_PANEL_MIN_ROWS = BOX_PANEL_CHROME_ROWS + 1;
const RULE_PANEL_MIN_ROWS = RULE_PANEL_CHROME_ROWS + 1;
const FOOTER_ROWS = 1;
const PROJECT_ROWS = 2;
const FOCUS_CAP = 6;
const ACTIVITY_CAP = 7;
// Fixed-width trailing columns keep list rows aligned into stable columns
// instead of drifting with each title's length.
const PRIORITY_COL = 6;
const DUE_COL = 7;
const KIND_COL = 8;
const TIME_COL = 9;
const DETAIL_COL = 14;
const DONE_COL = 5;
const HINT = screenHint("dashboard");
const FOCUS_TARGETS: DashboardFocus[] = ["stats", "focus", "projects", "in-progress", "activity"];

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, length - 1));
}

/** Left-pad with spaces to a minimum width; longer text is left untouched. */
function padStart(text: string, width: number): string {
  return text.length >= width ? text : text.padStart(width);
}

/** Right-pad with spaces to a minimum width; longer text is left untouched. */
function padEnd(text: string, width: number): string {
  return text.length >= width ? text : text.padEnd(width);
}

/** Split `total` rows across panels by weight, guaranteeing each panel at least
 * `min` rows (the minimum a panel needs to draw its chrome plus a content row)
 * whenever the total can cover it. Predictable: the largest panel absorbs the
 * rounding remainder and donates rows to any panel below the floor. The result
 * never sums above `total`; any panel the total cannot cover gets a 0 budget
 * and is skipped by the caller. */
function allocateRows(total: number, weights: number[], min: number): number[] {
  if (total <= 0) {
    return weights.map(() => 0);
  }
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  const rows = weights.map((weight) => Math.floor((total * weight) / sum));
  let largest = 0;
  for (let i = 1; i < rows.length; i++) {
    if (weights[i] > weights[largest]) {
      largest = i;
    }
  }
  rows[largest] += total - rows.reduce((acc, row) => acc + row, 0);
  for (let i = 0; i < rows.length; i++) {
    while (rows[i] < min) {
      const donor = rows.indexOf(Math.max(...rows));
      if (rows[donor] <= min) {
        break;
      }
      rows[donor] -= 1;
      rows[i] += 1;
    }
  }
  return rows;
}

function screenForKind(kind: ActivityKind): Screen {
  if (kind === "note") {
    return "notes";
  }
  if (kind === "link") {
    return "links";
  }
  return "work-log";
}

/** A fixed-height panel. When `variant` is `box` the title is embedded in a
 * full border (the wide 2x2 grid). When it is `rule`, only the top rule is
 * drawn (the stacked narrow layout), which saves a row per panel. The caller
 * renders exactly `height - chrome` content rows so a panel can never overflow
 * its budget, and the chrome carries the focus state. */
function Panel(props: {
  title: string;
  focused: boolean;
  height: number;
  variant: "box" | "rule";
  children: ReactNode;
}): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  return (
    <box
      flexDirection="column"
      height={props.height}
      flexShrink={0}
      border={props.variant === "box" ? true : ["top"]}
      borderStyle="single"
      borderColor={color(props.focused ? tokens.borderFocus : tokens.borderMuted)}
      title={` ${props.title} `}
      titleColor={color(props.focused ? tokens.accent : tokens.fgMuted)}
      paddingLeft={1}
      paddingRight={1}
    >
      {props.children}
    </box>
  );
}

/** Skeleton bar widths as a fraction of the panel width, matching the old
 * dashboard placeholder proportions so the shared `Skeleton` keeps its shape. */
const SKELETON_FRACTIONS = [0.9, 0.6, 0.8, 0.45, 0.7];

function skeletonWidths(width: number): number[] {
  return SKELETON_FRACTIONS.map((fraction) => Math.max(4, Math.floor(width * fraction)));
}

// `RETRY_MARKER` drops the parens only for sub-~17-cell widths, where even the
// suffix cannot fit; every wider panel shows the parenthesized `RETRY_SUFFIX`.
const RETRY_MARKER = "r to retry";

function ErrorLine(props: { message: string; width: number }): ReactNode {
  const { theme, color } = useTheme();
  const width = Math.max(8, props.width);
  // Keep the retry hint visible: truncate only the message so the suffix
  // always fits. When there is not even room for the suffix, fall back to a
  // short marker instead of letting truncation eat the hint from the tail.
  const text =
    width >= RETRY_SUFFIX.length
      ? truncate(props.message, width - RETRY_SUFFIX.length) + RETRY_SUFFIX
      : truncate(RETRY_MARKER, width);
  return (
    <box height={1} flexShrink={0}>
      <text fg={color(theme.tokens.danger)} wrapMode="none">
        {text}
      </text>
    </box>
  );
}

/** Deliberate compact-card exception: dashboard panels render a single muted
 * line rather than the centered `EmptyState`, because each card is sized to a
 * tight row budget and a centered block would fight the row layout. Voice still
 * matches `EmptyState` (title-only, no trailing period). */
function MutedLine(props: { text: string; width: number }): ReactNode {
  const { theme, color } = useTheme();
  return (
    <box height={1} flexShrink={0}>
      <text fg={color(theme.tokens.fgSubtle)} wrapMode="none">
        {truncate(props.text, Math.max(8, props.width))}
      </text>
    </box>
  );
}

export function DashboardScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width, height } = useTerminalDimensions();

  const todos = useTodos((state) => state.todos);
  const notes = useNotes((state) => state.notes);
  const links = useLinks((state) => state.links);
  const linksTotal = useLinks((state) => state.total);
  const logs = useWorkLogs((state) => state.logs);
  const projects = useProjectsStore((state) => state.projects);
  const progress = useProjectsStore((state) => state.progress);
  const dashboardLoading = useDashboard((state) => state.loading);
  const dashboardError = useDashboard((state) => state.error);
  const counts = useDashboard((state) => state.counts);
  const scenario = useSession((state) => state.scenario);
  const latencyMs = useSession((state) => state.latencyMs);
  const sidebarCollapsed = useUi((state) => state.sidebarCollapsed);

  const todoForm = useTodoForm();

  const [focusTarget, setFocusTarget] = useState<DashboardFocus>("stats");
  const [statIndex, setStatIndex] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [projectIndex, setProjectIndex] = useState(0);
  const [inProgressIndex, setInProgressIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);

  // -- Loading ---------------------------------------------------------------

  useEffect(() => {
    void scenario;
    void latencyMs;
    void useDashboard.getState().loadDashboard();
  }, [scenario, latencyMs]);

  // A focused form defers the global plain-character bindings so typing reaches
  // the field; this screen's scope still runs first for Tab/Esc/Enter.
  const formOpen = todoForm.form.open;
  useEffect(() => {
    useUi.getState().setFocusedField(formOpen ? "dashboard-field" : null);
    return () => {
      useUi.getState().setFocusedField(null);
    };
  }, [formOpen]);

  // -- Derivations -----------------------------------------------------------

  const now = dashboardNow();
  const today = todayISO();
  const weekStart = mondayOfWeekISO(0);

  const overdueCount = todos.filter(
    (todo) => todo.status !== "completed" && todo.dueDate !== null && todo.dueDate < today,
  ).length;
  const dueTodayCount = todos.filter(
    (todo) => todo.status !== "completed" && todo.dueDate === today,
  ).length;

  const focusItems = useMemo(
    () =>
      todos
        .filter(
          (todo) => todo.status !== "completed" && todo.dueDate !== null && todo.dueDate <= today,
        )
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
        .slice(0, FOCUS_CAP),
    [todos, today],
  );

  const inProgressItems = useMemo(
    () => todos.filter((todo) => todo.status === "in-progress").slice(0, FOCUS_CAP),
    [todos],
  );

  const inProgressCount = todos.filter((todo) => todo.status === "in-progress").length;
  // The snapshot's three aggregates are authoritative; before the first
  // success, fall back to the loaded lists (notes and work logs are unbounded).
  const notesCount = counts?.notes ?? notes.length;
  const linksCount = counts?.links ?? linksTotal ?? links.length;
  const loggedThisWeek =
    counts?.loggedThisWeek ??
    logs.filter((log) => log.startDate >= weekStart && log.startDate <= today).length;
  // A successful snapshot keeps the previous data visible across a later
  // failure; before one exists, a failure shows the placeholder rather than a
  // misleading 0.
  const hasSnapshot = counts !== null;
  const cardLoading = dashboardLoading;
  const cardError = !dashboardLoading && dashboardError !== null && !hasSnapshot;
  const cardValue = (value: number): number | null => (cardLoading || cardError ? null : value);

  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...notes.map((note: Note) => ({
        key: `note-${note.id}`,
        kind: "note" as const,
        title: noteDisplayTitle(note),
        meta: "Note",
        date: note.updatedAt,
      })),
      ...links.map((link: Link) => ({
        key: `link-${link.id}`,
        kind: "link" as const,
        title: link.title === "" ? link.url : link.title,
        meta: "Link",
        date: link.createdAt,
      })),
      ...logs.map((log: WorkLog) => ({
        key: `work-${log.id}`,
        kind: "work" as const,
        title: log.title,
        meta: "Work log",
        date: log.createdAt,
      })),
    ];
    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, ACTIVITY_CAP);
  }, [notes, links, logs]);

  const statCards: StatCard[] = [
    {
      label: "In Progress",
      target: "todo",
      value: cardValue(inProgressCount),
      loading: cardLoading,
      error: cardError,
    },
    {
      label: "Notes",
      target: "notes",
      value: cardValue(notesCount),
      loading: cardLoading,
      error: cardError,
    },
    {
      label: "Save Links",
      target: "links",
      value: cardValue(linksCount),
      loading: cardLoading,
      error: cardError,
    },
    {
      label: "This Week",
      target: "work-log",
      value: cardValue(loggedThisWeek),
      loading: cardLoading,
      error: cardError,
    },
  ];

  // -- Geometry --------------------------------------------------------------

  const sideWidth = width < 60 ? 0 : sidebarCollapsed || width < 80 ? 2 : 22;
  const contentWidth = Math.max(24, width - sideWidth - 2);
  const wide = width >= WIDE_MIN;
  const statRows = wide ? STAT_CARD_ROWS : STAT_CARD_ROWS * 2 + 1;
  // The content area is the terminal minus the app header row and the status
  // line, plus the dev-only mock error banner when it is shown (it occupies a
  // full row above the screen). Derive from the real height so nothing is
  // pushed below the viewport on a short terminal; the footer is only kept when
  // a body row survives it.
  const mockBannerRows =
    (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) && scenario === "error"
      ? 1
      : 0;
  const viewportRows = Math.max(0, height - 2 - mockBannerRows);
  // One extra header row while the batch error is shown, so the error line
  // never pushes panel content past the viewport.
  const headerRows = dashboardError !== null ? HEADER_ROWS + 1 : HEADER_ROWS;
  const fixedRows = headerRows + statRows;
  const showFooter = viewportRows - fixedRows >= FOOTER_ROWS + 1;
  const bodyRows = Math.max(0, viewportRows - fixedRows - (showFooter ? FOOTER_ROWS : 0));
  const columnWidth = wide ? Math.max(24, Math.floor((contentWidth - 1) / 2)) : contentWidth;
  // A full-box panel loses a border and a padding cell on each side; a stacked
  // top-rule panel loses only the padding. Rows budget one cell less than that
  // so an exact-width row can never push a renderable to wrap.
  const panelVariant: "box" | "rule" = wide ? "box" : "rule";
  const panelChromeRows = panelVariant === "box" ? BOX_PANEL_CHROME_ROWS : RULE_PANEL_CHROME_ROWS;
  const panelMinRows = panelVariant === "box" ? BOX_PANEL_MIN_ROWS : RULE_PANEL_MIN_ROWS;
  const panelInnerWidth = Math.max(8, columnWidth - (panelVariant === "box" ? 4 : 2));
  const rowWidth = Math.max(8, panelInnerWidth - 1);
  const cardWidth = wide
    ? Math.max(8, Math.floor((contentWidth - 3) / 4))
    : Math.max(8, Math.floor((contentWidth - 1) / 2));
  // Leave two cells of slack: an embedded border title needs a border cell on
  // each side, and an exact-width title is dropped by the renderer.
  const cardInnerWidth = Math.max(4, cardWidth - 6);

  let topRows = 0;
  let bottomRows = 0;
  let focusPanelRows = 0;
  let projectPanelRows = 0;
  let inProgressPanelRows = 0;
  let activityPanelRows = 0;
  if (wide) {
    // Size both panel rows to what they actually hold so a tall terminal shows
    // content-sized cards with the leftover as background, instead of stretching
    // the list panels into large empty frames. The panels still shrink to share
    // a short terminal, and any overflow scrolls through `windowSlice`.
    const placeholder = dashboardError !== null && !hasSnapshot;
    const contentRows = (count: number, cap: number): number =>
      dashboardLoading ? cap : placeholder ? 1 : Math.max(1, Math.min(count, cap));
    const topContent = Math.max(
      contentRows(focusItems.length, FOCUS_CAP),
      contentRows(inProgressItems.length, FOCUS_CAP),
    );
    const projectContent = placeholder
      ? 1
      : projects.length === 0
        ? 1
        : projects.length * PROJECT_ROWS;
    const bottomContent = Math.max(projectContent, contentRows(activity.length, ACTIVITY_CAP));
    const desiredTop = topContent + panelChromeRows;
    const desiredBottom = bottomContent + panelChromeRows;
    if (bodyRows < panelMinRows * 2) {
      topRows = Math.min(bodyRows, Math.max(0, Math.floor(bodyRows / 2)));
      bottomRows = Math.max(0, bodyRows - topRows);
    } else {
      topRows = Math.max(panelMinRows, Math.min(desiredTop, bodyRows - panelMinRows));
      bottomRows = Math.max(panelMinRows, Math.min(desiredBottom, bodyRows - topRows));
    }
  } else {
    [focusPanelRows, projectPanelRows, inProgressPanelRows, activityPanelRows] = allocateRows(
      bodyRows,
      [2, 3, 2, 3],
      panelMinRows,
    );
  }

  // -- Selections ------------------------------------------------------------

  const statSel = clampIndex(statIndex, statCards.length);
  const focusSel = clampIndex(focusIndex, focusItems.length);
  const projectSel = clampIndex(projectIndex, projects.length);
  const inProgressSel = clampIndex(inProgressIndex, inProgressItems.length);
  const activitySel = clampIndex(activityIndex, activity.length);

  const selectedFocusId = focusTarget === "focus" ? focusItems[focusSel]?.id : undefined;
  const selectedProjectId = focusTarget === "projects" ? projects[projectSel]?.id : undefined;
  const selectedInProgressId =
    focusTarget === "in-progress" ? inProgressItems[inProgressSel]?.id : undefined;
  const selectedActivityKey = focusTarget === "activity" ? activity[activitySel]?.key : undefined;

  // -- Panel content ---------------------------------------------------------

  function focusRows(rows: number): ReactNode {
    if (rows <= 0) {
      return null;
    }
    if (dashboardLoading) {
      return <Skeleton lines={rows} widths={skeletonWidths(panelInnerWidth)} />;
    }
    if (dashboardError !== null && !hasSnapshot) {
      return (
        <ErrorLine
          message={operationError("Dashboard could not load", dashboardError)}
          width={panelInnerWidth}
        />
      );
    }
    if (focusItems.length === 0) {
      return <MutedLine text="Nothing due, you are all caught up" width={panelInnerWidth} />;
    }
    return <>{windowSlice(focusItems, focusSel, rows).map((todo) => renderFocusRow(todo))}</>;
  }

  function renderFocusRow(todo: Todo): ReactNode {
    const overdue = todo.dueDate !== null && todo.dueDate < today;
    const label = overdue ? "Overdue" : "Today";
    const priorityText = todo.priority ?? "";
    const priorityColor =
      todo.priority === "high"
        ? tokens.priorityHigh
        : todo.priority === "medium"
          ? tokens.priorityMedium
          : tokens.priorityLow;
    const titleRoom = Math.max(4, rowWidth - 2 - 1 - PRIORITY_COL - 1 - DUE_COL);
    const selected = todo.id === selectedFocusId;
    const index = focusItems.findIndex((entry) => entry.id === todo.id);
    return (
      <box
        key={todo.id}
        height={1}
        flexShrink={0}
        backgroundColor={selected ? color(tokens.bgAlt) : undefined}
        onMouseDown={rowClickHandler(
          todo.id,
          () => {
            setFocusTarget("focus");
            setFocusIndex(Math.max(0, index));
          },
          () => {
            setFocusTarget("focus");
            setFocusIndex(Math.max(0, index));
            todoForm.openEdit(todo);
          },
        )}
      >
        <text wrapMode="none">
          <span fg={color(selected ? tokens.accent : tokens.fg)}>
            {`${rowMarker(selected)}${padEnd(truncate(todo.title, titleRoom), titleRoom)} `}
          </span>
          <span fg={color(todo.priority !== null ? priorityColor : tokens.fgSubtle)}>
            {padStart(priorityText, PRIORITY_COL)}
          </span>
          <span fg={color(overdue ? tokens.danger : tokens.fgMuted)}>
            {` ${padStart(label, DUE_COL)}`}
          </span>
        </text>
      </box>
    );
  }

  function projectRows(rows: number): ReactNode {
    if (rows <= 0) {
      return null;
    }
    if (dashboardLoading) {
      return (
        <Skeleton
          lines={Math.max(0, Math.floor(rows / PROJECT_ROWS) * PROJECT_ROWS)}
          widths={skeletonWidths(panelInnerWidth)}
        />
      );
    }
    if (dashboardError !== null && !hasSnapshot) {
      return (
        <ErrorLine
          message={operationError("Dashboard could not load", dashboardError)}
          width={panelInnerWidth}
        />
      );
    }
    if (projects.length === 0) {
      return <MutedLine text="No projects yet" width={panelInnerWidth} />;
    }
    const visibleCount = Math.max(0, Math.floor(rows / PROJECT_ROWS));
    return (
      <>
        {windowSlice(projects, projectSel, visibleCount).map((project) =>
          renderProjectRow(project),
        )}
      </>
    );
  }

  function renderProjectRow(project: Project): ReactNode {
    const completion = getProjectCompletion(project, progress[project.id]);
    const selected = project.id === selectedProjectId;
    const nameRoom = Math.max(6, rowWidth - 2 - DONE_COL - DETAIL_COL);
    const rowFg = completion.isDone ? tokens.fgSubtle : tokens.fg;
    // The bar is indented two cells to sit under the project name; the trailing
    // percentage occupies a fixed 5-cell field so every bar ends flush right.
    const barWidth = Math.max(4, rowWidth - 2 - 5);
    const index = projects.findIndex((entry) => entry.id === project.id);
    return (
      <box
        key={project.id}
        height={PROJECT_ROWS}
        flexShrink={0}
        flexDirection="column"
        backgroundColor={selected ? color(tokens.bgAlt) : undefined}
        onMouseDown={rowClickHandler(
          project.id,
          () => {
            setFocusTarget("projects");
            setProjectIndex(Math.max(0, index));
          },
          () => {
            setFocusTarget("projects");
            setProjectIndex(Math.max(0, index));
            void useProjectsStore.getState().selectProject(project.id);
            useUi.getState().setScreen("projects");
          },
        )}
      >
        <text wrapMode="none">
          <span fg={color(selected ? tokens.accent : rowFg)}>
            {`${rowMarker(selected)}${padEnd(truncate(project.name, nameRoom), nameRoom)}`}
          </span>
          <span fg={color(tokens.success)}>{completion.isDone ? "Done " : "     "}</span>
          <span fg={color(completion.isDone ? tokens.fgSubtle : tokens.fgMuted)}>
            {padStart(completion.detail, DETAIL_COL)}
          </span>
        </text>
        <box paddingLeft={2} flexShrink={0}>
          <ProgressBar
            ratio={completion.pct / 100}
            width={barWidth}
            label={padStart(`${completion.pct}%`, 4)}
          />
        </box>
      </box>
    );
  }

  function inProgressRows(rows: number): ReactNode {
    if (rows <= 0) {
      return null;
    }
    if (dashboardLoading) {
      return <Skeleton lines={rows} widths={skeletonWidths(panelInnerWidth)} />;
    }
    if (dashboardError !== null && !hasSnapshot) {
      return (
        <ErrorLine
          message={operationError("Dashboard could not load", dashboardError)}
          width={panelInnerWidth}
        />
      );
    }
    if (inProgressItems.length === 0) {
      return <MutedLine text="Nothing in progress right now" width={panelInnerWidth} />;
    }
    return (
      <>
        {windowSlice(inProgressItems, inProgressSel, rows).map((todo) => {
          const selected = todo.id === selectedInProgressId;
          const priorityText = todo.priority ?? "";
          const priorityColor =
            todo.priority === "high"
              ? tokens.priorityHigh
              : todo.priority === "medium"
                ? tokens.priorityMedium
                : tokens.priorityLow;
          const titleRoom = Math.max(4, rowWidth - 2 - 1 - PRIORITY_COL);
          const index = inProgressItems.findIndex((entry) => entry.id === todo.id);
          return (
            <box
              key={todo.id}
              height={1}
              flexShrink={0}
              backgroundColor={selected ? color(tokens.bgAlt) : undefined}
              onMouseDown={rowClickHandler(
                todo.id,
                () => {
                  setFocusTarget("in-progress");
                  setInProgressIndex(Math.max(0, index));
                },
                () => {
                  setFocusTarget("in-progress");
                  setInProgressIndex(Math.max(0, index));
                  todoForm.openEdit(todo);
                },
              )}
            >
              <text wrapMode="none">
                <span fg={color(selected ? tokens.accent : tokens.fg)}>
                  {`${rowMarker(selected)}${padEnd(truncate(todo.title, titleRoom), titleRoom)} `}
                </span>
                <span fg={color(todo.priority !== null ? priorityColor : tokens.fgSubtle)}>
                  {padStart(priorityText, PRIORITY_COL)}
                </span>
              </text>
            </box>
          );
        })}
      </>
    );
  }

  function activityRows(rows: number): ReactNode {
    if (rows <= 0) {
      return null;
    }
    if (dashboardLoading) {
      return <Skeleton lines={rows} widths={skeletonWidths(panelInnerWidth)} />;
    }
    if (dashboardError !== null && !hasSnapshot) {
      return (
        <ErrorLine
          message={operationError("Dashboard could not load", dashboardError)}
          width={panelInnerWidth}
        />
      );
    }
    if (activity.length === 0) {
      return <MutedLine text="No activity yet" width={panelInnerWidth} />;
    }
    const titleRoom = Math.max(4, rowWidth - 2 - 1 - KIND_COL - 1 - TIME_COL);
    return (
      <>
        {windowSlice(activity, activitySel, rows).map((item) => {
          const selected = item.key === selectedActivityKey;
          const time = relativeTime(item.date, now);
          const index = activity.findIndex((entry) => entry.key === item.key);
          return (
            <box
              key={item.key}
              height={1}
              flexShrink={0}
              backgroundColor={selected ? color(tokens.bgAlt) : undefined}
              onMouseDown={rowClickHandler(
                item.key,
                () => {
                  setFocusTarget("activity");
                  setActivityIndex(Math.max(0, index));
                },
                () => {
                  setFocusTarget("activity");
                  setActivityIndex(Math.max(0, index));
                  useUi.getState().setScreen(screenForKind(item.kind));
                },
              )}
            >
              <text wrapMode="none">
                <span fg={color(selected ? tokens.accent : tokens.fg)}>
                  {`${rowMarker(selected)}${padEnd(truncate(item.title, titleRoom), titleRoom)} `}
                </span>
                <span fg={color(tokens.fgSubtle)}>{padStart(item.meta, KIND_COL)}</span>
                <span fg={color(tokens.fgMuted)}>{` ${padStart(time, TIME_COL)}`}</span>
              </text>
            </box>
          );
        })}
      </>
    );
  }

  function renderPanel(
    title: string,
    target: DashboardFocus,
    panelHeight: number,
    content: ReactNode,
  ): ReactNode {
    // A panel below the minimum cannot show its chrome and a content row, so
    // skip it entirely rather than emitting a clipped fixed-height child.
    if (panelHeight < panelMinRows) {
      return null;
    }
    return (
      <Panel
        key={target}
        title={truncate(title, Math.max(4, columnWidth - 4))}
        focused={focusTarget === target}
        height={panelHeight}
        variant={panelVariant}
      >
        {content}
      </Panel>
    );
  }

  // -- Stats -----------------------------------------------------------------

  function renderStatCard(card: StatCard, index: number): ReactNode {
    const active = focusTarget === "stats" && index === statSel;
    // Second compact-card exception: a stat is a single value cell, so it uses
    // the same block glyph `Skeleton` draws (not a multi-line Skeleton bar,
    // which cannot fit one value row). Empty/loading shape is intentionally
    // different from the list panels.
    const valueText = card.error
      ? "!"
      : card.loading || card.value === null
        ? "█"
        : String(card.value);
    const valueColor = card.error
      ? tokens.danger
      : card.loading || card.value === null
        ? tokens.fgSubtle
        : active
          ? tokens.accent
          : tokens.fg;
    return (
      <box
        key={card.label}
        flexGrow={1}
        flexBasis={0}
        height={STAT_CARD_ROWS}
        flexDirection="column"
        border
        borderStyle="single"
        borderColor={color(active ? tokens.borderFocus : tokens.borderMuted)}
        title={` ${truncate(card.label, cardInnerWidth)} `}
        titleColor={color(active ? tokens.accent : tokens.fgMuted)}
        paddingLeft={1}
        paddingRight={1}
        onMouseDown={rowClickHandler(
          `stat-${card.label}`,
          () => {
            setFocusTarget("stats");
            setStatIndex(index);
          },
          () => {
            setFocusTarget("stats");
            setStatIndex(index);
            useUi.getState().setScreen(card.target);
          },
        )}
      >
        <text fg={color(valueColor)} wrapMode="none">
          {valueText}
        </text>
      </box>
    );
  }

  function renderStats(): ReactNode {
    if (wide) {
      return (
        <box flexDirection="row" height={STAT_CARD_ROWS} flexShrink={0} gap={1}>
          {statCards.map((card, index) => renderStatCard(card, index))}
        </box>
      );
    }
    return (
      <box flexDirection="column" flexShrink={0} rowGap={1}>
        <box flexDirection="row" height={STAT_CARD_ROWS} gap={1}>
          {statCards.slice(0, 2).map((card, index) => renderStatCard(card, index))}
        </box>
        <box flexDirection="row" height={STAT_CARD_ROWS} gap={1}>
          {statCards.slice(2).map((card, index) => renderStatCard(card, index + 2))}
        </box>
      </box>
    );
  }

  // -- Header ----------------------------------------------------------------

  const dateSegments: { text: string; danger?: boolean }[] = [{ text: formatLongDate(now) }];
  if (overdueCount > 0) {
    dateSegments.push({ text: `${overdueCount} overdue`, danger: true });
  }
  if (dueTodayCount > 0) {
    dateSegments.push({ text: `${dueTodayCount} due today` });
  }
  const dateSeparator = "  |  ";
  const dateRoom = Math.max(8, contentWidth - 8);
  const fittedSegments: { text: string; danger?: boolean }[] = [
    { text: truncate(dateSegments[0].text, dateRoom) },
  ];
  let usedRoom = fittedSegments[0].text.length;
  for (const segment of dateSegments.slice(1)) {
    const add = dateSeparator.length + segment.text.length;
    if (usedRoom + add > dateRoom) {
      break;
    }
    usedRoom += add;
    fittedSegments.push(segment);
  }

  // -- Actions ---------------------------------------------------------------

  function reloadAll(): void {
    void useDashboard.getState().loadDashboard();
  }

  function cycleFocus(delta: number): void {
    const index = FOCUS_TARGETS.indexOf(focusTarget);
    setFocusTarget(FOCUS_TARGETS[(index + delta + FOCUS_TARGETS.length) % FOCUS_TARGETS.length]);
  }

  function moveSelection(delta: number): void {
    if (focusTarget === "stats") {
      setStatIndex((current) => clampIndex(current + delta, statCards.length));
      return;
    }
    if (focusTarget === "focus") {
      setFocusIndex((current) => clampIndex(current + delta, focusItems.length));
      return;
    }
    if (focusTarget === "projects") {
      setProjectIndex((current) => clampIndex(current + delta, projects.length));
      return;
    }
    if (focusTarget === "in-progress") {
      setInProgressIndex((current) => clampIndex(current + delta, inProgressItems.length));
      return;
    }
    setActivityIndex((current) => clampIndex(current + delta, activity.length));
  }

  function activate(): void {
    if (focusTarget === "stats") {
      useUi.getState().setScreen(statCards[statSel].target);
      return;
    }
    if (focusTarget === "focus") {
      const todo = focusItems[focusSel];
      if (todo !== undefined && !isReadOnlyRow(todo.id)) {
        todoForm.openEdit(todo);
      }
      return;
    }
    if (focusTarget === "in-progress") {
      const todo = inProgressItems[inProgressSel];
      if (todo !== undefined && !isReadOnlyRow(todo.id)) {
        todoForm.openEdit(todo);
      }
      return;
    }
    if (focusTarget === "projects") {
      const project = projects[projectSel];
      if (project !== undefined) {
        void useProjectsStore.getState().selectProject(project.id);
        useUi.getState().setScreen("projects");
      }
      return;
    }
    const item = activity[activitySel];
    if (item !== undefined) {
      useUi.getState().setScreen(screenForKind(item.kind));
    }
  }

  // -- Keyboard scope --------------------------------------------------------

  function handleKey(key: KeyEvent): boolean {
    const name = key.name;
    const meta = key.meta === true || key.option === true;
    const plainChar = (char: string): boolean =>
      !key.ctrl && !meta && key.shift !== true && name === char;

    if (todoForm.form.open) {
      if (name === "escape") {
        todoForm.close();
        return true;
      }
      if (key.ctrl && (name === "return" || name === "kpenter" || name === "linefeed")) {
        void todoForm.submit();
        return true;
      }
      if (name === "tab") {
        todoForm.cycleField(key.shift ? -1 : 1);
        return true;
      }
      if (name === "return") {
        if (todoForm.form.field === "description") {
          return false;
        }
        void todoForm.submit();
        return true;
      }
      if (key.ctrl && (name === "d" || name === "u" || name === "p")) {
        return true;
      }
      return false;
    }

    if (key.ctrl || meta) {
      return false;
    }

    if (plainChar("n")) {
      todoForm.openCreate("todo");
      return true;
    }
    if (plainChar("r")) {
      reloadAll();
      return true;
    }
    if (name === "escape") {
      setFocusTarget("stats");
      setStatIndex(0);
      return true;
    }
    if (name === "1" || name === "2" || name === "3" || name === "4") {
      setFocusTarget("stats");
      setStatIndex(Number(name) - 1);
      return true;
    }
    if (name === "tab") {
      cycleFocus(1);
      return true;
    }
    if (name === "backtab") {
      cycleFocus(-1);
      return true;
    }
    if (plainChar("j") || name === "down") {
      moveSelection(1);
      return true;
    }
    if (plainChar("k") || name === "up") {
      moveSelection(-1);
      return true;
    }
    if (plainChar("l") || name === "right") {
      if (focusTarget === "stats") {
        moveSelection(1);
        return true;
      }
      return false;
    }
    if (plainChar("h") || name === "left") {
      if (focusTarget === "stats") {
        moveSelection(-1);
        return true;
      }
      return false;
    }
    if (name === "return") {
      activate();
      return true;
    }
    return false;
  }

  useKeyboardScope(handleKey);

  // -- Render ----------------------------------------------------------------

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      minHeight={0}
      backgroundColor={color(tokens.bg)}
      onMouseScroll={(event) => {
        const delta = wheelDelta(event);
        if (delta !== 0) {
          moveSelection(delta);
        }
      }}
    >
      <box flexDirection="column" height={headerRows} flexShrink={0}>
        <box height={1} flexShrink={0}>
          <text fg={color(tokens.fg)} wrapMode="none">
            {timeOfDayGreeting(now)}
          </text>
        </box>
        <box flexDirection="row" height={1} flexShrink={0}>
          <box flexGrow={1}>
            <text wrapMode="none">
              {fittedSegments.map((segment, index) => (
                <span
                  key={segment.text}
                  fg={color(segment.danger === true ? tokens.danger : tokens.fgMuted)}
                >
                  {index === 0 ? segment.text : `${dateSeparator}${segment.text}`}
                </span>
              ))}
            </text>
          </box>
          <text fg={color(tokens.accent)} wrapMode="none">
            {"n  add"}
          </text>
        </box>
        {dashboardError !== null ? (
          <ErrorLine
            message={operationError("Dashboard could not load", dashboardError)}
            width={contentWidth}
          />
        ) : null}
      </box>

      {renderStats()}

      {wide ? (
        <box flexDirection="row" flexGrow={1} minHeight={0} gap={1}>
          <box flexDirection="column" flexGrow={1} flexBasis={0} minHeight={0}>
            {renderPanel("Today & Overdue", "focus", topRows, focusRows(topRows - panelChromeRows))}
            {renderPanel(
              "Active Projects",
              "projects",
              bottomRows,
              projectRows(bottomRows - panelChromeRows),
            )}
          </box>
          <box flexDirection="column" flexGrow={1} flexBasis={0} minHeight={0}>
            {renderPanel(
              "In Progress",
              "in-progress",
              topRows,
              inProgressRows(topRows - panelChromeRows),
            )}
            {renderPanel(
              "Recent Activity",
              "activity",
              bottomRows,
              activityRows(bottomRows - panelChromeRows),
            )}
          </box>
        </box>
      ) : (
        <box flexDirection="column" flexGrow={1} minHeight={0}>
          {renderPanel(
            "Today & Overdue",
            "focus",
            focusPanelRows,
            focusRows(focusPanelRows - panelChromeRows),
          )}
          {renderPanel(
            "Active Projects",
            "projects",
            projectPanelRows,
            projectRows(projectPanelRows - panelChromeRows),
          )}
          {renderPanel(
            "In Progress",
            "in-progress",
            inProgressPanelRows,
            inProgressRows(inProgressPanelRows - panelChromeRows),
          )}
          {renderPanel(
            "Recent Activity",
            "activity",
            activityPanelRows,
            activityRows(activityPanelRows - panelChromeRows),
          )}
        </box>
      )}

      {showFooter ? (
        <box height={FOOTER_ROWS} flexShrink={0}>
          <text fg={color(tokens.fgSubtle)} wrapMode="none">
            {truncate(HINT, contentWidth)}
          </text>
        </box>
      ) : null}

      {todoForm.form.open ? (
        <TodoForm
          editing={todoForm.form.editing}
          focusedField={todoForm.form.field}
          values={todoForm.form.values}
          error={todoForm.form.error}
          saving={todoForm.form.saving}
          descriptionRef={todoForm.descriptionRef}
          onPatch={todoForm.patch}
          onDescriptionChange={todoForm.clearError}
        />
      ) : null}
    </box>
  );
}

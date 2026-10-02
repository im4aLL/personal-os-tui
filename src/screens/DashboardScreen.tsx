import type { KeyEvent } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { TodoForm } from "../components/todos/TodoForm";
import { ProgressBar } from "../components/ui/ProgressBar";
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
import { noteDisplayTitle } from "../utils/notes";
import { truncate } from "../utils/text";
import { windowSlice } from "../utils/window";
import type { ActivityItem, ActivityKind, DashboardFocus, StatCard } from "./DashboardScreen.types";

const WIDE_MIN = 100;
const HEADER_ROWS = 2;
const STAT_CARD_HEIGHT = 2;
const FOOTER_ROWS = 1;
const PROJECT_ROWS = 2;
const FOCUS_CAP = 6;
const ACTIVITY_CAP = 7;
const HINT = "Tab panel  j/k move  1-4 card  Enter open  n add  r refresh";
const FOCUS_TARGETS: DashboardFocus[] = ["stats", "focus", "projects", "in-progress", "activity"];

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, length - 1));
}

/** Split `total` rows across panels by weight, guaranteeing each panel a title
 * row (budget 1) whenever the total can cover it. Predictable: the largest
 * panel absorbs the rounding remainder and donates rows to any panel below the
 * floor. The result never sums above `total`; any panel the total cannot cover
 * gets a 0 budget and is skipped by the caller. */
function allocateRows(total: number, weights: number[]): number[] {
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
    while (rows[i] < 1) {
      const donor = rows.indexOf(Math.max(...rows));
      if (rows[donor] <= 1) {
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

/** A fixed-height titled panel. The caller renders exactly
 * `height - 1` content rows so a panel can never overflow its budget. */
function Panel(props: {
  title: string;
  focused: boolean;
  height: number;
  children: ReactNode;
}): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  return (
    <box flexDirection="column" height={props.height} flexShrink={0}>
      <box height={1} flexShrink={0}>
        <text fg={color(props.focused ? tokens.accent : tokens.fgMuted)} wrapMode="none">
          {props.title}
        </text>
      </box>
      {props.children}
    </box>
  );
}

/** Exactly `rows` skeleton bars, sized as a fraction of `width`. */
function SkeletonRows(props: { rows: number; width: number }): ReactNode {
  const { theme, color } = useTheme();
  const fractions = [0.9, 0.6, 0.8, 0.45, 0.7];
  const count = Math.max(0, props.rows);
  const rows = Array.from({ length: count }, (_, index) => index);
  return (
    <>
      {rows.map((row) => (
        <box key={row} height={1} flexShrink={0}>
          <text fg={color(theme.tokens.bgHover)} wrapMode="none">
            {"█".repeat(Math.max(4, Math.floor(props.width * fractions[row % fractions.length])))}
          </text>
        </box>
      ))}
    </>
  );
}

const RETRY_SUFFIX = "  (r to retry)";
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
      label: "Logged this week",
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
  const statRows = wide ? STAT_CARD_HEIGHT : STAT_CARD_HEIGHT * 2;
  // The content area is the terminal minus the app header row and the status
  // line. Derive from the real height so nothing is pushed below the viewport
  // on a short terminal; the footer is only kept when a body row survives it.
  const viewportRows = Math.max(0, height - 2);
  // One extra header row while the batch error is shown, so the error line
  // never pushes panel content past the viewport.
  const headerRows = dashboardError !== null ? HEADER_ROWS + 1 : HEADER_ROWS;
  const fixedRows = headerRows + statRows;
  const showFooter = viewportRows - fixedRows >= FOOTER_ROWS + 1;
  const bodyRows = Math.max(0, viewportRows - fixedRows - (showFooter ? FOOTER_ROWS : 0));
  const columnWidth = wide ? Math.max(20, Math.floor((contentWidth - 1) / 2)) : contentWidth;
  const cardWidth = Math.max(
    4,
    wide ? Math.floor((contentWidth - 3) / 4) - 2 : Math.floor((contentWidth - 1) / 2) - 2,
  );
  const barWidth = Math.max(4, columnWidth - 8);

  let topRows = 0;
  let bottomRows = 0;
  let focusPanelRows = 0;
  let projectPanelRows = 0;
  let inProgressPanelRows = 0;
  let activityPanelRows = 0;
  if (wide) {
    // Shrink toward 0 on a short terminal; a 0-height panel is skipped below.
    topRows = Math.min(bodyRows, Math.max(0, Math.floor(bodyRows / 2)));
    bottomRows = Math.max(0, bodyRows - topRows);
  } else {
    [focusPanelRows, projectPanelRows, inProgressPanelRows, activityPanelRows] = allocateRows(
      bodyRows,
      [2, 3, 2, 3],
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
      return <SkeletonRows rows={rows} width={columnWidth} />;
    }
    if (dashboardError !== null && !hasSnapshot) {
      return <MutedLine text="Could not load" width={columnWidth} />;
    }
    if (focusItems.length === 0) {
      return <MutedLine text="Nothing due, you are all caught up" width={columnWidth} />;
    }
    return <>{windowSlice(focusItems, focusSel, rows).map((todo) => renderFocusRow(todo))}</>;
  }

  function renderFocusRow(todo: Todo): ReactNode {
    const overdue = todo.dueDate !== null && todo.dueDate < today;
    const label = overdue ? "Overdue" : "Today";
    const priorityText = todo.priority !== null ? ` ${todo.priority}` : "";
    const titleRoom = Math.max(4, columnWidth - 2 - priorityText.length - label.length - 2);
    const priorityColor =
      todo.priority === "high"
        ? tokens.priorityHigh
        : todo.priority === "medium"
          ? tokens.priorityMedium
          : tokens.priorityLow;
    const selected = todo.id === selectedFocusId;
    return (
      <box key={todo.id} height={1} flexShrink={0}>
        <text wrapMode="none">
          <span fg={color(selected ? tokens.accent : tokens.fg)}>
            {`${selected ? "> " : "  "}${truncate(todo.title, titleRoom)}`}
          </span>
          {todo.priority !== null ? <span fg={color(priorityColor)}>{priorityText}</span> : null}
          <span fg={color(overdue ? tokens.danger : tokens.fgMuted)}>{` ${label}`}</span>
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
        <SkeletonRows
          rows={Math.max(0, Math.floor(rows / PROJECT_ROWS) * PROJECT_ROWS)}
          width={columnWidth}
        />
      );
    }
    if (dashboardError !== null && !hasSnapshot) {
      return <MutedLine text="Could not load" width={columnWidth} />;
    }
    if (projects.length === 0) {
      return <MutedLine text="No projects yet" width={columnWidth} />;
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
    const nameRoom = Math.max(6, Math.floor(columnWidth * 0.5));
    const detailText = completion.detail;
    const rowFg = completion.isDone ? tokens.fgSubtle : tokens.fg;
    return (
      <box key={project.id} height={PROJECT_ROWS} flexShrink={0} flexDirection="column">
        <text wrapMode="none">
          <span fg={color(selected ? tokens.accent : rowFg)}>
            {`${selected ? "> " : "  "}${truncate(project.name, nameRoom)}`}
          </span>
          {completion.isDone ? <span fg={color(tokens.success)}>{" Done"}</span> : null}
          <span fg={color(completion.isDone ? tokens.fgSubtle : tokens.fgMuted)}>
            {` ${truncate(detailText, Math.max(4, columnWidth - nameRoom - 8))}`}
          </span>
        </text>
        <box paddingLeft={2} flexShrink={0}>
          <ProgressBar ratio={completion.pct / 100} width={barWidth} />
        </box>
      </box>
    );
  }

  function inProgressRows(rows: number): ReactNode {
    if (rows <= 0) {
      return null;
    }
    if (dashboardLoading) {
      return <SkeletonRows rows={rows} width={columnWidth} />;
    }
    if (dashboardError !== null && !hasSnapshot) {
      return <MutedLine text="Could not load" width={columnWidth} />;
    }
    if (inProgressItems.length === 0) {
      return <MutedLine text="Nothing in progress right now" width={columnWidth} />;
    }
    return (
      <>
        {windowSlice(inProgressItems, inProgressSel, rows).map((todo) => {
          const selected = todo.id === selectedInProgressId;
          return (
            <box key={todo.id} height={1} flexShrink={0}>
              <text wrapMode="none">
                <span fg={color(selected ? tokens.accent : tokens.fg)}>
                  {`${selected ? "> " : "  "}${truncate(todo.title, Math.max(4, columnWidth - 2))}`}
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
      return <SkeletonRows rows={rows} width={columnWidth} />;
    }
    if (dashboardError !== null && !hasSnapshot) {
      return <MutedLine text="Could not load" width={columnWidth} />;
    }
    if (activity.length === 0) {
      return <MutedLine text="No activity yet" width={columnWidth} />;
    }
    return (
      <>
        {windowSlice(activity, activitySel, rows).map((item) => {
          const selected = item.key === selectedActivityKey;
          const tail = `  ${item.meta}  ${relativeTime(item.date, now)}`;
          const tailRoom = Math.min(tail.length, Math.max(8, Math.floor(columnWidth * 0.45)));
          const titleRoom = Math.max(4, columnWidth - 2 - tailRoom);
          return (
            <box key={item.key} height={1} flexShrink={0}>
              <text wrapMode="none">
                <span fg={color(selected ? tokens.accent : tokens.fg)}>
                  {`${selected ? "> " : "  "}${truncate(item.title, titleRoom)}`}
                </span>
                <span fg={color(tokens.fgSubtle)}>
                  {truncate(tail, Math.max(4, columnWidth - 2 - titleRoom))}
                </span>
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
    // A 0-height panel cannot show even its title, so skip it entirely rather
    // than emitting a fixed-height child past the viewport.
    if (panelHeight <= 0) {
      return null;
    }
    return (
      <Panel key={target} title={title} focused={focusTarget === target} height={panelHeight}>
        {content}
      </Panel>
    );
  }

  // -- Stats -----------------------------------------------------------------

  function renderStatCard(card: StatCard, index: number): ReactNode {
    const active = focusTarget === "stats" && index === statSel;
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
        height={STAT_CARD_HEIGHT}
        flexDirection="column"
        backgroundColor={color(active ? tokens.bgRaised : tokens.bgPanel)}
        paddingLeft={1}
        paddingRight={1}
      >
        <text fg={color(valueColor)} wrapMode="none">
          {valueText}
        </text>
        <text fg={color(active ? tokens.accent : tokens.fgMuted)} wrapMode="none">
          {truncate(card.label, cardWidth)}
        </text>
      </box>
    );
  }

  function renderStats(): ReactNode {
    if (wide) {
      return (
        <box flexDirection="row" height={STAT_CARD_HEIGHT} flexShrink={0} gap={1}>
          {statCards.map((card, index) => renderStatCard(card, index))}
        </box>
      );
    }
    return (
      <box flexDirection="column" flexShrink={0}>
        <box flexDirection="row" height={STAT_CARD_HEIGHT} gap={1}>
          {statCards.slice(0, 2).map((card, index) => renderStatCard(card, index))}
        </box>
        <box flexDirection="row" height={STAT_CARD_HEIGHT} gap={1}>
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
      if (todo !== undefined) {
        todoForm.openEdit(todo);
      }
      return;
    }
    if (focusTarget === "in-progress") {
      const todo = inProgressItems[inProgressSel];
      if (todo !== undefined) {
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
    <box flexDirection="column" flexGrow={1} minHeight={0} backgroundColor={color(tokens.bg)}>
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
            {"n  Add"}
          </text>
        </box>
        {dashboardError !== null ? (
          <ErrorLine message={dashboardError} width={contentWidth} />
        ) : null}
      </box>

      {renderStats()}

      {wide ? (
        <box flexDirection="row" flexGrow={1} minHeight={0} gap={1}>
          <box flexDirection="column" flexGrow={1} flexBasis={0} minHeight={0}>
            {renderPanel("Today & Overdue", "focus", topRows, focusRows(topRows - 1))}
            {renderPanel("Active Projects", "projects", bottomRows, projectRows(bottomRows - 1))}
          </box>
          <box flexDirection="column" flexGrow={1} flexBasis={0} minHeight={0}>
            {renderPanel("In Progress", "in-progress", topRows, inProgressRows(topRows - 1))}
            {renderPanel("Recent Activity", "activity", bottomRows, activityRows(bottomRows - 1))}
          </box>
        </box>
      ) : (
        <box flexDirection="column" flexGrow={1} minHeight={0}>
          {renderPanel("Today & Overdue", "focus", focusPanelRows, focusRows(focusPanelRows - 1))}
          {renderPanel(
            "Active Projects",
            "projects",
            projectPanelRows,
            projectRows(projectPanelRows - 1),
          )}
          {renderPanel(
            "In Progress",
            "in-progress",
            inProgressPanelRows,
            inProgressRows(inProgressPanelRows - 1),
          )}
          {renderPanel(
            "Recent Activity",
            "activity",
            activityPanelRows,
            activityRows(activityPanelRows - 1),
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

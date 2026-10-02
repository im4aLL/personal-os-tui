import { type KeyEvent, TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { screenHint } from "../commands/registry";
import { ArchivedTodosDialog } from "../components/todos/ArchivedTodosDialog";
import { KanbanColumn } from "../components/todos/KanbanColumn";
import { TodoForm } from "../components/todos/TodoForm";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useKeyboardScope } from "../hooks/useKeyboardScope";
import { useTodoForm } from "../hooks/useTodoForm";
import type { Todo, TodoStatus } from "../repos/types";
import { getRepos } from "../store/repos";
import { useSession } from "../store/session";
import { useTodos } from "../store/todos";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { todayISO } from "../utils/date";
import { operationError, retryableError } from "../utils/error";
import { isReadOnlyRow } from "../utils/mouse";
import { windowSlice } from "../utils/window";
import type { TodoConfirmState } from "./TodoScreen.types";

const COLUMNS: TodoStatus[] = ["todo", "in-progress", "completed"];

const COLUMN_LABELS: Record<TodoStatus, string> = {
  todo: "Todo",
  "in-progress": "In Progress",
  completed: "Completed",
};

const NEXT_STATUS: Record<TodoStatus, TodoStatus> = {
  todo: "in-progress",
  "in-progress": "completed",
  completed: "todo",
};

const HINT = screenHint("todo");

function truncate(text: string, room: number): string {
  if (text.length <= room) {
    return text;
  }
  if (room <= 3) {
    return text.slice(0, Math.max(0, room));
  }
  return `${text.slice(0, room - 3)}...`;
}

export function TodoScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width, height } = useTerminalDimensions();

  const todos = useTodos((state) => state.todos);
  const loading = useTodos((state) => state.loading);
  const loadError = useTodos((state) => state.error);
  const loadTodos = useTodos((state) => state.loadTodos);
  const refreshTodos = useTodos((state) => state.refreshTodos);
  const scenario = useSession((state) => state.scenario);
  const latencyMs = useSession((state) => state.latencyMs);

  const [focusedColumn, setFocusedColumn] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const todoForm = useTodoForm({
    onCreated: (todo) => {
      setSelectedId(todo.id);
      setFocusedColumn(COLUMNS.indexOf(todo.status));
    },
  });
  const [confirm, setConfirm] = useState<TodoConfirmState | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedTodos, setArchivedTodos] = useState<Todo[]>([]);
  const [archivedIndex, setArchivedIndex] = useState(0);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const wide = width >= 100;
  const compact = width < 70;
  const sidebarCollapsed = useUi((state) => state.sidebarCollapsed);
  const sideWidth = width < 60 ? 0 : sidebarCollapsed || width < 80 ? 2 : 22;
  const contentWidth = Math.max(24, width - sideWidth - 2);
  const banner =
    actionError ?? (loadError !== null ? retryableError("Todos could not load", loadError) : null);
  // Even grid: three bordered columns separated by one-cell gaps. `columnWidth`
  // is the inner text width a row can use, after the border and padding.
  const wideColumnWidth = Math.max(
    10,
    Math.floor((contentWidth - (COLUMNS.length - 1)) / COLUMNS.length),
  );
  const wideColumnInner = Math.max(8, wideColumnWidth - 4);
  const narrowColumnInner = Math.max(8, contentWidth - 2);
  // Rows spent outside the board: the app header and status line, the bordered
  // search box, the footer hint, the spacer under the search box, and the
  // optional error banner.
  const bannerRows = banner !== null ? 1 : 0;
  const bodyRows = Math.max(3, height - 2 - 3 - 1 - 1 - bannerRows);
  // Each todo renders as title + meta + gap (up to 3 terminal rows), so the
  // window size is an item count derived from the available row budget. The
  // wide board also spends two rows on the column borders; the stacked layout
  // spends one on its status tab row.
  const visibleCount = Math.max(1, Math.floor((bodyRows - (wide ? 2 : 1)) / 3));
  // Ctrl+D/Ctrl+U move by half the visible rows, at least one item.
  const pageStep = Math.max(1, Math.floor(visibleCount / 2));

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle === "") {
      return todos;
    }
    return todos.filter((todo) => {
      if (todo.title.toLowerCase().includes(needle)) {
        return true;
      }
      return todo.description?.toLowerCase().includes(needle) ?? false;
    });
  }, [todos, search]);

  const byStatus = useMemo(() => {
    const map: Record<TodoStatus, Todo[]> = { todo: [], "in-progress": [], completed: [] };
    for (const todo of filtered) {
      map[todo.status].push(todo);
    }
    for (const status of COLUMNS) {
      map[status].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filtered]);

  // Unfiltered per-status order, for position persistence: reordering must
  // write a complete contiguous 0..n ordering of the whole target column, not
  // just the rows visible under a search filter.
  const fullByStatus = useMemo(() => {
    const map: Record<TodoStatus, Todo[]> = { todo: [], "in-progress": [], completed: [] };
    for (const todo of todos) {
      map[todo.status].push(todo);
    }
    for (const status of COLUMNS) {
      map[status].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [todos]);

  const focusedStatus = COLUMNS[focusedColumn];
  const focusedList = byStatus[focusedStatus];
  const selected = focusedList.find((todo) => todo.id === selectedId) ?? null;

  // Keep the selection valid as filtering, status changes, or column moves
  // change the focused column's list.
  useEffect(() => {
    if (focusedList.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }
    if (selectedId === null || !focusedList.some((todo) => todo.id === selectedId)) {
      setSelectedId(focusedList[0].id);
    }
  }, [focusedList, selectedId]);

  // Reload on mount and whenever the mock scenario/latency changes. The mock
  // repo reads both from the environment, so `loadTodos` takes no arguments;
  // the tuple reference keeps them as explicit effect triggers.
  useEffect(() => {
    void scenario;
    void latencyMs;
    void loadTodos();
  }, [scenario, latencyMs, loadTodos]);

  // An active field or local overlay defers the global bindings so typed
  // characters reach the control and ex mode cannot open over a dialog; the
  // scope still runs first for Tab/Esc/Enter.
  const fieldOwned = todoForm.form.open || searchActive || confirm !== null || archivedOpen;
  useEffect(() => {
    useUi.getState().setFocusedField(fieldOwned ? "todo-field" : null);
    return () => {
      useUi.getState().setFocusedField(null);
    };
  }, [fieldOwned]);

  useEffect(() => {
    if (notice === null) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  const loadArchived = useCallback((): void => {
    setArchivedLoading(true);
    getRepos()
      .todos.archived()
      .then((rows) => {
        setArchivedTodos(rows);
        setArchivedIndex((index) => Math.min(index, Math.max(0, rows.length - 1)));
      })
      .catch((error) => setActionError(retryableError("Could not load archived todos", error)))
      .finally(() => setArchivedLoading(false));
  }, []);

  useEffect(() => {
    if (archivedOpen) {
      loadArchived();
    }
  }, [archivedOpen, loadArchived]);

  // -- Selection and column movement ---------------------------------------

  function moveSelection(delta: number): void {
    if (focusedList.length === 0) {
      return;
    }
    const current = selectedId === null ? -1 : focusedList.findIndex((t) => t.id === selectedId);
    const next = Math.min(focusedList.length - 1, Math.max(0, current + delta));
    setSelectedId(focusedList[next].id);
  }

  function changeColumn(delta: number): void {
    setFocusedColumn((index) => Math.min(COLUMNS.length - 1, Math.max(0, index + delta)));
  }

  /** Mouse: focus the clicked column and select a specific todo. */
  function selectTodo(todo: Todo): void {
    setSearchActive(false);
    setFocusedColumn(COLUMNS.indexOf(todo.status));
    setSelectedId(todo.id);
  }

  /** Mouse wheel: focus the wheeled column and step the selection inside it. */
  function wheelColumn(status: TodoStatus, delta: number): void {
    const list = byStatus[status];
    if (list.length === 0) {
      return;
    }
    setFocusedColumn(COLUMNS.indexOf(status));
    const current = selectedId === null ? -1 : list.findIndex((todo) => todo.id === selectedId);
    const next = Math.min(list.length - 1, Math.max(0, current + delta));
    setSelectedId(list[next].id);
  }

  // -- Form ----------------------------------------------------------------

  // Thin wrappers: the shared controller owns the form state; the screen only
  // closes its search field before opening the modal.
  function openCreate(status: TodoStatus): void {
    setSearchActive(false);
    todoForm.openCreate(status);
  }

  function openEdit(todo: Todo): void {
    // `large` clones are read-only, so Enter/activate selects without opening
    // an editor that can only fail on save.
    if (isReadOnlyRow(todo.id)) {
      return;
    }
    setSearchActive(false);
    todoForm.openEdit(todo);
  }

  // -- Write actions (optimistic, reload on failure) ------------------------

  function cycleStatus(todo: Todo): void {
    const status = NEXT_STATUS[todo.status];
    // Unfiltered order so a search filter cannot leave hidden rows with
    // duplicate positions.
    const targetIds = fullByStatus[status]
      .map((item) => item.id)
      .filter((id) => id !== todo.id)
      .concat(todo.id);
    useTodos.getState().patchTodo(todo.id, { status, position: targetIds.length - 1 });
    useTodos.getState().reorderTodos(targetIds);
    setFocusedColumn(COLUMNS.indexOf(status));
    setSelectedId(todo.id);
    setActionError(null);
    void (async () => {
      try {
        await getRepos().todos.updatePositions(
          targetIds.map((item, index) => ({
            id: item,
            position: index,
            ...(item === todo.id ? { status } : {}),
          })),
        );
      } catch (error) {
        setActionError(retryableError("Could not move todo", error));
        void loadTodos();
      }
    })();
  }

  function moveAcrossColumn(delta: number): void {
    if (selected === null) {
      return;
    }
    const targetColumn = focusedColumn + delta;
    if (targetColumn < 0 || targetColumn >= COLUMNS.length) {
      return;
    }
    const targetStatus = COLUMNS[targetColumn];
    // Unfiltered order so a search filter cannot leave hidden rows with
    // duplicate positions.
    const targetIds = fullByStatus[targetStatus]
      .map((todo) => todo.id)
      .filter((id) => id !== selected.id)
      .concat(selected.id);
    useTodos.getState().patchTodo(selected.id, {
      status: targetStatus,
      position: targetIds.length - 1,
    });
    useTodos.getState().reorderTodos(targetIds);
    setFocusedColumn(targetColumn);
    setSelectedId(selected.id);
    const id = selected.id;
    setActionError(null);
    void (async () => {
      try {
        await getRepos().todos.updatePositions(
          targetIds.map((item, index) => ({
            id: item,
            position: index,
            ...(item === id ? { status: targetStatus } : {}),
          })),
        );
      } catch (error) {
        setActionError(retryableError("Could not move todo", error));
        void loadTodos();
      }
    })();
  }

  function reorderSelection(delta: number): void {
    if (selected === null) {
      return;
    }
    const index = focusedList.findIndex((todo) => todo.id === selected.id);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= focusedList.length) {
      return;
    }
    const ids = focusedList.map((todo) => todo.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);
    useTodos.getState().reorderTodos(ids);
    setSelectedId(moved);
    setActionError(null);
    void (async () => {
      try {
        await getRepos().todos.updatePositions(ids.map((id, position) => ({ id, position })));
      } catch (error) {
        setActionError(retryableError("Could not reorder todos", error));
        void loadTodos();
      }
    })();
  }

  function requestDelete(): void {
    if (selected === null) {
      return;
    }
    setSearchActive(false);
    setConfirm({
      kind: "delete",
      ids: [selected.id],
      title: "Delete todo?",
      body: `Delete "${selected.title}" permanently?`,
      confirmLabel: "Delete",
      destructive: true,
    });
  }

  function requestArchiveCompleted(): void {
    const ids = byStatus.completed.map((todo) => todo.id);
    if (ids.length === 0) {
      setNotice("No completed todos to archive");
      return;
    }
    setSearchActive(false);
    const inSearch = search.trim() !== "" ? " matching your current search" : "";
    setConfirm({
      kind: "archive-completed",
      ids,
      title: "Archive completed todos?",
      body: `Archive ${ids.length} completed todo${ids.length === 1 ? "" : "s"}${inSearch}? Restore them from the archived dialog.`,
      confirmLabel: "Archive",
      destructive: false,
    });
  }

  function requestClearCompleted(): void {
    const ids = byStatus.completed.map((todo) => todo.id);
    if (ids.length === 0) {
      setNotice("No completed todos to clear");
      return;
    }
    setSearchActive(false);
    const inSearch = search.trim() !== "" ? " matching your current search" : "";
    setConfirm({
      kind: "clear-completed",
      ids,
      title: "Clear completed todos?",
      body: `Permanently delete ${ids.length} completed todo${ids.length === 1 ? "" : "s"}${inSearch}? This cannot be undone.`,
      confirmLabel: "Clear all",
      destructive: true,
    });
  }

  async function runConfirm(): Promise<void> {
    if (confirm === null) {
      return;
    }
    const current = confirm;
    setConfirm(null);
    setActionError(null);
    try {
      if (current.kind === "delete") {
        useTodos.getState().removeTodo(current.ids[0]);
        await getRepos().todos.remove(current.ids[0]);
        return;
      }
      if (current.kind === "delete-archived") {
        setArchivedTodos((rows) => rows.filter((row) => row.id !== current.ids[0]));
        await getRepos().todos.remove(current.ids[0]);
        return;
      }
      useTodos.getState().removeTodos(current.ids);
      if (current.kind === "archive-completed") {
        await getRepos().todos.archive(current.ids);
      } else {
        await getRepos().todos.removeMany(current.ids);
      }
    } catch (error) {
      setActionError(
        retryableError(
          current.kind === "archive-completed"
            ? "Could not archive completed todos"
            : "Could not delete todos",
          error,
        ),
      );
      void loadTodos();
      if (current.kind === "delete-archived") {
        loadArchived();
      }
    }
  }

  function addWorkLog(todo: Todo): void {
    setActionError(null);
    void (async () => {
      try {
        await getRepos().workLogs.create({
          title: todo.title,
          description: todo.description ?? null,
          startDate: todayISO(),
          endDate: todayISO(),
          tags: [],
        });
        setNotice("Added to work log");
      } catch (error) {
        // The todo is unchanged, so `w` repeats the add; surface the key
        // inline so the error still offers a next step.
        setActionError(`${operationError("Could not add to work log", error)}  (w to retry)`);
      }
    })();
  }

  // -- Archived dialog actions ---------------------------------------------

  async function restoreArchived(todo: Todo): Promise<void> {
    setArchivedTodos((current) => current.filter((item) => item.id !== todo.id));
    useTodos.getState().addTodo({ ...todo, archived: false });
    setActionError(null);
    try {
      await getRepos().todos.restore([todo.id]);
    } catch (error) {
      setActionError(retryableError("Could not restore todo", error));
      void loadTodos();
      loadArchived();
    }
  }

  async function restoreAllArchived(): Promise<void> {
    const all = archivedTodos;
    if (all.length === 0) {
      return;
    }
    setArchivedTodos([]);
    setArchivedIndex(0);
    useTodos.getState().addTodos(all.map((todo) => ({ ...todo, archived: false })));
    setActionError(null);
    try {
      await getRepos().todos.restore(all.map((todo) => todo.id));
    } catch (error) {
      setActionError(retryableError("Could not restore todos", error));
      void loadTodos();
      loadArchived();
    }
  }

  function requestDeleteArchived(todo: Todo): void {
    setConfirm({
      kind: "delete-archived",
      ids: [todo.id],
      title: "Delete archived todo?",
      body: `Permanently delete "${todo.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
  }

  // -- Keyboard scope -------------------------------------------------------

  const archivedMax = Math.max(0, archivedTodos.length - 1);
  const archivedSelected = archivedTodos[Math.min(archivedIndex, archivedMax)] ?? null;

  function handleKey(key: KeyEvent): boolean {
    const name = key.name;
    const lower = name.toLowerCase();
    const meta = key.meta === true || key.option === true;
    const plainChar = (char: string): boolean =>
      !key.ctrl && !meta && key.shift !== true && name === char;
    const shiftChar = (char: string): boolean =>
      !key.ctrl && !meta && (name === char.toUpperCase() || (lower === char && key.shift === true));

    // Form: only intercept the keys the screen owns; typing reaches the field.
    if (todoForm.form.open) {
      if (name === "escape") {
        todoForm.close();
        return true;
      }
      // Ctrl+Enter submits from any field (including the description area).
      // Terminals report it as return, kpenter, or linefeed depending on mode.
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
      // Swallow the chords that would otherwise stack the mock panel
      // (Ctrl+D), open the palette (Ctrl+P), or page (Ctrl+U) over the form.
      if (key.ctrl && (name === "d" || name === "u" || name === "p")) {
        return true;
      }
      return false;
    }

    // Confirm dialog: confirm on Enter/y, cancel on Esc/n, block other keys.
    if (confirm !== null) {
      if (name === "return" || plainChar("y")) {
        void runConfirm();
        return true;
      }
      if (name === "escape" || plainChar("n")) {
        setConfirm(null);
        return true;
      }
      return !meta;
    }

    // Archived dialog.
    if (archivedOpen) {
      if (name === "escape" || plainChar("a")) {
        setArchivedOpen(false);
        return true;
      }
      if (name === "down" || plainChar("j")) {
        setArchivedIndex((index) => Math.min(archivedMax, index + 1));
        return true;
      }
      if (name === "up" || plainChar("k")) {
        setArchivedIndex((index) => Math.max(0, index - 1));
        return true;
      }
      if (shiftChar("r")) {
        void restoreAllArchived();
        return true;
      }
      if (plainChar("r")) {
        if (archivedSelected !== null) {
          void restoreArchived(archivedSelected);
        }
        return true;
      }
      if (plainChar("d")) {
        if (archivedSelected !== null) {
          requestDeleteArchived(archivedSelected);
        }
        return true;
      }
      return !meta;
    }

    // The search field owns typing once active.
    if (searchActive) {
      if (name === "escape") {
        setSearch("");
        setSearchActive(false);
        return true;
      }
      return false;
    }

    // Browsing: Ctrl+D pages down half a screen (Ctrl+Shift+D still reaches the
    // mock panel). The `!key.shift` guard keeps Ctrl+Shift+D intact where the
    // terminal can distinguish it.
    if (key.ctrl && !key.shift) {
      if (name === "d") {
        moveSelection(pageStep);
        return true;
      }
      if (name === "u") {
        moveSelection(-pageStep);
        return true;
      }
      return false;
    }
    if (key.ctrl || meta) {
      return false;
    }

    // Shifted actions: accept the uppercase name or a shift report.
    if (shiftChar("g")) {
      if (focusedList.length > 0) {
        setSelectedId(focusedList[focusedList.length - 1].id);
      }
      return true;
    }
    if (shiftChar("h")) {
      moveAcrossColumn(-1);
      return true;
    }
    if (shiftChar("l")) {
      moveAcrossColumn(1);
      return true;
    }
    if (shiftChar("k")) {
      reorderSelection(-1);
      return true;
    }
    if (shiftChar("j")) {
      reorderSelection(1);
      return true;
    }
    if (shiftChar("a")) {
      requestArchiveCompleted();
      return true;
    }
    if (shiftChar("x")) {
      requestClearCompleted();
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
    if (plainChar("g")) {
      if (focusedList.length > 0) {
        setSelectedId(focusedList[0].id);
      }
      return true;
    }
    if (plainChar("h") || name === "left") {
      changeColumn(-1);
      return true;
    }
    if (plainChar("l") || name === "right") {
      changeColumn(1);
      return true;
    }
    if (wide && (name === "1" || name === "2" || name === "3")) {
      setFocusedColumn(Number(name) - 1);
      return true;
    }
    if (name === "/") {
      setSearchActive(true);
      return true;
    }
    if (plainChar("n")) {
      openCreate(focusedStatus);
      return true;
    }
    if (name === "return") {
      if (selected !== null) {
        openEdit(selected);
      }
      return true;
    }
    if (name === "escape") {
      if (search !== "" || searchActive) {
        setSearch("");
        setSearchActive(false);
        return true;
      }
      return false;
    }
    if (plainChar("m")) {
      if (selected !== null) {
        cycleStatus(selected);
      }
      return true;
    }
    if (plainChar("d")) {
      requestDelete();
      return true;
    }
    if (plainChar("a")) {
      setArchivedOpen(true);
      return true;
    }
    if (plainChar("w")) {
      if (selected !== null && selected.status === "completed") {
        addWorkLog(selected);
        return true;
      }
      return false;
    }
    if (banner !== null && plainChar("r")) {
      setActionError(null);
      // A load error wants the skeleton; a pure action error only needs a
      // silent reload so the retry does not flash one.
      if (loadError !== null) {
        void loadTodos();
      } else {
        void refreshTodos();
      }
      return true;
    }
    return false;
  }

  useKeyboardScope(handleKey);

  // -- Render ---------------------------------------------------------------

  const selectedIndexIn = (status: TodoStatus): number => {
    if (status !== focusedStatus || selectedId === null) {
      return -1;
    }
    return byStatus[status].findIndex((todo) => todo.id === selectedId);
  };

  // `w` is only meaningful on a completed item, so it is advertised only then.
  const footerHint =
    selected !== null && selected.status === "completed" ? `${HINT}  w work log` : HINT;

  return (
    <box flexDirection="column" flexGrow={1} backgroundColor={color(tokens.bg)}>
      <box
        flexShrink={0}
        border
        borderStyle="single"
        borderColor={color(searchActive ? tokens.borderFocus : tokens.borderMuted)}
        title=" Search "
        titleColor={color(searchActive ? tokens.accent : tokens.fgMuted)}
        paddingLeft={1}
        paddingRight={1}
        height={3}
      >
        <input
          focused={searchActive}
          value={search}
          placeholder="title or description"
          onInput={(value) => setSearch(value)}
          flexGrow={1}
          backgroundColor={color(tokens.bg)}
          focusedBackgroundColor={color(tokens.bg)}
          textColor={color(tokens.fg)}
          focusedTextColor={color(tokens.fg)}
          placeholderColor={color(tokens.fgDisabled)}
          cursorColor={color(tokens.cursor)}
          selectionBg={color(tokens.selectionBg)}
          selectionFg={color(tokens.selectionFg)}
        />
      </box>

      {banner !== null ? (
        <box height={1} flexShrink={0}>
          <text fg={color(tokens.danger)} wrapMode="none">
            {truncate(banner, Math.max(8, width - 2))}
          </text>
        </box>
      ) : null}

      <box height={1} flexShrink={0} />

      {loading ? (
        <Skeleton
          lines={Math.max(3, Math.min(visibleCount, 6))}
          widths={[26, 34, 30, 22, 28, 20]}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No todos yet" hint="n to add your first todo" />
      ) : wide ? (
        <box flexDirection="row" flexGrow={1} minHeight={0} gap={1}>
          {COLUMNS.map((status, index) => (
            <KanbanColumn
              key={status}
              status={status}
              label={COLUMN_LABELS[status]}
              items={windowSlice(byStatus[status], selectedIndexIn(status), visibleCount)}
              count={byStatus[status].length}
              selectedId={index === focusedColumn ? selectedId : null}
              compact={compact}
              columnWidth={wideColumnInner}
              focused={index === focusedColumn}
              variant="box"
              onSelectTodo={selectTodo}
              onActivateTodo={(todo) => {
                selectTodo(todo);
                openEdit(todo);
              }}
              onWheel={(delta) => wheelColumn(status, delta)}
            />
          ))}
        </box>
      ) : (
        <box flexDirection="column" flexGrow={1} minHeight={0} paddingLeft={1} paddingRight={1}>
          <box flexDirection="row" height={1} flexShrink={0} gap={2}>
            {COLUMNS.map((status, index) => {
              const active = index === focusedColumn;
              const label = `${COLUMN_LABELS[status]} ${byStatus[status].length}`;
              return (
                <text key={status} wrapMode="none">
                  <span
                    fg={color(active ? tokens.accent : tokens.fgMuted)}
                    attributes={active ? TextAttributes.BOLD : undefined}
                  >
                    {active ? `[ ${label} ]` : label}
                  </span>
                </text>
              );
            })}
          </box>
          <box flexGrow={1} minHeight={0} paddingTop={1}>
            <KanbanColumn
              status={focusedStatus}
              label={COLUMN_LABELS[focusedStatus]}
              items={windowSlice(
                byStatus[focusedStatus],
                selectedIndexIn(focusedStatus),
                visibleCount,
              )}
              count={byStatus[focusedStatus].length}
              selectedId={selectedId}
              compact={compact}
              columnWidth={narrowColumnInner}
              focused={true}
              variant="plain"
              onSelectTodo={selectTodo}
              onActivateTodo={(todo) => {
                selectTodo(todo);
                openEdit(todo);
              }}
              onWheel={(delta) => wheelColumn(focusedStatus, delta)}
            />
          </box>
        </box>
      )}

      <box height={1} flexShrink={0}>
        <text fg={color(notice !== null ? tokens.success : tokens.fgSubtle)} wrapMode="none">
          {truncate(notice ?? footerHint, Math.max(8, width - 2))}
        </text>
      </box>

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

      {archivedOpen ? (
        <ArchivedTodosDialog
          todos={archivedTodos}
          selectedIndex={Math.min(archivedIndex, archivedMax)}
          loading={archivedLoading}
          maxRows={Math.max(3, Math.min(12, height - 10))}
        />
      ) : null}

      {/* Rendered last so it paints on top of the archived dialog it can be
          opened from (both Modals are full-screen absolute overlays). */}
      {confirm !== null ? (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          destructive={confirm.destructive}
        />
      ) : null}
    </box>
  );
}

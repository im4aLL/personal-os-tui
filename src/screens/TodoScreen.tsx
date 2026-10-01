import type { KeyEvent, TextareaRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArchivedTodosDialog } from "../components/todos/ArchivedTodosDialog";
import { KanbanColumn } from "../components/todos/KanbanColumn";
import { TodoForm } from "../components/todos/TodoForm";
import type { TodoFormField, TodoFormValues } from "../components/todos/TodoForm.types";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { useKeyboardScope } from "../hooks/useKeyboardScope";
import type { Todo, TodoStatus } from "../repos/types";
import { getRepos } from "../store/repos";
import { useSession } from "../store/session";
import { useTodos } from "../store/todos";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { isValidISODate, todayISO } from "../utils/date";
import { messageOf } from "../utils/error";
import { windowSlice } from "../utils/window";
import type { TodoConfirmState, TodoFormState } from "./TodoScreen.types";

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

const CREATE_FIELDS: TodoFormField[] = ["title", "description", "priority", "due"];
const EDIT_FIELDS: TodoFormField[] = ["title", "description", "priority", "due", "status"];

const HINT =
  "n new  Enter edit  m cycle status  H/L move column  K/J reorder  / search  d delete  a archived  A archive done  X clear done";

const EMPTY_FORM: TodoFormState = {
  open: false,
  editing: null,
  values: { title: "", priority: "none", dueDate: "", status: "todo" },
  field: "title",
  error: null,
  saving: false,
};

function truncate(text: string, room: number): string {
  if (text.length <= room) {
    return text;
  }
  if (room <= 3) {
    return text.slice(0, Math.max(0, room));
  }
  return `${text.slice(0, room - 3)}...`;
}

/** Three-column loading placeholder: a header bar plus two card bars per
 * column, matching the desktop's Kanban skeleton. */
function TodoSkeleton(): ReactNode {
  const { theme, color } = useTheme();
  const { width } = useTerminalDimensions();
  const cap = Math.max(12, width - 24);
  const columnWidth = Math.max(6, Math.floor((cap - 2) / 3));
  return (
    <box flexDirection="row" flexGrow={1} gap={1}>
      {[0, 1, 2].map((column) => (
        <box key={column} flexDirection="column" flexGrow={1} flexBasis={0} gap={1}>
          <text fg={color(theme.tokens.bgHover)}>{"█".repeat(Math.max(6, columnWidth - 2))}</text>
          <text fg={color(theme.tokens.bgHover)}>{"█".repeat(columnWidth)}</text>
          <text fg={color(theme.tokens.bgHover)}>{"█".repeat(Math.max(6, columnWidth - 4))}</text>
        </box>
      ))}
    </box>
  );
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
  const [form, setForm] = useState<TodoFormState>(EMPTY_FORM);
  const [confirm, setConfirm] = useState<TodoConfirmState | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedTodos, setArchivedTodos] = useState<Todo[]>([]);
  const [archivedIndex, setArchivedIndex] = useState(0);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const descriptionRef = useRef<TextareaRenderable | null>(null);

  const wide = width >= 100;
  const compact = width < 70;
  const cap = Math.max(12, width - 24);
  const wideColumnWidth = Math.max(10, Math.floor((cap - 2) / 3));
  const columnWidth = wide ? wideColumnWidth : cap;
  const bodyHeight = Math.max(3, height - 10);
  // Each todo renders as title + meta + gap (up to 3 terminal rows), so the
  // window size is an item count derived from the available row budget.
  const visibleCount = Math.max(1, Math.floor(bodyHeight / 3));

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

  // A focused field defers the global bindings so typed characters reach the
  // control (search or form); the scope still runs first for Tab/Esc/Enter.
  const fieldOwned = form.open || searchActive;
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
      .catch((error) => setActionError(messageOf(error)))
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

  // -- Form ----------------------------------------------------------------

  function openCreate(status: TodoStatus): void {
    setSearchActive(false);
    setForm({
      open: true,
      editing: null,
      values: { title: "", priority: "none", dueDate: "", status },
      field: "title",
      error: null,
      saving: false,
    });
  }

  function openEdit(todo: Todo): void {
    setSearchActive(false);
    setForm({
      open: true,
      editing: todo,
      values: {
        title: todo.title,
        priority: todo.priority ?? "none",
        dueDate: todo.dueDate ?? "",
        status: todo.status,
      },
      field: "title",
      error: null,
      saving: false,
    });
  }

  function closeForm(): void {
    setForm(EMPTY_FORM);
  }

  function patchForm(patch: Partial<TodoFormValues>): void {
    setForm((current) => ({
      ...current,
      values: { ...current.values, ...patch },
      error: null,
    }));
  }

  function cycleFormField(delta: 1 | -1): void {
    const fields = form.editing === null ? CREATE_FIELDS : EDIT_FIELDS;
    setForm((current) => {
      const index = fields.indexOf(current.field);
      const next = index === -1 ? 0 : (index + delta + fields.length) % fields.length;
      return { ...current, field: fields[next] };
    });
  }

  async function submitForm(): Promise<void> {
    if (!form.open || form.saving) {
      return;
    }
    const values = form.values;
    const title = values.title.trim();
    if (title === "") {
      setForm((current) => ({ ...current, error: "Title is required", field: "title" }));
      return;
    }
    const due = values.dueDate.trim();
    if (due !== "" && !isValidISODate(due)) {
      setForm((current) => ({ ...current, error: "Use YYYY-MM-DD", field: "due" }));
      return;
    }
    const description = (descriptionRef.current?.plainText ?? "").trim();
    const priority = values.priority === "none" ? null : values.priority;
    setForm((current) => ({ ...current, saving: true, error: null }));
    try {
      if (form.editing !== null) {
        const id = form.editing.id;
        const patch = {
          title,
          description: description === "" ? null : description,
          priority,
          dueDate: due === "" ? null : due,
          status: values.status,
        };
        await getRepos().todos.update(id, patch);
        useTodos.getState().patchTodo(id, patch);
      } else {
        const created = await getRepos().todos.create({
          title,
          description: description === "" ? null : description,
          priority,
          dueDate: due === "" ? null : due,
          status: values.status,
          position: fullByStatus[values.status].length,
        });
        useTodos.getState().addTodo(created);
        setSelectedId(created.id);
        setFocusedColumn(COLUMNS.indexOf(created.status));
      }
      setForm(EMPTY_FORM);
    } catch (error) {
      setForm((current) => ({ ...current, saving: false, error: messageOf(error) }));
    }
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
        setActionError(messageOf(error));
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
        setActionError(messageOf(error));
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
        setActionError(messageOf(error));
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
      setActionError(messageOf(error));
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
          body: todo.description ?? "",
          date: todayISO(),
          tags: [],
        });
        setNotice("Added to work log");
      } catch (error) {
        setActionError(messageOf(error));
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
      setActionError(messageOf(error));
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
      setActionError(messageOf(error));
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
  const banner = actionError ?? loadError;

  function handleKey(key: KeyEvent): boolean {
    const name = key.name;
    const lower = name.toLowerCase();
    const meta = key.meta === true || key.option === true;
    const plainChar = (char: string): boolean =>
      !key.ctrl && !meta && key.shift !== true && name === char;
    const shiftChar = (char: string): boolean =>
      !key.ctrl && !meta && (name === char.toUpperCase() || (lower === char && key.shift === true));

    // Form: only intercept the keys the screen owns; typing reaches the field.
    if (form.open) {
      if (name === "escape") {
        closeForm();
        return true;
      }
      // Ctrl+Enter submits from any field (including the description area).
      // Terminals report it as return, kpenter, or linefeed depending on mode.
      if (key.ctrl && (name === "return" || name === "kpenter" || name === "linefeed")) {
        void submitForm();
        return true;
      }
      if (name === "tab") {
        cycleFormField(key.shift ? -1 : 1);
        return true;
      }
      if (name === "return") {
        if (form.field === "description") {
          return false;
        }
        void submitForm();
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

    // Browsing: Ctrl+D pages (Ctrl+Shift+D still reaches the mock panel).
    if (key.ctrl && !key.shift) {
      if (name === "d") {
        moveSelection(visibleCount);
        return true;
      }
      if (name === "u") {
        moveSelection(-visibleCount);
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
      <box flexDirection="row" flexShrink={0} gap={1} paddingTop={1} paddingBottom={1}>
        <text fg={color(tokens.fgMuted)}>{"Search"}</text>
        <input
          focused={searchActive}
          value={search}
          placeholder="title or description"
          onInput={(value) => setSearch(value)}
          flexGrow={1}
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

      {banner !== null ? (
        <box height={1} flexShrink={0}>
          <text fg={color(tokens.danger)} wrapMode="none">
            {truncate(`${banner}${archivedOpen ? "" : "  (r to retry)"}`, Math.max(8, width - 2))}
          </text>
        </box>
      ) : null}

      {loading ? (
        <TodoSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState title="No todos yet." hint="n to add your first todo" />
      ) : wide ? (
        <box flexDirection="row" flexGrow={1} gap={1}>
          {COLUMNS.map((status, index) => (
            <KanbanColumn
              key={status}
              status={status}
              label={COLUMN_LABELS[status]}
              items={windowSlice(byStatus[status], selectedIndexIn(status), visibleCount)}
              count={byStatus[status].length}
              selectedId={index === focusedColumn ? selectedId : null}
              compact={compact}
              columnWidth={wideColumnWidth}
              flex={true}
            />
          ))}
        </box>
      ) : (
        <box flexDirection="column" flexGrow={1}>
          <box flexDirection="row" height={1} flexShrink={0} gap={1}>
            {COLUMNS.map((status, index) => {
              const active = index === focusedColumn;
              const label = `${COLUMN_LABELS[status]} ${byStatus[status].length}`;
              return (
                <text key={status} wrapMode="none">
                  <span fg={color(active ? tokens.accent : tokens.fgMuted)}>
                    {active ? `[ ${label} ]` : label}
                  </span>
                </text>
              );
            })}
          </box>
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
            columnWidth={columnWidth}
            flex={false}
          />
        </box>
      )}

      <box height={1} flexShrink={0}>
        <text fg={color(notice !== null ? tokens.success : tokens.fgSubtle)} wrapMode="none">
          {truncate(notice ?? footerHint, Math.max(8, width - 2))}
        </text>
      </box>

      {form.open ? (
        <TodoForm
          editing={form.editing}
          focusedField={form.field}
          values={form.values}
          error={form.error}
          saving={form.saving}
          descriptionRef={descriptionRef}
          onPatch={patchForm}
          onDescriptionChange={() => {
            setForm((current) => (current.error === null ? current : { ...current, error: null }));
          }}
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

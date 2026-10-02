import type { KeyEvent, TextareaRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { DateRangeBar } from "../components/work-log/DateRangeBar";
import { WeekGroupHeader } from "../components/work-log/WeekGroupHeader";
import { WorkLogForm } from "../components/work-log/WorkLogForm";
import type { WorkLogFormField, WorkLogFormValues } from "../components/work-log/WorkLogForm.types";
import { WorkLogRow } from "../components/work-log/WorkLogRow";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useKeyboardScope } from "../hooks/useKeyboardScope";
import type { WorkLog, WorkLogFilter } from "../repos/types";
import { getRepos } from "../store/repos";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { useWorkLogs } from "../store/workLogs";
import { useTheme } from "../theme/ThemeProvider";
import {
  addDaysISO,
  firstOfMonthISO,
  isValidISODate,
  mondayOfWeekISO,
  todayISO,
} from "../utils/date";
import { messageOf } from "../utils/error";
import { truncate } from "../utils/text";
import type {
  Notice,
  WorkLogConfirmState,
  WorkLogDateFocus,
  WorkLogFlatItem,
  WorkLogFormState,
} from "./WorkLogScreen.types";

const NARROW_MIN = 90;
const VERY_NARROW_MIN = 60;
const SEARCH_DEBOUNCE_MS = 300;
const NOTICE_MS = 2200;
/** Fixed geometry: a group header is 1 row, an entry row is 3 rows. */
const HEADER_ROWS = 1;
const ROW_ROWS = 3;
const FORM_FIELDS: WorkLogFormField[] = ["title", "description", "start", "end", "tags"];

const HINT = "j/k select  Enter edit  n add  d delete  / search  f date  1-3 preset  c clear";
const SEARCH_HINT = "Type to search  Enter done  Esc clear";
const DATE_HINT = "Type a date  Tab next field  Esc leave date field";

const EMPTY_FORM: WorkLogFormState = {
  open: false,
  editing: null,
  values: { title: "", startDate: "", endDate: "", tags: [] },
  field: "title",
  tagInput: "",
  suggestionIndex: 0,
  error: null,
  saving: false,
};

/** Loading placeholder: a header bar plus entry bars, matching the fixed row
 * geometry so the list does not jump when the real rows arrive. */
function GroupSkeleton(props: { width: number }): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const widths = [24, 46, 38, 30];
  return (
    <box flexDirection="column" flexShrink={0}>
      {widths.map((len) => (
        <text key={len} fg={color(tokens.bgHover)}>
          {"█".repeat(Math.max(6, Math.min(len, props.width)))}
        </text>
      ))}
    </box>
  );
}

function itemRows(item: WorkLogFlatItem): number {
  return item.kind === "header" ? HEADER_ROWS : ROW_ROWS;
}

/** Slice the flattened grouped list to `budget` rows, keeping the selected
 * item visible (roughly centered). Selection crosses group boundaries because
 * the input is already flat. */
function windowItems(
  items: WorkLogFlatItem[],
  selectedRow: number,
  budget: number,
): WorkLogFlatItem[] {
  if (items.length === 0 || budget <= 0) {
    return [];
  }
  let lo = selectedRow >= 0 && selectedRow < items.length ? selectedRow : 0;
  let hi = lo;
  let used = itemRows(items[lo]);
  const half = Math.max(1, Math.floor(budget / 2));
  while (lo - 1 >= 0 && used + itemRows(items[lo - 1]) <= half) {
    lo -= 1;
    used += itemRows(items[lo]);
  }
  while (hi + 1 < items.length && used + itemRows(items[hi + 1]) <= budget) {
    hi += 1;
    used += itemRows(items[hi]);
  }
  while (lo - 1 >= 0 && used + itemRows(items[lo - 1]) <= budget) {
    lo -= 1;
    used += itemRows(items[lo]);
  }
  return items.slice(lo, hi + 1);
}

export function WorkLogScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width, height } = useTerminalDimensions();

  const logs = useWorkLogs((state) => state.logs);
  const groups = useWorkLogs((state) => state.groups);
  const allTags = useWorkLogs((state) => state.allTags);
  const loading = useWorkLogs((state) => state.loading);
  const filter = useWorkLogs((state) => state.filter);
  const error = useWorkLogs((state) => state.error);
  const scenario = useSession((state) => state.scenario);
  const latencyMs = useSession((state) => state.latencyMs);
  const sidebarCollapsed = useUi((state) => state.sidebarCollapsed);

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dateFocus, setDateFocus] = useState<WorkLogDateFocus>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkLogFormState>(EMPTY_FORM);
  const [confirm, setConfirm] = useState<WorkLogConfirmState | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const descriptionRef = useRef<TextareaRenderable | null>(null);
  // Mirrors `search` for the load effect's stale-debounce guard.
  const searchRef = useRef("");
  // Serialized effective filter, so invalid intermediate dates and stale
  // search values do not trigger redundant refetches.
  const appliedRef = useRef("");

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const narrow = width < NARROW_MIN;
  const veryNarrow = width < VERY_NARROW_MIN;
  const sideWidth = width < 60 ? 0 : sidebarCollapsed || width < 80 ? 2 : 22;
  const contentWidth = Math.max(20, width - sideWidth - 2);
  // The list lives in a bordered panel: two border cells plus one padding cell
  // on each side. Rows budget against the inner text width.
  const panelInnerWidth = Math.max(16, contentWidth - 4);
  const dateBarRows = veryNarrow ? 3 : 1;
  // Rows outside the list panel: the app header and status line, the bordered
  // search box, the spacer under it, the date bar, and the footer.
  const listPanelRows = Math.max(3, height - 2 - 3 - 1 - dateBarRows - 1);
  const bodyHeight = Math.max(3, listPanelRows - 2);

  const hasFilters =
    filter.query !== undefined || filter.dateFrom !== undefined || filter.dateTo !== undefined;

  const selected = logs.find((log) => log.id === selectedId) ?? null;

  // The flattened render list (group header + its rows) and the selected row's
  // position in it, so the window can keep the selection visible.
  const items = useMemo<WorkLogFlatItem[]>(() => {
    const out: WorkLogFlatItem[] = [];
    for (const group of groups) {
      out.push({
        kind: "header",
        weekKey: group.weekKey,
        label: group.label,
        count: group.logs.length,
      });
      for (const log of group.logs) {
        out.push({ kind: "row", log });
      }
    }
    return out;
  }, [groups]);

  const selectedItemIndex = useMemo(() => {
    if (selectedId === null) {
      return -1;
    }
    return items.findIndex((item) => item.kind === "row" && item.log.id === selectedId);
  }, [items, selectedId]);

  const visibleItems = useMemo(
    () => windowItems(items, selectedItemIndex, bodyHeight),
    [items, selectedItemIndex, bodyHeight],
  );

  const formSuggestions = useMemo(() => {
    const needle = form.tagInput.trim().toLowerCase();
    return allTags.filter(
      (name) => !form.values.tags.includes(name) && (needle === "" || name.includes(needle)),
    );
  }, [allTags, form.tagInput, form.values.tags]);

  // -- Loading and filtering -------------------------------------------------

  // Single load path: mount, mock scenario/latency change, debounced search,
  // and the date bounds all resolve here. An unfiltered state takes the
  // skeleton load; a filtered state refetches silently and keeps the previous
  // list on failure. `appliedRef` drops redundant runs (typing an incomplete
  // date, or a stale debounced search).
  useEffect(() => {
    void scenario;
    void latencyMs;
    if (searchRef.current.trim() === "" && debouncedSearch.trim() !== "") {
      return;
    }
    const query = debouncedSearch.trim();
    const dateFrom = isValidISODate(from) ? from : undefined;
    const dateTo = isValidISODate(to) ? to : undefined;
    const next: WorkLogFilter = {
      ...(query === "" ? {} : { query }),
      ...(dateFrom === undefined ? {} : { dateFrom }),
      ...(dateTo === undefined ? {} : { dateTo }),
    };
    const key = `${scenario}|${latencyMs}|${query}|${dateFrom ?? ""}|${dateTo ?? ""}`;
    if (key === appliedRef.current) {
      return;
    }
    appliedRef.current = key;
    if (query === "" && dateFrom === undefined && dateTo === undefined) {
      void useWorkLogs.getState().loadWorkLogs();
    } else {
      void useWorkLogs.getState().applyFilter(next);
    }
  }, [scenario, latencyMs, debouncedSearch, from, to]);

  // Keep the selection valid as filtering and deletes change the list.
  useEffect(() => {
    if (logs.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }
    if (selectedId === null || !logs.some((log) => log.id === selectedId)) {
      setSelectedId(logs[0].id);
    }
  }, [logs, selectedId]);

  useEffect(() => {
    if (notice === null) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  // A focused control defers the global bindings so typed characters reach it;
  // this scope still runs first for Tab/Esc/Enter.
  const fieldOwned = form.open || searchFocused || dateFocus !== "none";
  useEffect(() => {
    useUi.getState().setFocusedField(fieldOwned ? "worklog-field" : null);
    return () => {
      useUi.getState().setFocusedField(null);
    };
  }, [fieldOwned]);

  // -- Selection -------------------------------------------------------------

  function moveSelection(delta: number): void {
    if (logs.length === 0) {
      return;
    }
    const current = selectedId === null ? -1 : logs.findIndex((log) => log.id === selectedId);
    const next = Math.min(logs.length - 1, Math.max(0, current + delta));
    setSelectedId(logs[next].id);
  }

  function selectFirst(): void {
    if (logs.length > 0) {
      setSelectedId(logs[0].id);
    }
  }

  function selectLast(): void {
    if (logs.length > 0) {
      setSelectedId(logs[logs.length - 1].id);
    }
  }

  // -- Filters ---------------------------------------------------------------

  function applyPreset(preset: "this-week" | "last-week" | "this-month"): void {
    const today = todayISO();
    if (preset === "this-week") {
      setFrom(mondayOfWeekISO(0));
      setTo(today);
      return;
    }
    if (preset === "last-week") {
      const monday = mondayOfWeekISO(-1);
      setFrom(monday);
      setTo(addDaysISO(monday, 6));
      return;
    }
    setFrom(firstOfMonthISO());
    setTo(today);
  }

  function clearFilters(): void {
    searchRef.current = "";
    setSearch("");
    setFrom("");
    setTo("");
    setDateFocus("none");
    setSearchFocused(false);
  }

  // -- Form ------------------------------------------------------------------

  function openCreate(): void {
    setSearchFocused(false);
    setDateFocus("none");
    setForm({
      open: true,
      editing: null,
      values: { title: "", startDate: todayISO(), endDate: todayISO(), tags: [] },
      field: "title",
      tagInput: "",
      suggestionIndex: 0,
      error: null,
      saving: false,
    });
  }

  function openEdit(log: WorkLog): void {
    setSearchFocused(false);
    setDateFocus("none");
    setForm({
      open: true,
      editing: log,
      values: {
        title: log.title,
        startDate: log.startDate,
        endDate: log.endDate,
        tags: [...log.tags],
      },
      field: "title",
      tagInput: "",
      suggestionIndex: 0,
      error: null,
      saving: false,
    });
  }

  function closeForm(): void {
    setForm(EMPTY_FORM);
  }

  function patchForm(patch: Partial<WorkLogFormValues>): void {
    setForm((current) => ({
      ...current,
      values: { ...current.values, ...patch },
      error: null,
    }));
  }

  function cycleFormField(delta: number): void {
    setForm((current) => {
      const index = FORM_FIELDS.indexOf(current.field);
      const next = (index + delta + FORM_FIELDS.length) % FORM_FIELDS.length;
      return { ...current, field: FORM_FIELDS[next] };
    });
  }

  function addFormTag(raw: string): void {
    const name = raw.trim().toLowerCase().replace(/\s+/g, "-");
    setForm((current) => {
      if (name === "" || current.values.tags.includes(name)) {
        return { ...current, tagInput: "", suggestionIndex: 0 };
      }
      return {
        ...current,
        values: { ...current.values, tags: [...current.values.tags, name] },
        tagInput: "",
        suggestionIndex: 0,
        error: null,
      };
    });
  }

  function removeLastFormTag(): void {
    setForm((current) => ({
      ...current,
      values: { ...current.values, tags: current.values.tags.slice(0, -1) },
    }));
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
    const startDate = values.startDate.trim();
    if (!isValidISODate(startDate)) {
      setForm((current) => ({ ...current, error: "Use YYYY-MM-DD", field: "start" }));
      return;
    }
    const endDate = values.endDate.trim();
    if (!isValidISODate(endDate)) {
      setForm((current) => ({ ...current, error: "Use YYYY-MM-DD", field: "end" }));
      return;
    }
    if (startDate > endDate) {
      setForm((current) => ({
        ...current,
        error: "End date must be on or after start date",
        field: "end",
      }));
      return;
    }
    const descriptionText = (descriptionRef.current?.plainText ?? "").trim();
    const description = descriptionText === "" ? null : descriptionText;
    setForm((current) => ({ ...current, saving: true, error: null }));
    try {
      if (form.editing !== null) {
        const id = form.editing.id;
        const patch = { title, description, startDate, endDate, tags: [...values.tags] };
        await getRepos().workLogs.update(id, patch);
        useWorkLogs.getState().patchWorkLog(id, patch);
        await useWorkLogs.getState().reloadTags();
        setForm(EMPTY_FORM);
        setSelectedId(id);
        setNotice({ text: "Entry updated", kind: "success" });
      } else {
        const created = await getRepos().workLogs.create({
          title,
          description,
          startDate,
          endDate,
          tags: [...values.tags],
        });
        useWorkLogs.getState().addWorkLog(created);
        await useWorkLogs.getState().reloadTags();
        setForm(EMPTY_FORM);
        setSelectedId(created.id);
        setNotice({ text: "Entry added", kind: "success" });
      }
    } catch (saveError) {
      // The form stays open with the error inline.
      setForm((current) => ({ ...current, saving: false, error: messageOf(saveError) }));
    }
  }

  // -- Delete ----------------------------------------------------------------

  function requestDelete(): void {
    if (selected === null) {
      return;
    }
    setSearchFocused(false);
    setDateFocus("none");
    setConfirm({ id: selected.id, title: selected.title });
  }

  async function runDelete(): Promise<void> {
    const current = confirm;
    setConfirm(null);
    if (current === null) {
      return;
    }
    useWorkLogs.getState().removeWorkLog(current.id);
    try {
      await getRepos().workLogs.remove(current.id);
      setNotice({ text: "Entry deleted", kind: "success" });
    } catch (deleteError) {
      setNotice({ text: `Delete failed: ${messageOf(deleteError)}`, kind: "danger" });
      void useWorkLogs.getState().refreshWorkLogs();
    }
  }

  // -- Keyboard scope --------------------------------------------------------

  function handleKey(key: KeyEvent): boolean {
    const name = key.name;
    const lower = name.toLowerCase();
    const meta = key.meta === true || key.option === true;
    const plainChar = (char: string): boolean =>
      !key.ctrl && !meta && key.shift !== true && name === char;
    const shiftChar = (char: string): boolean =>
      !key.ctrl && !meta && (name === char.toUpperCase() || (lower === char && key.shift === true));

    if (form.open) {
      if (name === "escape") {
        closeForm();
        return true;
      }
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
        if (form.field === "tags") {
          addFormTag(formSuggestions[form.suggestionIndex] ?? form.tagInput);
          return true;
        }
        void submitForm();
        return true;
      }
      if (name === "down" && form.field === "tags") {
        setForm((current) => ({
          ...current,
          suggestionIndex: Math.min(
            Math.max(0, formSuggestions.length - 1),
            current.suggestionIndex + 1,
          ),
        }));
        return true;
      }
      if (name === "up" && form.field === "tags") {
        setForm((current) => ({
          ...current,
          suggestionIndex: Math.max(0, current.suggestionIndex - 1),
        }));
        return true;
      }
      if (name === "backspace" && form.field === "tags" && form.tagInput === "") {
        removeLastFormTag();
        return true;
      }
      if (key.ctrl && (name === "d" || name === "u" || name === "p")) {
        return true;
      }
      return false;
    }

    if (confirm !== null) {
      if (name === "return" || plainChar("y")) {
        void runDelete();
        return true;
      }
      if (name === "escape" || plainChar("n")) {
        setConfirm(null);
        return true;
      }
      return !meta;
    }

    if (searchFocused) {
      if (name === "escape") {
        searchRef.current = "";
        setSearch("");
        setSearchFocused(false);
        return true;
      }
      if (name === "return") {
        setSearchFocused(false);
        return true;
      }
      if (name === "tab") {
        setSearchFocused(false);
        setDateFocus("from");
        return true;
      }
      return false;
    }

    // A date field owns its keys (the `<input>` types). Tab switches fields and
    // Esc leaves; presets and `c` must not fire while typing a date.
    if (dateFocus !== "none") {
      if (name === "escape" || name === "return") {
        setDateFocus("none");
        return true;
      }
      if (name === "tab" || name === "backtab") {
        setDateFocus(dateFocus === "from" ? "to" : "from");
        return true;
      }
      return false;
    }

    if (key.ctrl || meta) {
      return false;
    }

    if (shiftChar("g")) {
      selectLast();
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
      selectFirst();
      return true;
    }
    if (name === "return") {
      if (selected !== null) {
        openEdit(selected);
      }
      return true;
    }
    if (plainChar("n")) {
      openCreate();
      return true;
    }
    if (plainChar("d")) {
      requestDelete();
      return true;
    }
    if (name === "/") {
      setDateFocus("none");
      setSearchFocused(true);
      return true;
    }
    if (plainChar("f")) {
      setSearchFocused(false);
      setDateFocus("from");
      return true;
    }
    if (name === "1") {
      applyPreset("this-week");
      return true;
    }
    if (name === "2") {
      applyPreset("last-week");
      return true;
    }
    if (name === "3") {
      applyPreset("this-month");
      return true;
    }
    if (plainChar("c")) {
      clearFilters();
      return true;
    }
    if (name === "escape") {
      if (search !== "") {
        searchRef.current = "";
        setSearch("");
        return true;
      }
      if (from !== "" || to !== "") {
        setFrom("");
        setTo("");
        return true;
      }
      return false;
    }
    if (plainChar("r") && error !== null) {
      void useWorkLogs.getState().retry();
      return true;
    }
    return false;
  }

  useKeyboardScope(handleKey);

  // -- Render ----------------------------------------------------------------

  const hintText = searchFocused ? SEARCH_HINT : dateFocus !== "none" ? DATE_HINT : HINT;
  const showError = error !== null && logs.length > 0;
  const footerText = notice?.text ?? (showError ? `${error}  (r to retry)` : hintText);
  const footerColor =
    notice !== null
      ? notice.kind === "success"
        ? tokens.success
        : tokens.danger
      : showError
        ? tokens.danger
        : tokens.fgSubtle;
  // The list keeps the default focus; the search, date fields, form, and confirm
  // each take it over, so the panel border only lights when the list is active.
  const listFocused = !form.open && !searchFocused && dateFocus === "none" && confirm === null;
  const panelTitle = truncate(`Entries (${logs.length})`, Math.max(6, contentWidth - 4));

  return (
    <box flexDirection="column" flexGrow={1} minHeight={0} backgroundColor={color(tokens.bg)}>
      {/* Bordered search field, matching the other list screens. The `n add`
          affordance moved into the footer hint so the box stays one control. */}
      <box
        flexShrink={0}
        border
        borderStyle="single"
        borderColor={color(searchFocused ? tokens.borderFocus : tokens.borderMuted)}
        title=" Search "
        titleColor={color(searchFocused ? tokens.accent : tokens.fgMuted)}
        paddingLeft={1}
        paddingRight={1}
        height={3}
      >
        <input
          focused={searchFocused}
          value={search}
          placeholder="Search entries..."
          onInput={(value) => {
            searchRef.current = value;
            setSearch(value);
          }}
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

      <box height={1} flexShrink={0} />

      <DateRangeBar
        from={from}
        to={to}
        fromFocused={dateFocus === "from"}
        toFocused={dateFocus === "to"}
        veryNarrow={veryNarrow}
        width={contentWidth}
        onFromChange={setFrom}
        onToChange={setTo}
      />

      {/* The entries list shares one titled panel across loading, empty, and
          loaded states. */}
      <box
        flexDirection="column"
        flexGrow={1}
        minHeight={0}
        border
        borderStyle="single"
        borderColor={color(listFocused ? tokens.borderFocus : tokens.borderMuted)}
        title={` ${panelTitle} `}
        titleColor={color(listFocused ? tokens.accent : tokens.fgMuted)}
        paddingLeft={1}
        paddingRight={1}
      >
        {loading ? (
          <>
            <GroupSkeleton width={panelInnerWidth} />
            <GroupSkeleton width={panelInnerWidth} />
          </>
        ) : logs.length === 0 ? (
          error !== null ? (
            <EmptyState title="Entries could not load" hint={`${error}  (r to retry)`} />
          ) : (
            <EmptyState
              title={hasFilters ? "No entries match your filters" : "No entries yet"}
              hint={
                hasFilters
                  ? "Try adjusting your search or date range"
                  : "Start logging what you work on each day"
              }
            />
          )
        ) : (
          visibleItems.map((item) =>
            item.kind === "header" ? (
              <WeekGroupHeader
                key={`header-${item.weekKey}`}
                label={item.label}
                count={item.count}
                width={panelInnerWidth}
              />
            ) : (
              <WorkLogRow
                key={item.log.id}
                log={item.log}
                selected={item.log.id === selectedId}
                width={panelInnerWidth}
                narrow={narrow}
                veryNarrow={veryNarrow}
              />
            ),
          )
        )}
      </box>

      <box height={1} flexShrink={0}>
        <text fg={color(footerColor)} wrapMode="none">
          {truncate(footerText, Math.max(8, contentWidth))}
        </text>
      </box>

      {form.open ? (
        <WorkLogForm
          editing={form.editing}
          focusedField={form.field}
          values={form.values}
          tagInput={form.tagInput}
          suggestions={formSuggestions}
          suggestionIndex={form.suggestionIndex}
          error={form.error}
          saving={form.saving}
          descriptionRef={descriptionRef}
          onPatch={patchForm}
          onTagInputChange={(value) =>
            setForm((current) => ({ ...current, tagInput: value, suggestionIndex: 0 }))
          }
          onDescriptionChange={() => {
            setForm((current) => (current.error === null ? current : { ...current, error: null }));
          }}
        />
      ) : null}

      {confirm !== null ? (
        <ConfirmDialog
          title="Delete entry?"
          body={`Delete "${selected?.title ?? confirm.title}" permanently? This cannot be undone.`}
          confirmLabel="Delete"
          destructive={true}
        />
      ) : null}
    </box>
  );
}

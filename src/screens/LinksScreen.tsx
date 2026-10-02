import type { KeyEvent } from "@opentui/core";
import { useRenderer, useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { screenHint } from "../commands/registry";
import { LinkForm } from "../components/links/LinkForm";
import type { LinkFormField, LinkFormValues } from "../components/links/LinkForm.types";
import { LinkRow } from "../components/links/LinkRow";
import { TagFilterBar } from "../components/links/TagFilterBar";
import { fitTagPills } from "../components/links/tag-pills";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useKeyboardScope } from "../hooks/useKeyboardScope";
import { openUrl } from "../lib/open-url";
import type { Link } from "../repos/types";
import { useLinks } from "../store/links";
import { getRepos } from "../store/repos";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { messageOf, operationError, retryableError } from "../utils/error";
import { linkDomain, linkScheme } from "../utils/links";
import { isReadOnlyRow, wheelDelta } from "../utils/mouse";
import { truncate } from "../utils/text";
import { windowSlice } from "../utils/window";
import type { LinkConfirmState, LinkFormState } from "./LinksScreen.types";

const NARROW_MIN = 90;
const VERY_NARROW_MIN = 60;
const SEARCH_DEBOUNCE_MS = 300;
const NOTICE_MS = 2200;
/** Wide rows are title + meta + divider; narrow rows add a tags line. */
const ROW_ROWS_WIDE = 3;
const ROW_ROWS_NARROW = 4;
const FORM_FIELDS: LinkFormField[] = ["url", "title", "tags"];

const HINT = screenHint("links");
const PILL_HINT = "tab/shift+tab cycle tags  enter apply or clear  esc back to list";
const SEARCH_HINT = "Type to search  enter done  esc clear";
const EDIT_HINT = "enter save title  esc revert";

const EMPTY_FORM: LinkFormState = {
  open: false,
  values: { url: "", title: "", tags: [] },
  field: "url",
  tagInput: "",
  suggestionIndex: 0,
  error: null,
  saving: false,
};

interface Notice {
  text: string;
  kind: "success" | "danger";
}

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function LinksScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width, height } = useTerminalDimensions();
  const renderer = useRenderer();

  const links = useLinks((state) => state.links);
  const allTags = useLinks((state) => state.allTags);
  const loading = useLinks((state) => state.loading);
  const mode = useLinks((state) => state.mode);
  const tag = useLinks((state) => state.tag);
  const hasMore = useLinks((state) => state.hasMore);
  const loadingMore = useLinks((state) => state.loadingMore);
  const total = useLinks((state) => state.total);
  const error = useLinks((state) => state.error);
  const scenario = useSession((state) => state.scenario);
  const latencyMs = useSession((state) => state.latencyMs);
  const sidebarCollapsed = useUi((state) => state.sidebarCollapsed);

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [pillFocused, setPillFocused] = useState(false);
  const [tagIndex, setTagIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [form, setForm] = useState<LinkFormState>(EMPTY_FORM);
  const [confirm, setConfirm] = useState<LinkConfirmState | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  // Mirrors `search` so the load effect can read the live value for its stale
  // guard without taking a dependency on every keystroke.
  const searchRef = useRef("");

  function changeSearch(value: string): void {
    searchRef.current = value;
    setSearch(value);
  }

  const narrow = width < NARROW_MIN;
  const veryNarrow = width < VERY_NARROW_MIN;
  const sideWidth = width < 60 ? 0 : sidebarCollapsed || width < 80 ? 2 : 22;
  const listWidth = Math.max(20, width - sideWidth - 2);
  // The list lives in a bordered panel: two border cells plus one padding cell
  // on each side. Rows budget against the inner text width so a fixed-width row
  // can never push a renderable to wrap.
  const panelInnerWidth = Math.max(16, listWidth - 4);
  const rowRows = narrow ? ROW_ROWS_NARROW : ROW_ROWS_WIDE;
  // Rows outside the list panel: the app header and status line, the bordered
  // search box, the spacer under it, the tag pill row, and the footer.
  const panelRows = Math.max(3, height - 2 - 3 - 1 - 1 - 1);
  // The panel spends two rows on its border; the sentinel line ("j to load
  // more"/"all shown") takes one more and is not a saved link.
  const sentinelRows = loadingMore ? 5 : 1;
  const visibleCount = Math.max(1, Math.floor((panelRows - 2 - sentinelRows) / rowRows));

  // The pill row is width-fit once here so the cursor and Enter always operate
  // on pills that are actually rendered (`all` first).
  const pills = useMemo(() => fitTagPills(allTags, listWidth), [allTags, listWidth]);
  const pillsTruncated = pills.length < allTags.length + 1;
  const selectedLink = links.find((link) => link.id === selectedId) ?? null;
  const selectedIndex =
    selectedId === null ? -1 : links.findIndex((link) => link.id === selectedId);
  const visibleLinks = windowSlice(links, selectedIndex, visibleCount);

  const formSuggestions = useMemo(() => {
    const needle = form.tagInput.trim().toLowerCase();
    return allTags.filter(
      (name) => !form.values.tags.includes(name) && (needle === "" || name.includes(needle)),
    );
  }, [allTags, form.tagInput, form.values.tags]);

  // -- Loading and filtering -------------------------------------------------

  // Single first-page load path: mount, mock scenario/latency change, debounced
  // search, and tag filter all resolve here. The stale-debounce guard matches
  // the desktop link list: applying a tag clears `search` synchronously while
  // `debouncedSearch` still lags, so a non-empty stale value must not win.
  useEffect(() => {
    void scenario;
    void latencyMs;
    if (searchRef.current.trim() === "" && debouncedSearch.trim() !== "") {
      return;
    }
    if (debouncedSearch.trim() !== "") {
      void useLinks.getState().searchLinks(debouncedSearch.trim());
    } else if (tag !== null) {
      void useLinks.getState().filterByTag(tag);
    } else {
      void useLinks.getState().loadLinks();
    }
    // `searchRef` is read for the stale guard only; taking a dependency on the
    // live `search` would refetch on every keystroke instead of once per debounce
    // window.
  }, [scenario, latencyMs, debouncedSearch, tag]);

  // Keep the selection valid as filtering and deletes change the list.
  useEffect(() => {
    if (links.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }
    if (selectedId === null || !links.some((link) => link.id === selectedId)) {
      setSelectedId(links[0].id);
    }
  }, [links, selectedId]);

  // Clamp the pill cursor into the fitted pill list as it changes.
  useEffect(() => {
    setTagIndex((index) => Math.min(index, Math.max(0, pills.length - 1)));
  }, [pills.length]);

  // Keep the pill cursor on the applied tag when its pill is visible; an
  // applied tag dropped at the width limit leaves the cursor on `all`.
  useEffect(() => {
    if (tag === null) {
      setTagIndex(0);
      return;
    }
    const index = pills.findIndex((pill) => pill.tag === tag);
    setTagIndex(index === -1 ? 0 : index);
  }, [tag, pills]);

  useEffect(() => {
    if (notice === null) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  // A focused field defers the global bindings so typed characters reach the
  // control; the screen scope still runs first for Tab/Esc/Enter.
  const fieldOwned = form.open || searchFocused || editing !== null;
  useEffect(() => {
    useUi.getState().setFocusedField(fieldOwned ? "links-field" : null);
    return () => {
      useUi.getState().setFocusedField(null);
    };
  }, [fieldOwned]);

  // -- Selection and navigation ---------------------------------------------

  function moveUp(): void {
    if (links.length === 0) {
      return;
    }
    const current = selectedId === null ? -1 : links.findIndex((link) => link.id === selectedId);
    const next = Math.min(links.length - 1, Math.max(0, current - 1));
    setSelectedId(links[next].id);
  }

  async function moveDown(): Promise<void> {
    if (links.length === 0) {
      return;
    }
    const current = selectedId === null ? -1 : links.findIndex((link) => link.id === selectedId);
    if (current < links.length - 1) {
      setSelectedId(links[current + 1].id);
      return;
    }
    // At the bottom sentinel: load the next page, then advance into it.
    if (!hasMore) {
      return;
    }
    await useLinks.getState().loadMore();
    const after = useLinks.getState().links;
    const index = selectedId === null ? -1 : after.findIndex((link) => link.id === selectedId);
    if (index >= 0 && index < after.length - 1) {
      setSelectedId(after[index + 1].id);
    }
  }

  // -- Open, copy, and URL fallback -----------------------------------------

  function copyText(text: string): boolean {
    return renderer.copyToClipboardOSC52(text);
  }

  function copyWithFallback(link: Link, prefix: string): void {
    const copied = copyText(link.url);
    setNotice(
      copied
        ? { text: `${prefix}; copied ${link.url}`, kind: "danger" }
        : { text: `${prefix}; copy failed`, kind: "danger" },
    );
  }

  async function openSelected(): Promise<void> {
    const link = selectedLink;
    if (link === null) {
      return;
    }
    const scheme = linkScheme(link.url);
    if (scheme !== "http" && scheme !== "https") {
      copyWithFallback(link, `Cannot open ${scheme === "" ? "this" : `${scheme}:`} link`);
      return;
    }
    const result = await openUrl(link.url);
    if (result.ok) {
      setNotice({ text: `Opened ${linkDomain(link.url)}`, kind: "success" });
      return;
    }
    copyWithFallback(link, "Could not open link");
  }

  // Plain `c` copies the selected link's URL. The global `Ctrl+C` copies the
  // terminal text selection instead, so the two shortcuts are distinct and do
  // not conflict.
  function copySelected(): void {
    const link = selectedLink;
    if (link === null) {
      return;
    }
    const copied = copyText(link.url);
    setNotice(
      copied
        ? { text: `Copied ${link.url}`, kind: "success" }
        : { text: "Copy failed", kind: "danger" },
    );
  }

  // -- Inline title edit -----------------------------------------------------

  function startEdit(target: Link | null = selectedLink): void {
    const link = target;
    if (link === null) {
      return;
    }
    // `large` clones are read-only: Enter/activate selects without entering
    // the inline editor whose save can only fail.
    if (isReadOnlyRow(link.id)) {
      return;
    }
    setPillFocused(false);
    setEditing({ id: link.id, value: link.title });
  }

  async function commitEdit(): Promise<void> {
    const current = editing;
    setEditing(null);
    if (current === null) {
      return;
    }
    const trimmed = current.value.trim();
    const link = useLinks.getState().links.find((item) => item.id === current.id);
    if (link === undefined || trimmed === "" || trimmed === link.title) {
      return;
    }
    useLinks.getState().patchLinkInList(current.id, { title: trimmed });
    try {
      await getRepos().links.update(current.id, { title: trimmed });
    } catch (writeError) {
      // Revert the optimistic title and report the failure.
      useLinks.getState().patchLinkInList(current.id, { title: link.title });
      setNotice({ text: operationError("Could not save title", writeError), kind: "danger" });
    }
  }

  // -- Delete ----------------------------------------------------------------

  function requestDelete(): void {
    const link = selectedLink;
    if (link === null) {
      return;
    }
    setPillFocused(false);
    setConfirm({ id: link.id, title: link.title });
  }

  async function runDelete(): Promise<void> {
    const current = confirm;
    setConfirm(null);
    if (current === null) {
      return;
    }
    useLinks.getState().removeLink(current.id);
    try {
      await getRepos().links.remove(current.id);
      setNotice({ text: "Link deleted", kind: "success" });
    } catch (deleteError) {
      setNotice({ text: `Delete failed: ${messageOf(deleteError)}`, kind: "danger" });
      void useLinks.getState().refreshLinks();
    }
  }

  // -- Save form -------------------------------------------------------------

  function openForm(): void {
    setSearchFocused(false);
    setPillFocused(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM, open: true, values: { url: "", title: "", tags: [] } });
  }

  function closeForm(): void {
    setForm(EMPTY_FORM);
  }

  function patchForm(patch: Partial<LinkFormValues>): void {
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
    const name = normalizeTag(raw);
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
    const rawUrl = values.url.trim();
    let domain = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      domain = parsed.hostname === "" ? rawUrl : parsed.hostname.replace(/^www\./, "");
    } catch (parseError) {
      setForm((current) => ({ ...current, error: messageOf(parseError), field: "url" }));
      return;
    }
    setForm((current) => ({ ...current, saving: true, error: null }));
    try {
      if (await getRepos().links.checkDuplicateUrl(rawUrl)) {
        setForm((current) => ({
          ...current,
          saving: false,
          error: "This link is already saved",
          field: "url",
        }));
        return;
      }
      const title = values.title.trim() === "" ? domain : values.title.trim();
      const created = await getRepos().links.create({ url: rawUrl, title, tags: values.tags });
      useLinks.getState().addLink(created);
      await useLinks.getState().reloadTags();
      // Under an active filter/search the prepended row may not belong in the
      // visible list, so reconcile from the repo instead of leaving a stray row
      // and an inflated total until the next refresh.
      if (useLinks.getState().mode !== "all") {
        await useLinks.getState().refreshLinks();
      }
      setForm(EMPTY_FORM);
      setSelectedId(created.id);
      setNotice({ text: "Link saved", kind: "success" });
    } catch (saveError) {
      setForm((current) => ({
        ...current,
        saving: false,
        error: operationError("Could not save link", saveError),
      }));
    }
  }

  // -- Tag pills -------------------------------------------------------------

  function movePill(delta: number): void {
    const count = pills.length;
    if (count === 0) {
      return;
    }
    setTagIndex((index) => (index + delta + count) % count);
  }

  function applyPill(index: number): void {
    const pill = pills[index];
    if (pill === undefined) {
      return;
    }
    changeSearch("");
    setSearchFocused(false);
    // `tag === null` is the clear-all pill; a user tag named `all` has tag
    // "all" and is applied (or cleared) like any other tag.
    if (pill.tag === null || pill.tag === tag) {
      setTagIndex(0);
      void useLinks.getState().loadLinks();
      return;
    }
    void useLinks.getState().filterByTag(pill.tag);
  }

  function clearFilter(): void {
    if (tag !== null) {
      setTagIndex(0);
      setPillFocused(false);
      void useLinks.getState().loadLinks();
      return;
    }
    if (search !== "") {
      changeSearch("");
      void useLinks.getState().loadLinks();
      return;
    }
    setPillFocused(false);
  }

  // -- Keyboard scope --------------------------------------------------------

  function handleKey(key: KeyEvent): boolean {
    const name = key.name;
    const meta = key.meta === true || key.option === true;
    const plain = (char: string): boolean =>
      !key.ctrl && !meta && key.shift !== true && name === char;

    if (confirm !== null) {
      if (name === "return" || plain("y")) {
        void runDelete();
        return true;
      }
      if (name === "escape" || plain("n")) {
        setConfirm(null);
        return true;
      }
      return !meta;
    }

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

    if (editing !== null) {
      if (name === "escape") {
        setEditing(null);
        return true;
      }
      if (name === "return") {
        void commitEdit();
        return true;
      }
      return false;
    }

    if (searchFocused) {
      if (name === "escape") {
        changeSearch("");
        setSearchFocused(false);
        return true;
      }
      if (name === "return") {
        setSearchFocused(false);
        return true;
      }
      if (name === "tab") {
        setSearchFocused(false);
        setPillFocused(true);
        return true;
      }
      return false;
    }

    if (key.ctrl || meta) {
      return false;
    }

    if (pillFocused) {
      if (name === "escape") {
        setPillFocused(false);
        return true;
      }
      if (name === "tab" || name === "backtab") {
        movePill(name === "backtab" || key.shift === true ? -1 : 1);
        return true;
      }
      if (name === "return") {
        applyPill(tagIndex);
        return true;
      }
      if (name === "left") {
        movePill(-1);
        return true;
      }
      if (name === "right") {
        movePill(1);
        return true;
      }
      if (plain("j") || name === "down" || plain("k") || name === "up") {
        setPillFocused(false);
        return true;
      }
      return false;
    }

    if (plain("j") || name === "down") {
      void moveDown();
      return true;
    }
    if (plain("k") || name === "up") {
      moveUp();
      return true;
    }
    if (name === "/") {
      setPillFocused(false);
      setSearchFocused(true);
      return true;
    }
    if (name === "return") {
      void openSelected();
      return true;
    }
    if (plain("e")) {
      startEdit();
      return true;
    }
    if (plain("c")) {
      copySelected();
      return true;
    }
    if (plain("d")) {
      requestDelete();
      return true;
    }
    if (plain("n")) {
      openForm();
      return true;
    }
    if ((name === "tab" && key.shift) || name === "backtab") {
      setPillFocused(true);
      setTagIndex(Math.max(0, pills.length - 1));
      return true;
    }
    if (name === "tab") {
      setPillFocused(true);
      return true;
    }
    if (name === "escape") {
      clearFilter();
      return true;
    }
    if (plain("r") && error !== null) {
      void useLinks.getState().retry();
      return true;
    }
    return false;
  }

  useKeyboardScope(handleKey);

  // -- Render ----------------------------------------------------------------

  const filtered = mode !== "all";
  const countLabel = total !== null ? `${links.length} of ${total}` : `${links.length}`;
  const panelTitle = truncate(`Links (${countLabel})`, Math.max(6, listWidth - 4));
  // The pagination affordance only means something once rows are on screen; an
  // empty or errored list already explains itself in the panel body.
  const statusText = links.length > 0 ? (hasMore ? "j to load more" : "all shown") : "";
  const hintText = pillFocused
    ? PILL_HINT
    : searchFocused
      ? SEARCH_HINT
      : editing !== null
        ? EDIT_HINT
        : HINT;
  const showError = error !== null && links.length > 0;
  const footerText =
    notice?.text ?? (showError ? retryableError("Links could not load", error) : hintText);
  const footerColor =
    notice !== null
      ? notice.kind === "success"
        ? tokens.success
        : tokens.danger
      : showError
        ? tokens.danger
        : tokens.fgSubtle;
  // The list keeps the default focus; the search, pills, inline edit, form, and
  // confirm each take it over, so the panel border only lights when the list is
  // actually the thing the keys act on.
  const listFocused =
    !pillFocused && !searchFocused && editing === null && !form.open && confirm === null;
  const footerRoom = Math.max(8, listWidth - statusText.length - 2);

  return (
    <box flexDirection="column" flexGrow={1} minHeight={0} backgroundColor={color(tokens.bg)}>
      {/* Bordered search field, matching the Todo board. The `n save` affordance
          moved into the footer hint so the box stays a single control. */}
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
          placeholder="title or url"
          onInput={(value) => changeSearch(value)}
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

      <TagFilterBar
        pills={pills}
        truncated={pillsTruncated}
        focusedIndex={tagIndex}
        focused={pillFocused}
        appliedTag={tag}
        onSelect={(index) => {
          setTagIndex(index);
          applyPill(index);
        }}
      />

      {/* The link list lives in one titled panel, so the empty, loading, and
          loaded states share the same frame. */}
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
        onMouseScroll={(event) => {
          const delta = wheelDelta(event);
          if (delta === 0) {
            return;
          }
          if (delta < 0) {
            moveUp();
          } else {
            void moveDown();
          }
        }}
      >
        {loading ? (
          <Skeleton lines={5} widths={[42, 26, 38, 22, 30]} />
        ) : links.length === 0 ? (
          error !== null ? (
            // Store errors are already stringified via `messageOf`, so this
            // raw interpolation is intentional; do not wrap it in
            // `operationError` or the message would be double-prefixed.
            <EmptyState
              title="Links could not load"
              hint={`${error ?? "Unknown error"}  (r to retry)`}
            />
          ) : (
            <EmptyState
              title={filtered ? "No links match your search" : "No links yet"}
              hint={filtered ? "Try a different search or tag" : "n to add your first link"}
            />
          )
        ) : (
          <>
            {visibleLinks.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                selected={link.id === selectedId}
                width={panelInnerWidth}
                narrow={narrow}
                veryNarrow={veryNarrow}
                editing={editing !== null && editing.id === link.id}
                editValue={editing !== null && editing.id === link.id ? editing.value : link.title}
                onEditChange={(value) => setEditing({ id: link.id, value })}
                onSelect={() => {
                  setPillFocused(false);
                  setSelectedId(link.id);
                }}
                onActivate={() => {
                  setPillFocused(false);
                  setSelectedId(link.id);
                  startEdit(link);
                }}
              />
            ))}
            {loadingMore ? (
              <>
                <Skeleton lines={2} widths={[42, 26]} />
                <text fg={color(tokens.fgSubtle)}>{"loading more"}</text>
              </>
            ) : (
              <text fg={color(tokens.fgSubtle)}>{hasMore ? "j to load more" : "all shown"}</text>
            )}
          </>
        )}
      </box>

      {/* One footer: the transient notice or load error on the left, the
          shown/loaded status on the right. */}
      <box flexDirection="row" height={1} flexShrink={0}>
        <text fg={color(footerColor)} wrapMode="none">
          {truncate(footerText, footerRoom)}
        </text>
        <box flexGrow={1} />
        <text fg={color(tokens.fgMuted)} wrapMode="none">
          {statusText}
        </text>
      </box>

      {form.open ? (
        <LinkForm
          values={form.values}
          focusedField={form.field}
          tagInput={form.tagInput}
          suggestions={formSuggestions}
          suggestionIndex={form.suggestionIndex}
          error={form.error}
          saving={form.saving}
          onPatch={patchForm}
          onTagInputChange={(value) => {
            setForm((current) => ({ ...current, tagInput: value, suggestionIndex: 0 }));
          }}
        />
      ) : null}

      {confirm !== null ? (
        <ConfirmDialog
          title="Delete link?"
          body={`Delete "${selectedLink?.title ?? confirm.title}" permanently? This cannot be undone.`}
          confirmLabel="Delete"
          destructive={true}
        />
      ) : null}
    </box>
  );
}

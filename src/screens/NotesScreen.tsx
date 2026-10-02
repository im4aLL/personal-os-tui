import type { KeyEvent, TextareaRenderable } from "@opentui/core";
import { useRenderer, useSelectionHandler, useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { screenHint } from "../commands/registry";
import { NoteEditorPane } from "../components/notes/NoteEditorPane";
import type { NoteEditorField } from "../components/notes/NoteEditorPane.types";
import { NoteListPane } from "../components/notes/NoteListPane";
import type { NoteEditorMode, NoteSaveStatus } from "../components/notes/NoteToolbar.types";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Modal } from "../components/ui/Modal";
import { useKeyboardScope } from "../hooks/useKeyboardScope";
import { exportNoteAsMarkdown, exportNoteAsTxt } from "../lib/export-note";
import { useNotes } from "../store/notes";
import { getRepos } from "../store/repos";
import { useSession } from "../store/session";
import { useTodos } from "../store/todos";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { messageOf, operationError, retryableError } from "../utils/error";
import { ACTIVE_GLYPH } from "../utils/marker";
import { isReadOnlyRow } from "../utils/mouse";
import { noteDisplayTitle } from "../utils/notes";
import { truncate } from "../utils/text";
import { windowSlice } from "../utils/window";
import type { NoteConfirmState, NoteNotice } from "./NotesScreen.types";

const WIDE_MIN = 100;
const TODO_TITLE_MAX_LENGTH = 100;
const SAVE_DEBOUNCE_MS = 1000;
const NOTICE_MS = 1500;
const SAVED_MS = 2000;
// A list row is 2 text lines plus a 1-row gap; the visible count derives from
// that fixed geometry, not from a user setting.
const LIST_ROW_ROWS = 3;

const HINT = screenHint("notes");

const EXPORT_OPTIONS = [
  { kind: "txt" as const, label: "Plain text (.txt)", detail: "markdown stripped" },
  { kind: "md" as const, label: "Markdown (.md)", detail: "verbatim" },
];

interface EditorValues {
  title: string;
  content: string;
  tags: string[];
}

function tagsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Normalize a typed tag the same way the desktop tag input does. */
function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function NotesScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width, height } = useTerminalDimensions();
  const renderer = useRenderer();

  const notes = useNotes((state) => state.notes);
  const loading = useNotes((state) => state.loading);
  const loadError = useNotes((state) => state.error);
  const selectedId = useNotes((state) => state.selectedId);
  const loadNotes = useNotes((state) => state.loadNotes);
  const scenario = useSession((state) => state.scenario);
  const latencyMs = useSession((state) => state.latencyMs);
  const privacyMode = useUi((state) => state.notesPrivacyMode);
  const setPrivacyMode = useUi((state) => state.setNotesPrivacyMode);

  const narrow = width < WIDE_MIN;
  const sidebarCollapsed = useUi((state) => state.sidebarCollapsed);
  const sideWidth = width < 60 ? 0 : sidebarCollapsed || width < 80 ? 2 : 22;
  const contentWidth = Math.max(24, width - sideWidth - 2);
  // Two bordered panes separated by one gap column. Each pane spends four
  // columns on its frame (two border plus one padding cell each side), so rows
  // budget against the inner width.
  const paneGap = 1;
  const listOuter = narrow
    ? contentWidth
    : Math.max(28, Math.min(38, Math.floor(contentWidth * 0.3)));
  const editorOuter = narrow ? contentWidth : Math.max(20, contentWidth - listOuter - paneGap);
  const editorInner = Math.max(8, editorOuter - 4);
  // The list panel spends two border rows and a three-row search strip.
  const listBodyHeight = Math.max(3, height - 8);
  const visibleCount = Math.max(1, Math.floor(listBodyHeight / LIST_ROW_ROWS));

  const [search, setSearch] = useState("");
  const [narrowPane, setNarrowPane] = useState<"list" | "editor">("list");
  const [mode, setMode] = useState<NoteEditorMode>("edit");
  const [focusedField, setFocusedField] = useState<NoteEditorField | "search" | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>("idle");
  const [bodyKey, setBodyKey] = useState("none");
  const [notice, setNotice] = useState<NoteNotice | null>(null);
  const [confirm, setConfirm] = useState<NoteConfirmState | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportIndex, setExportIndex] = useState(0);
  const [allTags, setAllTags] = useState<string[]>([]);

  const bodyRef = useRef<TextareaRenderable | null>(null);
  const noteIdRef = useRef<string | null>(null);
  const savedRef = useRef<EditorValues>({ title: "", content: "", tags: [] });
  const latestRef = useRef<EditorValues>({ title: "", content: "", tags: [] });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionTextRef = useRef("");
  const focusOnLoadRef = useRef<NoteEditorField | null>(null);
  // Monotonic token: every openNote bumps it, and a load bails after any await
  // once a newer openNote has superseded it. This replaces an identity check
  // against `noteIdRef` so re-selecting a note mid-flight is never dropped.
  const requestRef = useRef(0);

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;
  const activePane: "list" | "editor" = focusedField === "search" ? "list" : narrowPane;

  const suggestions = useMemo(() => {
    const needle = tagInput.trim().toLowerCase();
    return allTags.filter((tag) => !tags.includes(tag) && (needle === "" || tag.includes(needle)));
  }, [allTags, tags, tagInput]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle === "") {
      return notes;
    }
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle),
    );
  }, [notes, search]);

  // -- Saving ---------------------------------------------------------------

  /** Re-read the global tag pool. Called on mount/note switch and after the tag
   * mutations that can actually change it, not after every autosave patch. */
  const refreshAllTags = useCallback((): void => {
    void (async () => {
      setAllTags(await useNotes.getState().allTags());
    })();
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    const id = noteIdRef.current;
    if (id === null) {
      return;
    }
    // Capture the refs once. openNote may reassign them while this flush is in
    // flight, so writes below target the captured object, not the live ref.
    const latest = latestRef.current;
    const saved = savedRef.current;
    const titleChanged = latest.title !== saved.title;
    const contentChanged = latest.content !== saved.content;
    const tagsChanged = !tagsEqual(latest.tags, saved.tags);
    if (!titleChanged && !contentChanged && !tagsChanged) {
      return;
    }
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (savedTimerRef.current !== null) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    setSaveStatus("saving");
    try {
      if (titleChanged || contentChanged) {
        const nextTitle = latest.title;
        await getRepos().notes.update(id, { title: nextTitle, content: latest.content });
        saved.title = nextTitle;
        saved.content = latest.content;
        useNotes
          .getState()
          .patchNote(id, { title: nextTitle, updatedAt: new Date().toISOString() });
      }
      if (tagsChanged) {
        const nextTags = [...latest.tags];
        await getRepos().notes.setTags(id, nextTags);
        saved.tags = nextTags;
        useNotes.getState().patchNote(id, { tags: nextTags });
        // The tag pool can only change here, so refresh suggestions now.
        refreshAllTags();
      }
      setSaveStatus("saved");
      if (savedTimerRef.current !== null) {
        clearTimeout(savedTimerRef.current);
      }
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_MS);
    } catch (error) {
      // Keep the typed content; the status stays `error` until the next edit or
      // a successful Ctrl+S retry, and the notice explains the immediate reason.
      setSaveStatus("error");
      setNotice({ text: operationError("Could not save note", error), kind: "danger" });
    }
  }, [refreshAllTags]);

  const scheduleSave = useCallback((): void => {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void flush();
    }, SAVE_DEBOUNCE_MS);
  }, [flush]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
      if (savedTimerRef.current !== null) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  // -- Loading and selection ------------------------------------------------

  const openNote = useCallback(
    async (id: string): Promise<void> => {
      requestRef.current += 1;
      const token = requestRef.current;
      // Start the previous note's flush while the refs still point at it: flush
      // reads noteIdRef/latestRef/savedRef synchronously at call time. Clearing
      // the editor before awaiting means the previous note is never rendered
      // under the new selection, even while the save is in flight.
      const flushPromise = flush();
      noteIdRef.current = id;
      savedRef.current = { title: "", content: "", tags: [] };
      latestRef.current = { title: "", content: "", tags: [] };
      setTitle("");
      setContent("");
      setTags([]);
      setTagInput("");
      setSuggestionIndex(0);
      setEditorError(null);
      setEditorLoading(true);
      setSaveStatus("idle");
      setMode("edit");
      setFocusedField(null);
      setBodyKey(`${id}:loading`);
      try {
        await flushPromise;
        if (requestRef.current !== token) {
          return;
        }
        // The previous note's flush may have set `saved`; this note starts clean.
        setSaveStatus("idle");
        const note = await getRepos().notes.getById(id);
        if (requestRef.current !== token) {
          return;
        }
        if (note === null) {
          setEditorError("Note not found");
          setEditorLoading(false);
          return;
        }
        savedRef.current = { title: note.title, content: note.content, tags: [...note.tags] };
        latestRef.current = { title: note.title, content: note.content, tags: [...note.tags] };
        setTitle(note.title);
        setContent(note.content);
        setTags([...note.tags]);
        setBodyKey(`${id}:ready`);
        setEditorLoading(false);
        const focus = focusOnLoadRef.current;
        if (focus !== null) {
          focusOnLoadRef.current = null;
          setFocusedField(focus);
        }
      } catch (error) {
        if (requestRef.current === token) {
          setEditorError(messageOf(error));
          setEditorLoading(false);
        }
      }
    },
    [flush],
  );

  const reloadNote = useCallback(async (): Promise<void> => {
    const id = selectedId;
    if (id === null) {
      return;
    }
    noteIdRef.current = null;
    await openNote(id);
  }, [openNote, selectedId]);

  // Reload on mount and whenever the mock scenario/latency changes.
  useEffect(() => {
    void scenario;
    void latencyMs;
    void loadNotes();
  }, [scenario, latencyMs, loadNotes]);

  // Keep the selection valid as filtering and deletes change the list.
  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) {
        useNotes.getState().selectNote(null);
      }
      return;
    }
    if (selectedId === null || !filtered.some((note) => note.id === selectedId)) {
      useNotes.getState().selectNote(filtered[0].id);
    }
  }, [filtered, selectedId]);

  // Load (or clear) the editor when the selection changes.
  useEffect(() => {
    if (selectedId === null) {
      // Invalidate any in-flight load so a late getById cannot repopulate the
      // editor after the selection is cleared.
      requestRef.current += 1;
      noteIdRef.current = null;
      savedRef.current = { title: "", content: "", tags: [] };
      latestRef.current = { title: "", content: "", tags: [] };
      setTitle("");
      setContent("");
      setTags([]);
      setEditorError(null);
      setEditorLoading(false);
      setSaveStatus("idle");
      setBodyKey("none");
      return;
    }
    // Refresh the global tag pool on mount and on every note switch; the flush
    // refreshes again after an actual tag mutation.
    refreshAllTags();
    void openNote(selectedId);
  }, [selectedId, openNote, refreshAllTags]);

  useEffect(() => {
    setSuggestionIndex((index) =>
      suggestions.length === 0 ? 0 : Math.min(index, suggestions.length - 1),
    );
  }, [suggestions]);

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
  // control; the note scope still runs first for Tab/Esc/Enter.
  const fieldOwned = focusedField !== null;
  useEffect(() => {
    useUi.getState().setFocusedField(fieldOwned ? "notes-field" : null);
    return () => {
      useUi.getState().setFocusedField(null);
    };
  }, [fieldOwned]);

  // Selection text drives Ctrl+Enter; the handler also checks the renderer at
  // key time as a fallback for terminals that do not emit selection events.
  useSelectionHandler((selection) => {
    selectionTextRef.current = selection.getSelectedText();
  });

  // -- Editor handlers ------------------------------------------------------

  /** A user edit clears a sticky save error; the next debounce/Ctrl+S retries. */
  function markEdited(): void {
    setSaveStatus((status) => (status === "error" ? "idle" : status));
  }

  function handleTitleChange(value: string): void {
    setTitle(value);
    latestRef.current.title = value;
    markEdited();
    scheduleSave();
  }

  function handleBodyChange(): void {
    const text = bodyRef.current?.plainText ?? "";
    setContent(text);
    latestRef.current.content = text;
    markEdited();
    scheduleSave();
  }

  function addTag(raw: string): void {
    const name = normalizeTag(raw);
    setTagInput("");
    setSuggestionIndex(0);
    if (name === "" || tags.includes(name)) {
      return;
    }
    const next = [...tags, name];
    setTags(next);
    latestRef.current.tags = next;
    markEdited();
    scheduleSave();
  }

  function removeTag(name: string): void {
    const next = tags.filter((tag) => tag !== name);
    setTags(next);
    latestRef.current.tags = next;
    markEdited();
    scheduleSave();
  }

  /** Switch the editor to `next`, capturing the live body text before leaving
   * edit mode so the preview reflects the latest keystrokes. Selecting the
   * already-active mode is a no-op. */
  function selectMode(next: NoteEditorMode): void {
    if (next === mode) {
      return;
    }
    if (next === "preview") {
      const text = bodyRef.current?.plainText ?? content;
      setContent(text);
      latestRef.current.content = text;
    }
    setFocusedField(null);
    setMode(next);
  }

  function toggleMode(): void {
    selectMode(mode === "edit" ? "preview" : "edit");
  }

  function togglePin(): void {
    if (selectedId === null) {
      return;
    }
    // `large` clones are read-only, so pinning one can only fail; no-op to
    // match the other screens instead of surfacing a pointless error.
    if (isReadOnlyRow(selectedId)) {
      return;
    }
    void useNotes.getState().togglePin(selectedId);
  }

  function moveSelection(delta: number): void {
    if (filtered.length === 0) {
      return;
    }
    const current = selectedId === null ? -1 : filtered.findIndex((note) => note.id === selectedId);
    const next = Math.min(filtered.length - 1, Math.max(0, current + delta));
    useNotes.getState().selectNote(filtered[next].id);
  }

  function switchPane(): void {
    if (!narrow) {
      return;
    }
    setFocusedField(null);
    setNarrowPane((pane) => (pane === "list" ? "editor" : "list"));
  }

  /** Mouse double-click / Enter on a row: select it and focus the editor body.
   * `large` clones stay in preview so the edit surface never opens on a row
   * whose autosave can only fail. */
  function activateNote(id: string): void {
    useNotes.getState().selectNote(id);
    setNarrowPane("editor");
    if (isReadOnlyRow(id)) {
      setMode("preview");
      setFocusedField(null);
      return;
    }
    setMode("edit");
    setFocusedField("body");
  }

  async function createNote(): Promise<void> {
    await flush();
    try {
      const created = await getRepos().notes.create({ title: "", content: "" });
      useNotes.getState().addNote(created);
      focusOnLoadRef.current = "title";
      setNarrowPane("editor");
      useNotes.getState().selectNote(created.id);
    } catch (error) {
      setNotice({ text: operationError("Could not create note", error), kind: "danger" });
    }
  }

  /** Text of the current mouse selection. The renderer owns the selection for
   * both the markdown preview and the editor, and the editor can additionally
   * report its own selection. */
  function activeSelectionText(): string {
    const fromRenderer = renderer.getSelection()?.getSelectedText() ?? "";
    if (fromRenderer.trim() !== "") {
      return fromRenderer;
    }
    return bodyRef.current?.getSelectedText() ?? "";
  }

  async function addSelectionAsTodo(): Promise<void> {
    const raw = activeSelectionText() || selectionTextRef.current;
    const text = raw.trim().replace(/\s+/g, " ");
    if (text === "") {
      // Ctrl+Enter is offered in both edit and preview; without a selection it
      // is a no-op, so say so instead of failing silently.
      setNotice({ text: "Select text first", kind: "danger" });
      return;
    }
    const long = text.length > TODO_TITLE_MAX_LENGTH;
    const todoTitle = long ? `${text.slice(0, TODO_TITLE_MAX_LENGTH).trimEnd()}...` : text;
    const description = long ? text : null;
    try {
      const created = await getRepos().todos.create({ title: todoTitle, description });
      useTodos.getState().addTodo(created);
      selectionTextRef.current = "";
      setNotice({ text: "Added to todo", kind: "success" });
    } catch (error) {
      setNotice({ text: `Could not add todo: ${messageOf(error)}`, kind: "danger" });
    }
  }

  function openExport(): void {
    if (selectedId === null) {
      return;
    }
    setExportIndex(0);
    setExportOpen(true);
  }

  async function runExport(kind: "txt" | "md"): Promise<void> {
    setExportOpen(false);
    if (selectedId === null) {
      return;
    }
    const exportTitle = latestRef.current.title;
    const exportContent =
      mode === "preview" ? content : (bodyRef.current?.plainText ?? latestRef.current.content);
    try {
      await flush();
      const path =
        kind === "txt"
          ? await exportNoteAsTxt(exportTitle, exportContent)
          : await exportNoteAsMarkdown(exportTitle, exportContent);
      setNotice({ text: `Exported ${path}`, kind: "success" });
    } catch (error) {
      setNotice({ text: `Export failed: ${messageOf(error)}`, kind: "danger" });
    }
  }

  function requestDelete(): void {
    if (selectedId === null || selectedNote === null) {
      return;
    }
    setConfirm({
      noteId: selectedId,
      title: "Delete note?",
      body: `Delete "${noteDisplayTitle(selectedNote)}" permanently? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
  }

  async function runDelete(): Promise<void> {
    const current = confirm;
    setConfirm(null);
    if (current === null) {
      return;
    }
    try {
      await getRepos().notes.remove(current.noteId);
      // Invalidate any in-flight load and clear the editor refs before the
      // selection changes so the switch effect never tries to flush an
      // already-deleted note.
      requestRef.current += 1;
      if (noteIdRef.current === current.noteId) {
        noteIdRef.current = null;
      }
      savedRef.current = { title: "", content: "", tags: [] };
      latestRef.current = { title: "", content: "", tags: [] };
      useNotes.getState().removeNote(current.noteId);
      // The deleted note's tags leave the pool.
      refreshAllTags();
      setNotice({ text: "Note deleted", kind: "success" });
    } catch (error) {
      setNotice({ text: `Delete failed: ${messageOf(error)}`, kind: "danger" });
      void useNotes.getState().loadNotes();
    }
  }

  // -- Keyboard scope -------------------------------------------------------

  function handleKey(key: KeyEvent): boolean {
    const name = key.name;
    const meta = key.meta === true || key.option === true;
    const plain = (char: string): boolean =>
      !key.ctrl && !meta && key.shift !== true && name === char;
    const ctrlChar = (char: string): boolean => key.ctrl === true && name === char;

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

    if (exportOpen) {
      if (name === "escape") {
        setExportOpen(false);
        return true;
      }
      if (name === "down" || plain("j")) {
        setExportIndex((index) => Math.min(EXPORT_OPTIONS.length - 1, index + 1));
        return true;
      }
      if (name === "up" || plain("k")) {
        setExportIndex((index) => Math.max(0, index - 1));
        return true;
      }
      if (name === "return") {
        void runExport(EXPORT_OPTIONS[exportIndex]?.kind ?? "txt");
        return true;
      }
      return !meta;
    }

    if (ctrlChar("s")) {
      void flush();
      return true;
    }
    if (key.ctrl && (name === "return" || name === "kpenter" || name === "linefeed")) {
      void addSelectionAsTodo();
      return true;
    }
    if (key.ctrl && name === "n") {
      switchPane();
      return true;
    }

    if (focusedField === "search") {
      if (name === "escape") {
        setSearch("");
        setFocusedField(null);
        return true;
      }
      if (name === "return") {
        setFocusedField(null);
        return true;
      }
      if (name === "tab") {
        setFocusedField("title");
        setNarrowPane("editor");
        return true;
      }
      return false;
    }
    if (focusedField === "title") {
      if (name === "escape") {
        setFocusedField(null);
        return true;
      }
      if (name === "tab" || name === "return") {
        setFocusedField("tags");
        return true;
      }
      return false;
    }
    if (focusedField === "tags") {
      if (name === "escape") {
        setFocusedField(null);
        return true;
      }
      if (name === "tab") {
        setFocusedField("body");
        return true;
      }
      if (name === "return") {
        addTag(suggestions[suggestionIndex] ?? tagInput);
        return true;
      }
      if (name === "down") {
        setSuggestionIndex((index) => Math.min(Math.max(0, suggestions.length - 1), index + 1));
        return true;
      }
      if (name === "up") {
        setSuggestionIndex((index) => Math.max(0, index - 1));
        return true;
      }
      if (name === "backspace" && tagInput === "") {
        const last = tags[tags.length - 1];
        if (last !== undefined) {
          removeTag(last);
        }
        return true;
      }
      return false;
    }
    if (focusedField === "body") {
      if (name === "escape") {
        // Leave the body first; a second Esc (now unfocused) backs out to the
        // list in narrow mode.
        setFocusedField(null);
        return true;
      }
      if (name === "tab") {
        setFocusedField("title");
        return true;
      }
      return false;
    }

    if (key.ctrl || meta) {
      return false;
    }

    const listActive = !narrow || narrowPane === "list";
    if (listActive && (plain("j") || name === "down")) {
      moveSelection(1);
      return true;
    }
    if (listActive && (plain("k") || name === "up")) {
      moveSelection(-1);
      return true;
    }
    if (name === "/") {
      setNarrowPane("list");
      setFocusedField("search");
      return true;
    }
    if (name === "return") {
      if (selectedId !== null) {
        activateNote(selectedId);
      }
      return true;
    }
    if (name === "tab") {
      if (narrow) {
        switchPane();
        return true;
      }
      setFocusedField("title");
      return true;
    }
    if (plain("n")) {
      void createNote();
      return true;
    }
    if (plain("p")) {
      toggleMode();
      return true;
    }
    if (plain("b")) {
      togglePin();
      return true;
    }
    if (plain("v")) {
      setPrivacyMode(!privacyMode);
      return true;
    }
    if (plain("x")) {
      openExport();
      return true;
    }
    if (plain("d")) {
      requestDelete();
      return true;
    }
    if (plain("r") && (loadError !== null || editorError !== null)) {
      // `r` is the shared retry key: a list-load failure reloads the list, an
      // editor-load failure reloads the selected note.
      if (loadError !== null) {
        void loadNotes();
      } else {
        void reloadNote();
      }
      return true;
    }
    if (name === "escape") {
      if (narrow && activePane === "editor") {
        setNarrowPane("list");
        return true;
      }
      if (search !== "") {
        setSearch("");
        return true;
      }
      return false;
    }
    return false;
  }

  useKeyboardScope(handleKey);

  // -- Render ---------------------------------------------------------------

  const searchFocused = focusedField === "search";
  // The list panel owns focus by default (or while its search is active); the
  // editor panel lights whenever a field there owns the keyboard.
  const listPanelFocused =
    searchFocused || (focusedField === null && (!narrow || narrowPane === "list"));
  const editorPanelFocused = !listPanelFocused;
  const selectedIndex = filtered.findIndex((note) => note.id === selectedId);
  const visibleNotes = windowSlice(filtered, selectedIndex, visibleCount);
  const banner =
    notice ??
    (loadError !== null
      ? { text: retryableError("Notes could not load", loadError), kind: "danger" as const }
      : null);
  const statusText = banner !== null ? banner.text : HINT;
  const statusColor =
    banner === null ? tokens.fgSubtle : banner.kind === "success" ? tokens.success : tokens.danger;

  const listPane = (
    <NoteListPane
      items={visibleNotes}
      count={filtered.length}
      selectedId={selectedId}
      loading={loading}
      focused={listPanelFocused}
      searchFocused={searchFocused}
      search={search}
      privacyMode={privacyMode}
      width={listOuter}
      onSearchChange={setSearch}
      onSelectNote={(id) => {
        useNotes.getState().selectNote(id);
      }}
      onActivateNote={activateNote}
      onWheel={(delta) => {
        setNarrowPane("list");
        moveSelection(delta);
      }}
    />
  );

  const editorPane = (
    <NoteEditorPane
      note={selectedNote}
      loading={editorLoading}
      error={editorError}
      mode={mode}
      saveStatus={saveStatus}
      focused={editorPanelFocused}
      focusedField={focusedField === "search" ? null : focusedField}
      privacyMode={privacyMode}
      title={title}
      content={content}
      tags={tags}
      tagInput={tagInput}
      suggestions={suggestions}
      suggestionIndex={suggestionIndex}
      bodyKey={bodyKey}
      width={editorInner}
      bodyRef={bodyRef}
      onTitleChange={handleTitleChange}
      onTagInputChange={(value) => {
        setTagInput(value);
        setSuggestionIndex(0);
      }}
      onBodyChange={handleBodyChange}
      onSelectMode={selectMode}
      onRetry={() => {
        void reloadNote();
      }}
    />
  );

  return (
    <box flexDirection="column" flexGrow={1} minHeight={0} backgroundColor={color(tokens.bg)}>
      {narrow ? (
        <box flexDirection="row" height={1} flexShrink={0} gap={1}>
          <text wrapMode="none">
            <span
              fg={color(activePane === "list" ? tokens.accent : tokens.fgMuted)}
            >{`${activePane === "list" ? "[ " : ""}List${activePane === "list" ? " ]" : ""}`}</span>
            <span fg={color(tokens.fgSubtle)}>{"  "}</span>
            <span
              fg={color(activePane === "editor" ? tokens.accent : tokens.fgMuted)}
            >{`${activePane === "editor" ? "[ " : ""}Editor${activePane === "editor" ? " ]" : ""}`}</span>
          </text>
        </box>
      ) : null}

      {narrow ? (
        activePane === "list" ? (
          listPane
        ) : (
          editorPane
        )
      ) : (
        <box flexDirection="row" flexGrow={1} minHeight={0} gap={paneGap}>
          <box width={listOuter} flexDirection="column" flexShrink={0} minHeight={0}>
            {listPane}
          </box>
          <box flexDirection="column" flexGrow={1} flexShrink={1} minHeight={0}>
            {editorPane}
          </box>
        </box>
      )}

      <box height={1} flexShrink={0}>
        <text fg={color(statusColor)} wrapMode="none">
          {truncate(statusText, Math.max(8, contentWidth))}
        </text>
      </box>

      {exportOpen ? (
        <Modal title="Export note" width={44}>
          <box flexDirection="column" gap={1}>
            {EXPORT_OPTIONS.map((option, index) => (
              <text
                key={option.kind}
                fg={color(index === exportIndex ? tokens.fg : tokens.fgMuted)}
              >
                {`${index === exportIndex ? ACTIVE_GLYPH : " "} ${option.label}  ${option.detail}`}
              </text>
            ))}
            <text fg={color(tokens.fgSubtle)}>{"enter export  esc cancel"}</text>
          </box>
        </Modal>
      ) : null}

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

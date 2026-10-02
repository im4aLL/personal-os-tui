import type { KeyEvent, TextareaRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PHASE_COLORS, PhaseManager } from "../components/projects/PhaseManager";
import { ProjectForm } from "../components/projects/ProjectForm";
import { ProjectHeader } from "../components/projects/ProjectHeader";
import { ProjectListPane } from "../components/projects/ProjectListPane";
import { WeekGrid } from "../components/projects/WeekGrid";
import { WeekGridHeader } from "../components/projects/WeekGridHeader";
import { WorkItemForm } from "../components/projects/WorkItemForm";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { useKeyboardScope } from "../hooks/useKeyboardScope";
import { openUrl } from "../lib/open-url";
import { getCurrentWeek, getWeekHeaders } from "../lib/week-utils";
import type { CreateWorkItemInput } from "../repos/types";
import { useProjectsStore } from "../store/projects";
import { getRepos } from "../store/repos";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { isValidISODate, todayISO } from "../utils/date";
import { messageOf } from "../utils/error";
import { truncate, wrapSegments } from "../utils/text";
import { windowSlice } from "../utils/window";
import type {
  CommentState,
  GridGeometry,
  Notice,
  PhaseManagerState,
  ProjectConfirm,
  ProjectFocusZone,
  ProjectFormState,
  WorkItemFormState,
} from "./ProjectsScreen.types";

const NOTICE_MS = 2200;
/** Below this terminal width the grid is forced into list mode. */
const LIST_MODE_MAX = 60;
/** Minimum readable week column: fits `Week 52`. */
const MIN_WEEK_COL = 7;
/** Columns reserved for the window indicator when the project is windowed. */
const INDICATOR_ROOM = 14;
const ZONES: ProjectFocusZone[] = ["list", "header", "grid"];
const PROJECT_FIELDS: ProjectFormState["field"][] = ["name", "start", "weeks"];
const ITEM_FIELDS: WorkItemFormState["field"][] = [
  "title",
  "person",
  "jira",
  "start",
  "end",
  "status",
  "phase",
  "comment",
];

const EMPTY_PROJECT_FORM: ProjectFormState = {
  open: false,
  editing: null,
  values: { name: "", startDate: "", weekCount: "12" },
  field: "name",
  error: null,
  saving: false,
};

const EMPTY_ITEM_FORM: WorkItemFormState = {
  open: false,
  editing: null,
  values: {
    title: "",
    person: "",
    jiraTicket: "",
    status: "pending",
    phaseId: "",
    startWeek: "1",
    endWeek: "1",
  },
  field: "title",
  error: null,
  saving: false,
};

const EMPTY_PHASE_MANAGER: PhaseManagerState = {
  open: false,
  cursor: 0,
  mode: "list",
  addName: "",
  addColor: PHASE_COLORS[0],
  renameName: "",
};

const HINTS: Record<ProjectFocusZone, string[]> = {
  list: [
    "1 list",
    "2 grid",
    "Tab zone",
    "j/k select",
    "Enter open",
    "n new project",
    "e edit",
    "d delete",
    "p phases",
    "K/J reorder",
  ],
  header: ["1 list", "2 grid", "Tab zone", "e edit project", "p phases", "n new item"],
  grid: [
    "1 list",
    "2 grid",
    "Tab zone",
    "j/k select",
    "Enter edit",
    "n new item",
    "d delete",
    "s separator",
    "p phases",
    "K/J reorder",
    "o jira",
    "c comment",
    "[ ] window",
    "v list",
  ],
};

/** Content width in a zone is the terminal minus the sidebar and the two
 * content padding columns. */
function contentWidthFor(width: number, sidebarCollapsed: boolean): number {
  const sideWidth = width < 60 ? 0 : sidebarCollapsed || width < 80 ? 2 : 22;
  return Math.max(20, width - sideWidth - 2);
}

/** Derive the list/grid split plus the visible week window from the content
 * width. Windowed mode reserves room for the header indicator and never shows
 * fewer than one week. `weekArea` is the space left for the visible week columns
 * after the Task/Res columns and the fixed one-column gaps between grid columns. */
function computeGeometry(contentWidth: number, weekCount: number): GridGeometry {
  const listWidth = Math.max(18, Math.min(24, Math.floor(contentWidth * 0.22)));
  const gridWidth = Math.max(16, contentWidth - listWidth - 1);
  const taskWidth = Math.max(10, Math.min(22, Math.floor(gridWidth * 0.32)));
  const resWidth = Math.max(4, Math.min(8, Math.floor(gridWidth * 0.08)));
  // Fixed one-column gaps: two between the three leading column groups
  // (selection+Task, Res, Weeks).
  const leadGaps = 2;
  const weekArea = Math.max(1, gridWidth - taskWidth - resWidth - leadGaps);

  if (weekCount <= 0) {
    return {
      listWidth,
      gridWidth,
      taskWidth,
      resWidth,
      weekAreaWidth: 0,
      visibleWeeks: 0,
      weekColumnWidth: MIN_WEEK_COL,
      windowed: false,
    };
  }
  // Visible week columns need their own width plus a one-column gap between
  // adjacent weeks; compare in that space so non-windowed fills the area.
  if (weekCount + (weekCount - 1) <= weekArea / MIN_WEEK_COL) {
    return {
      listWidth,
      gridWidth,
      taskWidth,
      resWidth,
      weekAreaWidth: weekArea,
      visibleWeeks: weekCount,
      weekColumnWidth: MIN_WEEK_COL,
      windowed: false,
    };
  }
  const available = Math.max(MIN_WEEK_COL, weekArea - INDICATOR_ROOM);
  const visibleWeeks = Math.max(1, Math.floor((available + 1) / (MIN_WEEK_COL + 1)));
  return {
    listWidth,
    gridWidth,
    taskWidth,
    resWidth,
    weekAreaWidth: available,
    visibleWeeks,
    weekColumnWidth: MIN_WEEK_COL,
    windowed: true,
  };
}

/** The next unused preset color, so a new phase reads distinct from the rest. */
function nextPhaseColor(phases: { color: string }[]): string {
  const used = new Set(phases.map((phase) => phase.color.toLowerCase()));
  return PHASE_COLORS.find((color) => !used.has(color.toLowerCase())) ?? PHASE_COLORS[0];
}

export function ProjectsScreen(): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width, height } = useTerminalDimensions();

  const projects = useProjectsStore((state) => state.projects);
  const selectedId = useProjectsStore((state) => state.selectedId);
  const phases = useProjectsStore((state) => state.phases);
  const workItems = useProjectsStore((state) => state.workItems);
  const loading = useProjectsStore((state) => state.loading);
  const itemsLoading = useProjectsStore((state) => state.itemsLoading);
  const progress = useProjectsStore((state) => state.progress);
  const error = useProjectsStore((state) => state.error);
  const scenario = useSession((state) => state.scenario);
  const latencyMs = useSession((state) => state.latencyMs);
  const sidebarCollapsed = useUi((state) => state.sidebarCollapsed);

  const [focusZone, setFocusZone] = useState<ProjectFocusZone>("list");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState(0);
  const [listToggled, setListToggled] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
  const [itemForm, setItemForm] = useState<WorkItemFormState>(EMPTY_ITEM_FORM);
  const [phaseManager, setPhaseManager] = useState<PhaseManagerState>(EMPTY_PHASE_MANAGER);
  const [confirm, setConfirm] = useState<ProjectConfirm | null>(null);
  const [comment, setComment] = useState<CommentState | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const commentRef = useRef<TextareaRenderable | null>(null);
  // Tracks the project whose window was last centered, so the recenter effect
  // runs on a project change even when its other dependencies (geometry) move.
  const centeredProjectRef = useRef<string | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedId) ?? null;
  const selectedWorkItem = workItems.find((item) => item.id === selectedItemId) ?? null;
  const weekCount = selectedProject?.weekCount ?? 0;

  const contentWidth = contentWidthFor(width, sidebarCollapsed);
  const geometry = computeGeometry(contentWidth, weekCount);
  const listMode = width < LIST_MODE_MAX || listToggled;

  const legendRows = phases.length > 0 ? 1 : 0;
  const headerRows = selectedProject !== null ? 2 + legendRows : 0;
  const showSkeleton = loading || itemsLoading;
  const gridHeaderRows = showSkeleton ? 2 : listMode ? 1 : 2;
  const bannerRows = notice !== null || error !== null ? 1 : 0;
  // Pack the footer shortcuts into whole lines so none are cut off mid-text.
  // The grid body reserves a row per footer line; on very short terminals the
  // footer is capped so the body still gets its three-row minimum.
  const hintRoom = Math.max(8, geometry.gridWidth);
  const hintSegments = [...HINTS[focusZone], ...(error !== null ? ["r retry"] : [])];
  const maxHintRows = Math.max(1, height - 2 - headerRows - gridHeaderRows - bannerRows - 3);
  const hintLines = wrapSegments(hintSegments, "  ", hintRoom).slice(0, maxHintRows);
  const hintRows = hintLines.length;
  const bodyHeight = Math.max(3, height - 2 - headerRows - gridHeaderRows - bannerRows - hintRows);
  const listItemsMax = Math.max(2, Math.floor((height - 3) / 2));

  const visibleHeaders =
    selectedProject !== null && !listMode
      ? getWeekHeaders(selectedProject.startDate, selectedProject.weekCount).slice(
          windowStart,
          windowStart + geometry.visibleWeeks,
        )
      : [];

  const selectedIndex = workItems.findIndex((item) => item.id === selectedItemId);
  const visibleItems = windowSlice(workItems, selectedIndex, bodyHeight);

  const phaseOptions = useMemo(
    () => [
      { value: "", label: "No phase" },
      ...phases.map((phase) => ({ value: phase.id, label: phase.name })),
    ],
    [phases],
  );

  // -- Loading and selection -------------------------------------------------

  useEffect(() => {
    void scenario;
    void latencyMs;
    void useProjectsStore.getState().loadProjects();
  }, [scenario, latencyMs]);

  // Select the first project once a load arrives with no valid selection.
  useEffect(() => {
    if (projects.length === 0) {
      return;
    }
    if (selectedId === null || !projects.some((project) => project.id === selectedId)) {
      void useProjectsStore.getState().selectProject(projects[0].id);
    }
  }, [projects, selectedId]);

  // Keep the work item selection valid as the project's items change.
  useEffect(() => {
    if (workItems.length === 0) {
      if (selectedItemId !== null) {
        setSelectedItemId(null);
      }
      return;
    }
    if (selectedItemId === null || !workItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(workItems[0].id);
    }
  }, [workItems, selectedItemId]);

  useEffect(() => {
    if (notice === null) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  const fieldOwned =
    projectForm.open || itemForm.open || phaseManager.open || comment !== null || confirm !== null;
  useEffect(() => {
    useUi.getState().setFocusedField(fieldOwned ? "projects-field" : null);
    return () => {
      useUi.getState().setFocusedField(null);
    };
  }, [fieldOwned]);

  // Recenter the week window when the project changes; a resize only clamps it.
  // The ref guard keeps a same-project geometry change from re-centering.
  useEffect(() => {
    if (selectedProject === null) {
      centeredProjectRef.current = null;
      setWindowStart(0);
      return;
    }
    if (centeredProjectRef.current === selectedProject.id) {
      return;
    }
    centeredProjectRef.current = selectedProject.id;
    const currentWeek = getCurrentWeek(selectedProject.startDate, selectedProject.weekCount);
    const maxStart = Math.max(0, selectedProject.weekCount - geometry.visibleWeeks);
    const centered =
      currentWeek === null ? 0 : currentWeek - 1 - Math.floor(geometry.visibleWeeks / 2);
    setWindowStart(Math.max(0, Math.min(maxStart, centered)));
  }, [selectedProject, geometry.visibleWeeks]);

  useEffect(() => {
    setWindowStart((start) =>
      Math.max(0, Math.min(Math.max(0, weekCount - geometry.visibleWeeks), start)),
    );
  }, [weekCount, geometry.visibleWeeks]);

  // -- Selection and reorder -------------------------------------------------

  function moveSelection(delta: number): void {
    if (focusZone === "list") {
      if (projects.length === 0) {
        return;
      }
      const current =
        selectedId === null ? -1 : projects.findIndex((project) => project.id === selectedId);
      const next = Math.min(projects.length - 1, Math.max(0, current + delta));
      const project = projects[next];
      if (project.id !== selectedId) {
        void useProjectsStore.getState().selectProject(project.id);
      }
      return;
    }
    if (focusZone === "grid") {
      if (workItems.length === 0) {
        return;
      }
      const current =
        selectedItemId === null ? -1 : workItems.findIndex((item) => item.id === selectedItemId);
      const next = Math.min(workItems.length - 1, Math.max(0, current + delta));
      setSelectedItemId(workItems[next].id);
    }
  }

  function reorder(delta: number): void {
    if (focusZone === "list") {
      if (selectedId === null) {
        return;
      }
      const index = projects.findIndex((project) => project.id === selectedId);
      const target = index + delta;
      if (index === -1 || target < 0 || target >= projects.length) {
        return;
      }
      const ids = projects.map((project) => project.id);
      [ids[index], ids[target]] = [ids[target], ids[index]];
      void useProjectsStore.getState().reorderProjects(ids);
      return;
    }
    if (focusZone === "grid") {
      if (selectedItemId === null) {
        return;
      }
      const index = workItems.findIndex((item) => item.id === selectedItemId);
      const target = index + delta;
      if (index === -1 || target < 0 || target >= workItems.length) {
        return;
      }
      const ids = workItems.map((item) => item.id);
      [ids[index], ids[target]] = [ids[target], ids[index]];
      void useProjectsStore.getState().reorderWorkItems(ids);
    }
  }

  function shiftWindow(delta: number): void {
    const maxStart = Math.max(0, weekCount - geometry.visibleWeeks);
    setWindowStart((start) => Math.max(0, Math.min(maxStart, start + delta)));
  }

  // -- Project mutations -----------------------------------------------------

  function openCreateProject(): void {
    setProjectForm({
      open: true,
      editing: null,
      values: { name: "", startDate: todayISO(), weekCount: "12" },
      field: "name",
      error: null,
      saving: false,
    });
  }

  function openEditProject(): void {
    if (selectedProject === null) {
      return;
    }
    setProjectForm({
      open: true,
      editing: selectedProject,
      values: {
        name: selectedProject.name,
        startDate: selectedProject.startDate,
        weekCount: String(selectedProject.weekCount),
      },
      field: "name",
      error: null,
      saving: false,
    });
  }

  function patchProjectForm(patch: Partial<ProjectFormState["values"]>): void {
    setProjectForm((current) => ({
      ...current,
      values: { ...current.values, ...patch },
      error: null,
    }));
  }

  function cycleProjectField(delta: number): void {
    setProjectForm((current) => {
      const index = PROJECT_FIELDS.indexOf(current.field);
      const next = (index + delta + PROJECT_FIELDS.length) % PROJECT_FIELDS.length;
      return { ...current, field: PROJECT_FIELDS[next] };
    });
  }

  async function submitProjectForm(): Promise<void> {
    if (!projectForm.open || projectForm.saving) {
      return;
    }
    const name = projectForm.values.name.trim();
    if (name === "") {
      setProjectForm((current) => ({
        ...current,
        error: "Project name is required",
        field: "name",
      }));
      return;
    }
    const startDate = projectForm.values.startDate.trim();
    if (!isValidISODate(startDate)) {
      setProjectForm((current) => ({ ...current, error: "Use YYYY-MM-DD", field: "start" }));
      return;
    }
    const weeks = Number.parseInt(projectForm.values.weekCount.trim(), 10);
    if (!Number.isInteger(weeks) || weeks < 4 || weeks > 52) {
      setProjectForm((current) => ({
        ...current,
        error: "Weeks must be between 4 and 52",
        field: "weeks",
      }));
      return;
    }

    setProjectForm((current) => ({ ...current, saving: true, error: null }));
    try {
      if (projectForm.editing !== null) {
        const id = projectForm.editing.id;
        const patch = { name, startDate, weekCount: weeks };
        await getRepos().projects.update(id, patch);
        useProjectsStore.getState().patchProject(id, patch);
        setProjectForm(EMPTY_PROJECT_FORM);
        setNotice({ text: "Project updated", kind: "success" });
      } else {
        const project = await useProjectsStore
          .getState()
          .addProject({ name, startDate, weekCount: weeks });
        setProjectForm(EMPTY_PROJECT_FORM);
        await useProjectsStore.getState().selectProject(project.id);
        setFocusZone("grid");
        setNotice({ text: "Project created", kind: "success" });
      }
    } catch (saveError) {
      setProjectForm((current) => ({ ...current, saving: false, error: messageOf(saveError) }));
    }
  }

  async function deleteProject(id: string, title: string): Promise<void> {
    try {
      await getRepos().projects.remove(id);
      useProjectsStore.getState().removeProject(id);
      setNotice({ text: `Deleted ${title}`, kind: "success" });
    } catch (deleteError) {
      setNotice({ text: `Delete failed: ${messageOf(deleteError)}`, kind: "danger" });
    }
  }

  // -- Work item mutations ---------------------------------------------------

  function openCreateItem(): void {
    if (selectedProject === null) {
      return;
    }
    setItemForm({
      open: true,
      editing: null,
      values: {
        title: "",
        person: "",
        jiraTicket: "",
        status: "pending",
        phaseId: phases[0]?.id ?? "",
        startWeek: "1",
        endWeek: "1",
      },
      field: "title",
      error: null,
      saving: false,
    });
  }

  function openEditItem(): void {
    if (selectedWorkItem === null) {
      return;
    }
    setItemForm({
      open: true,
      editing: selectedWorkItem,
      values: {
        title: selectedWorkItem.title,
        person: selectedWorkItem.person ?? "",
        jiraTicket: selectedWorkItem.jiraTicket ?? "",
        status: selectedWorkItem.status,
        phaseId: selectedWorkItem.phaseId ?? "",
        startWeek: String(selectedWorkItem.startWeek),
        endWeek: String(selectedWorkItem.endWeek),
      },
      field: "title",
      error: null,
      saving: false,
    });
  }

  function patchItemForm(patch: Partial<WorkItemFormState["values"]>): void {
    setItemForm((current) => ({
      ...current,
      values: { ...current.values, ...patch },
      error: null,
    }));
  }

  function cycleItemField(delta: number): void {
    setItemForm((current) => {
      const index = ITEM_FIELDS.indexOf(current.field);
      const next = (index + delta + ITEM_FIELDS.length) % ITEM_FIELDS.length;
      return { ...current, field: ITEM_FIELDS[next] };
    });
  }

  async function submitItemForm(): Promise<void> {
    if (!itemForm.open || itemForm.saving || selectedProject === null) {
      return;
    }
    const total = selectedProject.weekCount;
    const title = itemForm.values.title.trim();
    if (title === "") {
      setItemForm((current) => ({ ...current, error: "Title is required", field: "title" }));
      return;
    }
    const start = Number.parseInt(itemForm.values.startWeek.trim(), 10);
    if (!Number.isInteger(start) || start < 1 || start > total) {
      setItemForm((current) => ({
        ...current,
        error: `Start week must be 1-${total}`,
        field: "start",
      }));
      return;
    }
    const end = Number.parseInt(itemForm.values.endWeek.trim(), 10);
    if (!Number.isInteger(end) || end < start || end > total) {
      setItemForm((current) => ({
        ...current,
        error: `End week must be >= start week and <= ${total}`,
        field: "end",
      }));
      return;
    }

    const trimmedPerson = itemForm.values.person.trim();
    const trimmedJira = itemForm.values.jiraTicket.trim();
    const commentText = (commentRef.current?.plainText ?? "").trim();
    const fields = {
      phaseId: itemForm.values.phaseId === "" ? null : itemForm.values.phaseId,
      title,
      person: trimmedPerson === "" ? null : trimmedPerson,
      comment: commentText === "" ? null : commentText,
      jiraTicket: trimmedJira === "" ? null : trimmedJira,
      status: itemForm.values.status,
      startWeek: start,
      endWeek: end,
    };

    setItemForm((current) => ({ ...current, saving: true, error: null }));
    try {
      if (itemForm.editing !== null) {
        const id = itemForm.editing.id;
        await getRepos().projects.updateWorkItem(id, fields);
        useProjectsStore.getState().patchWorkItem(id, fields);
        setItemForm(EMPTY_ITEM_FORM);
        setSelectedItemId(id);
        setNotice({ text: "Work item updated", kind: "success" });
      } else {
        const input: CreateWorkItemInput = {
          ...fields,
          position: workItems.length,
          isSeparator: false,
        };
        await useProjectsStore.getState().addWorkItem(input);
        setItemForm(EMPTY_ITEM_FORM);
        setNotice({ text: "Work item added", kind: "success" });
      }
    } catch (saveError) {
      setItemForm((current) => ({ ...current, saving: false, error: messageOf(saveError) }));
    }
  }

  function requestDeleteItem(): void {
    const item = selectedWorkItem;
    if (item === null) {
      return;
    }
    if (item.isSeparator) {
      void useProjectsStore.getState().removeWorkItem(item.id);
      return;
    }
    setConfirm({
      kind: "item",
      id: item.id,
      title: item.title === "" ? "this work item" : item.title,
    });
  }

  // -- Phases ----------------------------------------------------------------

  function openPhaseManager(): void {
    if (selectedProject === null) {
      return;
    }
    setPhaseManager({
      open: true,
      cursor: 0,
      mode: "list",
      addName: "",
      addColor: nextPhaseColor(phases),
      renameName: "",
    });
  }

  function movePhaseCursor(delta: number): void {
    setPhaseManager((current) => ({
      ...current,
      cursor: Math.min(Math.max(0, phases.length - 1), Math.max(0, current.cursor + delta)),
    }));
  }

  function startAddPhase(): void {
    setPhaseManager((current) => ({
      ...current,
      mode: "add",
      addName: "",
      addColor: nextPhaseColor(phases),
    }));
  }

  function startRenamePhase(): void {
    const phase = phases[phaseManager.cursor];
    if (phase === undefined) {
      return;
    }
    setPhaseManager((current) => ({ ...current, mode: "rename", renameName: phase.name }));
  }

  async function savePhase(id: string, patch: { name?: string; color?: string }): Promise<void> {
    try {
      await getRepos().projects.updatePhase(id, patch);
      useProjectsStore.getState().patchPhase(id, patch);
    } catch (saveError) {
      setNotice({ text: `Phase save failed: ${messageOf(saveError)}`, kind: "danger" });
    }
  }

  async function commitAddPhase(): Promise<void> {
    const name = phaseManager.addName.trim();
    if (name === "") {
      return;
    }
    await useProjectsStore.getState().addPhase({ name, color: phaseManager.addColor });
    setPhaseManager((current) => ({ ...current, mode: "list", addName: "" }));
  }

  async function commitRenamePhase(): Promise<void> {
    const phase = phases[phaseManager.cursor];
    if (phase === undefined) {
      return;
    }
    const name = phaseManager.renameName.trim();
    if (name !== "") {
      await savePhase(phase.id, { name });
    }
    setPhaseManager((current) => ({ ...current, mode: "list" }));
  }

  function deletePhaseAtCursor(): void {
    const phase = phases[phaseManager.cursor];
    if (phase === undefined) {
      return;
    }
    const count = workItems.filter((item) => !item.isSeparator && item.phaseId === phase.id).length;
    if (count > 0) {
      setNotice({ text: `Phase has ${count} item${count === 1 ? "" : "s"}`, kind: "danger" });
      return;
    }
    void useProjectsStore.getState().removePhase(phase.id);
    setPhaseManager((current) => ({ ...current, cursor: Math.max(0, current.cursor - 1) }));
  }

  function cyclePhaseColor(): void {
    const phase = phases[phaseManager.cursor];
    if (phase === undefined) {
      return;
    }
    const index = PHASE_COLORS.indexOf(phase.color);
    const next = PHASE_COLORS[(index + 1) % PHASE_COLORS.length];
    void savePhase(phase.id, { color: next });
  }

  // -- Item actions ----------------------------------------------------------

  function openJira(): void {
    const item = selectedWorkItem;
    if (item === null || item.jiraTicket === null || item.jiraTicket.trim() === "") {
      setNotice({ text: "No Jira ticket", kind: "danger" });
      return;
    }
    const ticket = item.jiraTicket.trim();
    if (!/^https?:\/\//.test(ticket)) {
      setNotice({ text: `Not a URL: ${ticket}`, kind: "danger" });
      return;
    }
    void openUrl(ticket).then((result) => {
      if (!result.ok) {
        setNotice({ text: `Open failed: ${result.error ?? "unknown"}`, kind: "danger" });
      }
    });
  }

  function openComment(): void {
    const item = selectedWorkItem;
    if (item === null || item.comment === null || item.comment.trim() === "") {
      setNotice({ text: "No comment", kind: "danger" });
      return;
    }
    setComment({ title: item.title, text: item.comment });
  }

  async function runConfirm(): Promise<void> {
    const current = confirm;
    setConfirm(null);
    if (current === null) {
      return;
    }
    if (current.kind === "project") {
      await deleteProject(current.id, current.title);
    } else {
      await useProjectsStore.getState().removeWorkItem(current.id);
    }
  }

  // -- Keyboard scope --------------------------------------------------------

  function handleKey(key: KeyEvent): boolean {
    const name = key.name;
    const lower = name.toLowerCase();
    const meta = key.meta === true || key.option === true;
    const plainChar = (char: string): boolean =>
      !key.ctrl && !meta && key.shift !== true && name === char;
    const upperChar = (char: string): boolean =>
      !key.ctrl && !meta && (name === char.toUpperCase() || (lower === char && key.shift === true));

    if (projectForm.open) {
      if (name === "escape") {
        setProjectForm(EMPTY_PROJECT_FORM);
        return true;
      }
      if (key.ctrl && (name === "return" || name === "kpenter" || name === "linefeed")) {
        void submitProjectForm();
        return true;
      }
      if (name === "tab") {
        cycleProjectField(key.shift ? -1 : 1);
        return true;
      }
      if (name === "backtab") {
        cycleProjectField(-1);
        return true;
      }
      if (name === "return") {
        void submitProjectForm();
        return true;
      }
      return false;
    }

    if (itemForm.open) {
      if (name === "escape") {
        setItemForm(EMPTY_ITEM_FORM);
        return true;
      }
      if (key.ctrl && (name === "return" || name === "kpenter" || name === "linefeed")) {
        void submitItemForm();
        return true;
      }
      if (name === "tab") {
        cycleItemField(key.shift ? -1 : 1);
        return true;
      }
      if (name === "backtab") {
        cycleItemField(-1);
        return true;
      }
      if (name === "return") {
        if (itemForm.field === "comment") {
          return false;
        }
        void submitItemForm();
        return true;
      }
      return false;
    }

    if (phaseManager.open) {
      if (name === "escape") {
        if (phaseManager.mode !== "list") {
          setPhaseManager((current) => ({ ...current, mode: "list" }));
          return true;
        }
        setPhaseManager(EMPTY_PHASE_MANAGER);
        return true;
      }
      if (phaseManager.mode === "add" || phaseManager.mode === "rename") {
        if (name === "return") {
          if (phaseManager.mode === "add") {
            void commitAddPhase();
          } else {
            void commitRenamePhase();
          }
          return true;
        }
        return false;
      }
      if (plainChar("j") || name === "down") {
        movePhaseCursor(1);
        return true;
      }
      if (plainChar("k") || name === "up") {
        movePhaseCursor(-1);
        return true;
      }
      if (upperChar("k")) {
        const phase = phases[phaseManager.cursor];
        if (phase !== undefined) {
          void useProjectsStore.getState().movePhase(phase.id, "up");
        }
        return true;
      }
      if (upperChar("j")) {
        const phase = phases[phaseManager.cursor];
        if (phase !== undefined) {
          void useProjectsStore.getState().movePhase(phase.id, "down");
        }
        return true;
      }
      if (plainChar("n")) {
        startAddPhase();
        return true;
      }
      if (plainChar("r")) {
        startRenamePhase();
        return true;
      }
      if (plainChar("c")) {
        cyclePhaseColor();
        return true;
      }
      if (plainChar("d")) {
        deletePhaseAtCursor();
        return true;
      }
      return !meta;
    }

    if (comment !== null) {
      if (name === "escape" || name === "return") {
        setComment(null);
        return true;
      }
      return !meta;
    }

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

    if (key.ctrl || meta) {
      return false;
    }

    if (name === "1") {
      setFocusZone("list");
      return true;
    }
    if (name === "2") {
      setFocusZone("grid");
      return true;
    }
    if (name === "tab") {
      const index = ZONES.indexOf(focusZone);
      setFocusZone(ZONES[(index + 1) % ZONES.length]);
      return true;
    }
    if (name === "backtab") {
      const index = ZONES.indexOf(focusZone);
      setFocusZone(ZONES[(index - 1 + ZONES.length) % ZONES.length]);
      return true;
    }

    if (upperChar("k")) {
      reorder(-1);
      return true;
    }
    if (upperChar("j")) {
      reorder(1);
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

    if (name === "return") {
      if (focusZone === "list" && selectedProject !== null) {
        setFocusZone("grid");
      } else if (focusZone === "grid") {
        openEditItem();
      }
      return true;
    }
    if (plainChar("n")) {
      if (focusZone === "list") {
        openCreateProject();
      } else {
        openCreateItem();
      }
      return true;
    }
    if (plainChar("e")) {
      openEditProject();
      return true;
    }
    if (plainChar("d")) {
      if (focusZone === "list") {
        if (selectedProject !== null) {
          setConfirm({
            kind: "project",
            id: selectedProject.id,
            title: selectedProject.name,
          });
        }
      } else if (focusZone === "grid") {
        requestDeleteItem();
      }
      return true;
    }
    if (plainChar("s")) {
      if (focusZone === "grid" && selectedProject !== null) {
        void useProjectsStore.getState().addSeparator();
      }
      return true;
    }
    if (plainChar("p")) {
      openPhaseManager();
      return true;
    }
    if (plainChar("o")) {
      openJira();
      return true;
    }
    if (plainChar("c")) {
      openComment();
      return true;
    }
    if (name === "[") {
      shiftWindow(-1);
      return true;
    }
    if (name === "]") {
      shiftWindow(1);
      return true;
    }
    if (plainChar("v")) {
      setListToggled((current) => !current);
      return true;
    }
    if (plainChar("r") && error !== null) {
      if (projects.length === 0) {
        void useProjectsStore.getState().loadProjects();
      } else {
        void useProjectsStore.getState().refreshProjects();
      }
      return true;
    }
    return false;
  }

  useKeyboardScope(handleKey);

  // -- Render ----------------------------------------------------------------

  const banner: Notice | null =
    notice ?? (error !== null ? { text: `${error}  (r to retry)`, kind: "danger" } : null);

  return (
    <box flexDirection="column" flexGrow={1} minHeight={0} backgroundColor={color(tokens.bg)}>
      <box flexDirection="row" flexGrow={1} minHeight={0}>
        <ProjectListPane
          projects={projects}
          selectedId={selectedId}
          focused={focusZone === "list"}
          loading={loading}
          progress={progress}
          width={geometry.listWidth}
          maxItems={listItemsMax}
        />

        <box flexDirection="column" flexGrow={1} minHeight={0} paddingLeft={1}>
          {selectedProject !== null ? (
            <ProjectHeader
              project={selectedProject}
              phases={phases}
              workItems={workItems}
              stat={progress[selectedProject.id]}
              focused={focusZone === "header"}
              width={geometry.gridWidth}
            />
          ) : null}

          {showSkeleton ? (
            <>
              <WeekGridHeader
                headers={[]}
                totalWeeks={0}
                windowStart={0}
                width={geometry.gridWidth}
                taskWidth={geometry.taskWidth}
                resWidth={geometry.resWidth}
                weekColumnWidth={geometry.weekColumnWidth}
                weekAreaWidth={geometry.weekAreaWidth}
                focused={false}
                loading={true}
              />
              <WeekGrid
                workItems={[]}
                selectedId={null}
                focused={false}
                listMode={false}
                loading={true}
                width={geometry.gridWidth}
                taskWidth={geometry.taskWidth}
                resWidth={geometry.resWidth}
                weekColumnWidth={geometry.weekColumnWidth}
                weekAreaWidth={geometry.weekAreaWidth}
                windowStart={0}
                visibleWeeks={0}
              />
            </>
          ) : selectedProject === null ? (
            <EmptyState title="No project selected" hint="Press n to create one" />
          ) : listMode ? (
            <WeekGrid
              workItems={visibleItems}
              selectedId={selectedItemId}
              focused={focusZone === "grid"}
              listMode={true}
              loading={false}
              width={geometry.gridWidth}
              taskWidth={geometry.taskWidth}
              resWidth={geometry.resWidth}
              weekColumnWidth={geometry.weekColumnWidth}
              weekAreaWidth={geometry.weekAreaWidth}
              windowStart={windowStart}
              visibleWeeks={geometry.visibleWeeks}
            />
          ) : (
            <>
              <WeekGridHeader
                headers={visibleHeaders}
                totalWeeks={selectedProject.weekCount}
                windowStart={windowStart}
                width={geometry.gridWidth}
                taskWidth={geometry.taskWidth}
                resWidth={geometry.resWidth}
                weekColumnWidth={geometry.weekColumnWidth}
                weekAreaWidth={geometry.weekAreaWidth}
                focused={focusZone === "grid"}
                loading={false}
              />
              <WeekGrid
                workItems={visibleItems}
                selectedId={selectedItemId}
                focused={focusZone === "grid"}
                listMode={false}
                loading={false}
                width={geometry.gridWidth}
                taskWidth={geometry.taskWidth}
                resWidth={geometry.resWidth}
                weekColumnWidth={geometry.weekColumnWidth}
                weekAreaWidth={geometry.weekAreaWidth}
                windowStart={windowStart}
                visibleWeeks={geometry.visibleWeeks}
              />
            </>
          )}

          {banner !== null ? (
            <box height={1} flexShrink={0}>
              <text
                fg={color(banner.kind === "success" ? tokens.success : tokens.danger)}
                wrapMode="none"
              >
                {truncate(banner.text, Math.max(8, geometry.gridWidth))}
              </text>
            </box>
          ) : null}

          <box flexDirection="column" flexShrink={0} height={hintRows}>
            <text fg={color(tokens.fgSubtle)} wrapMode="none">
              {hintLines.join("\n")}
            </text>
          </box>
        </box>
      </box>

      {projectForm.open ? (
        <ProjectForm
          editing={projectForm.editing}
          focusedField={projectForm.field}
          values={projectForm.values}
          error={projectForm.error}
          saving={projectForm.saving}
          onPatch={patchProjectForm}
        />
      ) : null}

      {itemForm.open ? (
        <WorkItemForm
          key={itemForm.editing?.id ?? "new"}
          editing={itemForm.editing}
          focusedField={itemForm.field}
          values={itemForm.values}
          phaseOptions={phaseOptions}
          error={itemForm.error}
          saving={itemForm.saving}
          commentRef={commentRef}
          onPatch={patchItemForm}
          onCommentChange={() =>
            setItemForm((current) =>
              current.error === null ? current : { ...current, error: null },
            )
          }
        />
      ) : null}

      {phaseManager.open ? (
        <PhaseManager
          phases={phases}
          workItems={workItems}
          cursor={phaseManager.cursor}
          mode={phaseManager.mode}
          addName={phaseManager.addName}
          addColor={phaseManager.addColor}
          renameName={phaseManager.renameName}
          colors={PHASE_COLORS}
          onAddNameChange={(value) =>
            setPhaseManager((current) => ({ ...current, addName: value }))
          }
          onRenameNameChange={(value) =>
            setPhaseManager((current) => ({ ...current, renameName: value }))
          }
        />
      ) : null}

      {comment !== null ? (
        <Modal title={comment.title === "" ? "Comment" : "Comment"} width={64}>
          <box flexDirection="column" gap={1}>
            <text fg={color(tokens.fgMuted)}>{comment.text}</text>
            <text fg={color(tokens.fgSubtle)}>{"Esc close"}</text>
          </box>
        </Modal>
      ) : null}

      {confirm !== null ? (
        <ConfirmDialog
          title={confirm.kind === "project" ? "Delete project?" : "Delete work item?"}
          body={
            confirm.kind === "project"
              ? `Delete "${confirm.title}" and all its phases and work items?`
              : `Delete "${confirm.title}"? This cannot be undone.`
          }
          confirmLabel="Delete"
          destructive={true}
        />
      ) : null}
    </box>
  );
}

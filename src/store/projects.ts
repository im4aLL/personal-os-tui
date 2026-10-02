// Projects store: the project list plus the selected project's phases and work
// items over the repository seam. Mirrors `personal-os/src/store/projects.ts`,
// adapted to camelCase and to the local error style: repo failures are captured
// with `messageOf` into `error`, and optimistic reorders restore the previous
// array on failure. Mutations that change persisted rows call the repo and then
// patch state; pure display patches stay local. Runtime only; the state shape
// lives in `projects.types.ts`.
import { create } from "zustand";
import type { ProjectProgressStat } from "../lib/project-progress.types";
import type { Project, ProjectProgress, WorkItemWithPhase } from "../repos/types";
import { messageOf } from "../utils/error";
import type { ProjectsState } from "./projects.types";
import { getRepos } from "./repos";

function toProgressMap(rows: ProjectProgress[]): Record<string, ProjectProgressStat> {
  return Object.fromEntries(
    rows.map((row) => [row.projectId, { total: row.total, done: row.done }]),
  );
}

/** Progress is advisory: a failed read keeps the previous map and must not fail
 * the whole project load. */
async function loadProgress(): Promise<ProjectProgress[]> {
  try {
    return await getRepos().projects.progress();
  } catch {
    return [];
  }
}

/** Recompute one project's non-separator progress locally from the given items,
 * so the list percent and header bar stay fresh without a reload. */
function withProjectProgress(
  progress: Record<string, ProjectProgressStat>,
  projectId: string,
  items: WorkItemWithPhase[],
): Record<string, ProjectProgressStat> {
  let total = 0;
  let done = 0;
  for (const item of items) {
    if (item.isSeparator) {
      continue;
    }
    total += 1;
    if (item.status === "done") {
      done += 1;
    }
  }
  return { ...progress, [projectId]: { total, done } };
}

// Monotonic generation token: a competing `loadProjects`/`refreshProjects` or a
// batched dashboard `setProjects` bumps it, so an in-flight read cannot land a
// stale list after a newer write.
let projectsGeneration = 0;

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  selectedId: null,
  phases: [],
  workItems: [],
  loading: true,
  itemsLoading: false,
  progress: {},
  error: null,

  loadProjects: async () => {
    const gen = ++projectsGeneration;
    set({ loading: true, error: null });
    try {
      const [projects, progress] = await Promise.all([getRepos().projects.list(), loadProgress()]);
      if (gen !== projectsGeneration) {
        return;
      }
      set({ projects, progress: toProgressMap(progress), loading: false });
    } catch (error) {
      if (gen !== projectsGeneration) {
        return;
      }
      set({ loading: false, error: messageOf(error) });
    }
  },

  setProjects: (projects, progress) => {
    projectsGeneration += 1;
    set({ projects, progress: toProgressMap(progress), loading: false, error: null });
  },

  refreshProjects: async () => {
    const gen = ++projectsGeneration;
    try {
      const [projects, progress] = await Promise.all([getRepos().projects.list(), loadProgress()]);
      if (gen !== projectsGeneration) {
        return;
      }
      set({ projects, progress: toProgressMap(progress), error: null });
      const { selectedId } = get();
      if (selectedId !== null) {
        const [phases, workItems] = await Promise.all([
          getRepos().projects.phases(selectedId),
          getRepos().projects.workItems(selectedId),
        ]);
        if (gen !== projectsGeneration) {
          return;
        }
        // A newer selection may have started during the fetch; drop the stale
        // result instead of landing it under the new selection.
        if (get().selectedId !== selectedId) {
          return;
        }
        set({ phases, workItems });
      }
    } catch (error) {
      if (gen !== projectsGeneration) {
        return;
      }
      set({ error: messageOf(error) });
    }
  },

  selectProject: async (id) => {
    set({ selectedId: id, phases: [], workItems: [], itemsLoading: true, error: null });
    try {
      const [phases, workItems] = await Promise.all([
        getRepos().projects.phases(id),
        getRepos().projects.workItems(id),
      ]);
      // A newer selection may have started while this fetch was in flight; the
      // stale response must not land under it.
      if (get().selectedId !== id) {
        return;
      }
      set({ phases, workItems, itemsLoading: false });
    } catch (error) {
      if (get().selectedId !== id) {
        return;
      }
      set({ itemsLoading: false, error: messageOf(error) });
    }
  },

  addProject: async (input) => {
    try {
      const project = await getRepos().projects.create(input);
      set((state) => ({ projects: [...state.projects, project], error: null }));
      return project;
    } catch (error) {
      set({ error: messageOf(error) });
      throw error;
    }
  },

  patchProject: (id, patch) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...patch } : project,
      ),
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  reorderProjects: async (orderedIds) => {
    const previous = get().projects;
    const byId = new Map(previous.map((project) => [project.id, project]));
    const reordered = orderedIds
      .map((id, index) => {
        const project = byId.get(id);
        return project !== undefined ? { ...project, position: index } : null;
      })
      .filter((project): project is Project => project !== null);
    set({ projects: reordered, error: null });

    try {
      await getRepos().projects.reorder(orderedIds);
    } catch (error) {
      set({ projects: previous, error: messageOf(error) });
    }
  },

  addPhase: async (input) => {
    const { selectedId } = get();
    if (selectedId === null) {
      return;
    }
    try {
      const phase = await getRepos().projects.createPhase(selectedId, input);
      set((state) => ({ phases: [...state.phases, phase], error: null }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  patchPhase: (id, patch) =>
    set((state) => {
      const phases = state.phases.map((phase) =>
        phase.id === id ? { ...phase, ...patch } : phase,
      );
      const updated = phases.find((phase) => phase.id === id);
      if (updated === undefined) {
        return { phases };
      }
      // Work items hold their own resolved phase copy; remap it so the grid
      // bars and legend reflect a rename or recolor immediately.
      return {
        phases,
        workItems: state.workItems.map((item) =>
          item.phaseId === id ? { ...item, phase: updated } : item,
        ),
      };
    }),

  removePhase: async (id) => {
    try {
      await getRepos().projects.removePhase(id);
      set((state) => ({
        phases: state.phases.filter((phase) => phase.id !== id),
        error: null,
      }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  movePhase: async (id, dir) => {
    const previous = get().phases;
    const index = previous.findIndex((phase) => phase.id === id);
    if (index === -1) {
      return;
    }
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= previous.length) {
      return;
    }

    const reordered = [...previous];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const updated = reordered.map((phase, position) => ({ ...phase, position }));
    set({ phases: updated, error: null });

    try {
      await Promise.all(
        updated.map((phase) =>
          getRepos().projects.updatePhase(phase.id, { position: phase.position }),
        ),
      );
    } catch (error) {
      set({ phases: previous, error: messageOf(error) });
    }
  },

  addWorkItem: async (input) => {
    const { selectedId } = get();
    if (selectedId === null) {
      return;
    }
    try {
      const item = await getRepos().projects.createWorkItem(selectedId, input);
      set((state) => {
        const workItems = [...state.workItems, item];
        return {
          workItems,
          progress: withProjectProgress(state.progress, selectedId, workItems),
          error: null,
        };
      });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  patchWorkItem: (id, patch) =>
    set((state) => {
      const workItems = state.workItems.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const next = { ...item, ...patch };
        // Keep the resolved phase in step with a phase reassignment, so the
        // grid bar color and the `No phase` legend are correct immediately.
        if (patch.phaseId !== undefined) {
          const phaseId = patch.phaseId;
          next.phase =
            phaseId === null ? null : (state.phases.find((phase) => phase.id === phaseId) ?? null);
        }
        return next;
      });
      const projectId = state.selectedId;
      return projectId === null
        ? { workItems }
        : { workItems, progress: withProjectProgress(state.progress, projectId, workItems) };
    }),

  removeWorkItem: async (id) => {
    try {
      await getRepos().projects.removeWorkItem(id);
      set((state) => {
        const workItems = state.workItems.filter((item) => item.id !== id);
        const projectId = state.selectedId;
        return projectId === null
          ? { workItems, error: null }
          : {
              workItems,
              progress: withProjectProgress(state.progress, projectId, workItems),
              error: null,
            };
      });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  addSeparator: async () => {
    const { selectedId, workItems } = get();
    if (selectedId === null) {
      return;
    }
    try {
      const item = await getRepos().projects.createWorkItem(selectedId, {
        phaseId: null,
        title: "",
        person: null,
        comment: null,
        jiraTicket: null,
        status: "pending",
        startWeek: 1,
        endWeek: 1,
        position: workItems.length,
        isSeparator: true,
      });
      set((state) => {
        const workItems = [...state.workItems, item];
        return {
          workItems,
          progress: withProjectProgress(state.progress, selectedId, workItems),
          error: null,
        };
      });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  reorderWorkItems: async (orderedIds) => {
    const { selectedId, workItems: previous } = get();
    if (selectedId === null) {
      return;
    }
    const byId = new Map(previous.map((item) => [item.id, item]));
    const reordered = orderedIds
      .map((id, index) => {
        const item = byId.get(id);
        return item !== undefined ? { ...item, position: index } : null;
      })
      .filter((item): item is WorkItemWithPhase => item !== null);
    set({ workItems: reordered, error: null });

    try {
      await getRepos().projects.reorderWorkItems(selectedId, orderedIds);
    } catch (error) {
      set({ workItems: previous, error: messageOf(error) });
    }
  },
}));

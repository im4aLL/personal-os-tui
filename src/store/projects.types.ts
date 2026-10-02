import type { ProjectProgressStat } from "../lib/project-progress.types";
import type {
  CreatePhaseInput,
  CreateProjectInput,
  CreateWorkItemInput,
  Project,
  ProjectPhase,
  ProjectProgress,
  WorkItemWithPhase,
} from "../repos/types";

/** The mutable fields of a project: what an edit may patch optimistically. */
export type ProjectPatch = Partial<Project>;
/** The mutable fields of a phase. */
export type PhasePatch = Partial<ProjectPhase>;
/** The mutable fields of a work item, including its resolved phase. */
export type WorkItemPatch = Partial<WorkItemWithPhase>;

export interface ProjectsState {
  /** All projects, ordered by position. */
  projects: Project[];
  /** The selected project id, or null when none is selected. */
  selectedId: string | null;
  /** Phases of the selected project, ordered by position. */
  phases: ProjectPhase[];
  /** Work items of the selected project with their phase resolved. */
  workItems: WorkItemWithPhase[];
  /** True while a first load runs (skeletons). */
  loading: boolean;
  /** True while the selected project's phases/work items are being fetched. */
  itemsLoading: boolean;
  /** Item-count progress per project id, for the project rows. */
  progress: Record<string, ProjectProgressStat>;
  /** Last load or mutation failure; cleared by the next success. */
  error: string | null;

  /** First load with the skeleton state; loads projects and progress. */
  loadProjects: () => Promise<void>;
  /** Silent reload of projects, progress, and the selected project's data. */
  refreshProjects: () => Promise<void>;
  /** Replace projects and progress with a dashboard snapshot (no request). */
  setProjects: (projects: Project[], progress: ProjectProgress[]) => void;
  /** Select a project and load its phases and work items. */
  selectProject: (id: string) => Promise<void>;

  addProject: (input: CreateProjectInput) => Promise<Project>;
  patchProject: (id: string, patch: ProjectPatch) => void;
  removeProject: (id: string) => void;
  /** Optimistic reorder, restoring the previous array when the write fails. */
  reorderProjects: (orderedIds: string[]) => Promise<void>;

  addPhase: (input: CreatePhaseInput) => Promise<void>;
  patchPhase: (id: string, patch: PhasePatch) => void;
  removePhase: (id: string) => Promise<void>;
  movePhase: (id: string, dir: "up" | "down") => Promise<void>;

  addWorkItem: (input: CreateWorkItemInput) => Promise<void>;
  patchWorkItem: (id: string, patch: WorkItemPatch) => void;
  removeWorkItem: (id: string) => Promise<void>;
  addSeparator: () => Promise<void>;
  /** Optimistic reorder, restoring the previous array when the write fails. */
  reorderWorkItems: (orderedIds: string[]) => Promise<void>;
}

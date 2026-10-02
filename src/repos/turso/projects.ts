// Turso stub (M0). Throws until the Project Planner wiring milestone lands.
import type {
  CreatePhaseInput,
  CreateProjectInput,
  CreateWorkItemInput,
  Project,
  ProjectPhase,
  ProjectProgress,
  ProjectRepo,
  UpdatePhaseInput,
  UpdateProjectInput,
  UpdateWorkItemInput,
  WorkItemWithPhase,
} from "../types";

function notWired(what: string): Error {
  return new Error(`turso ${what} is not wired yet`);
}

export const tursoProjectRepo: ProjectRepo = {
  list(): Promise<Project[]> {
    throw notWired("projects.list");
  },
  create(_input: CreateProjectInput): Promise<Project> {
    throw notWired("projects.create");
  },
  update(_id: string, _input: UpdateProjectInput): Promise<void> {
    throw notWired("projects.update");
  },
  remove(_id: string): Promise<void> {
    throw notWired("projects.remove");
  },
  reorder(_orderedIds: string[]): Promise<void> {
    throw notWired("projects.reorder");
  },
  phases(_projectId: string): Promise<ProjectPhase[]> {
    throw notWired("projects.phases");
  },
  createPhase(_projectId: string, _input: CreatePhaseInput): Promise<ProjectPhase> {
    throw notWired("projects.createPhase");
  },
  updatePhase(_id: string, _input: UpdatePhaseInput): Promise<void> {
    throw notWired("projects.updatePhase");
  },
  removePhase(_id: string): Promise<void> {
    throw notWired("projects.removePhase");
  },
  workItems(_projectId: string): Promise<WorkItemWithPhase[]> {
    throw notWired("projects.workItems");
  },
  createWorkItem(_projectId: string, _input: CreateWorkItemInput): Promise<WorkItemWithPhase> {
    throw notWired("projects.createWorkItem");
  },
  updateWorkItem(_id: string, _input: UpdateWorkItemInput): Promise<void> {
    throw notWired("projects.updateWorkItem");
  },
  removeWorkItem(_id: string): Promise<void> {
    throw notWired("projects.removeWorkItem");
  },
  reorderWorkItems(_projectId: string, _orderedIds: string[]): Promise<void> {
    throw notWired("projects.reorderWorkItems");
  },
  progress(): Promise<ProjectProgress[]> {
    throw notWired("projects.progress");
  },
};

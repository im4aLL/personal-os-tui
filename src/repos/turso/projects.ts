// Real ProjectRepo: remote rows through src/lib/projects.ts. Mapping only; the
// SQL, phase resolution, and column/boolean translation live in the lib layer.
import {
  createPhase,
  createProject,
  createWorkItem,
  deletePhase,
  deleteProject,
  deleteWorkItem,
  getPhasesForProject,
  getProjectProgress,
  getProjects,
  getWorkItemsForProject,
  reorderProjects,
  reorderWorkItems,
  updatePhase,
  updateProject,
  updateWorkItem,
} from "../../lib/projects";
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

export const tursoProjectRepo: ProjectRepo = {
  async list(): Promise<Project[]> {
    return getProjects();
  },
  async create(input: CreateProjectInput): Promise<Project> {
    return createProject(input);
  },
  async update(id: string, input: UpdateProjectInput): Promise<void> {
    await updateProject(id, input);
  },
  async remove(id: string): Promise<void> {
    await deleteProject(id);
  },
  async reorder(orderedIds: string[]): Promise<void> {
    await reorderProjects(orderedIds);
  },
  async phases(projectId: string): Promise<ProjectPhase[]> {
    return getPhasesForProject(projectId);
  },
  async createPhase(projectId: string, input: CreatePhaseInput): Promise<ProjectPhase> {
    return createPhase(projectId, input);
  },
  async updatePhase(id: string, input: UpdatePhaseInput): Promise<void> {
    await updatePhase(id, input);
  },
  async removePhase(id: string): Promise<void> {
    await deletePhase(id);
  },
  async workItems(projectId: string): Promise<WorkItemWithPhase[]> {
    return getWorkItemsForProject(projectId);
  },
  async createWorkItem(projectId: string, input: CreateWorkItemInput): Promise<WorkItemWithPhase> {
    return createWorkItem(projectId, input);
  },
  async updateWorkItem(id: string, input: UpdateWorkItemInput): Promise<void> {
    await updateWorkItem(id, input);
  },
  async removeWorkItem(id: string): Promise<void> {
    await deleteWorkItem(id);
  },
  async reorderWorkItems(projectId: string, orderedIds: string[]): Promise<void> {
    await reorderWorkItems(projectId, orderedIds);
  },
  async progress(): Promise<ProjectProgress[]> {
    return getProjectProgress();
  },
};

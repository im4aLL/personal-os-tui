// In-memory ProjectRepo: projects, phases, and work items over three
// position-ordered fixture arrays. Mirrors the desktop `personal-os/src/lib/projects.ts`
// semantics: creates append (position = current count), updates stamp
// `updatedAt`, list reads sort by position, and work item phases resolve from
// the phase list (null when the id is null or the phase is missing, so a
// deleted phase falls back to gray).
import { randomUUID } from "node:crypto";
import { createFixtures } from "../../mock/fixtures";
import type { Fixtures } from "../../mock/fixtures.types";
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
  WorkItem,
  WorkItemWithPhase,
} from "../types";
import { applyListScenario, mockCall } from "./guard";

/** Work item rows the `large` scenario grows to (PLAN M6: 40 items, 52 weeks). */
const LARGE_WORK_ITEMS = 40;

const seed = createFixtures();
let projects: Project[] = seed.projects;
let phases: ProjectPhase[] = seed.projectPhases;
let workItems: WorkItem[] = seed.workItems;

export function resetProjectFixtures(fixtures: Fixtures): void {
  projects = [...fixtures.projects];
  phases = [...fixtures.projectPhases];
  workItems = [...fixtures.workItems];
}

function stamp(): string {
  return new Date().toISOString();
}

function projectCount(projectId: string): number {
  return workItems.filter((item) => item.projectId === projectId).length;
}

function phaseCount(projectId: string): number {
  return phases.filter((phase) => phase.projectId === projectId).length;
}

function withPhase(item: WorkItem, byId: Map<string, ProjectPhase>): WorkItemWithPhase {
  return {
    ...item,
    phase: item.phaseId === null ? null : (byId.get(item.phaseId) ?? null),
  };
}

export const mockProjectRepo: ProjectRepo = {
  list(): Promise<Project[]> {
    return mockCall(() => {
      const ordered = [...projects].sort((a, b) => a.position - b.position);
      return applyListScenario(ordered, (row, index) => ({
        ...row,
        id: `${row.id}-large-${index}`,
      }));
    });
  },

  create(input: CreateProjectInput): Promise<Project> {
    return mockCall(() => {
      const now = stamp();
      const project: Project = {
        id: randomUUID(),
        name: input.name,
        startDate: input.startDate,
        weekCount: input.weekCount,
        position: projects.length,
        createdAt: now,
        updatedAt: now,
      };
      projects.push(project);
      return project;
    });
  },

  update(id: string, input: UpdateProjectInput): Promise<void> {
    return mockCall(() => {
      const project = projects.find((row) => row.id === id);
      if (project === undefined) {
        throw new Error(`mock project not found: ${id}`);
      }
      Object.assign(project, { ...input, id: project.id, updatedAt: stamp() });
    });
  },

  remove(id: string): Promise<void> {
    return mockCall(() => {
      projects = projects.filter((row) => row.id !== id);
      // Phases and work items cascade with the project, matching the schema's
      // ON DELETE CASCADE.
      phases = phases.filter((phase) => phase.projectId !== id);
      workItems = workItems.filter((item) => item.projectId !== id);
    });
  },

  reorder(orderedIds: string[]): Promise<void> {
    return mockCall(() => {
      const byId = new Map(projects.map((project) => [project.id, project]));
      orderedIds.forEach((id, index) => {
        const project = byId.get(id);
        if (project !== undefined) {
          project.position = index;
          project.updatedAt = stamp();
        }
      });
    });
  },

  phases(projectId: string): Promise<ProjectPhase[]> {
    return mockCall(() => {
      const ordered = phases
        .filter((phase) => phase.projectId === projectId)
        .sort((a, b) => a.position - b.position);
      return applyListScenario(ordered, (row, index) => ({
        ...row,
        id: `${row.id}-large-${index}`,
      }));
    });
  },

  createPhase(projectId: string, input: CreatePhaseInput): Promise<ProjectPhase> {
    return mockCall(() => {
      const phase: ProjectPhase = {
        id: randomUUID(),
        projectId,
        name: input.name,
        color: input.color,
        position: phaseCount(projectId),
        createdAt: stamp(),
      };
      phases.push(phase);
      return phase;
    });
  },

  updatePhase(id: string, input: UpdatePhaseInput): Promise<void> {
    return mockCall(() => {
      const phase = phases.find((row) => row.id === id);
      if (phase === undefined) {
        throw new Error(`mock phase not found: ${id}`);
      }
      Object.assign(phase, { ...input, id: phase.id, projectId: phase.projectId });
    });
  },

  removePhase(id: string): Promise<void> {
    return mockCall(() => {
      phases = phases.filter((row) => row.id !== id);
    });
  },

  workItems(projectId: string): Promise<WorkItemWithPhase[]> {
    return mockCall(() => {
      const byId = new Map(phases.map((phase) => [phase.id, phase]));
      const ordered = workItems
        .filter((item) => item.projectId === projectId)
        .sort((a, b) => a.position - b.position)
        .map((item) => withPhase(item, byId));
      return applyListScenario(
        ordered,
        (row, index) => ({ ...row, id: `${row.id}-large-${index}` }),
        LARGE_WORK_ITEMS,
      );
    });
  },

  createWorkItem(projectId: string, input: CreateWorkItemInput): Promise<WorkItemWithPhase> {
    return mockCall(() => {
      const now = stamp();
      const item: WorkItem = {
        id: randomUUID(),
        projectId,
        phaseId: input.phaseId,
        title: input.title,
        person: input.person,
        comment: input.comment,
        jiraTicket: input.jiraTicket,
        status: input.status,
        startWeek: input.startWeek,
        endWeek: input.endWeek,
        position: projectCount(projectId),
        isSeparator: input.isSeparator,
        createdAt: now,
        updatedAt: now,
      };
      workItems.push(item);
      const byId = new Map(phases.map((phase) => [phase.id, phase]));
      return withPhase(item, byId);
    });
  },

  updateWorkItem(id: string, input: UpdateWorkItemInput): Promise<void> {
    return mockCall(() => {
      const item = workItems.find((row) => row.id === id);
      if (item === undefined) {
        throw new Error(`mock work item not found: ${id}`);
      }
      Object.assign(item, { ...input, id: item.id, projectId: item.projectId, updatedAt: stamp() });
    });
  },

  removeWorkItem(id: string): Promise<void> {
    return mockCall(() => {
      workItems = workItems.filter((row) => row.id !== id);
    });
  },

  reorderWorkItems(projectId: string, orderedIds: string[]): Promise<void> {
    return mockCall(() => {
      const byId = new Map(workItems.map((item) => [item.id, item]));
      orderedIds.forEach((id, index) => {
        const item = byId.get(id);
        if (item !== undefined && item.projectId === projectId) {
          item.position = index;
          item.updatedAt = stamp();
        }
      });
    });
  },

  progress(): Promise<ProjectProgress[]> {
    return mockCall(() => {
      const byProject = new Map<string, ProjectProgress>();
      for (const item of workItems) {
        if (item.isSeparator) {
          continue;
        }
        const stat = byProject.get(item.projectId) ?? {
          projectId: item.projectId,
          total: 0,
          done: 0,
        };
        stat.total += 1;
        if (item.status === "done") {
          stat.done += 1;
        }
        byProject.set(item.projectId, stat);
      }
      return [...byProject.values()];
    });
  },
};

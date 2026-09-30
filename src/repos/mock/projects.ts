// In-memory ProjectRepo ordered by position.
import { randomUUID } from "node:crypto";
import { createFixtures } from "../../mock/fixtures";
import type { Fixtures } from "../../mock/fixtures.types";
import type { CreateProjectInput, Project, ProjectRepo, UpdateProjectInput } from "../types";
import { applyListScenario, mockCall } from "./guard";

let rows: Project[] = createFixtures().projects;

export function resetProjectFixtures(fixtures: Fixtures): void {
  rows = [...fixtures.projects];
}

function stamp(): string {
  return new Date().toISOString();
}

export const mockProjectRepo: ProjectRepo = {
  list(): Promise<Project[]> {
    return mockCall(() => {
      const ordered = [...rows].sort((a, b) => a.position - b.position);
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
        description: input.description ?? "",
        position: rows.length,
        createdAt: now,
        updatedAt: now,
      };
      rows.push(project);
      return project;
    });
  },

  update(id: string, input: UpdateProjectInput): Promise<void> {
    return mockCall(() => {
      const project = rows.find((row) => row.id === id);
      if (project === undefined) {
        throw new Error(`mock project not found: ${id}`);
      }
      Object.assign(project, { ...input, id: project.id, updatedAt: stamp() });
    });
  },

  remove(id: string): Promise<void> {
    return mockCall(() => {
      rows = rows.filter((row) => row.id !== id);
    });
  },
};

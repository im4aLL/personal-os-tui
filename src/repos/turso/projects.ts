// Turso stub (M0). Throws until the Project Planner wiring milestone lands.
import type { CreateProjectInput, Project, ProjectRepo, UpdateProjectInput } from "../types";

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
};

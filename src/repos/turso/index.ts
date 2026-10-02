// Turso bundle factory.
import type { ReposBundle } from "../types";
import { tursoDashboardRepo } from "./dashboard";
import { tursoLinkRepo } from "./links";
import { tursoNoteRepo } from "./notes";
import { tursoProjectRepo } from "./projects";
import { tursoSettingsRepo } from "./settings";
import { tursoSetupRepo } from "./setup";
import { tursoTodoRepo } from "./todos";
import { tursoWorkLogRepo } from "./workLogs";

export function createTursoRepos(): ReposBundle {
  return {
    repos: {
      todos: tursoTodoRepo,
      notes: tursoNoteRepo,
      links: tursoLinkRepo,
      workLogs: tursoWorkLogRepo,
      projects: tursoProjectRepo,
      settings: tursoSettingsRepo,
      dashboard: tursoDashboardRepo,
    },
    setup: tursoSetupRepo,
  };
}

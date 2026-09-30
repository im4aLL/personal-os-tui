// Turso bundle factory (M0 stubs; real wrappers arrive per wiring milestone).
import type { ReposBundle } from "../types";
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
    },
    setup: tursoSetupRepo,
  };
}

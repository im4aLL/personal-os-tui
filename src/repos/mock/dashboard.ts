// In-memory DashboardRepo: mirrors the real batch by composing the existing
// mock repos, so mock latency/error injection and the empty/large scenarios
// stay in effect. Counts are derived from the returned data with the same
// Monday-through-today window the real `COUNT(*)` query uses.
import { mondayOfWeekISO, todayISO } from "../../utils/date";
import type { DashboardRepo, DashboardSnapshot } from "../types";
import { LINKS_PAGE_SIZE, mockLinkRepo } from "./links";
import { mockNoteRepo } from "./notes";
import { mockProjectRepo } from "./projects";
import { mockTodoRepo } from "./todos";
import { mockWorkLogRepo } from "./workLogs";

export const mockDashboardRepo: DashboardRepo = {
  async load(): Promise<DashboardSnapshot> {
    const [todos, notes, linksPage, workLogs, projects, progress] = await Promise.all([
      mockTodoRepo.list(),
      mockNoteRepo.list(),
      mockLinkRepo.list({ limit: LINKS_PAGE_SIZE }),
      mockWorkLogRepo.list(),
      mockProjectRepo.list(),
      mockProjectRepo.progress(),
    ]);

    const weekStart = mondayOfWeekISO(0);
    const today = todayISO();
    const linksTotal = linksPage.total ?? linksPage.links.length;

    return {
      todos,
      notes,
      links: linksPage.links,
      linksNextCursor: linksPage.nextCursor,
      linksTotal,
      workLogs,
      projects,
      progress,
      counts: {
        notes: notes.length,
        links: linksTotal,
        loggedThisWeek: workLogs.filter(
          (log) => log.startDate >= weekStart && log.startDate <= today,
        ).length,
      },
    };
  },
};

// In-memory WorkLogRepo with the desktop filter semantics: query matches the
// title only, `dateFrom` keeps entries whose end date is on or after it, and
// `dateTo` keeps entries whose start date is on or before it (so a multi-day
// entry still matches a range that only touches its tail or head). Sorted
// `startDate` DESC then `createdAt` DESC, matching `getWorkLogs`.
import { randomUUID } from "node:crypto";
import { createFixtures } from "../../mock/fixtures";
import type { Fixtures } from "../../mock/fixtures.types";
import type {
  CreateWorkLogInput,
  UpdateWorkLogInput,
  WorkLog,
  WorkLogFilter,
  WorkLogRepo,
} from "../types";
import {
  applyListScenario,
  assertNotLargeClone,
  isEmptyScenario,
  mockCall,
  mockMutationError,
} from "./guard";

/** Rows the `large` scenario grows to (PLAN M5). */
const LARGE_TOTAL = 300;

const seed = createFixtures();
let rows: WorkLog[] = cloneLogs(seed.workLogs);

function cloneLogs(logs: WorkLog[]): WorkLog[] {
  return logs.map((log) => ({ ...log, tags: [...log.tags] }));
}

export function resetWorkLogFixtures(fixtures: Fixtures): void {
  rows = cloneLogs(fixtures.workLogs);
}

function stamp(): string {
  return new Date().toISOString();
}

function filtered(filter: WorkLogFilter | undefined): WorkLog[] {
  const query = (filter?.query ?? "").trim().toLowerCase();
  const dateFrom = filter?.dateFrom;
  const dateTo = filter?.dateTo;
  return rows
    .filter((log) => {
      if (dateFrom !== undefined && log.endDate < dateFrom) {
        return false;
      }
      if (dateTo !== undefined && log.startDate > dateTo) {
        return false;
      }
      if (query === "") {
        return true;
      }
      return log.title.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const byStart = b.startDate.localeCompare(a.startDate);
      return byStart !== 0 ? byStart : b.createdAt.localeCompare(a.createdAt);
    });
}

export const mockWorkLogRepo: WorkLogRepo = {
  list(filter?: WorkLogFilter): Promise<WorkLog[]> {
    return mockCall(() => {
      if (isEmptyScenario()) {
        return [];
      }
      return applyListScenario(
        filtered(filter),
        (row, index) => ({ ...row, id: `${row.id}-large-${index}`, tags: [...row.tags] }),
        LARGE_TOTAL,
      );
    });
  },

  tags(): Promise<string[]> {
    return mockCall(() => {
      const seen = new Set<string>();
      for (const log of rows) {
        for (const tag of log.tags) {
          seen.add(tag);
        }
      }
      return [...seen].sort((a, b) => a.localeCompare(b));
    });
  },

  create(input: CreateWorkLogInput): Promise<WorkLog> {
    return mockCall(() => {
      const now = stamp();
      const log: WorkLog = {
        id: randomUUID(),
        title: input.title,
        description: input.description ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        createdAt: now,
        updatedAt: now,
        tags: [...input.tags],
      };
      rows.push(log);
      return { ...log, tags: [...log.tags] };
    });
  },

  update(id: string, input: UpdateWorkLogInput): Promise<void> {
    return mockCall(() => {
      const log = rows.find((row) => row.id === id);
      if (log === undefined) {
        throw mockMutationError("work log", id);
      }
      if (input.title !== undefined) {
        log.title = input.title;
      }
      if (input.description !== undefined) {
        log.description = input.description;
      }
      if (input.startDate !== undefined) {
        log.startDate = input.startDate;
      }
      if (input.endDate !== undefined) {
        log.endDate = input.endDate;
      }
      if (input.tags !== undefined) {
        log.tags = [...input.tags];
      }
      log.updatedAt = stamp();
    });
  },

  remove(id: string): Promise<void> {
    return mockCall(() => {
      assertNotLargeClone("work log", id);
      rows = rows.filter((row) => row.id !== id);
    });
  },
};

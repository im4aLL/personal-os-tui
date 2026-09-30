// In-memory WorkLogRepo, newest date first.
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
import { applyListScenario, isEmptyScenario, mockCall } from "./guard";

let rows: WorkLog[] = createFixtures().workLogs;

export function resetWorkLogFixtures(fixtures: Fixtures): void {
  rows = [...fixtures.workLogs];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function stamp(): string {
  return new Date().toISOString();
}

export const mockWorkLogRepo: WorkLogRepo = {
  list(filter?: WorkLogFilter): Promise<WorkLog[]> {
    return mockCall(() => {
      if (isEmptyScenario()) {
        return [];
      }
      const query = (filter?.query ?? "").trim().toLowerCase();
      const tag = filter?.tag ?? null;
      const from = filter?.from;
      const to = filter?.to;
      const matches = [...rows]
        .sort((a, b) => b.date.localeCompare(a.date))
        .filter((log) => {
          if (tag !== null && !log.tags.includes(tag)) {
            return false;
          }
          if (from !== undefined && log.date < from) {
            return false;
          }
          if (to !== undefined && log.date > to) {
            return false;
          }
          if (query === "") {
            return true;
          }
          return log.title.toLowerCase().includes(query) || log.body.toLowerCase().includes(query);
        });
      return applyListScenario(matches, (row, index) => ({
        ...row,
        id: `${row.id}-large-${index}`,
      }));
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
      return [...seen].sort();
    });
  },

  create(input: CreateWorkLogInput): Promise<WorkLog> {
    return mockCall(() => {
      const log: WorkLog = {
        id: randomUUID(),
        title: input.title,
        body: input.body ?? "",
        date: input.date ?? today(),
        tags: input.tags ?? [],
        createdAt: stamp(),
      };
      rows.push(log);
      return log;
    });
  },

  update(id: string, input: UpdateWorkLogInput): Promise<void> {
    return mockCall(() => {
      const log = rows.find((row) => row.id === id);
      if (log === undefined) {
        throw new Error(`mock work log not found: ${id}`);
      }
      Object.assign(log, { ...input, id: log.id });
    });
  },

  remove(id: string): Promise<void> {
    return mockCall(() => {
      rows = rows.filter((row) => row.id !== id);
    });
  },
};

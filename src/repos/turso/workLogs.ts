// Turso stub (M0). Throws until the Work Log wiring milestone lands.
import type {
  CreateWorkLogInput,
  UpdateWorkLogInput,
  WorkLog,
  WorkLogFilter,
  WorkLogRepo,
} from "../types";

function notWired(what: string): Error {
  return new Error(`turso ${what} is not wired yet`);
}

export const tursoWorkLogRepo: WorkLogRepo = {
  list(_filter?: WorkLogFilter): Promise<WorkLog[]> {
    throw notWired("workLogs.list");
  },
  tags(): Promise<string[]> {
    throw notWired("workLogs.tags");
  },
  create(_input: CreateWorkLogInput): Promise<WorkLog> {
    throw notWired("workLogs.create");
  },
  update(_id: string, _input: UpdateWorkLogInput): Promise<void> {
    throw notWired("workLogs.update");
  },
  remove(_id: string): Promise<void> {
    throw notWired("workLogs.remove");
  },
};

// Real WorkLogRepo: remote rows through src/lib/work-logs.ts. Mapping only; the
// SQL, tag serialization, and column translation live in the lib layer.
import {
  createWorkLog,
  deleteWorkLog,
  getAllUsedTags,
  getWorkLogs,
  updateWorkLog,
} from "../../lib/work-logs";
import type {
  CreateWorkLogInput,
  UpdateWorkLogInput,
  WorkLog,
  WorkLogFilter,
  WorkLogRepo,
} from "../types";

export const tursoWorkLogRepo: WorkLogRepo = {
  async list(filter?: WorkLogFilter): Promise<WorkLog[]> {
    return getWorkLogs(filter);
  },
  async tags(): Promise<string[]> {
    return getAllUsedTags();
  },
  async create(input: CreateWorkLogInput): Promise<WorkLog> {
    return createWorkLog(input);
  },
  async update(id: string, input: UpdateWorkLogInput): Promise<void> {
    await updateWorkLog(id, input);
  },
  async remove(id: string): Promise<void> {
    await deleteWorkLog(id);
  },
};

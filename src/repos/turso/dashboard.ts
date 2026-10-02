// Real DashboardRepo: one batched read through src/lib/dashboard.ts. Mapping
// only; the SQL and row mappers live in the lib layer.
import { loadDashboardSnapshot } from "../../lib/dashboard";
import type { DashboardRepo, DashboardSnapshot } from "../types";

export const tursoDashboardRepo: DashboardRepo = {
  async load(): Promise<DashboardSnapshot> {
    return loadDashboardSnapshot();
  },
};

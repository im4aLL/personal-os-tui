// Work Logs store: the filtered, week-grouped list over the repository seam.
// Mirrors the desktop `personal-os/src/store/work-logs.ts`, plus the
// module-level generation guard from `links.ts` so a slow filter response can
// never overwrite a newer one. The screen performs repo writes and patches
// here. Runtime only; the state shape lives in `workLogs.types.ts`.
import { create } from "zustand";
import { groupByWeek } from "../lib/week-groups";
import type { WorkLogFilter } from "../repos/types";
import { messageOf } from "../utils/error";
import { getRepos } from "./repos";
import type { WorkLogsState } from "./workLogs.types";

// Monotonic generation token: every load bumps it, and readers snapshot it and
// ignore results once it changed (a stale in-flight response).
let workLogsGeneration = 0;

/** True when the filter carries no constraint, so the skeleton load path is
 * the right one to run. */
function isUnfiltered(filter: WorkLogFilter): boolean {
  return filter.query === undefined && filter.dateFrom === undefined && filter.dateTo === undefined;
}

export const useWorkLogs = create<WorkLogsState>((set, get) => ({
  logs: [],
  groups: [],
  allTags: [],
  loading: true,
  filter: {},
  error: null,

  loadWorkLogs: async () => {
    const gen = ++workLogsGeneration;
    set({ loading: true, filter: {}, error: null });
    try {
      const [logs, allTags] = await Promise.all([
        getRepos().workLogs.list(),
        getRepos().workLogs.tags(),
      ]);
      if (gen !== workLogsGeneration) {
        return;
      }
      set({ logs, groups: groupByWeek(logs), allTags, loading: false });
    } catch (error) {
      if (gen !== workLogsGeneration) {
        return;
      }
      set({ loading: false, error: messageOf(error) });
    }
  },

  refreshWorkLogs: async () => {
    const gen = ++workLogsGeneration;
    const { filter } = get();
    try {
      const [logs, allTags] = await Promise.all([
        getRepos().workLogs.list(filter),
        getRepos().workLogs.tags(),
      ]);
      if (gen !== workLogsGeneration) {
        return;
      }
      set({ logs, groups: groupByWeek(logs), allTags, error: null });
    } catch (error) {
      // Keep the existing list; the screen surfaces the retry hint.
      if (gen !== workLogsGeneration) {
        return;
      }
      set({ error: messageOf(error) });
    }
  },

  applyFilter: async (filter) => {
    const gen = ++workLogsGeneration;
    set({ filter, error: null });
    try {
      const logs = await getRepos().workLogs.list(filter);
      if (gen !== workLogsGeneration) {
        return;
      }
      set({ logs, groups: groupByWeek(logs), loading: false });
    } catch (error) {
      // Keep the previous list; the screen surfaces the retry hint.
      if (gen !== workLogsGeneration) {
        return;
      }
      set({ loading: false, error: messageOf(error) });
    }
  },

  retry: async () => {
    const { filter } = get();
    if (isUnfiltered(filter)) {
      await get().loadWorkLogs();
      return;
    }
    await get().applyFilter(filter);
  },

  addWorkLog: (log) =>
    set((state) => {
      const logs = [log, ...state.logs];
      return { logs, groups: groupByWeek(logs) };
    }),

  patchWorkLog: (id, patch) =>
    set((state) => {
      const logs = state.logs.map((log) => (log.id === id ? { ...log, ...patch } : log));
      return { logs, groups: groupByWeek(logs) };
    }),

  removeWorkLog: (id) =>
    set((state) => {
      const logs = state.logs.filter((log) => log.id !== id);
      return { logs, groups: groupByWeek(logs) };
    }),

  reloadTags: async () => {
    try {
      set({ allTags: await getRepos().workLogs.tags() });
    } catch {
      // Tag suggestions are advisory: keep the previous pool and do not set
      // `error`, which would hijack the `r` retry scope away from the last
      // list request and pop a banner for a failed background refresh.
    }
  },
}));

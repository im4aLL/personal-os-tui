// Dashboard store: one batched load that fans out into the per-domain stores.
// The screen reads its loading/error/latency from here, so a single request
// produces a single skeleton and a single error line. Distribution keeps the
// existing stores authoritative for their data. Runtime only; the shape lives
// in `dashboard.types.ts`.
import { create } from "zustand";
import type { Todo } from "../repos/types";
import { messageOf } from "../utils/error";
import type { DashboardState } from "./dashboard.types";
import { useLinks } from "./links";
import { useNotes } from "./notes";
import { useProjectsStore } from "./projects";
import { getRepos } from "./repos";
import { useTodos } from "./todos";
import { useWorkLogs } from "./workLogs";

/** Reconcile the batched todos with any quick-add, edit, or delete that landed
 * while the request was in flight. The batch SELECT reads before those
 * mutations commit, so it can omit a newly created row, still carry a deleted
 * one, and carry a stale copy of an edited one. Local edits win (the `now` row
 * replaces the snapshot row), created rows are appended once and deduped
 * against the snapshot so a create that committed before the SELECT is never
 * installed twice, and local deletes are dropped rather than resurrected. No
 * todo-store generation counter is involved. */
function reconcileTodos(before: Todo[], snapshot: Todo[], now: Todo[]): Todo[] {
  const beforeIds = new Set(before.map((todo) => todo.id));
  const nowById = new Map(now.map((todo) => [todo.id, todo]));
  const snapshotIds = new Set(snapshot.map((todo) => todo.id));
  const deletedIds = new Set(before.filter((todo) => !nowById.has(todo.id)).map((todo) => todo.id));

  const reconciled = snapshot
    .filter((todo) => !deletedIds.has(todo.id))
    .map((todo) => nowById.get(todo.id) ?? todo);
  const addedDuringLoad = now.filter(
    (todo) => !beforeIds.has(todo.id) && !snapshotIds.has(todo.id),
  );
  return [...reconciled, ...addedDuringLoad];
}

export const useDashboard = create<DashboardState>((set) => ({
  loading: true,
  error: null,
  latencyMs: null,
  counts: null,

  loadDashboard: async () => {
    set({ loading: true, error: null });
    const todosBefore = useTodos.getState().todos;
    const startedAt = Date.now();
    try {
      const snapshot = await getRepos().dashboard.load();
      const latencyMs = Date.now() - startedAt;
      const todosNow = useTodos.getState().todos;
      useTodos.getState().setTodos(reconcileTodos(todosBefore, snapshot.todos, todosNow));
      useNotes.getState().setNotes(snapshot.notes);
      useLinks.getState().setLinksPage({
        links: snapshot.links,
        nextCursor: snapshot.linksNextCursor,
        total: snapshot.linksTotal,
      });
      useWorkLogs.getState().setWorkLogs(snapshot.workLogs);
      useProjectsStore.getState().setProjects(snapshot.projects, snapshot.progress);
      set({ loading: false, latencyMs, counts: snapshot.counts });
    } catch (error) {
      // Keep every store as-is: the previous data stays visible and only the
      // header error line changes.
      set({ loading: false, error: messageOf(error), latencyMs: Date.now() - startedAt });
    }
  },
}));

// Links store: paginated list state over the repository seam. Mirrors the
// desktop `personal-os/src/store/links.ts`, including the module-level
// `linksGeneration` guard so a slow response can never overwrite a newer
// query. Mutations stay local; the screen performs the repo write and patches
// here. Runtime only; the state shape lives in `links.types.ts`.
import { create } from "zustand";
import { messageOf } from "../utils/error";
import type { LinksState } from "./links.types";
import { getRepos } from "./repos";

/** Page size for every list request. Kept here (not imported from the mock) so
 * a production build never reaches the mock module. */
const LINKS_PAGE_SIZE = 50;

// Monotonic generation token: every page reset bumps it, and readers snapshot
// it and ignore results once it changed (a stale in-flight response).
let linksGeneration = 0;

export const useLinks = create<LinksState>((set, get) => ({
  links: [],
  allTags: [],
  loading: true,
  mode: "all",
  query: "",
  tag: null,
  cursor: null,
  hasMore: true,
  loadingMore: false,
  total: null,
  error: null,
  errorScope: null,

  loadLinks: async () => {
    const gen = ++linksGeneration;
    set({
      loading: true,
      mode: "all",
      query: "",
      tag: null,
      cursor: null,
      hasMore: true,
      error: null,
      errorScope: null,
    });
    try {
      const [page, allTags] = await Promise.all([
        getRepos().links.list({ limit: LINKS_PAGE_SIZE }),
        getRepos().links.tags(),
      ]);
      if (gen !== linksGeneration) {
        return;
      }
      set({
        links: page.links,
        allTags,
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        total: page.total ?? null,
        loading: false,
      });
    } catch (error) {
      if (gen !== linksGeneration) {
        return;
      }
      set({ loading: false, error: messageOf(error), errorScope: "list" });
    }
  },

  refreshLinks: async () => {
    const gen = ++linksGeneration;
    const { mode, query, tag } = get();
    try {
      const [page, allTags] = await Promise.all([
        getRepos().links.list({
          limit: LINKS_PAGE_SIZE,
          ...(mode === "search" ? { query } : {}),
          ...(mode === "tag" && tag !== null ? { tag } : {}),
        }),
        getRepos().links.tags(),
      ]);
      if (gen !== linksGeneration) {
        return;
      }
      set({
        links: page.links,
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        total: page.total ?? null,
        allTags,
        error: null,
        errorScope: null,
      });
    } catch (error) {
      if (gen !== linksGeneration) {
        return;
      }
      set({ error: messageOf(error), errorScope: "list" });
    }
  },

  searchLinks: async (query) => {
    const trimmed = query.trim();
    if (trimmed === "") {
      await get().loadLinks();
      return;
    }
    const gen = ++linksGeneration;
    set({
      mode: "search",
      query: trimmed,
      tag: null,
      cursor: null,
      hasMore: true,
      error: null,
      errorScope: null,
    });
    try {
      const page = await getRepos().links.list({ limit: LINKS_PAGE_SIZE, query: trimmed });
      // Guard against a stale response after the user typed something else.
      if (gen !== linksGeneration) {
        return;
      }
      if (get().mode !== "search" || get().query !== trimmed) {
        set({ loading: false });
        return;
      }
      set({
        links: page.links,
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        total: page.total ?? null,
        loading: false,
      });
    } catch (error) {
      if (gen !== linksGeneration) {
        return;
      }
      set({ loading: false, error: messageOf(error), errorScope: "list" });
    }
  },

  filterByTag: async (tag) => {
    const gen = ++linksGeneration;
    set({
      mode: "tag",
      tag,
      query: "",
      cursor: null,
      hasMore: true,
      error: null,
      errorScope: null,
    });
    try {
      const page = await getRepos().links.list({ limit: LINKS_PAGE_SIZE, tag });
      if (gen !== linksGeneration) {
        return;
      }
      if (get().mode !== "tag" || get().tag !== tag) {
        set({ loading: false });
        return;
      }
      set({
        links: page.links,
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        total: page.total ?? null,
        loading: false,
      });
    } catch (error) {
      if (gen !== linksGeneration) {
        return;
      }
      set({ loading: false, error: messageOf(error), errorScope: "list" });
    }
  },

  loadMore: async () => {
    const { mode, query, tag, cursor, hasMore, loadingMore } = get();
    if (!hasMore || loadingMore) {
      return;
    }
    const gen = linksGeneration;
    set({ loadingMore: true, error: null, errorScope: null });
    try {
      const page = await getRepos().links.list({
        limit: LINKS_PAGE_SIZE,
        cursor,
        ...(mode === "search" ? { query } : {}),
        ...(mode === "tag" && tag !== null ? { tag } : {}),
      });
      if (gen !== linksGeneration) {
        set({ loadingMore: false });
        return;
      }
      // A reset raced us (mode/query/tag changed): drop the stale page.
      if (get().mode !== mode || get().query !== query || get().tag !== tag) {
        set({ loadingMore: false });
        return;
      }
      const seen = new Set(get().links.map((link) => link.id));
      const fresh = page.links.filter((link) => !seen.has(link.id));
      // Terminate on zero progress so a duplicate/overlapping page cannot
      // stall the list with hasMore stuck true.
      const madeProgress = fresh.length > 0;
      set((state) => ({
        links: [...state.links, ...fresh],
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null && madeProgress,
        total: page.total ?? state.total,
        loadingMore: false,
      }));
    } catch (error) {
      // Keep the existing rows; the screen surfaces the retry hint.
      if (gen !== linksGeneration) {
        set({ loadingMore: false });
        return;
      }
      // A malformed cursor is client-side corruption with no recovery path if
      // it is retried verbatim (W4 review follow-up): retrying the same bad
      // cursor can only fail again. Drop it and restart the active filter from
      // page one. The error is still surfaced for this attempt; the caller's
      // retry then hits a clean cursor.
      const malformedCursor = messageOf(error).includes("invalid links cursor") && cursor !== null;
      set({
        loadingMore: false,
        cursor: malformedCursor ? null : cursor,
        hasMore: true,
        error: messageOf(error),
        errorScope: "more",
      });
    }
  },

  retry: async () => {
    const { errorScope, mode, query, tag } = get();
    if (errorScope === "more") {
      await get().loadMore();
      return;
    }
    if (mode === "search" && query !== "") {
      await get().searchLinks(query);
      return;
    }
    if (mode === "tag" && tag !== null) {
      await get().filterByTag(tag);
      return;
    }
    await get().loadLinks();
  },

  setLinksPage: (page) => {
    // Bump the generation so an in-flight list request cannot overwrite the
    // batched snapshot with a stale page.
    linksGeneration += 1;
    set({
      links: page.links,
      cursor: page.nextCursor,
      hasMore: page.nextCursor !== null,
      total: page.total,
      mode: "all",
      query: "",
      tag: null,
      loading: false,
      error: null,
      errorScope: null,
    });
  },

  addLink: (link) =>
    set((state) => ({
      links: [link, ...state.links],
      total: state.total === null ? null : state.total + 1,
      error: null,
      errorScope: null,
    })),

  patchLinkInList: (id, patch) =>
    set((state) => ({
      links: state.links.map((link) => (link.id === id ? { ...link, ...patch } : link)),
    })),

  removeLink: (id) =>
    set((state) => ({
      links: state.links.filter((link) => link.id !== id),
      total: state.total === null ? null : Math.max(0, state.total - 1),
    })),

  reloadTags: async () => {
    try {
      set({ allTags: await getRepos().links.tags() });
    } catch {
      // Tag suggestions are advisory: keep the previous pool and do not set
      // `error`, which would hijack the `r` retry scope away from the last
      // list request and pop a banner for a failed background refresh.
    }
  },
}));

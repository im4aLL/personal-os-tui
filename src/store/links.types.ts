import type { Link } from "../repos/types";

export type LinksMode = "all" | "search" | "tag";

export interface LinksState {
  links: Link[];
  /** Distinct tag names across the tag pool, sorted ascending. */
  allTags: string[];
  /** True while a first page loads (skeletons); load-more uses `loadingMore`. */
  loading: boolean;
  mode: LinksMode;
  query: string;
  tag: string | null;
  /** Opaque page cursor; null means the next request starts a fresh page. */
  cursor: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  /** Total rows matching the active filter, when the repo reports it. */
  total: number | null;
  /** Last load/search/load-more failure; cleared by a successful load. */
  error: string | null;
  /** Which request failed, so `retry` can repeat the right one. */
  errorScope: "list" | "more" | null;

  /** First page with the skeleton state (initial mount, scenario change). */
  loadLinks: () => Promise<void>;
  /** Silent reload of the active filter: no loading flag, used after a write. */
  refreshLinks: () => Promise<void>;
  /** Debounced text search over title and URL; an empty query resets to all. */
  searchLinks: (query: string) => Promise<void>;
  /** Tag filter; the caller resets the search first. */
  filterByTag: (tag: string) => Promise<void>;
  /** Append the next page; terminates on zero progress. */
  loadMore: () => Promise<void>;
  /** Repeat the last failed request. */
  retry: () => Promise<void>;
  /** Replace the list with a dashboard snapshot page (no request). Leaves the
   * tag pool untouched. */
  setLinksPage: (page: { links: Link[]; nextCursor: string | null; total: number | null }) => void;
  addLink: (link: Link) => void;
  patchLinkInList: (id: string, patch: Partial<Link>) => void;
  removeLink: (id: string) => void;
  /** Re-read the used-tag pool (after a create or tag change). */
  reloadTags: () => Promise<void>;
}

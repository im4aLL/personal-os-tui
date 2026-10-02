// In-memory LinkRepo with keyset-style pagination windows. Tags live in a
// separate pool (like the desktop `link_tags` table) so an orphan tag can
// exist with no attached link and the filtered-empty state stays reachable.
import { randomUUID } from "node:crypto";
import { createFixtures } from "../../mock/fixtures";
import type { Fixtures } from "../../mock/fixtures.types";
import type {
  CreateLinkInput,
  GetLinksPageParams,
  Link,
  LinkRepo,
  LinksPage,
  UpdateLinkInput,
} from "../types";
import {
  applyListScenario,
  assertNotLargeClone,
  isEmptyScenario,
  mockCall,
  mockMutationError,
} from "./guard";

export const LINKS_PAGE_SIZE = 50;

/** Rows the `large` scenario grows to. */
const LARGE_TOTAL = 600;

const seed = createFixtures();
let rows: Link[] = cloneLinks(seed.links);
let tagPool: string[] = [...seed.linkTags];

function cloneLinks(links: Link[]): Link[] {
  return links.map((link) => ({ ...link, tags: [...link.tags] }));
}

export function resetLinkFixtures(fixtures: Fixtures): void {
  rows = cloneLinks(fixtures.links);
  tagPool = [...fixtures.linkTags];
}

function stamp(): string {
  return new Date().toISOString();
}

/** Track a tag name in the pool; the pool keeps orphan tags, mirroring the
 * desktop `link_tags` table which is never pruned on delete. */
function rememberTags(tags: string[]): void {
  for (const tag of tags) {
    if (!tagPool.includes(tag)) {
      tagPool.push(tag);
    }
  }
}

function filtered(params: GetLinksPageParams): Link[] {
  const query = (params.query ?? "").trim().toLowerCase();
  const tag = params.tag ?? null;
  return rows
    .filter((link) => {
      if (tag !== null && !link.tags.includes(tag)) {
        return false;
      }
      if (query === "") {
        return true;
      }
      return link.title.toLowerCase().includes(query) || link.url.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const byDate = b.createdAt.localeCompare(a.createdAt);
      return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
    });
}

export const mockLinkRepo: LinkRepo = {
  list(params: GetLinksPageParams): Promise<LinksPage> {
    return mockCall(() => {
      if (isEmptyScenario()) {
        return { links: [], nextCursor: null, total: 0 };
      }
      const limit = params.limit ?? LINKS_PAGE_SIZE;
      const all = applyListScenario(
        filtered(params),
        (row, index) => ({ ...row, id: `${row.id}-large-${index}`, tags: [...row.tags] }),
        LARGE_TOTAL,
      );
      const start = params.cursor != null ? Number(params.cursor) : 0;
      const page = all.slice(start, start + limit);
      return {
        links: page,
        nextCursor: start + limit < all.length ? String(start + limit) : null,
        total: all.length,
      };
    });
  },

  tags(): Promise<string[]> {
    return mockCall(() => [...tagPool].sort((a, b) => a.localeCompare(b)));
  },

  checkDuplicateUrl(url: string): Promise<boolean> {
    return mockCall(() => rows.some((row) => row.url === url));
  },

  create(input: CreateLinkInput): Promise<Link> {
    return mockCall(() => {
      const tags = [...(input.tags ?? [])];
      const link: Link = {
        id: randomUUID(),
        url: input.url,
        title: input.title,
        tags,
        createdAt: stamp(),
      };
      rows.push(link);
      rememberTags(tags);
      return { ...link, tags: [...tags] };
    });
  },

  update(id: string, input: UpdateLinkInput): Promise<void> {
    return mockCall(() => {
      const link = rows.find((row) => row.id === id);
      if (link === undefined) {
        throw mockMutationError("link", id);
      }
      if (input.url !== undefined) {
        link.url = input.url;
      }
      if (input.title !== undefined) {
        link.title = input.title;
      }
      if (input.tags !== undefined) {
        link.tags = [...input.tags];
        rememberTags(input.tags);
      }
    });
  },

  setTags(id: string, tags: string[]): Promise<void> {
    return mockCall(() => {
      const link = rows.find((row) => row.id === id);
      if (link === undefined) {
        throw mockMutationError("link", id);
      }
      link.tags = [...tags];
      rememberTags(tags);
    });
  },

  remove(id: string): Promise<void> {
    return mockCall(() => {
      assertNotLargeClone("link", id);
      rows = rows.filter((row) => row.id !== id);
    });
  },
};

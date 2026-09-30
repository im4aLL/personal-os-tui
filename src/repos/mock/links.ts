// In-memory LinkRepo with the same keyset pagination shape as the real query.
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
import { applyListScenario, isEmptyScenario, mockCall } from "./guard";

export const LINKS_PAGE_SIZE = 50;

let rows: Link[] = createFixtures().links;

export function resetLinkFixtures(fixtures: Fixtures): void {
  rows = [...fixtures.links];
}

function stamp(): string {
  return new Date().toISOString();
}

function filtered(params: GetLinksPageParams): Link[] {
  const query = (params.query ?? "").trim().toLowerCase();
  const tag = params.tag ?? null;
  return [...rows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((link) => {
      if (tag !== null && !link.tags.includes(tag)) {
        return false;
      }
      if (query === "") {
        return true;
      }
      return link.title.toLowerCase().includes(query) || link.url.toLowerCase().includes(query);
    });
}

export const mockLinkRepo: LinkRepo = {
  list(params: GetLinksPageParams): Promise<LinksPage> {
    return mockCall(() => {
      if (isEmptyScenario()) {
        return { links: [], nextCursor: null };
      }
      const limit = params.limit ?? LINKS_PAGE_SIZE;
      const all = applyListScenario(filtered(params), (row, index) => ({
        ...row,
        id: `${row.id}-large-${index}`,
      }));
      const start = params.cursor != null ? Number(params.cursor) : 0;
      const page = all.slice(start, start + limit);
      return {
        links: page,
        nextCursor: start + limit < all.length ? String(start + limit) : null,
      };
    });
  },

  tags(): Promise<string[]> {
    return mockCall(() => {
      const seen = new Set<string>();
      for (const link of rows) {
        for (const tag of link.tags) {
          seen.add(tag);
        }
      }
      return [...seen].sort();
    });
  },

  create(input: CreateLinkInput): Promise<Link> {
    return mockCall(() => {
      const link: Link = {
        id: randomUUID(),
        url: input.url,
        title: input.title,
        tags: input.tags ?? [],
        createdAt: stamp(),
      };
      rows.push(link);
      return link;
    });
  },

  update(id: string, input: UpdateLinkInput): Promise<void> {
    return mockCall(() => {
      const link = rows.find((row) => row.id === id);
      if (link === undefined) {
        throw new Error(`mock link not found: ${id}`);
      }
      Object.assign(link, { ...input, id: link.id });
    });
  },

  remove(id: string): Promise<void> {
    return mockCall(() => {
      rows = rows.filter((row) => row.id !== id);
    });
  },
};

// Turso stub (M0). Throws until the Save Links wiring milestone lands.
import type {
  CreateLinkInput,
  GetLinksPageParams,
  Link,
  LinkRepo,
  LinksPage,
  UpdateLinkInput,
} from "../types";

function notWired(what: string): Error {
  return new Error(`turso ${what} is not wired yet`);
}

export const tursoLinkRepo: LinkRepo = {
  list(_params: GetLinksPageParams): Promise<LinksPage> {
    throw notWired("links.list");
  },
  tags(): Promise<string[]> {
    throw notWired("links.tags");
  },
  create(_input: CreateLinkInput): Promise<Link> {
    throw notWired("links.create");
  },
  update(_id: string, _input: UpdateLinkInput): Promise<void> {
    throw notWired("links.update");
  },
  remove(_id: string): Promise<void> {
    throw notWired("links.remove");
  },
};

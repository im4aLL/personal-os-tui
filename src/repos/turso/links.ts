// Real LinkRepo: remote rows through src/lib/links.ts. Mapping only; the SQL,
// cursor encoding, and tag serialization live in the lib layer.
import {
  checkDuplicateUrl,
  createLink,
  deleteLink,
  getAllUsedTags,
  getLinksPage,
  setTagsForLink,
  updateLink,
} from "../../lib/links";
import type {
  CreateLinkInput,
  GetLinksPageParams,
  Link,
  LinkRepo,
  LinksPage,
  UpdateLinkInput,
} from "../types";

export const tursoLinkRepo: LinkRepo = {
  async list(params: GetLinksPageParams): Promise<LinksPage> {
    return getLinksPage(params);
  },
  async tags(): Promise<string[]> {
    return getAllUsedTags();
  },
  async checkDuplicateUrl(url: string): Promise<boolean> {
    return checkDuplicateUrl(url);
  },
  async create(input: CreateLinkInput): Promise<Link> {
    return createLink(input);
  },
  async update(id: string, input: UpdateLinkInput): Promise<void> {
    await updateLink(id, input);
  },
  async setTags(id: string, tags: string[]): Promise<void> {
    await setTagsForLink(id, tags);
  },
  async remove(id: string): Promise<void> {
    await deleteLink(id);
  },
};

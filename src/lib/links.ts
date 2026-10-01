// Remote links access: the desktop SQL with `?` placeholders, returning domain
// `Link` values. The Turso repo delegates here; the mock mirrors the ordering
// and tag semantics. Links paginate over the `{ created_at, id }` keyset cursor,
// which this layer encodes to and decodes from the opaque `string` the store and
// repository seam carry. Tags live in `link_tags` and are read back as a batch.
import { randomUUID } from "node:crypto";
import type { CreateLinkInput, GetLinksPageParams, Link, LinksPage } from "../repos/types";
import { tursoBatchExecute, tursoExecute, tursoSelect } from "./turso";

/** Page size for every links request; also the cap a caller omitting `limit`
 * falls back to. Exported so the store's request size and the SQL agree. */
export const LINKS_PAGE_SIZE = 50;

interface LinkRow {
  id: string;
  url: string;
  title: string;
  created_at: string;
}

/** The keyset position of the last row on a page. Kept private: callers carry
 * only the opaque encoded string. */
interface LinkCursor {
  created_at: string;
  id: string;
}

function toLink(row: LinkRow): Link {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    tags: [],
    createdAt: row.created_at,
  };
}

// -- Cursor encoding ---------------------------------------------------------

/** Encode a keyset position as opaque base64url JSON. The store treats the
 * cursor as a black box, so the representation is an implementation detail. */
function encodeCursor(cursor: LinkCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/** Decode an opaque cursor. A malformed or incomplete cursor throws rather than
 * falling back to a fresh first page: silently restarting would re-serve rows
 * the caller already holds, and the store's zero-progress guard would then stop
 * pagination without surfacing the corruption. */
function decodeCursor(raw: string): LinkCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new Error("invalid links cursor");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("invalid links cursor");
  }
  const { created_at, id } = parsed as Record<string, unknown>;
  if (typeof created_at !== "string" || typeof id !== "string") {
    throw new Error("invalid links cursor");
  }
  return { created_at, id };
}

// -- Page reads --------------------------------------------------------------

/** Attach each link's tag names in one batched `IN (...)` query, mirroring the
 * desktop `attachTagsToPage`. `?` has no positional binding, so the id list
 * becomes one placeholder per id. Ordered by `created_at ASC` so the tag order
 * matches the mock and the desktop. */
async function attachTagsToPage(links: Link[]): Promise<Link[]> {
  if (links.length === 0) {
    return [];
  }
  const placeholders = links.map(() => "?").join(", ");
  const rows = await tursoSelect<{ link_id: string; name: string }>(
    `SELECT link_id, name FROM link_tags WHERE link_id IN (${placeholders}) ORDER BY created_at ASC`,
    links.map((link) => link.id),
  );

  const tagMap = new Map<string, string[]>();
  for (const row of rows) {
    const list = tagMap.get(row.link_id) ?? [];
    list.push(row.name);
    tagMap.set(row.link_id, list);
  }

  return links.map((link) => ({ ...link, tags: tagMap.get(link.id) ?? [] }));
}

// The four filter branches (tag/query/all, each with and without a cursor)
// share the `ORDER BY created_at DESC, id DESC` keyset ordering. `links` has no
// alias where possible so `parseValue` returns the same column names the desktop
// projection does.
async function fetchPage(
  limit: number,
  cursor: LinkCursor | null,
  query: string | undefined,
  tag: string | null,
): Promise<Link[]> {
  const afterKeyset =
    cursor === null ? "" : " AND (l.created_at < ? OR (l.created_at = ? AND l.id < ?))";
  const keysetArgs = cursor === null ? [] : [cursor.created_at, cursor.created_at, cursor.id];

  if (tag !== null) {
    const rows = await tursoSelect<LinkRow>(
      `SELECT DISTINCT l.id, l.url, l.title, l.created_at FROM links l
       JOIN link_tags t ON t.link_id = l.id
       WHERE t.name = ?${afterKeyset}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT ?`,
      [tag, ...keysetArgs, limit],
    );
    return rows.map(toLink);
  }

  const trimmedQuery = query?.trim();
  if (trimmedQuery !== undefined && trimmedQuery !== "") {
    const like = `%${trimmedQuery}%`;
    const rows = await tursoSelect<LinkRow>(
      `SELECT l.id, l.url, l.title, l.created_at FROM links l
       WHERE (l.title LIKE ? OR l.url LIKE ?)${afterKeyset}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT ?`,
      [like, like, ...keysetArgs, limit],
    );
    return rows.map(toLink);
  }

  const rows = await tursoSelect<LinkRow>(
    `SELECT l.id, l.url, l.title, l.created_at FROM links l
     WHERE 1 = 1${afterKeyset}
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT ?`,
    [...keysetArgs, limit],
  );
  return rows.map(toLink);
}

/** One page of links, newest first. `total` is deliberately left `undefined`:
 * the screen renders "all shown" from `nextCursor`, so a per-page `COUNT(*)`
 * would add a round trip that only ever improves a status line. The store maps
 * the absent field to `null` (`page.total ?? null`). */
export async function getLinksPage(params: GetLinksPageParams): Promise<LinksPage> {
  const limit = params.limit ?? LINKS_PAGE_SIZE;
  const rawCursor = params.cursor ?? null;
  const cursor = rawCursor === null ? null : decodeCursor(rawCursor);
  const tag = params.tag ?? null;

  const links = await fetchPage(limit, cursor, params.query, tag);
  const withTags = await attachTagsToPage(links);

  const last = links[links.length - 1];
  // A short page means the end of the filtered set; a full page offers the next
  // keyset position.
  const nextCursor: string | null =
    links.length < limit || last === undefined
      ? null
      : encodeCursor({ created_at: last.createdAt, id: last.id });

  return { links: withTags, nextCursor };
}

// -- Queries -----------------------------------------------------------------

export async function getAllUsedTags(): Promise<string[]> {
  const rows = await tursoSelect<{ name: string }>(
    "SELECT DISTINCT name FROM link_tags ORDER BY name ASC",
  );
  return rows.map((row) => row.name);
}

export async function checkDuplicateUrl(url: string): Promise<boolean> {
  const rows = await tursoSelect<{ id: string }>("SELECT id FROM links WHERE url = ?", [url]);
  return rows.length > 0;
}

// -- Mutations ---------------------------------------------------------------

/** Insert a link and its tag rows in one batch. `favicon_url` is always NULL:
 * the TUI does not fetch favicons, so the column stays empty for the desktop to
 * fill later.
 *
 * `links.url` is UNIQUE, so a duplicate that slipped past `checkDuplicateUrl`
 * (a concurrent insert, or the desktop writing first) fails the batch with a
 * constraint error. The screen surfaces that error and reloads, which is the
 * intended outcome: the check is a friendly pre-flight, not a lock. */
export async function createLink(input: CreateLinkInput): Promise<Link> {
  const now = new Date().toISOString();
  const tagNames = [...new Set(input.tags ?? [])];
  const link: Link = {
    id: randomUUID(),
    url: input.url,
    title: input.title,
    tags: tagNames,
    createdAt: now,
  };

  await tursoBatchExecute([
    {
      sql: `INSERT INTO links (id, url, title, favicon_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [link.id, link.url, link.title, null, link.createdAt, now],
    },
    ...tagNames.map((name) => ({
      sql: "INSERT INTO link_tags (id, link_id, name, created_at) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), link.id, name, now],
    })),
  ]);

  return link;
}

/** Title-only update, matching the desktop: `updated_at` advances, tags and URL
 * are untouched. The TUI never edits a saved URL, so `input.url` is ignored. */
export async function updateLink(id: string, input: { title?: string }): Promise<void> {
  await tursoExecute("UPDATE links SET title = ?, updated_at = ? WHERE id = ?", [
    input.title ?? null,
    new Date().toISOString(),
    id,
  ]);
}

/** Delete a link and its tags in one batch (tags first), so a mid-batch failure
 * never leaves orphaned `link_tags` rows behind. The batch is not transactional;
 * a crash between the two statements leaves the link orphaned, which a retry
 * clears. */
export async function deleteLink(id: string): Promise<void> {
  await tursoBatchExecute([
    { sql: "DELETE FROM link_tags WHERE link_id = ?", args: [id] },
    { sql: "DELETE FROM links WHERE id = ?", args: [id] },
  ]);
}

/** One batch that replaces a link's full tag set: DELETE then one INSERT per
 * tag. Does not bump `updated_at`, matching the desktop `setTagsForLink`. */
async function writeTags(linkId: string, tags: string[]): Promise<void> {
  const now = new Date().toISOString();
  await tursoBatchExecute([
    { sql: "DELETE FROM link_tags WHERE link_id = ?", args: [linkId] },
    ...tags.map((name) => ({
      sql: "INSERT INTO link_tags (id, link_id, name, created_at) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), linkId, name, now],
    })),
  ]);
}

// Per-link serialized tag-write queue. Mirrors the desktop link editor's
// `queueTagWrite`: each new write chains after the previous one for that link
// so rapid add/remove cannot interleave two DELETE + INSERT batches. Prior
// rejections are swallowed for chaining only; each caller still sees its own
// write's rejection.
const tagWriteQueues = new Map<string, Promise<void>>();

export function setTagsForLink(linkId: string, tags: string[]): Promise<void> {
  const previous = tagWriteQueues.get(linkId) ?? Promise.resolve();
  const next = previous
    .catch(() => {
      // A failed earlier write must not block this one.
    })
    .then(() => writeTags(linkId, tags));
  const tail = next.catch(() => {});
  tagWriteQueues.set(linkId, tail);
  // Drop the queue entry once this tail settles, unless a newer write replaced
  // it in the meantime, so the map does not grow without bound.
  void tail.then(() => {
    if (tagWriteQueues.get(linkId) === tail) {
      tagWriteQueues.delete(linkId);
    }
  });
  return next;
}

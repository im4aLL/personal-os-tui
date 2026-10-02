---
id: W4
title: Links wiring
type: wiring
status: done
phase: links
order: 14
depends_on: [G4]
wires: M4
---

# W4 - Links wiring

> Type: wiring · Status: done · Phase: links

## Objective

Links paginate, search, and mutate against real data with correct keyset pagination.

## Swap in

`LinkRepo` -> `src/lib/links.ts` with `getLinksPage` (all branches), `getAllUsedTags`, `checkDuplicateUrl`, `createLink` (always `favicon_url: null`), `updateLink`, `deleteLink`, `setTagsForLink`. `src/store/links.ts` unchanged, including the generation guard.

## Optimistic updates and rollback

New links prepend immediately; an inline title edit commits optimistically; deletes remove immediately. Failures reload the current page (mode, query, and tag preserved) rather than leaving a partial state. Pagination never optimistically guesses the next page.

## Errors and loading

Debounced search issues one request per settled query; a slow response for an older query is dropped by the generation guard. A duplicate URL surfaces the desktop's message. A failed `loadMore` does not advance the cursor and offers a retry.

## Files touched

- `src/repos/turso/links.ts` - Turso implementation of `LinkRepo`
- `src/lib/links.ts` - `getLinksPage` with `LINKS_PAGE_SIZE = 50` and the `{ created_at, id }` keyset cursor
- `src/lib/open-url.ts` - no change expected

## Verification checklist

- [ ] With 60+ real links, the first page is exactly 50 and the second is the remainder; no duplicates across pages.
- [ ] Keyset pagination is stable when new links are inserted between pages (insert, then load more, and confirm no skipped or repeated rows).
- [ ] Search matches title and URL substrings; rapid typing produces one request per settled query (confirm with `DEV=true` logging).
- [ ] Saving a duplicate URL is rejected before insert.
- [ ] `favicon_url` is `null` on every new row.
- [ ] Tag filtering returns correct sets, including the empty set for an unused tag.
- [ ] Delete removes link and tag rows.
- [ ] With the network off: load, search, and load-more each show errors without corrupting the list.

## Notes

- Starts only after its gate is `done`.
- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- Implemented `src/lib/links.ts` (the desktop SQL with `?` placeholders: all four `getLinksPage` branches over the `{ created_at, id }` keyset cursor and `ORDER BY created_at DESC, id DESC`, batched `IN (...)` tag attachment ordered by `created_at ASC`, `getAllUsedTags`, `checkDuplicateUrl`, `createLink` with `favicon_url` always NULL plus tag rows in one batch, title-only `updateLink`, batched `deleteLink` (tags first), and `setTagsForLink` with the per-link serialized write queue) and the real `src/repos/turso/links.ts` wrapper. `src/store/links.ts` (including the generation guard), `src/lib/open-url.ts`, and `LinksScreen.tsx` are unchanged.
- Cursor handling: the lib layer encodes the `{ created_at, id }` keyset position as base64url JSON and decodes it from the store's opaque `string | null`; a malformed cursor throws instead of silently returning a fresh first page. `LinksPage.total` is deliberately left `undefined` (no per-page `COUNT(*)`); the store maps it to `null` and the screen renders "all shown" from `nextCursor`. `createLink` can still fail with a `UNIQUE(url)` constraint error if a duplicate slips past `checkDuplicateUrl`; that is accepted and surfaced by the screen's error path.
- Reviewed by hadi-reviewer: no defects found, merge-ready. The review raised three non-blocking items, all accepted: the pre-flight `checkDuplicateUrl` is exact-match like the desktop (the `UNIQUE(url)` fallback is accepted above); a persistently malformed cursor had no recovery path beyond a store mode switch, since the store retried the same cursor (client-side corruption only) - resolved in W8 by dropping the cursor and restarting the active filter when a load-more fails with `invalid links cursor`; and `createLink` dedupes tag names with a `Set` where the desktop inserts one row per given name (strictly beneficial, no contract change). `npm run typecheck`, `npm run check`, `npm run build`, and `npm run build:prod` pass. Live-Turso checklist items remain pending credentials.

---
id: W4
title: Links wiring
type: wiring
status: not-started
phase: links
order: 14
depends_on: [G4]
wires: M4
---

# W4 - Links wiring

> Type: wiring · Status: not-started · Phase: links

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

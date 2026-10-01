---
id: M4
title: Save Links UI
type: milestone
status: done
phase: links
order: 12
depends_on: [W3]
gate: G4
---

# M4 - Save Links UI

> Type: milestone · Status: done · Phase: links

## Objective

The Links screen on fixtures: search, tag filter pills, paginated list, save form with duplicate detection, inline title editing, open URL, and delete.

## Deliverables

- [x] `src/screens/LinksScreen.tsx` with the search bar, pill row, paginated list, and status line.
- [x] `src/components/links/LinkRow.tsx`, `LinkForm.tsx`, and `TagFilterBar.tsx`.
- [x] Pagination: 63 fixtures so the first page is exactly 50 and the second is 13; a bottom sentinel loads the next page on `j`, and an "all shown" hint replaces the load-more row at the end.
- [x] Debounced search filtering by title and URL substring, case-insensitively, with a generation guard so a slow response never overwrites a newer query.
- [x] Tag filter pills from all used tags; `Tab`/`Shift+Tab` cycle pills, `Enter` applies or clears.
- [x] Save form (`n`) with a manually typed title and tags; a blank title defaults to the domain; duplicate URLs show "This link is already saved".
- [x] Inline title editing with `e`: `Enter` commits, `Esc` reverts with no write, and there is no layout shift.
- [x] `Enter` opens the URL in the system browser; `c` copies it; a non-`http` scheme shows the open-URL failure message.
- [x] Delete with confirmation (`d`).
- [x] Empty states: "No links yet" plus "Save your first link to get started"; filtered empty: "No links match your search" plus guidance.
- [x] Loading: three skeleton rows on first load; a two-row skeleton plus `loading more` at the pagination sentinel.
- [x] Error: an invalid URL shows the parse error; a load-more failure keeps existing rows and shows a retry hint with `r`.
- [x] Narrow: below 90 columns tags move under the title and the date column is dropped; below 60 the URL line truncates from the middle so the domain stays visible.
- [x] Fixtures: 63 links; 5-7 tags including one that matches a single link and one that matches zero; two links with identical titles but different URLs; one very long path; one non-`http` scheme; `created_at` spread over months.
- [x] Scenario transforms: `empty`, `loading`, `large` (600 links), `error`.

## Design notes

### Screen layout

```text
+--------------------------------------------------------------+
| Search links...                                n  Save link    |
+--------------------------------------------------------------+
| [ all ] [ dev ] [ db ] [ reading ] [ tools ] [ design ] ...   |
+--------------------------------------------------------------+
| > Turso docs                                          Sep 12  |
|   docs.turso.tech          [ dev ] [ db ]                     |
|   ----------------------------------------------------------  |
|   OpenTUI components                                  Sep 11  |
|   opentui.com              [ dev ] [ ui ]                     |
|   ----------------------------------------------------------  |
|   A very long link title that must truncate cleanly    Sep 10  |
|   example.com/very/long/path  [ reading ]                     |
+--------------------------------------------------------------+
 Enter open  e edit title  c copy  d delete  Tab cycle tags
 status: 50 of 63 shown, j to load more
```

### Keybindings

| Key | Action |
| --- | --- |
| `j` / `k` | Move selection (loading the next page when hitting the bottom sentinel) |
| `Enter` | Open the URL in the system browser |
| `e` | Edit the title inline (`Enter` commits, `Esc` reverts) |
| `c` | Copy the URL to the clipboard |
| `d` | Delete with confirmation |
| `n` | Open the save form |
| `/` | Focus search (debounced) |
| `Tab` / `Shift+Tab` | Cycle tag filter pills |
| `Enter` on a pill | Apply or clear the tag filter |
| `Esc` | Clear the tag filter, then the search |
| `r` | Retry the last failed request |

### States

- Empty: "No links yet" plus "Save your first link to get started"; filtered empty: "No links match your search" plus guidance, matching `personal-os/src/components/links/link-list.tsx`.
- Loading: three skeleton rows on first load; a two-row skeleton plus `loading more` at the pagination sentinel.
- Populated: 63 fixture links so pagination is real (50 then 13).
- Error: duplicate URL on save shows "This link is already saved"; an invalid URL shows the parse error; a load-more failure keeps existing rows and shows a retry hint.
- Inline edit: the title becomes an input with a visible cursor; no layout shift.
- Narrow: below 90 columns, tags move under the title and the date column is dropped; below 60, the URL line truncates from the middle so the domain stays visible.

## Files touched

- `src/screens/LinksScreen.tsx` - the Links screen
- `src/components/links/LinkRow.tsx` - row with title, domain, tags, and date
- `src/components/links/LinkForm.tsx` - save form with duplicate detection
- `src/components/links/TagFilterBar.tsx` - tag filter pills
- `src/components/ui/*` - TagInput, ConfirmDialog, Skeleton additions
- `src/store/links.ts` - store mirroring `personal-os/src/store/links.ts` including the `linksGeneration` guard
- `src/repos/mock/links.ts` - in-memory implementation with pagination windows

## Approval

Approved at [G4](G4-save-links-ui-approval.md). Do not start the next ticket until G4 is `done`.

## Deferred

- Favicons
- Metadata fetch
- Virtualization
- Bulk delete
- Link health checks

## Notes

- One feature at a time: UI, then gate, then wiring. The repository seam allows reordering features if priorities change.
- `npm run typecheck`, `npm run check`, and `npm run build` all pass. The interactive G4 checklist remains a manual pass.
- Repo seam: `LinkRepo` gained `checkDuplicateUrl(url)` and `setTags(id, tags)` (the latter for W4); `LinksPage` gained an optional `total` so the status line can read "50 of 63 shown". The Turso implementations stay W4 `notWired` stubs. `list` maps to the desktop `getLinksPage`, `tags()` to `getAllUsedTags`, so W4 swaps the mock for a mechanical wrapper without touching the store.
- Store mirrors `personal-os/src/store/links.ts` including the module-level `linksGeneration` guard and the zero-progress `loadMore` termination. Two additions beyond the desktop store (which logs to the console): an `error`/`errorScope` pair and a `retry()` that repeats the last failed request so `r` can distinguish a failed page load from a failed load-more. `total` is tracked alongside.
- The cursor stays an opaque `string | null` (the mock uses a numeric window offset) rather than the desktop `{created_at, id}` object; W4 encodes/decodes that object into this string, which keeps the store final for the wiring ticket.
- `TagInput` moved from `src/components/notes/` to `src/components/ui/` and is now shared by the Notes editor and the save form; the `truncate` helper moved to `src/utils/text.ts` (with the new `truncateMiddle`) and Notes importers were updated.
- `c` and the non-http/open-failure fallback use the OpenTUI renderer clipboard (`renderer.copyToClipboardOSC52`), and `src/lib/open-url.ts` launches the system browser with `node:child_process` (`open`/`xdg-open`/`explorer.exe`, the last chosen over `cmd /c start` so the URL is a single argv entry and cmd cannot re-parse it) returning `{ok}` so the screen can fall back to a copied-URL message.
- Narrow rule reading: below 90 columns the date column is dropped and tags move to their own line under the title/URL block (desktop order title -> URL -> tags); below 60 the URL label middle-truncates so the domain stays visible.
- Tag input field: `Enter` on the URL or Title field submits, `Enter` on the Tags field adds a tag (matching the Notes tag input), and `Ctrl+Enter` submits from anywhere in the form.
- Pill focus is a screen-level mode: `Tab`/`Shift+Tab` (or `backtab`) focus and cycle the pill row, `Enter` applies or clears the highlighted pill, and `Esc` returns focus to the list before it clears the tag then the search.
- Fixtures add 63 links and a 7-name tag pool (`dev`, `db`, `reading`, `tools`, `design`, `ui`, `rust`); `rust` is an orphan with no link (mirrors the desktop `link_tags` table), `design` matches exactly one link, and two "OpenTUI components" rows differ only by URL.

---
id: M4
title: Save Links UI
type: milestone
status: not-started
phase: links
order: 12
depends_on: [W3]
gate: G4
---

# M4 - Save Links UI

> Type: milestone · Status: not-started · Phase: links

## Objective

The Links screen on fixtures: search, tag filter pills, paginated list, save form with duplicate detection, inline title editing, open URL, and delete.

## Deliverables

- [ ] `src/screens/LinksScreen.tsx` with the search bar, pill row, paginated list, and status line.
- [ ] `src/components/links/LinkRow.tsx`, `LinkForm.tsx`, and `TagFilterBar.tsx`.
- [ ] Pagination: 63 fixtures so the first page is exactly 50 and the second is 13; a bottom sentinel loads the next page on `j`, and an "all shown" hint replaces the load-more row at the end.
- [ ] Debounced search filtering by title and URL substring, case-insensitively, with a generation guard so a slow response never overwrites a newer query.
- [ ] Tag filter pills from all used tags; `Tab`/`Shift+Tab` cycle pills, `Enter` applies or clears.
- [ ] Save form (`n`) with a manually typed title and tags; a blank title defaults to the domain; duplicate URLs show "This link is already saved".
- [ ] Inline title editing with `e`: `Enter` commits, `Esc` reverts with no write, and there is no layout shift.
- [ ] `Enter` opens the URL in the system browser; `c` copies it; a non-`http` scheme shows the open-URL failure message.
- [ ] Delete with confirmation (`d`).
- [ ] Empty states: "No links yet" plus "Save your first link to get started"; filtered empty: "No links match your search" plus guidance.
- [ ] Loading: three skeleton rows on first load; a two-row skeleton plus `loading more` at the pagination sentinel.
- [ ] Error: an invalid URL shows the parse error; a load-more failure keeps existing rows and shows a retry hint with `r`.
- [ ] Narrow: below 90 columns tags move under the title and the date column is dropped; below 60 the URL line truncates from the middle so the domain stays visible.
- [ ] Fixtures: 63 links; 5-7 tags including one that matches a single link and one that matches zero; two links with identical titles but different URLs; one very long path; one non-`http` scheme; `created_at` spread over months.
- [ ] Scenario transforms: `empty`, `loading`, `large` (600 links), `error`.

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

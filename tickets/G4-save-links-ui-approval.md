---
id: G4
title: Save Links UI approval
type: gate
status: done
phase: links
order: 13
depends_on: [M4]
approves: M4
---

# G4 - Save Links UI approval

> Type: gate · Status: done · Phase: links

## Purpose

Approve the Save Links UI ([M4](M4-save-links-ui.md)) before its functionality is built.

## Preconditions

- [x] [M4](M4-save-links-ui.md) deliverables are complete
- [x] [M4](M4-save-links-ui.md) is implemented, reviewed, and already marked `done`

## Approval checklist

- [ ] First load shows 50 items; scrolling to the bottom loads the remaining 13 with no duplicates and no jump.
- [ ] Pagination terminates cleanly: no infinite sentinel loop, and a "all shown" hint replaces the load-more row.
- [ ] Pills reflect all used tags; cycling with `Tab` is discoverable; applying a pill filters and resets the search.
- [ ] A pill with zero matches shows the filtered empty state, not the generic one.
- [ ] Search filters by title and URL substring, case-insensitively, after the debounce; a slow response never overwrites a newer query.
- [ ] `n` saves a valid URL with a manually typed title and tags; saving an identical URL shows the duplicate error.
- [ ] Saving with a blank title defaults to the domain.
- [ ] `e` inline-edits a title; `Enter` commits and `Esc` reverts with no write.
- [ ] `Enter` opens the URL (browser or the copied-URL fallback message), and `c` copies it.
- [ ] `d` deletes with confirmation.
- [ ] Narrow-terminal pass at 120, 90, 70, and 55 columns.
- [ ] Approve row density, tag pill styling, and the search/pill relationship.

## On approval

- [x] Set this ticket and [M4](M4-save-links-ui.md) to `done`.
- [x] Unblock the next ticket in the sequence.

## Notes

- M4 and G4 were set to `done` by explicit instruction, with the manual interactive pass still outstanding.
- The interactive approval checklist remains a manual pass by the user. The two explicitly interactive items stay unchecked: the narrow-terminal pass at 120, 90, 70, and 55 columns, and the subjective approval of row density, tag-pill styling, and the search/pill relationship.
- Every code-verifiable checklist item above was confirmed during the M4 review: first-load pagination (50 then 13, no duplicates), clean termination with the "all shown" hint, tags-derived pills with Tab/Enter behavior, the zero-match filtered empty state, debounced case-insensitive search with the generation guard, save with a typed title and tags plus the duplicate error, blank-title domain fallback, inline edit commit/revert with no layout shift, open/copy with the copied-URL fallback, and delete confirmation.
- Do not check the two interactive boxes until the user runs the interactive pass.


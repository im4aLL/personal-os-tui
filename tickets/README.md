# Personal OS TUI - Ticket Board

This board is generated from `PLAN.md`, which is the source of truth for scope, sequencing, and verification.

## Legend

`status`: `not-started` | `in-progress` | `done`

`type`: `milestone` (a feature UI built on mock data) | `gate` (explicit approval of a milestone before wiring) | `wiring` (swap the mock repository for real Turso)

## Delivery sequence

One feature at a time: UI, then gate, then wiring.

1. [M0](M0-skeleton-and-repo-seam.md) - Skeleton, theme, shell, navigation, and the repository seam (milestone, foundation, not-started)
2. [G0](G0-shell-ui-approval.md) - Shell UI approval (gate, foundation, not-started)
3. [M1](M1-setup-ui.md) - Setup UI (mock connection) (milestone, setup, not-started)
4. [G1](G1-setup-ui-approval.md) - Setup UI approval (gate, setup, not-started)
5. [W1](W1-setup-wiring.md) - Setup wiring (wiring, setup, not-started)
6. [M2](M2-todo-ui.md) - Todo UI (milestone, todo, not-started)
7. [G2](G2-todo-ui-approval.md) - Todo UI approval (gate, todo, not-started)
8. [W2](W2-todo-wiring.md) - Todo wiring (wiring, todo, not-started)
9. [M3](M3-notes-ui.md) - Notes UI (milestone, notes, not-started)
10. [G3](G3-notes-ui-approval.md) - Notes UI approval (gate, notes, not-started)
11. [W3](W3-notes-wiring.md) - Notes wiring (wiring, notes, not-started)
12. [M4](M4-save-links-ui.md) - Save Links UI (milestone, links, not-started)
13. [G4](G4-save-links-ui-approval.md) - Save Links UI approval (gate, links, not-started)
14. [W4](W4-links-wiring.md) - Links wiring (wiring, links, not-started)
15. [M5](M5-work-log-ui.md) - Work Log UI (milestone, work-log, not-started)
16. [G5](G5-work-log-ui-approval.md) - Work Log UI approval (gate, work-log, not-started)
17. [W5](W5-work-log-wiring.md) - Work Log wiring (wiring, work-log, not-started)
18. [M6](M6-project-planner-ui.md) - Project Planner UI (milestone, projects, not-started)
19. [G6](G6-project-planner-ui-approval.md) - Project Planner UI approval (gate, projects, not-started)
20. [W6](W6-project-planner-wiring.md) - Project Planner wiring (wiring, projects, not-started)
21. [M7](M7-dashboard-ui.md) - Dashboard UI (milestone, dashboard, not-started)
22. [G7](G7-dashboard-ui-approval.md) - Dashboard UI approval (gate, dashboard, not-started)
23. [W7](W7-dashboard-wiring.md) - Dashboard wiring (wiring, dashboard, not-started)
24. [M8](M8-cross-cutting-polish-ui.md) - Cross-cutting polish (UI) (milestone, polish, not-started)
25. [G8](G8-polish-ui-approval.md) - Polish UI approval (gate, polish, not-started)
26. [W8](W8-real-data-hardening.md) - Real-data hardening and end-to-end (wiring, hardening, not-started)

## Status board

## not-started

| Ticket | Title | Type | Phase |
| --- | --- | --- | --- |
| [M0](M0-skeleton-and-repo-seam.md) | Skeleton, theme, shell, navigation, and the repository seam | milestone | foundation |
| [G0](G0-shell-ui-approval.md) | Shell UI approval | gate | foundation |
| [M1](M1-setup-ui.md) | Setup UI (mock connection) | milestone | setup |
| [G1](G1-setup-ui-approval.md) | Setup UI approval | gate | setup |
| [W1](W1-setup-wiring.md) | Setup wiring | wiring | setup |
| [M2](M2-todo-ui.md) | Todo UI | milestone | todo |
| [G2](G2-todo-ui-approval.md) | Todo UI approval | gate | todo |
| [W2](W2-todo-wiring.md) | Todo wiring | wiring | todo |
| [M3](M3-notes-ui.md) | Notes UI | milestone | notes |
| [G3](G3-notes-ui-approval.md) | Notes UI approval | gate | notes |
| [W3](W3-notes-wiring.md) | Notes wiring | wiring | notes |
| [M4](M4-save-links-ui.md) | Save Links UI | milestone | links |
| [G4](G4-save-links-ui-approval.md) | Save Links UI approval | gate | links |
| [W4](W4-links-wiring.md) | Links wiring | wiring | links |
| [M5](M5-work-log-ui.md) | Work Log UI | milestone | work-log |
| [G5](G5-work-log-ui-approval.md) | Work Log UI approval | gate | work-log |
| [W5](W5-work-log-wiring.md) | Work Log wiring | wiring | work-log |
| [M6](M6-project-planner-ui.md) | Project Planner UI | milestone | projects |
| [G6](G6-project-planner-ui-approval.md) | Project Planner UI approval | gate | projects |
| [W6](W6-project-planner-wiring.md) | Project Planner wiring | wiring | projects |
| [M7](M7-dashboard-ui.md) | Dashboard UI | milestone | dashboard |
| [G7](G7-dashboard-ui-approval.md) | Dashboard UI approval | gate | dashboard |
| [W7](W7-dashboard-wiring.md) | Dashboard wiring | wiring | dashboard |
| [M8](M8-cross-cutting-polish-ui.md) | Cross-cutting polish (UI) | milestone | polish |
| [G8](G8-polish-ui-approval.md) | Polish UI approval | gate | polish |
| [W8](W8-real-data-hardening.md) | Real-data hardening and end-to-end | wiring | hardening |

## in-progress

None yet.

## done

None yet.

## Rules

- A gate must be `done` before its wiring ticket starts.
- A milestone's ticket stays open until its gate passes.
- Keep statuses in sync between the ticket frontmatter and this board.

## How to update

Edit the `status:` field in the ticket frontmatter and move its row to the matching section here.

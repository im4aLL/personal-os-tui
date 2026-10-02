# Personal OS TUI - Ticket Board

This board is generated from `PLAN.md`, which is the source of truth for scope, sequencing, and verification.

## Legend

`status`: `not-started` | `in-progress` | `done`

`type`: `bootstrap` (project init, dependencies, tooling config, license) | `milestone` (a feature UI built on mock data) | `gate` (explicit approval of a milestone before wiring) | `wiring` (swap the mock repository for real Turso) | `feature` (config- or runtime-driven behavior on real files, no mock or Turso)

## Delivery sequence

One feature at a time: UI, then gate, then wiring.

0. [B0](B0-project-bootstrap.md) - Project bootstrap (init, dependencies, config, license) (bootstrap, foundation, done)
1. [M0](M0-skeleton-and-repo-seam.md) - Skeleton, theme, shell, navigation, and the repository seam (milestone, foundation, done)
2. [G0](G0-shell-ui-approval.md) - Shell UI approval (gate, foundation, done)
3. [M1](M1-setup-ui.md) - Setup UI (mock connection) (milestone, setup, done)
4. [G1](G1-setup-ui-approval.md) - Setup UI approval (gate, setup, done)
5. [W1](W1-setup-wiring.md) - Setup wiring (wiring, setup, done)
6. [M2](M2-todo-ui.md) - Todo UI (milestone, todo, done)
7. [G2](G2-todo-ui-approval.md) - Todo UI approval (gate, todo, done)
8. [W2](W2-todo-wiring.md) - Todo wiring (wiring, todo, done)
9. [M3](M3-notes-ui.md) - Notes UI (milestone, notes, done)
10. [G3](G3-notes-ui-approval.md) - Notes UI approval (gate, notes, done)
11. [W3](W3-notes-wiring.md) - Notes wiring (wiring, notes, done)
12. [M4](M4-save-links-ui.md) - Save Links UI (milestone, links, done)
13. [G4](G4-save-links-ui-approval.md) - Save Links UI approval (gate, links, done)
14. [W4](W4-links-wiring.md) - Links wiring (wiring, links, done)
15. [M5](M5-work-log-ui.md) - Work Log UI (milestone, work-log, done)
16. [G5](G5-work-log-ui-approval.md) - Work Log UI approval (gate, work-log, done)
17. [W5](W5-work-log-wiring.md) - Work Log wiring (wiring, work-log, done)
18. [M6](M6-project-planner-ui.md) - Project Planner UI (milestone, projects, done)
19. [G6](G6-project-planner-ui-approval.md) - Project Planner UI approval (gate, projects, done)
20. [W6](W6-project-planner-wiring.md) - Project Planner wiring (wiring, projects, done)
21. [M7](M7-dashboard-ui.md) - Dashboard UI (milestone, dashboard, not-started)
22. [G7](G7-dashboard-ui-approval.md) - Dashboard UI approval (gate, dashboard, not-started)
23. [W7](W7-dashboard-wiring.md) - Dashboard wiring (wiring, dashboard, not-started)
24. [M8](M8-cross-cutting-polish-ui.md) - Cross-cutting polish (UI) (milestone, polish, not-started)
25. [G8](G8-polish-ui-approval.md) - Polish UI approval (gate, polish, not-started)
26. [F1](F1-configurable-keymap.md) - Configurable keymap from the config file (feature, polish, not-started)
27. [W8](W8-real-data-hardening.md) - Real-data hardening and end-to-end (wiring, hardening, not-started)

## Status board

## not-started

| Ticket | Title | Type | Phase |
| --- | --- | --- | --- |
| [M7](M7-dashboard-ui.md) | Dashboard UI | milestone | dashboard |
| [G7](G7-dashboard-ui-approval.md) | Dashboard UI approval | gate | dashboard |
| [W7](W7-dashboard-wiring.md) | Dashboard wiring | wiring | dashboard |
| [M8](M8-cross-cutting-polish-ui.md) | Cross-cutting polish (UI) | milestone | polish |
| [G8](G8-polish-ui-approval.md) | Polish UI approval | gate | polish |
| [F1](F1-configurable-keymap.md) | Configurable keymap from the config file | feature | polish |
| [W8](W8-real-data-hardening.md) | Real-data hardening and end-to-end | wiring | hardening |

## in-progress

| Ticket | Title | Type | Phase |
| --- | --- | --- | --- |

## done

| Ticket | Title | Type | Phase |
| --- | --- | --- | --- |
| [B0](B0-project-bootstrap.md) | Project bootstrap (init, dependencies, config, license) | bootstrap | foundation |
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

## Rules

- B0 (project bootstrap) has no gate; it must be `done` before M0 starts.
- A gate must be `done` before its wiring ticket starts.
- A milestone may be marked `done` once its implementation and review are complete; its gate must still pass before the next ticket starts.
- A `feature` ticket has no gate; it is reviewed in the end-to-end pass in W8.
- Keep statuses in sync between the ticket frontmatter and this board.

## How to update

Edit the `status:` field in the ticket frontmatter and move its row to the matching section here.

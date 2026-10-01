// Mock fixture set. Todos carry the full M2 review surface: 12 active todos
// with mixed statuses, priorities, due dates (gappy positions), plus 3
// archived todos with stale timestamps. Other domains stay minimal until their
// feature tickets land.
import { isoDateOffset } from "../utils/date";
import type { Fixtures } from "./fixtures.types";

function now(): string {
  return new Date().toISOString();
}

/** A date `days` before/after today at a fixed local time, as ISO datetime. */
function dayStamp(dayOffset: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function createFixtures(): Fixtures {
  const stamp = now();
  return {
    todos: [
      {
        id: "todo-01",
        title: "Fix login redirect loop",
        description: "The OAuth callback bounces back to the login page on the second hop.",
        status: "todo",
        priority: "high",
        dueDate: isoDateOffset(0),
        position: 0,
        archived: false,
        createdAt: dayStamp(-9, 9),
        updatedAt: stamp,
      },
      {
        id: "todo-02",
        title: "Review the Personal OS shell",
        description: null,
        status: "todo",
        priority: "medium",
        dueDate: isoDateOffset(3),
        position: 1,
        archived: false,
        createdAt: dayStamp(-8, 10),
        updatedAt: stamp,
      },
      {
        id: "todo-03",
        title:
          "Read the OpenTUI input documentation and the rest of the component reference before wiring",
        description: "Focus, key handling, and the select/textarea option shapes.",
        status: "todo",
        priority: "low",
        dueDate: null,
        position: 5,
        archived: false,
        createdAt: dayStamp(-7, 11),
        updatedAt: stamp,
      },
      {
        id: "todo-04",
        title: "Pay rent",
        description: null,
        status: "todo",
        priority: null,
        dueDate: isoDateOffset(-2),
        position: 6,
        archived: false,
        createdAt: dayStamp(-6, 12),
        updatedAt: stamp,
      },
      {
        id: "todo-05",
        title: "Draft the weekly summary",
        description: "Cover the ticket board, the setup wiring, and the open questions.",
        status: "todo",
        priority: "high",
        dueDate: isoDateOffset(5),
        position: 9,
        archived: false,
        createdAt: dayStamp(-5, 13),
        updatedAt: stamp,
      },
      {
        id: "todo-06",
        title: "Wire export",
        description:
          "Export should stream every note as Markdown, keep the frontmatter intact, and never block the UI while a large workspace is written to disk.",
        status: "in-progress",
        priority: "medium",
        dueDate: isoDateOffset(0),
        position: 10,
        archived: false,
        createdAt: dayStamp(-4, 14),
        updatedAt: stamp,
      },
      {
        id: "todo-07",
        title: "Refactor the schema loader",
        description: "Split migration discovery from application so tests can dry-run it.",
        status: "in-progress",
        priority: "high",
        dueDate: isoDateOffset(-1),
        position: 12,
        archived: false,
        createdAt: dayStamp(-3, 15),
        updatedAt: stamp,
      },
      {
        id: "todo-08",
        title: "Polish the empty states",
        description: null,
        status: "in-progress",
        priority: "low",
        dueDate: null,
        position: 13,
        archived: false,
        createdAt: dayStamp(-3, 16),
        updatedAt: stamp,
      },
      {
        id: "todo-09",
        title: "Plan the Q4 roadmap",
        description: "Gather the deferred work and size it against the remaining milestones.",
        status: "in-progress",
        priority: null,
        dueDate: isoDateOffset(10),
        position: 15,
        archived: false,
        createdAt: dayStamp(-2, 9),
        updatedAt: stamp,
      },
      {
        id: "todo-10",
        title: "Ship setup",
        description: "Onboarding, credentials, and the schema apply step all landed.",
        status: "completed",
        priority: "high",
        dueDate: isoDateOffset(-5),
        position: 16,
        archived: false,
        createdAt: dayStamp(-12, 10),
        updatedAt: stamp,
      },
      {
        id: "todo-11",
        title: "Write docs",
        description: "Document the repository seam and the mock scenario flags.",
        status: "completed",
        priority: "medium",
        dueDate: isoDateOffset(-8),
        position: 18,
        archived: false,
        createdAt: dayStamp(-11, 11),
        updatedAt: stamp,
      },
      {
        id: "todo-12",
        title: "Archive old notes",
        description: null,
        status: "completed",
        priority: "low",
        dueDate: null,
        position: 20,
        archived: false,
        createdAt: dayStamp(-10, 12),
        updatedAt: stamp,
      },
      {
        id: "todo-a1",
        title: "Old experiment",
        description: "A spike that never shipped.",
        status: "todo",
        priority: "low",
        dueDate: null,
        position: 3,
        archived: true,
        createdAt: "2024-11-02T09:15:00.000Z",
        updatedAt: "2025-11-02T09:15:00.000Z",
      },
      {
        id: "todo-a2",
        title: "Cancelled feature",
        description: "Dropped after the roadmap review.",
        status: "in-progress",
        priority: "medium",
        dueDate: null,
        position: 4,
        archived: true,
        createdAt: "2024-08-14T12:00:00.000Z",
        updatedAt: "2025-08-14T12:00:00.000Z",
      },
      {
        id: "todo-a3",
        title: "Duplicate entry",
        description: null,
        status: "completed",
        priority: null,
        dueDate: null,
        position: 7,
        archived: true,
        createdAt: "2024-02-20T08:30:00.000Z",
        updatedAt: "2025-02-20T08:30:00.000Z",
      },
    ],
    notes: [
      {
        id: "note-1",
        title: "Welcome to Personal OS",
        content: "This is mock data. Nothing here persists.",
        pinned: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    links: [],
    workLogs: [],
    projects: [],
  };
}

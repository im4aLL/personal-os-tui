// Minimal M0 fixture set: empty arrays per domain, plus one todo and one
// note so the shell has something to render references to. Grows per feature.
import type { Fixtures } from "./fixtures.types";

function now(): string {
  return new Date().toISOString();
}

export function createFixtures(): Fixtures {
  const stamp = now();
  return {
    todos: [
      {
        id: "todo-1",
        title: "Review the Personal OS shell",
        status: "todo",
        priority: "high",
        dueDate: null,
        position: 0,
        archived: false,
        createdAt: stamp,
        updatedAt: stamp,
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

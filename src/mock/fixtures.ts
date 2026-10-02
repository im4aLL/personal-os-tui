// Mock fixture set. Todos carry the full M2 review surface: 12 active todos
// with mixed statuses, priorities, due dates (gappy positions), plus 3
// archived todos with stale timestamps. Notes carry the full M3 surface: 14
// notes (3 pinned, one untitled, a long markdown body, a single long line, 4
// tagged, relative dates across today/yesterday/last week/last year).

import type {
  Link,
  Project,
  ProjectPhase,
  WorkItem,
  WorkItemStatus,
  WorkLog,
} from "../repos/types";
import { addDaysISO, isoDateOffset, mondayOfWeekISO, todayISO } from "../utils/date";
import type { Fixtures } from "./fixtures.types";

function now(): string {
  return new Date().toISOString();
}

/** An ISO datetime `minutes` in the past. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** An ISO datetime `hours` in the past. */
function hoursAgo(hours: number): string {
  return minutesAgo(hours * 60);
}

/** An ISO datetime exactly a full day in the past. It is always on the previous
 * local calendar day, so `relativeTime` renders "Yesterday" regardless of the
 * current time of day (unlike a fixed wall-clock hour, which stays inside the
 * `Nh ago` window until that hour passes). */
function yesterdayStamp(): string {
  return hoursAgo(24);
}

/** A date `days` before/after today at a fixed local time, as ISO datetime. */
function dayStamp(dayOffset: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** Long-form review fixture (~3,000 chars) covering every markdown construct
 * the preview must render: headings, nested lists, a task list, two fenced
 * code blocks, a table, a blockquote, an inline link, bold, and italic. */
const LONG_MARKDOWN = [
  "# Release checklist",
  "",
  "This note is a long-form review fixture for the Notes preview. It exercises",
  "every markdown construct the editor must render: **bold**, *italic*, an",
  "[inline link](https://opentui.com/docs), nested lists, a task list, two fenced",
  "code blocks, a table, and a blockquote. It is intentionally long so the preview",
  "scrolls and so wrapping can be reviewed.",
  "",
  "## Goals",
  "",
  "- Ship the release without surprises",
  "  - Freeze the branch",
  "  - Run the full test suite",
  "  - Verify the migration applies cleanly",
  "- Keep everyone informed",
  "  - Post the plan in the channel",
  "  - Update the changelog",
  "",
  "## Tasks",
  "",
  "- [x] Bump the version",
  "- [ ] Tag the release",
  "- [ ] Update the changelog",
  "- [ ] Publish to npm",
  "",
  "## Build script",
  "",
  "```bash",
  "#!/usr/bin/env bash",
  "set -euo pipefail",
  "npm run typecheck",
  "npm run check",
  "npm run build",
  "npm publish --access public",
  "```",
  "",
  "## Release helper",
  "",
  "```ts",
  "export interface ReleasePlan {",
  "  version: string;",
  "  notes: string[];",
  "}",
  "",
  "export function nextVersion(current: string): string {",
  "  const parts = current.split('.').map(Number);",
  "  const [major, minor, patch] = parts;",
  "  // Patch releases are the default; minors are planned in advance.",
  "  return String(major) + '.' + minor + '.' + (patch + 1);",
  "}",
  "```",
  "",
  "## Compatibility",
  "",
  "| Platform | Node | Status |",
  "| --- | --- | --- |",
  "| macOS | 26.4 | verified |",
  "| Linux | 26.4 | verified |",
  "| Windows | 26.4 | pending |",
  "",
  "> The release is only done when the changelog, the tag, and the published",
  "> package all agree. Never skip the changelog.",
  "",
  "## Rollback",
  "",
  "If the published package is broken, unpublish within the first minutes, or",
  "publish a patch release immediately. Communicate the rollback in the same",
  "channel where the release was announced. Do not rewrite history that other",
  "people may have already pulled.",
  "",
  "## Aftercare",
  "",
  "Watch the issue tracker for the first hour after publishing. Group incoming",
  "reports by area (install, runtime, platform) and turn each confirmed defect",
  "into a ticket with a reproduction. Capture the exact version and platform in",
  "every report, because a report without a version is not actionable.",
  "",
  "## Communication",
  "",
  "Write the announcement before the release, not after. State the version, the",
  "headline change, and any required action. Keep the tone plain and concrete.",
  "Link to the changelog and to the migration notes when there is one. Avoid",
  "marketing language in an engineering channel; people read it on a phone.",
  "",
  "## Follow-up",
  "",
  "Schedule a short review a week after the release. Ask three questions: did",
  "anything break, did anything surprise us, and what should change next time.",
  "Record the answers in the next retrospective so the process improves instead",
  "of repeating. The point of a checklist is not the checklist itself but the",
  "pause it creates before shipping.",
  "",
  "## Checklist discipline",
  "",
  "1. Read every line out loud before you start.",
  "2. Mark each line only when it is truly done.",
  "3. If a line is wrong, change the checklist first.",
  "",
  "A checklist that nobody reads is worse than no checklist at all, because it",
  "creates the feeling of safety without the substance. Keep it short enough to",
  "fit on one screen and revisit it after every release. Delete the lines that",
  "never catch anything, and add a line only after a real failure.",
].join("\n");

// Save Links review set: exactly 63 rows so the first page is 50 and the
// second 13. `createdAt` is spread over months. Two rows share a title on
// different URLs (duplicate detection is URL-based), one has a very long path,
// one is a `mailto:` scheme, `design` matches a single row, and `rust` is an
// orphan in the tag pool so a zero-match pill can reach the filtered-empty
// state.
const LINK_TAGS = ["dev", "db", "reading", "tools", "design", "ui", "rust"];

type LinkSpec = [title: string, url: string, tags: string[], daysAgo: number, hour: number];

const LINK_SPECS: LinkSpec[] = [
  ["Turso docs", "https://docs.turso.tech/introduction", ["dev", "db"], 2, 9],
  ["OpenTUI components", "https://opentui.com/docs/components", ["dev", "ui"], 3, 10],
  ["OpenTUI components", "https://github.com/sst/opentui", ["dev", "ui"], 4, 11],
  ["SQLite foreign keys", "https://sqlite.org/foreignkeys.html", ["db"], 5, 12],
  ["Designing Data-Intensive Applications", "https://dataintensive.net", ["reading", "db"], 6, 13],
  [
    "The Pragmatic Programmer",
    "https://pragprog.com/titles/tpp20/the-pragmatic-programmer",
    ["reading"],
    8,
    9,
  ],
  [
    "Zustand docs",
    "https://zustand.docs.pmnd.rs/getting-started/introduction",
    ["dev", "tools"],
    9,
    10,
  ],
  ["React hooks reference", "https://react.dev/reference/react/hooks", ["dev"], 10, 11],
  [
    "A very long path",
    "https://example.com/a/very/long/path/that/keeps/going/and/going/for/truncation/review/with/a/file.html",
    ["reading"],
    11,
    12,
  ],
  ["Team mailing list", "mailto:team@example.com", ["tools"], 12, 13],
  ["Catppuccin palette", "https://catppuccin.com/palette", ["design"], 14, 9],
  [
    "TypeScript handbook",
    "https://www.typescriptlang.org/docs/handbook/intro.html",
    ["dev", "reading"],
    15,
    10,
  ],
  ["Node.js child_process", "https://nodejs.org/api/child_process.html", ["dev", "tools"], 16, 11],
  ["OpenTUI renderer", "https://opentui.com/docs/renderer", ["dev", "ui"], 17, 12],
  ["SQLite WAL mode", "https://sqlite.org/wal.html", ["db"], 18, 13],
  ["Biome linter", "https://biomejs.dev/linter/rules", ["dev", "tools"], 20, 9],
  [
    "Zig language reference",
    "https://ziglang.org/documentation/master",
    ["dev", "reading"],
    21,
    10,
  ],
  ["Turso CLI", "https://docs.turso.tech/cli/introduction", ["dev", "db"], 22, 11],
  ["Deno KV", "https://docs.deno.com/deploy/kv/manual", ["db"], 23, 12],
  ["Latency numbers", "https://gist.github.com/jboner/2841832", ["reading", "tools"], 24, 13],
  [
    "Distributed systems reading",
    "https://github.com/theanalyst/awesome-distributed-systems",
    ["reading"],
    26,
    9,
  ],
  ["React patterns", "https://reactpatterns.com", ["dev"], 27, 10],
  ["CSS grid guide", "https://css-tricks.com/snippets/css/complete-guide-grid", ["ui"], 28, 11],
  ["Flexbox guide", "https://css-tricks.com/snippets/css/a-guide-to-flexbox", ["ui"], 29, 12],
  [
    "Terminal escape codes",
    "https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797",
    ["dev", "tools"],
    30,
    13,
  ],
  ["SQLite query planner", "https://sqlite.org/optoverview.html", ["db"], 32, 9],
  ["The Rust book", "https://doc.rust-lang.org/book", ["reading"], 33, 10],
  ["Go by example", "https://gobyexample.com", ["reading", "dev"], 34, 11],
  ["Vim motions", "https://vim.rtorr.com", ["tools"], 35, 12],
  ["tmux cheatsheet", "https://tmuxcheatsheet.com", ["tools"], 36, 13],
  [
    "Git internals",
    "https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain",
    ["dev", "reading"],
    38,
    9,
  ],
  [
    "npm workspaces",
    "https://docs.npmjs.com/cli/v10/using-npm/workspaces",
    ["dev", "tools"],
    39,
    10,
  ],
  ["tsdown bundler", "https://tsdown.dev", ["dev", "tools"], 40, 11],
  ["tsx runner", "https://tsx.is", ["dev", "tools"], 41, 12],
  ["Tree-sitter", "https://tree-sitter.github.io/tree-sitter", ["dev"], 42, 13],
  [
    "Zustand store patterns",
    "https://zustand.docs.pmnd.rs/guides/practice-with-no-store-actions",
    ["dev"],
    44,
    9,
  ],
  [
    "HTTP methods",
    "https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods",
    ["dev", "reading"],
    45,
    10,
  ],
  ["Fetch API", "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API", ["dev"], 46, 11],
  [
    "Intl.DateTimeFormat",
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat",
    ["dev"],
    47,
    12,
  ],
  ["SQLite date functions", "https://sqlite.org/lang_datefunc.html", ["db"], 48, 13],
  ["AWK one-liners", "https://www.pement.org/awk/awk1line.txt", ["tools"], 50, 9],
  [
    "The Art of Unix Programming",
    "https://www.catb.org/esr/writings/taoup/html",
    ["reading", "tools"],
    51,
    10,
  ],
  ["Refactoring catalog", "https://refactoring.com/catalog", ["dev"], 52, 11],
  [
    "Clean Architecture",
    "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
    ["reading"],
    53,
    12,
  ],
  ["Twelve-Factor App", "https://12factor.net", ["dev", "reading"], 54, 13],
  ["Semantic Versioning", "https://semver.org", ["dev"], 56, 9],
  [
    "Conventional Commits",
    "https://www.conventionalcommits.org/en/v1.0.0",
    ["dev", "tools"],
    57,
    10,
  ],
  ["Keep a Changelog", "https://keepachangelog.com/en/1.1.0", ["tools"], 58, 11],
  ["Open Source Guides", "https://opensource.guide", ["reading"], 59, 12],
  ["SQLite in production", "https://blog.pecar.me/sqlite-prod", ["db"], 60, 13],
  [
    "Command line text processing",
    "https://github.com/learnbyexample/Command-line-text-processing",
    ["tools", "reading"],
    65,
    9,
  ],
  ["Regular expressions", "https://regex101.com", ["dev", "tools"], 70, 10],
  ["JSON schema", "https://json-schema.org", ["dev"], 75, 11],
  ["Unicode console", "https://www.unicode.org/reports/tr11", ["dev", "reading"], 80, 12],
  ["ANSI colors", "https://en.wikipedia.org/wiki/ANSI_escape_code", ["dev", "ui"], 90, 13],
  [
    "Performance profiling",
    "https://nodejs.org/en/learn/getting-started/profiling",
    ["dev"],
    100,
    9,
  ],
  ["Database indexing", "https://use-the-index-luke.com", ["db", "reading"], 120, 10],
  [
    "System design primer",
    "https://github.com/donnemartin/system-design-primer",
    ["reading"],
    150,
    11,
  ],
  ["Kubernetes docs", "https://kubernetes.io/docs/home", ["tools"], 180, 12],
  ["Docker get started", "https://docs.docker.com/get-started", ["tools"], 220, 13],
  [
    "Linux permissions",
    "https://wiki.archlinux.org/title/File_permissions_and_attributes",
    ["tools"],
    280,
    9,
  ],
  ["SSH config", "https://www.ssh.com/academy/ssh/config", ["tools"], 340, 10],
  ["Emacs org mode", "https://orgmode.org/manual/Introduction.html", ["reading"], 420, 11],
];

function linkFixtures(): Link[] {
  return LINK_SPECS.map(([title, url, tags, daysAgo, hour], index) => ({
    id: `link-${String(index + 1).padStart(2, "0")}`,
    title,
    url,
    tags: [...tags],
    createdAt: dayStamp(-daysAgo, hour),
  }));
}

interface WorkLogSpec {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  tags: string[];
}

/** A deterministic ISO datetime for a fixture, derived from its start date and
 * index so createdAt/updatedAt stay realistic without wall-clock dependence. */
function workLogStamp(date: string, index: number): string {
  const hour = 8 + (index % 8);
  return `${date}T${String(hour).padStart(2, "0")}:30:00.000Z`;
}

// Work Log review set: 14 entries whose distribution holds at any run date.
// Exactly 3 fall in the current ISO week, 2 in the previous week, and 2 in the
// week before that; the remaining 7 spread across the last year and include a
// fixed year-boundary pair (2025-12-31 / 2026-01-01, both ISO 2026-W01) that
// exercises the ISO week-key year logic. Three entries are multi-day ranges
// (one in the current week whenever the day is not Monday, since a same-week
// span with a future end date is not allowed), two carry no tags, and one has
// a long title and description for truncation review.
function workLogFixtures(): WorkLog[] {
  const today = todayISO();
  const monday = mondayOfWeekISO(0);
  const lastWeekMonday = mondayOfWeekISO(-1);
  const priorWeekMonday = mondayOfWeekISO(-2);
  // Candidate current-week days, clamped so they never spill into the previous
  // week and never land in the future.
  const currentDay = (days: number): string => {
    const candidate = addDaysISO(today, days);
    return candidate < monday ? monday : candidate;
  };
  const currentStart = today === monday ? monday : addDaysISO(today, -1);
  // On a Monday the current-week range collapses to a single day, so a spread
  // entry becomes the third multi-day range instead.
  const spreadSpan = today === monday ? 2 : 0;
  const spread = (weeks: number): string => addDaysISO(monday, weeks * 7);

  const specs: WorkLogSpec[] = [
    {
      title: "Release prep",
      description: "Freeze the branch, cut the changelog, and dry-run the publish.",
      startDate: currentStart,
      endDate: today,
      tags: ["work", "review"],
    },
    {
      title: "API cleanup",
      description: "Tidy the repository seam before the Work Log wiring starts.",
      startDate: currentDay(-1),
      endDate: currentDay(-1),
      tags: ["dev"],
    },
    {
      title: "Design review",
      description: null,
      startDate: currentDay(-2),
      endDate: currentDay(-2),
      tags: [],
    },
    {
      title: "Sprint planning",
      description: "Scope the Work Log UI and the project planner.",
      startDate: lastWeekMonday,
      endDate: addDaysISO(lastWeekMonday, 1),
      tags: ["meetings", "work"],
    },
    {
      title: "Migration notes",
      description: "Record the schema differences between the desktop and the TUI.",
      startDate: addDaysISO(lastWeekMonday, 2),
      endDate: addDaysISO(lastWeekMonday, 2),
      tags: ["research"],
    },
    {
      title: "Docs pass",
      description: "Refresh the README and the milestone notes.",
      startDate: priorWeekMonday,
      endDate: addDaysISO(priorWeekMonday, 2),
      tags: ["work", "review"],
    },
    {
      title: "Team sync",
      description: null,
      startDate: addDaysISO(priorWeekMonday, 4),
      endDate: addDaysISO(priorWeekMonday, 4),
      tags: [],
    },
    {
      title:
        "Migrated the Work Log mock repository to the desktop date-range semantics and verified overlap filtering end to end",
      description:
        "The manual range filter keeps a multi-day entry when its end date is on or after the From date and its start date is on or before the To date, so a range that straddles either boundary still appears. This description is intentionally long so the row truncation can be reviewed at every width without touching the title.",
      startDate: spread(-5),
      endDate: addDaysISO(spread(-5), spreadSpan),
      tags: ["work", "dev"],
    },
    {
      title: "Tag audit",
      description: "Confirm the tag pool stays distinct and sorted after writes.",
      startDate: spread(-11),
      endDate: spread(-11),
      tags: ["research"],
    },
    {
      title: "Keyboard pass",
      description: "Walk the selection, preset, and date-field keys at every width.",
      startDate: spread(-19),
      endDate: spread(-19),
      tags: ["review", "dev"],
    },
    {
      title: "Year-end wrap",
      description: "Close out the year and note the outstanding work.",
      startDate: "2025-12-31",
      endDate: "2025-12-31",
      tags: ["meetings"],
    },
    {
      title: "New year kickoff",
      description: "Set the priorities for the first quarter.",
      startDate: "2026-01-01",
      endDate: "2026-01-01",
      tags: ["work"],
    },
    {
      title: "Reading day",
      description: "Caught up on the OpenTUI component reference.",
      startDate: spread(-28),
      endDate: spread(-28),
      tags: ["research"],
    },
    {
      title: "Retro notes",
      description: "Incremental delivery kept every diff small and reviewable.",
      startDate: spread(-40),
      endDate: spread(-40),
      tags: ["work", "meetings"],
    },
  ];

  return specs.map((spec, index) => {
    const stamp = workLogStamp(spec.startDate, index);
    return {
      id: `worklog-${String(index + 1).padStart(2, "0")}`,
      title: spec.title,
      description: spec.description,
      startDate: spec.startDate,
      endDate: spec.endDate,
      createdAt: stamp,
      updatedAt: stamp,
      tags: [...spec.tags],
    };
  });
}

/** Deterministic ISO datetime for a project/phase fixture, derived from its
 * start date and index so timestamps stay realistic without wall-clock
 * dependence. */
function projectStamp(date: string, index: number): string {
  const hour = 7 + (index % 8);
  return `${date}T${String(hour).padStart(2, "0")}:15:00.000Z`;
}

/** Deterministic ISO datetime for a work item fixture. */
function workItemStamp(index: number): string {
  const hour = 8 + (index % 9);
  const minute = (index * 13) % 60;
  return `${isoDateOffset(-(45 - index))}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
}

// Project Planner review set (PLAN M6). Five projects cover the windowing
// bounds: the 12-week default, an 8-week project that has not started, a
// 6-week project that already ended, a 24-week project for windowed scrolling,
// and a 52-week project for the upper bound on an 80-column terminal. All
// relative dates use `isoDateOffset` so the set holds at any run date.
function projectFixtures(): Project[] {
  const specs: Array<[id: string, name: string, startDate: string, weekCount: number]> = [
    ["project-personal-os", "Personal OS v2", isoDateOffset(-28), 12],
    ["project-docs", "Docs site", isoDateOffset(7), 8],
    ["project-marketing", "Marketing", isoDateOffset(-70), 6],
    ["project-platform", "Platform migration", isoDateOffset(-14), 24],
    ["project-roadmap", "Year roadmap", isoDateOffset(-7), 52],
  ];
  return specs.map(([id, name, startDate, weekCount], index) => {
    const stamp = projectStamp(startDate, index);
    return { id, name, startDate, weekCount, position: index, createdAt: stamp, updatedAt: stamp };
  });
}

// Five phases, all on "Personal OS v2", with distinct colors. "Polish" is the
// empty phase (its phase manager count is zero). "Docs site" deliberately has
// no phases, so its work items resolve to the fallback gray and its legend is
// hidden.
function projectPhaseFixtures(): ProjectPhase[] {
  const created = `${isoDateOffset(-35)}T09:00:00.000Z`;
  const specs: Array<[id: string, name: string, color: string]> = [
    ["phase-design", "Design", "#93C5FD"],
    ["phase-build", "Build", "#FCA5A5"],
    ["phase-ship", "Ship", "#86EFAC"],
    ["phase-support", "Support", "#FDBA74"],
    ["phase-polish", "Polish", "#C4B5FD"],
  ];
  return specs.map(([id, name, color], index) => ({
    id,
    projectId: "project-personal-os",
    name,
    color,
    position: index,
    createdAt: created,
  }));
}

interface WorkItemSpec {
  id: string;
  projectId: string;
  phaseId: string | null;
  title: string;
  person: string | null;
  comment?: string | null;
  jiraTicket?: string | null;
  status: WorkItemStatus;
  startWeek: number;
  endWeek: number;
  position: number;
  isSeparator?: boolean;
}

// Work item review set. Eighteen items live on "Personal OS v2" plus three
// separators (top, middle, bottom) for 21 rows total, so the default selection
// scrolls past the viewport. They cover every status, single-week and
// multi-week spans, a full-length 1-12 span, a comment, a Jira URL ticket and a
// plain ticket key, repeated and missing persons, and a long title. Positions
// are gappy and include 0, 2, 5, and 9. Two phase-less items on "Docs site"
// exercise the fallback gray.
function workItemFixtures(): WorkItem[] {
  const specs: WorkItemSpec[] = [
    // Top separator.
    {
      id: "workitem-p1-sep-top",
      projectId: "project-personal-os",
      phaseId: null,
      title: "",
      person: null,
      status: "pending",
      startWeek: 1,
      endWeek: 1,
      position: 0,
      isSeparator: true,
    },
    {
      id: "workitem-p1-01",
      projectId: "project-personal-os",
      phaseId: "phase-design",
      title: "Project shell and repo seam",
      person: "Ana",
      comment: "Port the seam first: stores must depend only on the interface.",
      status: "pending",
      startWeek: 1,
      endWeek: 2,
      position: 2,
    },
    {
      id: "workitem-p1-02",
      projectId: "project-personal-os",
      phaseId: "phase-design",
      title: "Phase legend",
      person: null,
      jiraTicket: "POS-101",
      status: "pending",
      startWeek: 1,
      endWeek: 1,
      position: 3,
    },
    {
      id: "workitem-p1-03",
      projectId: "project-personal-os",
      phaseId: "phase-design",
      title: "Week grid header",
      person: "Ana",
      jiraTicket: "https://example.com/browse/POS-102",
      status: "in_progress",
      startWeek: 2,
      endWeek: 4,
      position: 5,
    },
    {
      id: "workitem-p1-04",
      projectId: "project-personal-os",
      phaseId: "phase-design",
      title: "Keyboard focus model",
      person: "Bob",
      status: "done",
      startWeek: 1,
      endWeek: 3,
      position: 6,
    },
    {
      id: "workitem-p1-05",
      projectId: "project-personal-os",
      phaseId: "phase-build",
      title: "Mock project repo",
      person: "Bob",
      status: "in_progress",
      startWeek: 3,
      endWeek: 7,
      position: 9,
    },
    {
      id: "workitem-p1-06",
      projectId: "project-personal-os",
      phaseId: "phase-build",
      title: "Turso project repo",
      person: "Kim",
      jiraTicket: "POS-118",
      status: "pending",
      startWeek: 8,
      endWeek: 12,
      position: 10,
    },
    // Middle separator between Build and Ship work.
    {
      id: "workitem-p1-sep-mid",
      projectId: "project-personal-os",
      phaseId: null,
      title: "",
      person: null,
      status: "pending",
      startWeek: 1,
      endWeek: 1,
      position: 11,
      isSeparator: true,
    },
    {
      id: "workitem-p1-07",
      projectId: "project-personal-os",
      phaseId: "phase-build",
      title: "Work item form",
      person: null,
      status: "pending",
      startWeek: 4,
      endWeek: 6,
      position: 13,
    },
    {
      id: "workitem-p1-08",
      projectId: "project-personal-os",
      phaseId: "phase-build",
      title: "Phase manager",
      person: "Kim",
      status: "in_progress",
      startWeek: 4,
      endWeek: 6,
      position: 14,
    },
    {
      id: "workitem-p1-09",
      projectId: "project-personal-os",
      phaseId: "phase-build",
      title: "Project list reorder",
      person: "Ana",
      status: "done",
      startWeek: 5,
      endWeek: 7,
      position: 16,
    },
    {
      id: "workitem-p1-10",
      projectId: "project-personal-os",
      phaseId: "phase-build",
      title:
        "Reconcile the desktop snake_case schema with the TUI camelCase repository seam without losing the SQL rollback semantics",
      person: "Bob",
      status: "pending",
      startWeek: 2,
      endWeek: 12,
      position: 17,
    },
    {
      id: "workitem-p1-11",
      projectId: "project-personal-os",
      phaseId: "phase-build",
      title: "Gantt bar shades",
      person: "Ana",
      status: "done",
      startWeek: 6,
      endWeek: 8,
      position: 19,
    },
    {
      id: "workitem-p1-12",
      projectId: "project-personal-os",
      phaseId: "phase-ship",
      title: "Ship v2",
      person: "Ana",
      status: "done",
      startWeek: 9,
      endWeek: 12,
      position: 20,
    },
    {
      id: "workitem-p1-13",
      projectId: "project-personal-os",
      phaseId: "phase-ship",
      title: "Release notes",
      person: "Bob",
      status: "pending",
      startWeek: 11,
      endWeek: 12,
      position: 22,
    },
    {
      id: "workitem-p1-14",
      projectId: "project-personal-os",
      phaseId: "phase-ship",
      title: "Docs site handoff",
      person: "Kim",
      status: "in_progress",
      startWeek: 10,
      endWeek: 12,
      position: 23,
    },
    {
      id: "workitem-p1-15",
      projectId: "project-personal-os",
      phaseId: "phase-support",
      title: "Cutover",
      person: "Kim",
      status: "in_progress",
      startWeek: 10,
      endWeek: 12,
      position: 25,
    },
    {
      id: "workitem-p1-16",
      projectId: "project-personal-os",
      phaseId: "phase-support",
      title: "Post-release fixes",
      person: null,
      status: "pending",
      startWeek: 12,
      endWeek: 12,
      position: 26,
    },
    {
      id: "workitem-p1-17",
      projectId: "project-personal-os",
      phaseId: "phase-support",
      title: "Full rollout",
      person: "Ana",
      status: "pending",
      startWeek: 1,
      endWeek: 12,
      position: 28,
    },
    {
      id: "workitem-p1-18",
      projectId: "project-personal-os",
      phaseId: "phase-support",
      title: "Retro",
      person: "Bob",
      status: "done",
      startWeek: 12,
      endWeek: 12,
      position: 29,
    },
    // Bottom separator.
    {
      id: "workitem-p1-sep-bottom",
      projectId: "project-personal-os",
      phaseId: null,
      title: "",
      person: null,
      status: "pending",
      startWeek: 1,
      endWeek: 1,
      position: 30,
      isSeparator: true,
    },
    // Phase-less items on "Docs site": the project has no phases, so these
    // render at the fallback gray.
    {
      id: "workitem-p2-01",
      projectId: "project-docs",
      phaseId: null,
      title: "Content migration",
      person: null,
      jiraTicket: "DOC-7",
      status: "pending",
      startWeek: 1,
      endWeek: 4,
      position: 0,
    },
    {
      id: "workitem-p2-02",
      projectId: "project-docs",
      phaseId: null,
      title: "Theme pass",
      person: "Ana",
      status: "in_progress",
      startWeek: 3,
      endWeek: 8,
      position: 1,
    },
  ];

  return specs.map((spec, index) => {
    const stamp = workItemStamp(index);
    return {
      id: spec.id,
      projectId: spec.projectId,
      phaseId: spec.phaseId,
      title: spec.title,
      person: spec.person,
      comment: spec.comment ?? null,
      jiraTicket: spec.jiraTicket ?? null,
      status: spec.status,
      startWeek: spec.startWeek,
      endWeek: spec.endWeek,
      position: spec.position,
      isSeparator: spec.isSeparator ?? false,
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
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
        id: "note-01",
        title: "Release checklist",
        content: [
          "# Release checklist",
          "",
          "- [x] bump version",
          "- [ ] tag the release",
          "- [ ] update the changelog",
          "",
          "```bash",
          "npm run release",
          "```",
        ].join("\n"),
        pinned: true,
        tags: ["work", "release"],
        createdAt: dayStamp(-6, 9),
        updatedAt: minutesAgo(2),
      },
      {
        id: "note-02",
        title: "Meeting notes",
        content: [
          "## Standup",
          "",
          "- Reviewed the mock seam",
          "- Agreed on the list ordering: pinned first, then updated_at descending",
          "- Next: wire the export path",
        ].join("\n"),
        pinned: false,
        tags: ["work"],
        createdAt: dayStamp(-4, 10),
        updatedAt: hoursAgo(3),
      },
      {
        id: "note-03",
        title: "",
        content:
          "Quick capture before I forget: an untitled note should show its created-at date as the display title.",
        pinned: false,
        tags: [],
        createdAt: dayStamp(-1, 8),
        updatedAt: minutesAgo(25),
      },
      {
        id: "note-04",
        title: "Long-form spec",
        content: LONG_MARKDOWN,
        pinned: false,
        tags: [],
        createdAt: dayStamp(-12, 9),
        updatedAt: hoursAgo(5),
      },
      {
        id: "note-05",
        title: "Reading list",
        content: [
          "- The Pragmatic Programmer",
          "- Designing Data-Intensive Applications",
          "- A Philosophy of Software Design",
        ].join("\n"),
        pinned: true,
        tags: [],
        createdAt: dayStamp(-20, 12),
        updatedAt: yesterdayStamp(),
      },
      {
        id: "note-06",
        title: "Long line test",
        content:
          "ThisIsASingleVeryLongUnbrokenLineOfTextWithoutAnySpacesUsedToVerifyThatThePreviewAndTheEditorBothWrapOnCharacterBoundariesInsteadOfOverflowingOrScrollingHorizontallyAcrossTheWholeTerminalWindowAndItKeepsGoingForQuiteAWhileLongerThanAnyReasonableLine",
        pinned: false,
        tags: [],
        createdAt: dayStamp(-3, 10),
        updatedAt: yesterdayStamp(),
      },
      {
        id: "note-07",
        title: "Ideas parking lot",
        content: [
          "- Command palette fuzzy matching",
          "- A weekly review screen",
          "- Keyboard macros for the planner",
        ].join("\n"),
        pinned: false,
        tags: ["ideas"],
        createdAt: dayStamp(-30, 11),
        updatedAt: hoursAgo(24 * 7 + 5),
      },
      {
        id: "note-08",
        title: "Design review",
        content:
          "## Feedback\n\nThe two-pane proportion feels right. The saving indicator should sit near the actions, and privacy mode must keep a stable mask width.",
        pinned: false,
        tags: [],
        createdAt: dayStamp(-15, 14),
        updatedAt: hoursAgo(24 * 9 + 3),
      },
      {
        id: "note-09",
        title: "Personal OS roadmap",
        content: [
          "# Roadmap",
          "",
          "1. Repo seam and shell",
          "2. Todo",
          "3. Notes",
          "4. Save Links",
          "5. Work Log",
          "6. Project Planner",
          "7. Dashboard",
        ].join("\n"),
        pinned: true,
        tags: [],
        createdAt: dayStamp(-40, 9),
        updatedAt: hoursAgo(24 * 6 + 8),
      },
      {
        id: "note-10",
        title: "Clippings",
        content:
          "> Simplicity is a great virtue but it requires hard work to achieve it.\n\nRevisit this during the polish pass.",
        pinned: false,
        tags: [],
        createdAt: dayStamp(-25, 16),
        updatedAt: hoursAgo(24 * 10 + 2),
      },
      {
        id: "note-11",
        title: "Retro notes",
        content: [
          "## What went well",
          "",
          "- Incremental delivery",
          "- Small, reviewable diffs",
          "",
          "## What to improve",
          "",
          "- Fewer speculative abstractions",
        ].join("\n"),
        pinned: false,
        tags: [],
        createdAt: dayStamp(-380, 10),
        updatedAt: hoursAgo(24 * 370),
      },
      {
        id: "note-12",
        title: "Conference talk outline",
        content: [
          "# Terminal UIs that feel native",
          "",
          "- Why keyboard-first matters",
          "- Layout and density",
          "- Testing from the code",
        ].join("\n"),
        pinned: false,
        tags: [],
        createdAt: dayStamp(-410, 15),
        updatedAt: hoursAgo(24 * 400),
      },
      {
        id: "note-13",
        title: "Home maintenance",
        content: [
          "- Replace the furnace filter",
          "- Service the bike",
          "- Book the gutter cleaning",
        ].join("\n"),
        pinned: false,
        tags: ["personal"],
        createdAt: dayStamp(-14, 18),
        updatedAt: hoursAgo(24 * 7 + 19),
      },
      {
        id: "note-14",
        title: "Questions for Dan",
        content: [
          "1. How do we handle token refresh?",
          "2. What is the rollback plan?",
          "3. Who owns the release?",
        ].join("\n"),
        pinned: false,
        tags: [],
        createdAt: dayStamp(-11, 13),
        updatedAt: hoursAgo(24 * 5 + 12),
      },
    ],
    links: linkFixtures(),
    linkTags: [...LINK_TAGS],
    workLogs: workLogFixtures(),
    projects: projectFixtures(),
    projectPhases: projectPhaseFixtures(),
    workItems: workItemFixtures(),
  };
}
